/**
 * Web of Science 页面加载状态检查脚本（增强版）
 *
 * 功能：检查页面是否加载完成，是否仍显示加载状态
 * 用途：翻页后、导航后等待页面就绪
 *
 * @returns {Object} 页面状态信息
 */

(function() {
  try {
    // 检查页面是否加载完成
    const isReady = document.readyState === "complete" ||
                    document.querySelector("app-records-list") !== null ||
                    document.querySelector(".search-results") !== null;

    // 检查是否仍显示加载状态
    const loadingElements = document.querySelectorAll(
      ".loading, .spinner, [class*=\"progress\"], [aria-busy=\"true\"]"
    );
    const isLoading = loadingElements.length > 0;

    // 检查是否在高级检索页面
    const isAdvancedSearch = window.location.href.includes("advanced-search") ||
                             document.title.includes("Advanced search");

    // 检查是否在结果页面
    const isResultsPage = window.location.href.includes("result") ||
                          document.title.includes("Result") ||
                          document.title.includes("Results");

    // 检测页面主要内容
    const hasRecordsList = document.querySelector("app-records-list") !== null;
    const hasSearchResults = document.querySelector(".search-results") !== null;
    const hasMainContent = document.querySelector("main, .main-content") !== null;

    // 检测自定义元素（Angular 组件）
    const customElements = Array.from(document.querySelectorAll("*"))
      .filter(el => el.tagName.includes("-"))
      .map(el => el.tagName)
      .filter((v, i, a) => a.indexOf(v) === i);

    // 检查页面文本（用于调试）

    return {
      ready: isReady && !isLoading,
      pageType: isAdvancedSearch ? "advanced_search" : (isResultsPage ? "results" : "unknown"),
      hasRecords: hasRecordsList || hasSearchResults,
      hasMainContent: hasMainContent,
      loadingElementsCount: loadingElements.length,
      customElements: customElements.slice(0, 10),
      url: window.location.href,
      title: document.title,
      readyState: document.readyState,
      pageTextPreview: document.body.innerText.substring(0, 200).replace(/\n/g, ' ')
    };
  } catch (e) {
    return {
      error: "Page status check failed",
      errorMessage: e.message
    };
  }
})()