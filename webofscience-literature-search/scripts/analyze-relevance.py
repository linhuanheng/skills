#!/usr/bin/env python3
"""
Web of Science 文献相关性分析工具 -- 方案一：关键词密度 + TF-IDF 余弦相似度

功能：
  读取 merge 后的文献 JSON 文件，根据用户给定的 topic 关键词，
  用 TF-IDF 余弦相似度 + 关键词命中率双重信号为每篇论文计算相关性分数，
  输出到 enriched JSON、控制台摘要报告、以及追加 Top 20 到检索报告 Markdown。

依赖：
  - Python 3.8+
  - scikit-learn (pip install scikit-learn, 可选，有纯 Python 回退)

用法：
  python analyze-relevance.py <input.json> <topic_keywords> \
    [--output enriched.json] [--threshold 0.15] [--md-file report.md]

示例：
  python "$SKILL_DIR/scripts/analyze-relevance.py" \
    SEARCH_RESULTS/liquidity_20260422.json \
    "liquidity,asset pricing,market microstructure" \
    --threshold 0.15 \
    --md-file SEARCH_RESULTS/liquidity_20260422.md
"""

import json, sys, os, re, math, argparse, io
from collections import Counter
from typing import Any

# 修复 Windows 控制台编码：强制 stdout/stderr 使用 UTF-8
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── 纯 Python TF-IDF 实现（无外部依赖，保底方案）─────────────────────────

try:
    from sklearn.feature_extraction.text import TfidfVectorizer as _SkTfidf
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


def _tokenize(text: str) -> list[str]:
    """分词：保留字母数字和下划线，统一小写，过滤 <2 字符的 token。"""
    return [t.lower() for t in re.findall(r"[a-zA-Z0-9_#+.-]+", text) if len(t) > 1]


def _compute_tfidf_sklearn(docs: list[str]) -> list[list[float]]:
    """用 scikit-learn 的 TfidfVectorizer（含字符 n-gram），效果更好。"""
    vec = _SkTfidf(
        analyzer="word",
        token_pattern=r"(?u)[a-zA-Z0-9_#+.-]+",
        max_features=5000,
        sublinear_tf=True,
        norm="l2",
    )
    mat = vec.fit_transform(docs)
    return mat.toarray().tolist()


def _compute_tfidf_pure(docs: list[str]) -> list[list[float]]:
    """纯 Python TF-IDF 实现，不依赖 sklearn。"""
    tokenized = [_tokenize(d) for d in docs]
    df: Counter[str, int] = Counter()
    for toks in tokenized:
        df.update(set(toks))
    n_docs = len(docs)
    result: list[list[float]] = []
    for toks in tokenized:
        tf_raw = Counter(toks)
        max_tf = max(tf_raw.values()) if tf_raw else 1
        vec: dict[str, float] = {}
        for term, cnt in tf_raw.items():
            tf = 0.5 + 0.5 * cnt / max_tf
            idf = math.log((n_docs + 1) / (df[term] + 1)) + 1
            vec[term] = tf * idf
        norm = math.sqrt(sum(v * v for v in vec.values()))
        if norm > 0:
            vec = {k: v / norm for k, v in vec.items()}
        result.append([vec.get(t, 0.0) for t in sorted(set(t for toks in tokenized for t in toks))])
    return result


# ── 余弦相似度 ──────────────────────────────────────────────────────

def cosine_similarity_vec(a: list[float], b: list[float]) -> float:
    """计算两个向量的余弦相似度，带维度兼容处理。"""
    if not a or not b:
        return 0.0
    min_len = min(len(a), len(b))
    if min_len == 0:
        return 0.0
    a_t = a[:min_len]
    b_t = b[:min_len]
    dot = sum(x * y for x, y in zip(a_t, b_t))
    na = math.sqrt(sum(x * x for x in a_t))
    nb = math.sqrt(sum(y * y for y in b_t))
    if na < 1e-12 or nb < 1e-12:
        return 0.0
    return dot / (na * nb)


# ── 关键词命中率 ────────────────────────────────────────────────────

