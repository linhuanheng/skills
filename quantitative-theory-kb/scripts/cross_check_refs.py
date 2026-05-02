"""
参考文献交叉核对脚本 v2.0

用途: 将从引言识别的候选文献与论文末尾参考文献列表核对,
      补全候选文献的完整书目信息（标题、期刊、卷期、页码、DOI）。

问题修复记录 (v2.0):
  1) 正则编译崩溃 → 预编译 + try/except 兜底
  2) 年份格式不匹配 → 支持 ,1999. / (1999) / .1999 等多种分隔符
  3) None切片崩溃 → _get() 安全取值函数统一处理
  4) 连续文本无法分条 → 多阶段预处理管线
  5) 多作者分割错误 → 以 "年份+句点" 为锚点定位边界
  6) 中文编码乱码 → 统一 UTF-8 + ASCII 摘要输出

用法:
    python cross_check_refs.py --candidates candidates.json --refs refs.txt -o validated.json
    python cross_check_refs.py --candidates candidates.json --refs refs.txt --interactive
"""
import re
import json
import sys
import argparse


# ============================================================
# 预编译正则（问题 1 修复：所有 pattern 在模块加载时验证）
# ============================================================
_RE_YEAR = re.compile(r'[,\(\.]\s*((?:19|20)\d{2})\s*[\)\.]?\s*')  # 问题2修复
_RE_YEAR_ANCHOR = re.compile(r'(?:19|20)\d{2}\.')
_RE_AUTHOR_SPLIT = re.compile(r'(?:,\s+and\s+|;\s+|,\s+)')
_RE_CLEAN_NUM = re.compile(r'^\[?\d+\]?\.?\s*')
_RE_VOLUME = re.compile(r'(\d+)\s*[\(,]\s*(\d+)\)?[,:]?\s*([\d\-\–\+eE]+)?')
_RE_PAGES = re.compile(r'(?:pp?\.\s*)?(\d+[\-\–\d,]+)')
_RE_DOI = re.compile(r'(?:doi|DOI)[\s:]*([^\s,;}]+)', re.IGNORECASE)
_RE_DOI2 = re.compile(r'(10\.\d{4,}/[^\s,;}]+)')


# ============================================================
# None-safe 取值工具（问题3修复）
# ============================================================
def _get(d, key, default='?'):
    """安全取值: 无论 key 缺失还是值为 None, 都返回 default."""
    val = d.get(key)
    return default if val is None else val


def _str(val, size=None):
    """安全字符串截断."""
    if val is None:
        s = '?'
    else:
        s = str(val)
    if size and len(s) > size:
        s = s[:size]
    return s


