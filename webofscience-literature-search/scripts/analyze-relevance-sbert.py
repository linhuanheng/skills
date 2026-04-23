#!/usr/bin/env python3
"""
Web of Science 文献相关性分析工具 -- 方案二：Sentence-BERT 语义匹配

功能：
  读取 merge 后的文献 JSON 文件，根据用户给定的 topic 关键词/描述，
  用 Sentence-BERT (all-MiniLM-L6-v2) 将文本编码为 384 维语义向量，
  计算余弦相似度作为语义相关性分数，同时统计关键词命中率作为辅助信号，
  输出到 enriched JSON、控制台摘要报告、以及追加 Top 20 到检索报告 Markdown。

核心思路：
  - 将 topic 关键词扩展为自然语言描述（"Research about X, Y, Z"）作为 query
  - 将每篇论文的 title + abstract 拼接为 document
  - 用 SBERT 分别编码 query 和 documents，计算余弦相似度
  - 语义匹配能捕捉同义词/近义词关系（如 "volatility" vs "risk"，
    "market microstructure" vs "trading mechanism"），比关键词匹配更鲁棒
  - 综合 0.7 x SBERT 相似度 + 0.3 x 关键词命中率

依赖：
  - Python 3.8+
  - sentence-transformers (pip install sentence-transformers)
  - 首次运行时自动下载 all-MiniLM-L6-v2 模型（~90MB）

用法：
  python analyze-relevance-sbert.py <input.json> <topic_keywords> \
    [--output enriched.json] [--threshold 0.3] [--md-file report.md]

示例：
  python "$SKILL_DIR/scripts/analyze-relevance-sbert.py" \
    SEARCH_RESULTS/liquidity_20260422.json \
    "liquidity,asset pricing,market microstructure" \
    --threshold 0.3 \
    --md-file SEARCH_RESULTS/liquidity_20260422.md
"""

import json, sys, os, re, math, argparse, io, time
from typing import Any

# 修复 Windows 控制台编码：强制 stdout/stderr 使用 UTF-8
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# ── 依赖检测 ────────────────────────────────────────────────────────

try:
    from sentence_transformers import SentenceTransformer
    import torch
    HAS_SBERT = True
except ImportError:
    HAS_SBERT = False


# ── 余弦相似度 ──────────────────────────────────────────────────────

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """计算两个向量的余弦相似度。"""
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na < 1e-12 or nb < 1e-12:
        return 0.0
    return dot / (na * nb)


# ── 关键词命中率 ────────────────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    """分词：保留字母数字和下划线，统一小写，过滤 <2 字符的 token。"""
    return [t.lower() for t in re.findall(r"[a-zA-Z0-9_#+.-]+", text) if len(t) > 1]


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


# ── 构建 query 文本 ─────────────────────────────────────────────────

