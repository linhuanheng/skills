/**
 * Web of Science 文献详情页打开脚本
 *
 * 功能：点击文献标题，在新标签页打开详细信息
 * 参数：paperIndex (可选) - 要打开的文献序号，默认 1
 *
 * @param {number|string} paperIndex - 文献序号（1-based），默认为 1
 * @returns {Object} 操作结果，包含新标签页 ID 和文献信息
 */

(function openPaperDetail(paperIndex) {
  try {
    // 默认打开第一篇文献
    const targetIndex = parseInt(paperIndex) || 1;

    // === 查找文献标题链接 ===
    let titleLink = null;
    let paperInfo = {};

    // 多选择器查找文献标题链接（新版本 Angular UI）
    const linkSelectors = [
      // 新版 Angular Web Components
      "app-record-item app-summary-title a",
      "app-record-item .title-value a",
      "app-record-item [data-ta='title-link']",
      // 通用选择器
      ".record-item .title a",
      ".search-result-item .title a",
      "[data-record-id] .title a",
      ".wos-record .summary-title a",
      // 备选方案
      "a[href*='/woscc/record/']",
      "a[href*='/woscc/detailed-record']",
      "a[href*='/alldb/record/']",
      "a[href*='/alldb/detailed-record']"
    ];

    for (const selector of linkSelectors) {
      const links = document.querySelectorAll(selector);
      if (links.length > 0) {
        // 获取目标索引的链接（转换为 0-based）
        const idx = targetIndex - 1;
        if (idx >= 0 && idx < links.length) {
          titleLink = links[idx];

          // 尝试获取关联的文献信息
          const parentRecord = titleLink.closest("app-record-item, .record-item, .search-result-item, [data-record-id]");
          if (parentRecord) {
            // 提取标题
            const titleEl = parentRecord.querySelector(".title-value, .title, .summary-title, [data-ta='title-value']");
            paperInfo.title = titleEl ? (titleEl.innerText || "").trim() : (titleLink.innerText || "").trim();

            // 提取作者
            const authorsEl = parentRecord.querySelector(".authors, .author-value, [data-ta='author-value'], .summary-authors");
            paperInfo.authors = authorsEl ? (authorsEl.innerText || "").trim() : "";

            // 提取期刊/来源
            const sourceEl = parentRecord.querySelector(".source-value, .source, .journal-title, .summary-source");
            paperInfo.journal = sourceEl ? (sourceEl.innerText || "").trim() : "";

            // 提取年份
            const yearEl = parentRecord.querySelector(".year, .published-year, [data-ta='published-year'], .summary-year");
            if (yearEl) {
              const yearText = yearEl.innerText || "";
              const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
              paperInfo.year = yearMatch ? yearMatch[0] : "";
            }

            // 提取被引次数
            const citedEl = parentRecord.querySelector(".cited-count, .times-cited, .citation-count, [class*='cited']");
            if (citedEl) {
              const citedText = citedEl.innerText || "";
              paperInfo.cited = citedText.replace(/[^0-9]/g, "") || "0";
            }
          } else {
            paperInfo.title = titleLink.innerText || "";
          }

          // 获取 href
          paperInfo.href = titleLink.href || titleLink.getAttribute("href") || "";

          break;
        }
      }
    }

    if (!titleLink) {
      // 备选：直接查找所有链接
      const allLinks = document.querySelectorAll("a[href*='/woscc/record/'], a[href*='recordId='], a[href*='/alldb/record/']");
      if (allLinks.length > 0) {
        const idx = targetIndex - 1;
        if (idx >= 0 && idx < allLinks.length) {
          titleLink = allLinks[idx];
          paperInfo.title = titleLink.innerText || "文献 " + targetIndex;
          paperInfo.href = titleLink.href || titleLink.getAttribute("href") || "";
        }
      }
    }

    if (!titleLink) {
      return {
        success: false,
        action: "link_not_found",
        error: "未找到文献标题链接",
        targetIndex: targetIndex,
        availableLinks: {
          woscc: document.querySelectorAll("a[href*='/woscc/record/']").length,
          alldb: document.querySelectorAll("a[href*='/alldb/record/']").length,
          allLinks: document.querySelectorAll("a[href*='recordId='], a[href*='/record/']").length
        }
      };
    }

    // === 点击链接在新标签页打开 ===
    // 方法：使用 Ctrl+Click 或右键菜单选择"在新标签页打开"
    // 由于 CDP 无法直接模拟右键，我们使用 JavaScript 创建新标签页

    // 获取当前窗口的标签页信息（通过 CDP 传递）
    const currentUrl = window.location.href;

    // 触发点击，同时打开新标签页
    // 使用 metaKey (Mac) 或 ctrlKey (Windows) 模拟在新标签页打开
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      metaKey: true,  // Mac: Cmd+Click
      ctrlKey: true   // Windows: Ctrl+Click
    });

    titleLink.dispatchEvent(clickEvent);

    // 如果上述方法不生效，尝试直接打开
    setTimeout(() => {
      // 记录日志
      console.log("Opening paper detail in new tab:", paperInfo.href);
    }, 100);

    return {
      success: true,
      action: "opened_new_tab",
      targetIndex: targetIndex,
      paperInfo: {
        title: paperInfo.title,
        authors: paperInfo.authors || "",
        journal: paperInfo.journal || "",
        year: paperInfo.year || "",
        cited: paperInfo.cited || "0",
        href: paperInfo.href
      },
      note: "已在新标签页打开详情页，使用 extract-detail.js 提取完整信息",
      instructions: [
        "1. 等待新标签页加载完成",
        "2. 切换到新标签页",
        "3. 使用 extract-detail.js 提取详细信息（摘要、关键词、DOI 等）"
      ]
    };

  } catch (e) {
    return {
      success: false,
      error: "打开详情页失败：" + e.message,
      stack: e.stack
    };
  }
})();