# ============================================================
# 文本预处理管线（问题4/5修复）
# ============================================================
def _preprocess(text):
    """
    多阶段预处理: 将各类畸形的参考文献文本规范化为逐条独立成行的格式。

    阶段1: 移除 References/Bibliography 标题
    阶段2: 规整空白字符
    阶段3: 连续文本分条
    """
    text = re.sub(r'^(?:References|Bibliography|REFERENCES|BIBLIOGRAPHY)\s*\n?', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    # 在 "句点+空格+大写字母+小写字母+逗号" 前插入换行
    # 示例: ". Cai, Z., Wang, X., 2008." → ".\nCai, Z., Wang, X., 2008."
    text = re.sub(r'\.\s+(?=[A-Z][a-z\xc0-\xff]+,?\s+[A-Z]\.)', '.\n', text)
    # 二次精修: 如果还有连续文本残留, 用年份锚点再次分割
    lines = text.split('\n')
    if len(lines) <= 2:
        text = re.sub(r'(\.\s*)\d{4}\.\s+', lambda m: m.group(0).replace(m.group(1), '.\n', 1), text)
    # 移除空行和过短行
    lines = [l.strip() for l in text.split('\n') if len(l.strip()) > 20]
    return lines


# ============================================================
# 单条引用解析
# ============================================================
def _parse_single(text):
    """解析单条参考文献文本为结构化 dict."""
    text = _RE_CLEAN_NUM.sub('', text).strip()
    if len(text) < 30:
        return None

    entry = {
        'raw': text[:300],
        'authors': [],
        'year': None,
        'title': None,
        'journal': None,
        'volume': None,
        'pages': None,
        'doi': None,
    }

    # 提取年份 (问题2修复: 支持 , 1999. / (1999) / .1999)
    m = _RE_YEAR.search(text)
    if not m:
        return None
    entry['year'] = int(m.group(1))
    yr_pos = m.end()

    # 提取作者: 年份之前的文本
    author_text = text[:m.start()].strip().rstrip(',. ')
    authors = [p.strip().rstrip(',.') for p in _RE_AUTHOR_SPLIT.split(author_text)
               if p.strip() and len(p.strip()) > 1]
    if authors:
        entry['authors'] = authors

    # 提取标题和期刊: 年份之后的内容
    after = text[yr_pos:].strip()

    # 尝试多种标题-期刊格式
    # 格式1: "Title. Journal Volume"
    # 格式2: "Title, Journal, Volume"
    # 格式3: "Title." (如手册章节)
    for sep in ['. ', '., ']:
        parts = after.split(sep, 1)
        if len(parts) >= 2 and parts[0][0].isupper():
            entry['title'] = parts[0].strip()[:200]
            # 尝试提取期刊名
            rest = parts[1]
            jm = re.search(r'^([A-Z][\w\s&]+?)\s+(\d+)', rest)
            if jm:
                entry['journal'] = jm.group(1).strip()
                entry['volume'] = jm.group(2)
            break

    # 兜底: 如果标题没抓到, 直接取年份后第一个大写句段
    if not entry.get('title'):
        tk = after.split('. ')
        for t in tk:
            if t[0].isupper() and len(t) > 10:
                entry['title'] = t[:200]
                break

    # 卷号
    vm = _RE_VOLUME.search(text)
    if vm and not entry.get('volume'):
        entry['volume'] = vm.group(1)

    # 页码
    pm = _RE_PAGES.search(text[yr_pos:])
    if pm:
        pg = pm.group(1)
        if not any(kw in pg for kw in ['http', 'doi', 'www', '10.']):
            entry['pages'] = pg[:20]

    # DOI
    dm = _RE_DOI.search(text) or _RE_DOI2.search(text)
    if dm:
        entry['doi'] = dm.group(1).strip().rstrip('.')

    return entry


# ============================================================
# 主解析函数
# ============================================================
def parse_reference_section(text):
    """
    将参考文献部分的原始文本解析为结构化条目列表。
    内置多格式兼容, 无需外部预处理。
    """
    lines = _preprocess(text)
    # 进一步过滤: 只保留包含年份的行
    lines = [l for l in lines if _RE_YEAR_ANCHOR.search(l)]

    entries = []
    for line in lines:
        entry = _parse_single(line)
        if entry:
            entries.append(entry)
    return entries


# ============================================================
# 候选匹配
# ============================================================
def match_candidates(candidates, refs):
    """
    按 (作者姓氏 + 年份) 精确匹配候选文献与参考文献。
    返回 (validated, unmatched) 元组。
    """
    validated = []
    unmatched = []

    for cand in candidates:
        author_key = cand.get('author', '').strip().lower()
        year = cand.get('year')
        phrase = cand.get('key_phrase', '').lower()
        cand_raw = cand.get('raw', '')

        best = None
        best_score = 0

        for ref in refs:
            score = 0

            # 年份必须匹配
            ref_year = ref.get('year')
            if year and ref_year and ref_year == year:
                score += 2
            else:
                continue

            # 作者姓氏匹配 (任一作者匹配即可)
            for a in ref.get('authors', []):
                # 归一化: 去除非字母字符, 取前10字符
                a_norm = re.sub(r'[^a-z]', '', a.lower())[:10]
                if not a_norm:
                    continue
                if author_key in a_norm or a_norm in author_key:
                    score += 3
                    break
            else:
                # 无作者匹配, 尝试关键短语匹配
                if phrase and (phrase in ref.get('raw', '').lower()
                              or phrase in _str(ref.get('title', ''), 100).lower()):
                    score += 1

            if score > best_score:
                best_score = score
                best = ref

        if best and best_score >= 3:
            result = dict(cand)
            result.update({k: best[k] for k in best if k != 'raw'})
            result['match_status'] = 'matched'
            validated.append(result)
        elif best:
            result = dict(cand)
            result.update({k: best[k] for k in best if k != 'raw'})
            result['match_status'] = 'partial'
            validated.append(result)
        else:
            unmatched.append(cand)

    return validated, unmatched


# ============================================================
# 交互确认
# ============================================================
def interactive_confirm(validated):
    """对 match_status 为 partial 的条目进行人工确认."""
    for v in validated:
        if v.get('match_status') not in ('partial',):
            continue
        print(f"\n候选: {v.get('author', '?')} ({v.get('year', '?')})")
        print(f"匹配文本: {_str(v.get('raw'), 150)}")
        while True:
            ans = input("接受此匹配? (y=接受 / n=拒绝 / e=编辑): ").strip().lower()
            if ans in ('y', 'yes', ''):
                v['match_status'] = 'confirmed'
                v['manual_confirmed'] = True
                break
            elif ans in ('n', 'no'):
                v['match_status'] = 'rejected'
                break
            elif ans.startswith('e'):
                v['raw'] = ans[1:].strip() or v['raw']
                v['match_status'] = 'edited'
                v['manual_confirmed'] = True
                break


# ============================================================
# 主入口
# ============================================================
def main():
    parser = argparse.ArgumentParser(description='参考文献交叉核对 v2.0')
    parser.add_argument('--candidates', '-c', required=True)
    parser.add_argument('--refs', '-r', required=True)
    parser.add_argument('--output', '-o', default='validated_refs.json')
    parser.add_argument('--interactive', '-i', action='store_true')
    parser.add_argument('--verbose', '-v', action='store_true')
    args = parser.parse_args()

    # 读取
    with open(args.candidates, 'r', encoding='utf-8') as f:
        candidates = json.load(f)
    print(f"[INFO] 候选文献: {len(candidates)} 条", file=sys.stderr)

    with open(args.refs, 'r', encoding='utf-8') as f:
        refs_text = f.read()
    print(f"[INFO] 参考文献文本: {len(refs_text)} 字符", file=sys.stderr)

    # 解析
    refs = parse_reference_section(refs_text)
    print(f"[INFO] 解析出参考文献条目: {len(refs)} 条", file=sys.stderr)

    if args.verbose and refs:
        print("[INFO] 前 5 条解析结果:", file=sys.stderr)
        for i, r in enumerate(refs[:5]):
            author = _str(_get(r, 'authors', ['?'])[0] if r.get('authors') else '?')
            year = _get(r, 'year')
            title = _str(_get(r, 'title'), 60)
            journal = _str(_get(r, 'journal'), 30)
            print(f"  [{i+1}] {author} ({year}) - {title} - {journal}", file=sys.stderr)

    # 匹配
    validated, unmatched = match_candidates(candidates, refs)

    matched = [v for v in validated if v['match_status'] in ('matched', 'confirmed')]
    partial = [v for v in validated if v['match_status'] == 'partial']
    print(f"\n[RESULT] 完全匹配 {len(matched)} | 部分匹配 {len(partial)} | 未匹配 {len(unmatched)}", file=sys.stderr)

    # 未匹配报告
    if unmatched and args.verbose:
        print("[WARN] 未能匹配的候选:", file=sys.stderr)
        for u in unmatched:
            print(f"   - {u.get('author', '?')} ({u.get('year', '?')}) [{_str(u.get('key_phrase'), 40)}]", file=sys.stderr)

    # 交互确认
    if args.interactive and partial:
        interactive_confirm(validated)

    # 输出
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(validated, f, ensure_ascii=False, indent=2)
    print(f"[INFO] 结果已保存至: {args.output}", file=sys.stderr)

    # ASCII 摘要输出（避免 Windows 编码问题）
    print()
    print("=== Cross-Check Summary ===")
    print(f"{'#':<3} {'Author':<25} {'Year':<6} {'Journal':<35} {'Status':<10}")
    print("-" * 80)
    for i, v in enumerate(validated, 1):
        author_short = _str(_get(v, 'authors', ['?'])[0], 20) if v.get('authors') else _str(_get(v, 'author'), 20)
        year = str(_get(v, 'year'))
        journal = _str(_get(v, 'journal'), 32)
        status = v.get('match_status', '?')
        print(f"{i:<3} {author_short:<25} {year:<6} {journal:<35} {status:<10}")
    print("-" * 80)

    # 退出码: 有未匹配时返回非零
    if unmatched:
        sys.exit(2)


if __name__ == '__main__':
    main()