def keyword_hit_rate(text: str, keywords: list[str]) -> float:
    """关键词命中率：统计有多少个关键词短语出现在 text 中。返回 [0, 1]。"""
    if not keywords or not text:
        return 0.0
    text_lower = text.lower()
    hits = 0
    for kw in keywords:
        kw_stripped = kw.strip().lower()
        if not kw_stripped:
            continue
        if kw_stripped in text_lower:
            hits += 1
            continue
        tokens = _tokenize(kw_stripped)
        if tokens and all(t in text_lower for t in tokens):
            hits += 1
    return hits / len([k for k in keywords if k.strip()])


# ── 综合分数 ────────────────────────────────────────────────────────

def compute_scores(
    title: str,
    abstract: str,
    keywords: list[str],
    topic_tfidf_vec: list[float],
    paper_tfidf_vec: list[float],
    *,
    similarity_weight: float = 0.6,
    hit_rate_weight: float = 0.4,
) -> dict[str, Any]:
    """对一篇论文计算 tfidf_similarity、keyword_hit_rate、relevance_score。"""
    if not abstract and not title:
        return {"tfidf_similarity": 0.0, "keyword_hit_rate": 0.0, "relevance_score": 0.0}
    combined_text = f"{title} {abstract}" if abstract else title
    sim = cosine_similarity_vec(topic_tfidf_vec, paper_tfidf_vec)
    hr = keyword_hit_rate(combined_text, keywords)
    composite = similarity_weight * sim + hit_rate_weight * hr
    return {
        "tfidf_similarity": round(sim, 4),
        "keyword_hit_rate": round(hr, 4),
        "relevance_score": round(composite, 4),
    }


# ── Markdown 追加 ───────────────────────────────────────────────────

_RELEVANCE_SECTION_START = "<!-- RELEVANCE_ANALYSIS_START -->"
_RELEVANCE_SECTION_END = "<!-- RELEVANCE_ANALYSIS_END -->"


