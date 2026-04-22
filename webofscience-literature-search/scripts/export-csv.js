/**
 * Web of Science CSV 导出脚本
 *
 * 功能：将文献数据导出为 CSV 格式
 * 特点：安全的 CSV 转义、BOM 头、完整/简化模式
 *
 * @param {Array} results - 文献结果数组
 * @param {Object} options - 导出选项
 * @returns {Object} CSV 内容和元数据
 */

(function(results, options) {
  try {
    if (!results || !Array.isArray(results)) {
      return {
        success: false,
        error: "输入数据无效"
      };
    }

    const {
      includeFull = true,  // 是否包含所有字段
      escapeQuotes = true, // 是否转义引号
      addBOM = true        // 是否添加 BOM（Excel UTF-8 兼容）
    } = options || {};

    // 安全的字段提取函数
    const getField = (r, field, defaultVal = "") => {
      const val = r ? r[field] : null;
      if (val === null || val === undefined) return defaultVal;
      return String(val);
    };

    // CSV 转义函数（处理特殊字符）
    const escapeCSV = (text) => {
      if (!text) return '""';
      const str = String(text);
      // 如果包含逗号、引号或换行，需要用引号包裹
      const needQuote = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');
      if (!needQuote) return str;
      // 转义引号（双写）
      const escaped = escapeQuotes ? str.replace(/"/g, '""') : str;
      return '"' + escaped + '"';
    };

    // 定义表头
    const headers = includeFull ? [
      "序号", "标题", "作者", "年份", "期刊", "被引次数", "DOI",
      "卷号", "期号", "页码", "摘要", "关键词", "文献类型"
    ] : [
      "序号", "标题", "作者", "年份", "期刊", "被引次数"
    ];

    // 构建数据行
    const rows = results.map((r, idx) => {
      const row = includeFull ? [
        String(idx + 1),
        escapeCSV(getField(r, "title")),
        escapeCSV(getField(r, "authors")),
        getField(r, "year"),
        escapeCSV(getField(r, "journal")),
        getField(r, "cited", "0"),
        escapeCSV(getField(r, "doi")),
        getField(r, "volume"),
        getField(r, "issue"),
        getField(r, "pages"),
        escapeCSV(getField(r, "abstract")),
        escapeCSV(getField(r, "keywords")),
        getField(r, "documentType", "Article")
      ] : [
        String(idx + 1),
        escapeCSV(getField(r, "title")),
        escapeCSV(getField(r, "authors")),
        getField(r, "year"),
        escapeCSV(getField(r, "journal")),
        getField(r, "cited", "0")
      ];
      return row.join(",");
    });

    // 组合 CSV 内容
    const csvContent = (addBOM ? "\uFEFF" : "") + [headers.join(","), ...rows].join("\n");

    // 计算文件大小（字节）
    const fileSize = new Blob([csvContent]).size;

    return {
      success: true,
      content: csvContent,
      rowCount: results.length,
      fileSize: fileSize,
      fileSizeFormatted: (fileSize / 1024).toFixed(2) + " KB",
      headers: headers,
      includeFull: includeFull
    };

  } catch (e) {
    return {
      success: false,
      error: "CSV 构建失败：" + e.message,
      stack: e.stack
    };
  }
})