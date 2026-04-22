/**
 * Web of Science 文献详情页提取脚本（鲁棒增强版 v2）
 *
 * 功能：从文献详情页提取完整信息
 * 特点：多策略提取、降级处理、Web of Science 结构优化
 *
 * @returns {Object} 文献详细信息
 */

(function() {
  try {
    const fullText = document.body.innerText;
    const pageUrl = window.location.href;

    // 检测是否在详情页
    // Web of Science 详情页特征：URL 包含 record，页面包含 A等信息
    const isDetailPage = pageUrl.includes("/record/") ||
                         pageUrl.includes("recordId=") ||
                         (fullText.includes("Abstract") && fullText.includes("Authors"));

    if (!isDetailPage) {
      return { error: "不在文献详情页", pageType: "other", url: pageUrl };
    }

    // 安全查询函数
    const safeQuery = (selector) => {
      try {
        const el = document.querySelector(selector);
        return el ? (el.innerText || el.textContent || "").trim() : "";
      } catch (e) {
        return "";
      }
    };

    const safeQueryAll = (selector) => {
      try {
        const els = document.querySelectorAll(selector);
        return Array.from(els)
          .map(el => (el.innerText || el.textContent || "").trim())
          .filter(t => t.length > 0);
      } catch (e) {
        return [];
      }
    };

    // === 提取标题 ===
    let title = "";
    const titleSelectors = [
      // Web of Science 特定选择器
      "app-summary-title .title-value",
      ".summary-title .title-value",
      "h1[data-ta='title']",
      "h1.summary_title",
      // 通用选择器
      "h1.title",
      ".article-title",
      "[class*='title'] h1",
      "h1:first-child",
      "h2.title"
    ];

    for (const selector of titleSelectors) {
      title = safeQuery(selector);
      if (title && title.length > 10) break;
    }

    // 备选：从页面标题提取
    if (!title || title.length < 10) {
      const docTitle = document.title.split("|")[0].trim();
      if (docTitle.length > 10) {
        title = docTitle;
      }
    }

    // === 提取作者 ===
    let authors = "";
    const authorSelectors = [
      // Web of Science 选择器
      "app-authors-list .author-name",
      ".authors-list .author-name",
      "span.authors",
      "[data-ta='author-value']",
      ".author-info .author-name",
      // 通用选择器
      ".authors",
      ".author-list",
      "[class*='author']"
    ];

    for (const selector of authorSelectors) {
      const authorEls = document.querySelectorAll(selector);
      if (authorEls.length > 0) {
        authors = Array.from(authorEls).map(el => (el.innerText || "").trim()).join("; ");
        if (authors.length > 5) break;
      }
    }

    // 备选：从全文提取
    if (!authors || authors.length < 5) {
      const authorSection = fullText.match(/Authors?[:\s]*(.{10,200}?)(?=\n|$)/i);
      if (authorSection) {
        authors = authorSection[1].trim();
      }
    }

    // === 提取期刊/来源信息 ===
    let journal = "";
    let volume = "";
    let issue = "";
    let pages = "";

    // 从页面查找来源信息
    const sourceSelectors = [
      "app-source-info .source-title",
      ".source-info .source-title",
      ".journal-title",
      "[data-ta='source-title']",
      ".source"
    ];

    for (const selector of sourceSelectors) {
      journal = safeQuery(selector);
      if (journal && journal.length > 3) break;
    }

    // 从全文提取期刊信息
    if (!journal || journal.length < 3) {
      const journalMatch = fullText.match(/(?:Source|Journal)[:\s]*([^\n]+)/i);
      if (journalMatch) {
        journal = journalMatch[1].trim();
      }
    }

    // 提取卷期页码
    const volIssueMatch = fullText.match(/(?:Vol(?:ume)?\.?|卷)[.\s]*(\d+)(?:[,\s]*(?:Issue|期)[.\s]*(\d+))?/i);
    if (volIssueMatch) {
      volume = volIssueMatch[1] || "";
      issue = volIssueMatch[2] || "";
    }

    const pagesMatch = fullText.match(/(?:pp?\.?|页)[.\s]*(\d+(?:\s*[-–]\s*\d+)?)/i);
    if (pagesMatch) {
      pages = pagesMatch[1].replace(/\s/g, "");
    }

    // === 提取年份 ===
    let year = "";
    const yearMatch = fullText.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      year = yearMatch[0];
    }

    // === 提取摘要 ===
    let abstract = "";
    const abstractSelectors = [
      // Web of Science 选择器
      "app-abstract .abstract-content",
      "app-abstract p",
      ".abstract-container p",
      "[data-ta='abstract']",
      ".abstract p"
    ];

    for (const selector of abstractSelectors) {
      const abstractEls = document.querySelectorAll(selector);
      if (abstractEls.length > 0) {
        abstract = Array.from(abstractEls).map(el => (el.innerText || "").trim()).join("\n");
        if (abstract.length > 20) break;
      }
    }

    // 备选：查找包含 "Abstract" 标题的段落
    if (!abstract || abstract.length < 20) {
      const abstractSection = Array.from(document.querySelectorAll("p, div")).find(el => {
        const text = el.innerText || "";
        return text.includes("Abstract") || text.includes("摘要");
      });
      if (abstractSection) {
        abstract = abstractSection.innerText.replace(/^Abstract\s*/i, "").trim();
      }
    }

    // 清理摘要
    if (abstract) {
      abstract = abstract.replace(/\s+/g, " ").trim();
    }

    // === 提取关键词 ===
    let keywords = "";
    const keywordSelectors = [
      "app-keywords .keyword",
      ".keywords-list .keyword",
      "[data-ta='keywords']",
      ".keywords a"
    ];

    for (const selector of keywordSelectors) {
      const keywordEls = document.querySelectorAll(selector);
      if (keywordEls.length > 0) {
        keywords = Array.from(keywordEls).map(el => (el.innerText || "").trim()).join("; ");
        if (keywords.length > 5) break;
      }
    }

    if (!keywords || keywords.length < 5) {
      const keywordSection = fullText.match(/Keywords?[:\s]*([^\n]+)/i);
      if (keywordSection) {
        keywords = keywordSection[1].trim();
      }
    }

    // === 提取被引次数 ===
    let citedBy = "0";
    const citedSelectors = [
      "[data-ta='times-cited']",
      ".times-cited a",
      ".cited-count",
      "a[href*='citedby']"
    ];

    for (const selector of citedSelectors) {
      const citedEl = document.querySelector(selector);
      if (citedEl) {
        const citedText = citedEl.innerText || "";
        const citedMatch = citedText.match(/(\d+)/);
        if (citedMatch) {
          citedBy = citedMatch[1];
          break;
        }
      }
    }

    // 备选：从全文提取
    if (citedBy === "0") {
      const citedMatch = fullText.match(/(\d+)\s*(?:Times\s*cited|Citations?|被引用|次引用)/i);
      if (citedMatch) {
        citedBy = citedMatch[1];
      }
    }

    // === 提取 DOI ===
    let doi = "";
    const doiSelectors = [
      "a[href*='doi.org/']",
      "[data-ta='doi'] a",
      ".doi a"
    ];

    for (const selector of doiSelectors) {
      const doiEl = document.querySelector(selector);
      if (doiEl) {
        doi = doiEl.href || doiEl.innerText || "";
        break;
      }
    }

    // 备选：从全文提取
    if (!doi) {
      const doiMatch = fullText.match(/(?:https?:\/\/)?(?:doi\.org\/|DOI[:\s]*)(10\.\d{4,}\/[^\s\n]+)/i);
      if (doiMatch) {
        doi = doiMatch[1].replace(/[,.;]$/, "");
      }
    }

    // === 提取参考文献数量 ===
    let references = "0";
    const refMatch = fullText.match(/(\d+)\s*References?/i);
    if (refMatch) {
      references = refMatch[1];
    }

    // === 提取 WOS 号 ===
    let wosId = "";
    const wosMatch = fullText.match(/WOS:\s*(\w+)/i);
    if (wosMatch) {
      wosId = wosMatch[1];
    }

    // === 提取 PMID（如有）===
    let pmid = "";
    const pmidMatch = fullText.match(/PMID:\s*(\d+)/i);
    if (pmidMatch) {
      pmid = pmidMatch[1];
    }

    // === 提取研究领域 ===
    let researchAreas = "";
    const areaMatch = fullText.match(/Research\s*Areas?[:\s]*([^\n]+)/i);
    if (areaMatch) {
      researchAreas = areaMatch[1].trim();
    }

    // === 提取基金信息 ===
    let funding = "";
    const fundingSelectors = [
      "app-funding-info",
      ".funding-info",
      "[data-ta='funding']"
    ];

    for (const selector of fundingSelectors) {
      const fundEl = document.querySelector(selector);
      if (fundEl) {
        funding = fundEl.innerText || "";
        break;
      }
    }

    if (!funding) {
      const fundingMatch = fullText.match(/(?:Funding|Acknowledgments?)[:\s]*([^\n]{10,500})/i);
      if (fundingMatch) {
        funding = fundingMatch[1].trim();
      }
    }

    return {
      pageType: "detail",
      url: pageUrl,
      // 基本信息
      title: title.substring(0, 500),
      authors: authors.substring(0, 500),
      year: year,
      journal: journal.substring(0, 200),
      volume: volume,
      issue: issue,
      pages: pages,
      // 摘要和关键词
      abstract: abstract.substring(0, 2000),
      keywords: keywords.substring(0, 500),
      // 标识符
      doi: doi,
      wosId: wosId,
      pmid: pmid,
      // 计量信息
      citedBy: citedBy,
      references: references,
      researchAreas: researchAreas.substring(0, 300),
      funding: funding.substring(0, 1000),
      // 元数据
      extractionTime: new Date().toISOString(),
      extractionMethod: "wos-detail-v2"
    };

  } catch (e) {
    return {
      error: "提取失败：" + e.message,
      stack: e.stack,
      url: window.location.href
    };
  }
})()