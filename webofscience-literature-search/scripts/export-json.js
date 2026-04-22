/**
 * Web of Science JSON 导出脚本
 *
 * 功能：将文献数据导出为结构化 JSON 格式
 * 特点：数据标准化、元数据完整、质量评估
 *
 * @param {Array} results - 文献结果数组
 * @param {String} searchQuery - 检索式
 * @returns {Object} JSON 内容和元数据
 */

(function(results, searchQuery) {
  try {
    if (!results || !Array.isArray(results)) {
      return {
        success: false,
        error: "输入数据无效"
      };
    }

    // 数据有效性过滤
    const validResults = results.filter(r =>
      r && (r.title || "").trim().length > 5
    );

    // 标准化数据结构
    const normalizedResults = validResults.map((r, idx) => ({
      // 核心字段（必填）
      id: r.id || String(idx + 1),
      title: (r.title || "").trim(),
      authors: (r.authors || "").trim(),
      year: (r.year || "").trim(),
      journal: (r.journal || r.source || "").trim(),
      cited: parseInt(r.cited) || 0,

      // 扩展字段（可选）
      doi: (r.doi || "").trim(),
      volume: (r.volume || "").trim(),
      issue: (r.issue || "").trim(),
      pages: (r.pages || "").trim(),
      abstract: (r.abstract || "").trim(),
      keywords: r.keywords ?
        (typeof r.keywords === "string" ?
          r.keywords.split(/[,;]/).map(k => k.trim()).filter(k => k) :
          r.keywords) : [],
      documentType: r.documentType || "Article",
      url: r.url || "",

      // 元数据
      extractionTime: r.extractionTime || new Date().toISOString(),
      dataQuality: {
        hasTitle: !!(r.title || "").trim(),
        hasAuthors: !!(r.authors || "").trim(),
        hasYear: !!(r.year || "").trim(),
        hasJournal: !!(r.journal || r.source || "").trim()
      }
    }));

    // 计算数据质量统计
    const fieldStats = {
      title: normalizedResults.filter(r => r.title).length,
      authors: normalizedResults.filter(r => r.authors).length,
      year: normalizedResults.filter(r => r.year).length,
      journal: normalizedResults.filter(r => r.journal).length,
      doi: normalizedResults.filter(r => r.doi).length,
      abstract: normalizedResults.filter(r => r.abstract).length
    };

    const completenessRate = normalizedResults.length > 0 ?
      ((fieldStats.title + fieldStats.authors + fieldStats.year + fieldStats.journal) /
       (normalizedResults.length * 4) * 100).toFixed(1) : 0;

    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportTime: Date.now(),
        totalRecords: normalizedResults.length,
        validRecords: normalizedResults.filter(r => r.title).length,
        searchQuery: searchQuery || "",
        dataSource: "Web of Science Core Collection",
        exportFormat: "structured-json",
        version: "2.0"
      },
      dataQuality: {
        completenessRate: completenessRate + "%",
        qualityLevel: completenessRate >= 80 ? "HIGH" : completenessRate >= 50 ? "MEDIUM" : "LOW",
        fields: fieldStats
      },
      results: normalizedResults
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    const fileSize = new Blob([jsonContent]).size;

    return {
      success: true,
      content: jsonContent,
      fileSize: fileSize,
      fileSizeFormatted: (fileSize / 1024).toFixed(2) + " KB",
      recordCount: normalizedResults.length
    };

  } catch (e) {
    return {
      success: false,
      error: "JSON 构建失败：" + e.message,
      stack: e.stack
    };
  }
})