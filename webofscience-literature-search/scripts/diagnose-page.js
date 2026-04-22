/**
 * Web of Science 页面诊断脚本
 *
 * 功能：快速诊断页面结构和状态
 * 用途：当其他脚本失效时，用于排查问题
 *
 * @returns {Object} 页面诊断信息
 */

(function() {
  try {
    // 基本信息
    const pageInfo = {
      url: window.location.href,
      title: document.title,
      readyState: document.readyState
    };

    // 检查关键元素
    const criticalSelectors = [
      "app-records-list",
      ".search-results",
      ".results",
      "main",
      ".main-content",
      ".app-page-controls"
    ];

    const criticalElements = {};
    criticalSelectors.forEach(selector => {
      const el = document.querySelector(selector);
      criticalElements[selector] = el ? "found" : "not found";
    });

    // 获取自定义元素标签（Angular/Web Components）
    const customElements = Array.from(document.querySelectorAll("*"))
      .filter(el => el.tagName.includes("-"))
      .map(el => el.tagName)
      .filter((v, i, a) => a.indexOf(v) === i);

    // 获取所有按钮文本
    const buttons = Array.from(document.querySelectorAll("button"))
      .map(b => ({
        text: b.innerText.trim().substring(0, 30),
        aria: b.getAttribute("aria-label") || ""
      }))
      .filter(b => b.text || b.aria);

    // 获取所有输入框
    const inputs = Array.from(document.querySelectorAll("input, textarea"))
      .map((el, idx) => ({
        tag: el.tagName,
        type: el.type,
        placeholder: el.placeholder?.substring(0, 30),
        id: el.id || "",
        className: el.className?.substring(0, 30)
      }))
      .slice(0, 15);

    // 页面文本预览
    const bodyText = document.body.innerText;
    const textPreview = bodyText.split("\n")
      .filter(l => l.trim().length > 0)
      .slice(0, 15)
      .join(" | ");

    // 页面文本统计（用于调试）
    const pageTextLower = bodyText.toLowerCase();
    const textStats = {
      hasSearchTerm: pageTextLower.includes('search') || pageTextLower.includes('检索'),
      hasResultsTerm: pageTextLower.includes('result') || pageTextLower.includes('结果'),
      textLength: bodyText.length
    };

    return {
      pageInfo,
      criticalElements,
      customElements: customElements.slice(0, 15),
      buttons: buttons.slice(0, 20),
      inputs: inputs,
      textPreview: textPreview.substring(0, 300),
      textStats
    };

  } catch (e) {
    return {
      error: "诊断失败：" + e.message,
      stack: e.stack
    };
  }
})()