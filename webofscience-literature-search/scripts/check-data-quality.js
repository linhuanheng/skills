/**
 * Web of Science 数据质量检查脚本
 *
 * 功能：检查提取数据的质量和完整性
 * 输入：results 数组（从 extract-papers.js 获取）
 *
 * @param {Array} results - 文献结果数组
 * @returns {Object} 数据质量报告
 */

(function(results) {
  try {
    if (!results || !Array.isArray(results)) {
      return {
        error: "Invalid input data",
        total: 0
      };
    }

    const total = results.length;
    const withTitle = results.filter(r => r.title && r.title.trim().length > 5).length;
    const withAuthors = results.filter(r => r.authors && r.authors.trim().length > 3).length;
    const withYear = results.filter(r => r.year && r.year.trim().length === 4).length;
    const withJournal = results.filter(r => r.journal && r.journal.trim().length > 3).length;
    const withDOI = results.filter(r => r.doi && r.doi.trim().length > 5).length;

    // 计算完整性比例
    const completenessRate = total > 0 ? ((withTitle + withAuthors + withYear + withJournal) / (total * 4) * 100).toFixed(1) : 0;

    // 评估质量等级
    let qualityLevel = "LOW";
    if (completenessRate >= 80) qualityLevel = "HIGH";
    else if (completenessRate >= 50) qualityLevel = "MEDIUM";

    // 按年份统计
    const yearStats = results.reduce((acc, r) => {
      const year = (r.year || "未知").trim().substring(0, 4);
      const validYear = /^\d{4}$/.test(year) ? year : "未知";
      acc[validYear] = (acc[validYear] || 0) + 1;
      return acc;
    }, {});

    // 按期刊统计
    const journalStats = results.reduce((acc, r) => {
      const journal = (r.journal || "未知").trim();
      if (journal) {
        acc[journal] = (acc[journal] || 0) + 1;
      }
      return acc;
    }, {});

    // 高被引论文
    const highlyCited = results
      .filter(r => r.cited && parseInt(r.cited) > 0)
      .sort((a, b) => (parseInt(b.cited) || 0) - (parseInt(a.cited) || 0))
      .slice(0, 5)
      .map(r => ({
        title: r.title?.substring(0, 80) || "",
        cited: parseInt(r.cited) || 0
      }));

    return {
      total: total,
      withTitle: withTitle,
      withAuthors: withAuthors,
      withYear: withYear,
      withJournal: withJournal,
      withDOI: withDOI,
      completenessRate: completenessRate + "%",
      qualityLevel: qualityLevel,
      yearDistribution: yearStats,
      topJournals: Object.entries(journalStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([journal, count]) => ({ journal, count })),
      topCitedPapers: highlyCited,
      assessment: completenessRate >= 80 ? "数据质量良好，可继续导出" :
                  completenessRate >= 50 ? "数据质量中等，建议检查页面状态" :
                  "数据质量较低，建议重新提取或检查页面结构"
    };

  } catch (e) {
    return {
      error: "质量检查失败：" + e.message,
      stack: e.stack
    };
  }
})