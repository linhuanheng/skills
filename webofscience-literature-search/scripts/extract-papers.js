/**
 * Web of Science 文献提取脚本（鲁棒增强版 v2）
 *
 * 功能：从检索结果页面提取文献信息
 * 特点：多层选择器降级、双提取策略、完整错误处理
 *
 * @returns {Object} 提取结果，包含 papers 数组和元数据
 */

(function() {
  try {
    // === 第一步：定位结果列表容器（多选择器降级） ===
    let recordsList = document.querySelector("app-records-list");
    if (!recordsList) {
      recordsList = document.querySelector(".search-results, .results-list, [role='list']");
    }
    if (!recordsList) {
      recordsList = document.querySelector("main, .main-content");
    }

    const pageUrl = window.location.href;
    const pageTitle = document.title;

    if (!recordsList) {
      return {
        error: "No result container found",
        pageType: "unknown",
        url: pageUrl,
        title: pageTitle,
        bodyTextPreview: document.body.innerText.substring(0, 300)
      };
    }

    const fullText = recordsList.innerText;

    // === 第二步：检测页面类型 ===
    const isSummaryPage = fullText.includes("results") || fullText.includes("of");
    const isAdvancedSearch = pageUrl.includes("advanced-search") || pageTitle.includes("Advanced search");
    const isResultsPage = pageUrl.includes("result") || pageTitle.includes("Results");
    const pageType = isAdvancedSearch ? "advanced_search" : (isResultsPage ? "results" : (isSummaryPage ? "summary" : "unknown"));

    // === 第三步：根据页面类型选择提取策略 ===

    // 如果仍在高级检索页面，尝试查找检索结果
    if (isAdvancedSearch && !fullText.includes("No results")) {
      // 可能检索已执行但页面未跳转，尝试查找结果区域
      const resultSection = document.querySelector(".result-section, .search-result-section, [data-section='results']");
      if (resultSection) {
        recordsList = resultSection;
      }
    }

    // 策略 A：使用 recordsList.innerText 按行解析（更可靠）
    const papersFromText = [];
    const lines = fullText.split('\n').filter(line => line.trim().length > 0);

    // 查找以数字开头的条目（文献序号）
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 检查是否是数字序号行
      const numMatch = line.match(/^(\d{1,4})\.?\s*$/);
      if (numMatch && i + 1 < lines.length) {
        // 下一行可能是标题
        const nextLine = lines[i + 1].trim();
        if (nextLine.length > 15) {
          // 继续查找作者、年份、期刊
          let authors = "", year = "", journal = "";
          if (i + 2 < lines.length) authors = lines[i + 2].trim();
          if (i + 3 < lines.length) {
            const yearLine = lines[i + 3].trim();
            const yearMatch = yearLine.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
              year = yearMatch[0];
              // 可能是年份+期刊格式
              if (yearLine.length > year.length + 2) {
                journal = yearLine.substring(year.length + 1).trim();
              }
            } else {
              journal = yearLine;
            }
          }
          if (i + 4 < lines.length && !journal) {
            const journalLine = lines[i + 4].trim();
            if (!journalLine.match(/^\d/)) {
              journal = journalLine;
            }
          }

          // 过滤无关条目
          if (nextLine.toLowerCase().includes("citation") ||
              nextLine.toLowerCase().includes("reference") ||
              nextLine.toLowerCase().includes("related articles") ||
              nextLine.toLowerCase().includes("export")) {
            continue;
          }

          papersFromText.push({
            index: numMatch[1],
            title: nextLine,
            authors: authors.replace(/[;,]\s*$/, ''),
            year: year,
            journal: journal.replace(/[;,]\s*$/, ''),
            extractionMethod: "text-line-parsing"
          });

          // 限制提取数量
          if (papersFromText.length >= 50) break;
        }
      }
    }

    // 策略 B：尝试 DOM 元素提取（适用于新版 Angular UI）
    const papersFromDOM = [];
    const selectors = [
      "app-record-item",
      "app-records-list app-record-item",
      ".record-item",
      ".search-result-item",
      "[data-record-id]",
      ".wos-record",
      "li[role='listitem']"
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        Array.from(elements).slice(0, 50).forEach((record, idx) => {
          try {
            // 尝试多种选择器查找标题
            const titleEl = record.querySelector(
              ".title a, .title-value a, [data-ta='title-link'], a[class*='title'], .summary-title a"
            );
            const authorsEl = record.querySelector(
              ".authors, .author-value, [data-ta='author-value'], [class*='author'], .summary-authors"
            );
            const sourceEl = record.querySelector(
              ".source, .source-value, .journal-title, [class*='journal'], [class*='source'], .summary-source"
            );
            const yearEl = record.querySelector(
              ".year, .published-year, [data-ta='published-year'], .summary-year"
            );
            const citedEl = record.querySelector(
              ".cited-count, .times-cited, .citation-count, [class*='cited'], .summary-cited"
            );

            // 安全提取文本
            const safeText = (el) => {
              if (!el) return "";
              return (el.innerText || el.textContent || "").trim();
            };

            // 处理被引次数
            let citedCount = "0";
            if (citedEl) {
              const citedText = safeText(citedEl).replace(/[^0-9]/g, "");
              citedCount = citedText || "0";
            }

            // 处理年份
            let yearValue = safeText(yearEl);
            if (yearValue) {
              const yearMatch = yearValue.match(/\b(19|20)\d{2}\b/);
              if (yearMatch) yearValue = yearMatch[0];
            }

            const title = safeText(titleEl);
            if (title && title.length > 10) {
              papersFromDOM.push({
                index: String(papersFromDOM.length + 1),
                title: title,
                authors: safeText(authorsEl),
                source: safeText(sourceEl),
                year: yearValue,
                cited: citedCount,
                extractionMethod: "dom-selector-" + selector
              });
            }
          } catch (e) {
            // 单个元素解析失败不影响其他元素
          }
        });
        if (papersFromDOM.length > 0) break;
      }
    }

    // === 第四步：合并结果（优先使用文本解析结果） ===
    const finalPapers = papersFromText.length > 0 ? papersFromText : papersFromDOM;
    const fallback = papersFromText.length > 0 ? "text-parsing-primary" : (papersFromDOM.length > 0 ? "dom-selector-fallback" : "no-results");

    return {
      pageType: pageType,
      url: pageUrl,
      title: pageTitle,
      totalPapers: finalPapers.length,
      papers: finalPapers.slice(0, 50),
      fallback: fallback,
      textLinesCount: lines.length,
      hasRecordsContainer: !!recordsList,
      debugInfo: {
        textParsingCount: papersFromText.length,
        domParsingCount: papersFromDOM.length
      }
    };

  } catch (e) {
    return {
      error: "Extraction script execution failed",
      errorMessage: e.message,
      stack: e.stack,
      url: window.location.href,
      title: document.title
    };
  }
})()