def append_relevance_to_md(
    md_path: str,
    sorted_papers: list[dict],
    analysis: dict,
    raw_keywords: list[str],
    similarity_weight: float,
    hit_rate_weight: float,
    threshold: float,
    *,
    similarity_key: str = "tfidf_similarity",
    similarity_label: str = "TF-IDF Similarity",
    plan_label: str = "Plan A: Keyword Density + TF-IDF",
    top_n: int = 20,
) -> None:
    """
    将 Top 20 相关性分析结果追加到检索报告 Markdown 文件末尾。

    - 如果文件已有 `<!-- RELEVANCE_ANALYSIS_START -->` 标记，则替换该段
    - 否则追加到文件末尾
    """
    # ── 构建新的 Markdown 段 ────────────────────────────────────────
    md_lines: list[str] = []
    md_lines.append(f"\n{_RELEVANCE_SECTION_START}")
    md_lines.append("")
    md_lines.append("## Relevance Analysis (Top 20 by Relevance Score)")
    md_lines.append("")
    md_lines.append(f"**Method**: {plan_label}")
    md_lines.append(f"- Keywords: {', '.join(raw_keywords)}")
    md_lines.append(f"- Weights: {similarity_label}={similarity_weight}, Keyword Hit Rate={hit_rate_weight}")
    md_lines.append(f"- Composite Score = {similarity_weight} x {similarity_label.split()[0]} + {hit_rate_weight} x Hit Rate")
    md_lines.append(f"- Threshold: {threshold}")
    md_lines.append(
        f"- High relevance: {analysis['high_relevance_count']} / {analysis.get('total_papers', len(sorted_papers))} papers"
    )
    md_lines.append(
        f"- Avg relevance score: {analysis['avg_relevance_score']:.4f}"
    )
    md_lines.append("")

    # 摘要表
    md_lines.append("| # | Relevance | " + similarity_label + " | Hit Rate | Title | Authors | Journal | Date | Citations |")
    md_lines.append("|---|-----------|------------|----------|-------|---------|---------|------|-----------|")
    for i, p in enumerate(sorted_papers[:top_n], 1):
        r = p["relevance"]
        title = (p.get("title") or "").replace("|", "\\|")
        authors = (p.get("authors") or "").replace("|", "\\|")
        journal = (p.get("journal") or "").replace("|", "\\|")
        date = p.get("publishDate") or ""
        cites = p.get("citations") or "-"
        md_lines.append(
            f"| {i} | {r['relevance_score']:.4f} | {r[similarity_key]:.4f} "
            f"| {r['keyword_hit_rate']:.2f} | {title} | {authors} | {journal} "
            f"| {date} | {cites} |"
        )

    md_lines.append("")

    # Top 20 详细卡片
    md_lines.append("### Top 20 Most Relevant Papers (Detailed)")
    md_lines.append("")
    for i, p in enumerate(sorted_papers[:top_n], 1):
        r = p["relevance"]
        title = p.get("title") or "No title"
        authors = p.get("authors") or "N/A"
        journal = p.get("journal") or "N/A"
        date = p.get("publishDate") or "N/A"
        cites = p.get("citations") or "-"
        abstract = p.get("abstract") or ""

        md_lines.append(f"#### {i}. {title}")
        md_lines.append("")
        md_lines.append(f"- **Authors**: {authors}")
        md_lines.append(f"- **Journal**: {journal} ({date})")
        md_lines.append(f"- **Citations**: {cites}")
        md_lines.append(f"- **Relevance Score**: {r['relevance_score']:.4f} ({similarity_label.split()[0]}: {r[similarity_key]:.4f}, Hit Rate: {r['keyword_hit_rate']:.2f})")
        if abstract:
            md_lines.append(f"- **Abstract**: {abstract}")
        md_lines.append("")

    md_lines.append(f"{_RELEVANCE_SECTION_END}")

    new_section = "\n".join(md_lines)

    # ── 读取已有文件 → 替换或追加 ──────────────────────────────────
    if not os.path.exists(md_path):
        # 文件不存在，直接写入
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(new_section)
        print(f"[OK] Relevance section written to new file: {md_path}")
        return

    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    if _RELEVANCE_SECTION_START in content:
        # 替换已有段落
        start_idx = content.index(_RELEVANCE_SECTION_START)
        end_idx = content.index(_RELEVANCE_SECTION_END) + len(_RELEVANCE_SECTION_END)
        content = content[:start_idx] + new_section + content[end_idx:]
        print(f"[OK] Relevance section replaced in: {md_path}")
    else:
        # 追加到末尾
        # 去掉文件末尾可能存在的 report generated 行，追加后再加回去
        footer_pattern = "\n---\n*Report generated:"
        footer = ""
        if footer_pattern in content:
            idx = content.rindex(footer_pattern)
            footer = content[idx:]
            content = content[:idx]

        content = content.rstrip("\n") + "\n" + new_section + "\n" + footer + "\n"
        print(f"[OK] Relevance section appended to: {md_path}")

    with open(md_path, "w", encoding="utf-8") as f:
        f.write(content)


