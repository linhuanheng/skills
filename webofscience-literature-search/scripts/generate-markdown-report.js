/**
 * Web of Science Markdown 报告生成脚本（独立版）
 *
 * 功能：从已提取的 JSON 数据生成 Markdown 报告
 * 输入：通过全局变量传递 papers 数组和 searchInfo 对象
 *
 * 全局变量：
 * - papers: 文献数组
 * - searchInfo: 检索信息 {query, topic, journalScope, yearRange, timestamp}
 *
 * @returns {Object} 包含 content 字段的 Markdown 报告
 */

(function generateReport() {
  try {
    const papers = typeof papers !== 'undefined' ? papers : [];
    const searchInfo = typeof searchInfo !== 'undefined' ? searchInfo : {};

    if (!Array.isArray(papers) || papers.length === 0) {
      return {
        success: false,
        error: "No papers data provided",
        content: "# 检索结果为空\n\n未能提取到文献数据。"
      };
    }

    const validResults = papers.filter(r => r && (r.title || "").trim().length > 5);

    // 按被引次数排序
    const sortedByCited = [...validResults].sort((a, b) =>
      (parseInt(b.cited) || 0) - (parseInt(a.cited) || 0)
    );

    // 按年份统计
    const yearStats = validResults.reduce((acc, r) => {
      const year = (r.year || "未知").trim().substring(0, 4);
      const validYear = /^\d{4}$/.test(year) ? year : "未知";
      acc[validYear] = (acc[validYear] || 0) + 1;
      return acc;
    }, {});

    // 期刊统计
    const journalStats = validResults.reduce((acc, r) => {
      const journal = (r.journal || r.source || "未知").trim();
      if (journal) {
        acc[journal] = (acc[journal] || 0) + 1;
      }
      return acc;
    }, {});

    const topJournals = Object.entries(journalStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // 构建报告
    const report = `# Web of Science 文献检索报告

## 检索概况

- **检索时间**: ${searchInfo?.timestamp ? new Date(searchInfo.timestamp).toLocaleString('zh-CN') : new Date().toLocaleString('zh-CN')}
- **检索主题**: ${searchInfo?.topic || "未指定"}
- **检索式**: ${searchInfo?.query || "未指定"}
- **期刊范围**: ${searchInfo?.journalScope || "全部期刊"}
- **时间范围**: ${searchInfo?.yearRange || "全部年份"}
- **检索结果**: ${validResults.length} 篇文献
- **数据来源**: Web of Science Core Collection

## 文献列表

| 序号 | 标题 | 作者 | 年份 | 期刊 | 被引 |
|------|------|------|------|------|------|
${sortedByCited.slice(0, 50).map((r, i) =>
  `| ${i + 1} | ${((r.title || "").substring(0, 50)).replace(/\|/g, '\\|')} | ${((r.authors || "").substring(0, 25)).replace(/\|/g, '\\|')} | ${r.year || ""} | ${((r.journal || r.source || "").substring(0, 18)).replace(/\|/g, '\\|')} | ${r.cited || 0} |`
).join('\n')}

## 年度分布

${Object.entries(yearStats).length > 0 ?
  Object.entries(yearStats)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, count]) => `- ${year}: ${count} 篇`)
    .join('\n') : '无年份数据'}

## 核心期刊 Top 10

${topJournals.length > 0 ?
  topJournals.map(([journal, count], i) => `${i + 1}. **${journal}**: ${count} 篇`).join('\n') : '无期刊数据'}

## 高被引论文 Top 5

${sortedByCited.slice(0, 5).map((r, i) =>
  `${i + 1}. **${r.title}** (${r.year}) - ${r.cited || 0} 次引用`
).join('\n')}

---
*报告生成时间：${new Date().toISOString()}*
`;

    return {
      success: true,
      content: report,
      recordCount: validResults.length,
      sections: ["检索概况", "文献列表", "年度分布", "核心期刊", "高被引论文"]
    };
  } catch (e) {
    return {
      success: false,
      error: "Markdown 报告生成失败：" + e.message,
      stack: e.stack,
      content: "# 报告生成失败\n\n错误信息：" + e.message
    };
  }
})()