def build_query_text(keywords: list[str], topic_desc: str | None = None) -> str:
    """将关键词列表和可选的自然语言描述合并为 SBERT 编码用的 query 文本。"""
    if topic_desc and topic_desc.strip():
        return topic_desc.strip()
    if len(keywords) == 1:
        return f"Research about {keywords[0]}"
    elif len(keywords) == 2:
        return f"Research about {keywords[0]} and {keywords[1]}"
    else:
        head = ", ".join(keywords[:-1])
        return f"Research about {head}, and {keywords[-1]}"


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
    similarity_key: str = "sbert_similarity",
    similarity_label: str = "SBERT Similarity",
    plan_label: str = "Plan B: Sentence-BERT Semantic Matching",
    extra_info: str = "",
    top_n: int = 20,
) -> None:
    """
    将 Top 20 相关性分析结果追加到检索报告 Markdown 文件末尾。

    - 如果文件已有 RELEVANCE_ANALYSIS_START 标记，则替换该段
    - 否则追加到文件末尾
    """
    md_lines: list[str] = []
    md_lines.append(f"\n{_RELEVANCE_SECTION_START}")
    md_lines.append("")
    md_lines.append("## Relevance Analysis (Top 20 by Relevance Score)")
    md_lines.append("")
    md_lines.append(f"**Method**: {plan_label}")
    md_lines.append(f"- Keywords: {', '.join(raw_keywords)}")
    if extra_info:
        md_lines.append(f"- {extra_info}")
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

    # ── 读取已有文件 -> 替换或追加 ──────────────────────────────────
    if not os.path.exists(md_path):
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(new_section)
        print(f"[OK] Relevance section written to new file: {md_path}")
        return

    with open(md_path, "r", encoding="utf-8") as f:
        content = f.read()

    if _RELEVANCE_SECTION_START in content:
        start_idx = content.index(_RELEVANCE_SECTION_START)
        end_idx = content.index(_RELEVANCE_SECTION_END) + len(_RELEVANCE_SECTION_END)
        content = content[:start_idx] + new_section + content[end_idx:]
        print(f"[OK] Relevance section replaced in: {md_path}")
    else:
        # 追加到末尾（保留 report generated 页脚）
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
        description="Web of Science 文献相关性分析（Sentence-BERT 语义匹配）"
    )
    parser.add_argument("input_json", help="合并后的文献 JSON 文件路径")
    parser.add_argument("topic_keywords", help="逗号分隔的英文关键词短语，如 'liquidity,asset pricing'")
    parser.add_argument("--output", "-o", default=None, help="输出 enriched JSON 路径")
    parser.add_argument("--threshold", "-t", type=float, default=0.3, help="综合相关性阈值 [0,1]（默认 0.3）")
    parser.add_argument("--model", "-m", default="all-MiniLM-L6-v2", help="SBERT 模型名（默认 all-MiniLM-L6-v2）")
    parser.add_argument("--similarity-only", action="store_true", help="仅使用 SBERT 相似度（忽略命中率）")
    parser.add_argument("--topic-desc", "-d", default=None, help="对主题的自然语言描述（可选，比关键词更能表达语义）")
    parser.add_argument(
        "--md-file", default=None,
        help="检索报告 Markdown 文件路径，将 Top 20 相关性结果追加到该文件末尾"
    )
    args = parser.parse_args()

    # ── 0. 依赖检查 ──────────────────────────────────────────────────
    if not HAS_SBERT:
        print("[ERROR] sentence-transformers 未安装，请运行: pip install sentence-transformers", file=sys.stderr)
        sys.exit(1)

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
            output_path = f"{base}_sbert_enriched{ext}"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return 0

    print(f"[INFO] 读取 {len(papers)} 篇论文")

    # ── 2. 解析关键词 & 构建 query ───────────────────────────────────
    raw_keywords = [k.strip() for k in args.topic_keywords.split(",") if k.strip()]
    if not raw_keywords:
        print("[ERROR] topic_keywords 不能为空", file=sys.stderr)
        sys.exit(1)
    print(f"[INFO] 关键词: {raw_keywords}")

    query_text = build_query_text(raw_keywords, args.topic_desc)
    print(f"[INFO] Query 文本: {query_text}")

    # ── 3. 构建文档文本列表 ──────────────────────────────────────────
    doc_texts: list[str] = [query_text]
    for p in papers:
        title = p.get("title", "")
        abstract = p.get("abstract", "")
        combined = f"{title}. {abstract}" if abstract else title
        doc_texts.append(combined if combined.strip() else "[empty]")

    print(f"[INFO] 构建语料，共 {len(doc_texts)} 篇文档（含 1 篇 query）")

    # ── 4. 加载模型 & 编码 ───────────────────────────────────────────
    model_name = args.model
    print(f"[INFO] 加载 SBERT 模型: {model_name} ...")
    t0 = time.time()
    model = SentenceTransformer(model_name)
    print(f"[INFO] 模型加载耗时: {time.time() - t0:.1f}s")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[INFO] 推理设备: {device}")

    print(f"[INFO] 编码 {len(doc_texts)} 篇文档 ...")
    t0 = time.time()
    embeddings = model.encode(doc_texts, show_progress_bar=False, convert_to_numpy=True)
    print(f"[INFO] 编码耗时: {time.time() - t0:.1f}s")
    print(f"[INFO] Embedding 维度: {embeddings.shape[1]}")

    query_emb = embeddings[0].tolist()

    # ── 5. 逐篇评分 ──────────────────────────────────────────────────
    similarity_weight = 1.0 if args.similarity_only else 0.7
    hit_rate_weight = 0.0 if args.similarity_only else 0.3

    enriched_papers: list[dict] = []
    stats_sim: list[float] = []
    stats_hr: list[float] = []
    stats_composite: list[float] = []

    for i, p in enumerate(papers):
        title = p.get("title", "")
        abstract = p.get("abstract", "")
        combined_text = f"{title} {abstract}" if abstract else title

        paper_emb = embeddings[i + 1].tolist()
        sbert_sim = cosine_similarity(query_emb, paper_emb)
        hr = keyword_hit_rate(combined_text, raw_keywords)
        composite = similarity_weight * sbert_sim + hit_rate_weight * hr

        scores = {
            "sbert_similarity": round(sbert_sim, 4),
            "keyword_hit_rate": round(hr, 4),
            "relevance_score": round(composite, 4),
        }

        enriched = dict(p)
        enriched["relevance"] = scores
        enriched_papers.append(enriched)

        stats_sim.append(sbert_sim)
        stats_hr.append(hr)
        stats_composite.append(composite)

    # ── 6. 排序（全局按分数降序）──────────────────────────────────────
    threshold = max(0.0, min(1.0, args.threshold))
    all_sorted = sorted(enriched_papers, key=lambda p: p["relevance"]["relevance_score"], reverse=True)
    high_relevance = [p for p in all_sorted if p["relevance"]["relevance_score"] >= threshold]
    low_relevance = [p for p in all_sorted if p["relevance"]["relevance_score"] < threshold]

    # ── 7. 汇总信息 ─────────────────────────────────────────────────
    n = len(enriched_papers)
    analysis: dict[str, Any] = {
        "method": f"Sentence-BERT semantic similarity (model={model_name})",
        "model": model_name,
        "embedding_dim": int(embeddings.shape[1]),
        "device": device,
        "keywords": raw_keywords,
        "query_text": query_text,
        "similarity_weight": similarity_weight,
        "hit_rate_weight": hit_rate_weight,
        "threshold": threshold,
        "total_papers": n,
    }

    def _avg(lst: list[float]) -> float:
        return round(sum(lst) / len(lst), 4) if lst else 0.0

    analysis["avg_sbert_similarity"] = _avg(stats_sim)
    analysis["avg_keyword_hit_rate"] = _avg(stats_hr)
    analysis["avg_relevance_score"] = _avg(stats_composite)
    analysis["high_relevance_count"] = len(high_relevance)
    analysis["low_relevance_count"] = len(low_relevance)

    top_matches: list[dict] = []
    for p in all_sorted[:10]:
        top_matches.append({
            "index": p.get("index"),
            "title": p.get("title", "")[:80],
            "authors": (p.get("authors", "") or "")[:30],
            "journal": (p.get("journal", "") or "")[:30],
            "relevance_score": p["relevance"]["relevance_score"],
            "sbert_similarity": p["relevance"]["sbert_similarity"],
            "keyword_hit_rate": p["relevance"]["keyword_hit_rate"],
        })
    analysis["top_matches"] = top_matches

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
        output_path = f"{base}_sbert_enriched{ext}"

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
            similarity_key="sbert_similarity",
            similarity_label="SBERT Similarity",
            plan_label=f"Plan B: Sentence-BERT Semantic Matching (model={model_name})",
            extra_info=f"Query: {query_text}",
        )

    # ── 10. 打印控制台摘要报告 ──────────────────────────────────────
    print("\n" + "=" * 60)
    print("Relevance Analysis Summary (Sentence-BERT)")
    print("=" * 60)
    print(f"Method:  {analysis['method']}")
    print(f"Keywords: {', '.join(raw_keywords)}")
    print(f"Query:   {query_text}")
    print(f"Weights: SBERT={similarity_weight}, HitRate={hit_rate_weight}")
    print(f"Threshold: {threshold}")
    print(f"Device:  {device}")
    print()
    print(f"{'Metric':<30s} {'Average':<12s}")
    print("-" * 42)
    print(f"{'SBERT cosine similarity':<30s} {analysis['avg_sbert_similarity']:<12.4f}")
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
        print(f"{'#':>3s} | {'Score':<7s} | {'SBERT':<7s} | {'HitR':<6s} | {'Title'}")
        print("-" * 75)
        for i, p in enumerate(all_sorted[:10], 1):
            r = p["relevance"]
            title = (p.get("title", "") or "")[:50]
            print(f"{i:3d} | {r['relevance_score']:<7.4f} | {r['sbert_similarity']:<7.4f} | {r['keyword_hit_rate']:<6.3f} | {title}")

    # ── 11. 给 AI 的结构化输出 ───────────────────────────────────────
    print()
    print("=== STRUCTURED_RESULT ===")
    print(json.dumps({
        "method": "sbert",
        "model": model_name,
        "high_relevance_count": len(high_relevance),
        "low_relevance_count": len(low_relevance),
        "total_papers": n,
        "threshold": threshold,
        "top_3": [
            {
                "index": p.get("index"),
                "title": p.get("title", "")[:80],
                "relevance_score": p["relevance"]["relevance_score"],
                "sbert_similarity": p["relevance"]["sbert_similarity"],
            }
            for p in all_sorted[:3]
        ],
    }, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    sys.exit(main())