# ── 入口 ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Web of Science 文献相关性分析（关键词密度 + TF-IDF 余弦相似度）"
    )
    parser.add_argument("input_json", help="合并后的文献 JSON 文件路径")
    parser.add_argument("topic_keywords", help="逗号分隔的英文关键词短语，如 'liquidity,asset pricing'")
    parser.add_argument("--output", "-o", default=None, help="输出 enriched JSON 路径")
    parser.add_argument("--threshold", "-t", type=float, default=0.15, help="综合相关性阈值 [0,1]（默认 0.15）")
    parser.add_argument("--similarity-only", action="store_true", help="仅使用 TF-IDF 相似度（忽略命中率）")
    parser.add_argument(
        "--md-file", default=None,
        help="检索报告 Markdown 文件路径，将 Top 20 相关性结果追加到该文件末尾"
    )
    args = parser.parse_args()

    # ── 1. 读取输入 ──────────────────────────────────────────────────
    if not os.path.exists(args.input_json):
        print(f"[ERROR] 找不到输入文件: {args.input_json}", file=sys.stderr)
        sys.exit(1)

    with open(args.input_json, "r", encoding="utf-8") as f:
        data: dict = json.load(f)

    papers: list[dict] = data.get("papers", [])
    if not papers:
        print("[WARN] 输入 JSON 中 papers 数组为空，输出空分析结果。")
        data["relevance_analysis"] = {"status": "no_papers", "message": "papers array is empty"}
        output_path = args.output
        if not output_path:
            base, ext = os.path.splitext(args.input_json)
            output_path = f"{base}_enriched{ext}"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return 0

    print(f"[INFO] 读取 {len(papers)} 篇论文")

    # ── 2. 解析关键词 ───────────────────────────────────────────────
    raw_keywords = [k.strip() for k in args.topic_keywords.split(",") if k.strip()]
    if not raw_keywords:
        print("[ERROR] topic_keywords 不能为空", file=sys.stderr)
        sys.exit(1)
    print(f"[INFO] 关键词: {raw_keywords}")

    # ── 3. 构建文本语料 ─────────────────────────────────────────────
    topic_reference = " ".join(raw_keywords)
    docs = [topic_reference]
    for p in papers:
        title = p.get("title", "")
        abstract = p.get("abstract", "")
        combined = f"{title} {abstract}" if abstract else title
        docs.append(combined if combined.strip() else "[empty]")

    print(f"[INFO] 构建语料，共 {len(docs)} 篇文档（含 1 篇 topic reference）")

    # ── 4. 计算 TF-IDF ──────────────────────────────────────────────
    if HAS_SKLEARN:
        vecs = _compute_tfidf_sklearn(docs)
        print("[INFO] 使用 scikit-learn TfidfVectorizer（含 sublinear tf 和字符 n-gram）")
    else:
        vecs = _compute_tfidf_pure(docs)
        print("[INFO] 使用纯 Python TF-IDF 实现（安装 scikit-learn 可提升质量）")

    topic_vec = vecs[0]
    similarity_weight = 1.0 if args.similarity_only else 0.6
    hit_rate_weight = 0.0 if args.similarity_only else 0.4

    # ── 5. 逐篇评分 ──────────────────────────────────────────────────
    enriched_papers: list[dict] = []
    stats_sim: list[float] = []
    stats_hr: list[float] = []
    stats_composite: list[float] = []

    for i, p in enumerate(papers):
        title = p.get("title", "")
        abstract = p.get("abstract", "")
        scores = compute_scores(
            title, abstract, raw_keywords, topic_vec, vecs[i + 1],
            similarity_weight=similarity_weight, hit_rate_weight=hit_rate_weight,
        )
        enriched = dict(p)
        enriched["relevance"] = scores
        enriched_papers.append(enriched)
        stats_sim.append(scores["tfidf_similarity"])
        stats_hr.append(scores["keyword_hit_rate"])
        stats_composite.append(scores["relevance_score"])

    # ── 6. 排序（全局按分数降序，Top 20 即为最相关）────────────────────
    threshold = max(0.0, min(1.0, args.threshold))
    all_sorted = sorted(enriched_papers, key=lambda p: p["relevance"]["relevance_score"], reverse=True)
    high_relevance = [p for p in all_sorted if p["relevance"]["relevance_score"] >= threshold]
    low_relevance = [p for p in all_sorted if p["relevance"]["relevance_score"] < threshold]

    # ── 7. 汇总信息 ─────────────────────────────────────────────────
    n = len(enriched_papers)
    analysis: dict[str, Any] = {
        "method": "keyword_density + TF-IDF cosine similarity",
        "keywords": raw_keywords,
        "similarity_weight": similarity_weight,
        "hit_rate_weight": hit_rate_weight,
        "threshold": threshold,
        "total_papers": n,
    }

    def _avg(lst: list[float]) -> float:
        return round(sum(lst) / len(lst), 4) if lst else 0.0

    analysis["avg_tfidf_similarity"] = _avg(stats_sim)
    analysis["avg_keyword_hit_rate"] = _avg(stats_hr)
    analysis["avg_relevance_score"] = _avg(stats_composite)
    analysis["high_relevance_count"] = len(high_relevance)
    analysis["low_relevance_count"] = len(low_relevance)

    # top-N
    top_matches: list[dict] = []
    for p in all_sorted[:10]:
        top_matches.append({
            "index": p.get("index"),
            "title": p.get("title", "")[:80],
            "authors": (p.get("authors", "") or "")[:30],
            "journal": (p.get("journal", "") or "")[:30],
            "relevance_score": p["relevance"]["relevance_score"],
            "tfidf_similarity": p["relevance"]["tfidf_similarity"],
            "keyword_hit_rate": p["relevance"]["keyword_hit_rate"],
        })
    analysis["top_matches"] = top_matches

    # 分数段分布
    buckets = [f"[{i/10:.1f},{round((i+1)/10,1):.1f})" for i in range(10)]
    bucket_counts = {b: 0 for b in buckets}
    for p in enriched_papers:
        s = p["relevance"]["relevance_score"]
        idx = min(int(s * 10), 9)
        bucket_counts[buckets[idx]] += 1
    analysis["distribution"] = bucket_counts

    # ── 8. 保存 enriched JSON ──────────────────────────────────────
    output_data = dict(data)
    output_data["papers"] = enriched_papers
    output_data["relevance_analysis"] = analysis

    output_path = args.output
    if not output_path:
        base, ext = os.path.splitext(args.input_json)
        output_path = f"{base}_enriched{ext}"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\n[OK] Enriched JSON -> {output_path}")
    print(f"[OK] High relevance (>= {threshold}): {len(high_relevance)} / {n}")
    print(f"[OK] Low relevance  ( <  {threshold}): {len(low_relevance)} / {n}")

    # ── 9. 追加到 Markdown 报告 ──────────────────────────────────────
    if args.md_file:
        append_relevance_to_md(
            md_path=args.md_file,
            sorted_papers=all_sorted,
            analysis=analysis,
            raw_keywords=raw_keywords,
            similarity_weight=similarity_weight,
            hit_rate_weight=hit_rate_weight,
            threshold=threshold,
            similarity_key="tfidf_similarity",
            similarity_label="TF-IDF Similarity",
            plan_label="Plan A: Keyword Density + TF-IDF Cosine Similarity",
        )

    # ── 10. 打印控制台摘要报告 ──────────────────────────────────────
    print("\n" + "=" * 60)
    print("Relevance Analysis Summary")
    print("=" * 60)
    print(f"Method:     {analysis['method']}")
    print(f"Keywords:   {', '.join(raw_keywords)}")
    print(f"Weights:    TF-IDF={similarity_weight}, HitRate={hit_rate_weight}")
    print(f"Threshold:  {threshold}")
    print(f"Library:    {'scikit-learn' if HAS_SKLEARN else 'pure Python'}")
    print()
    print(f"{'Metric':<30s} {'Average':<12s}")
    print("-" * 42)
    print(f"{'TF-IDF cosine similarity':<30s} {analysis['avg_tfidf_similarity']:<12.4f}")
    print(f"{'Keyword hit rate':<30s} {analysis['avg_keyword_hit_rate']:<12.4f}")
    print(f"{'Composite relevance score':<30s} {analysis['avg_relevance_score']:<12.4f}")
    print()
    print(f"High relevance: {analysis['high_relevance_count']} papers (>= {threshold})")
    print(f"Low relevance:  {analysis['low_relevance_count']} papers ( <  {threshold})")
    print()

    print("Score distribution:")
    for b, c in sorted(bucket_counts.items()):
        bar = "|" * min(c, 40)
        b_low = float(b.split(",")[0].replace("[", ""))
        b_high = float(b.split(",")[1].replace(")", ""))
        marker = " <-- threshold" if threshold >= b_low and threshold < b_high else ""
        print(f"  {b}: {c:3d} {bar}{marker}")
    print()

    if all_sorted:
        print("Top 10 most relevant papers:")
        print(f"{'#':>3s} | {'Score':<7s} | {'TF-IDF':<7s} | {'HitR':<6s} | {'Title'}")
        print("-" * 75)
        for i, p in enumerate(all_sorted[:10], 1):
            r = p["relevance"]
            title = (p.get("title", "") or "")[:50]
            print(f"{i:3d} | {r['relevance_score']:<7.4f} | {r['tfidf_similarity']:<7.4f} | {r['keyword_hit_rate']:<6.3f} | {title}")

    # ── 11. 给 AI 的结构化输出 ───────────────────────────────────────
    print()
    print("=== STRUCTURED_RESULT ===")
    print(json.dumps({
        "method": "tfidf",
        "high_relevance_count": len(high_relevance),
        "low_relevance_count": len(low_relevance),
        "total_papers": n,
        "threshold": threshold,
        "top_3": [
            {
                "index": p.get("index"),
                "title": p.get("title", "")[:80],
                "relevance_score": p["relevance"]["relevance_score"],
            }
            for p in all_sorted[:3]
        ],
    }, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    sys.exit(main())
