/**
 * Web of Science 翻页脚本（鲁棒增强版）
 *
 * 功能：执行翻页操作并返回状态
 * 特点：多选择器降级、下一页/页码双模式、状态反馈
 *
 * @param {number} targetPage - 目标页码（可选，默认为下一页）
 * @returns {Object} 翻页结果，包含当前页码、总页数、操作类型
 */

(function(targetPage) {
  try {
    // === 第一步：查找分页控件（多选择器降级） ===

    // 尝试底部翻页控件（最常见）
    let pageControls = document.querySelector(".app-page-controls.summary-bottom-border");
    if (!pageControls) {
      pageControls = document.querySelector(".pagination, .page-controls, [class*=\"page-nav\"]");
    }

    // 尝试查找页码按钮
    let pageButtons = [];
    if (pageControls) {
      pageButtons = Array.from(pageControls.querySelectorAll("button")).filter(b =>
        b.innerText.match(/^\d+$/) && parseInt(b.innerText) > 0 && parseInt(b.innerText) <= 100
      );
    }

    // 降级：全局查找页码按钮
    if (pageButtons.length === 0) {
      pageButtons = Array.from(document.querySelectorAll("button")).filter(b =>
        b.innerText.match(/^\d+$/) && parseInt(b.innerText) > 0 && parseInt(b.innerText) <= 100
      );
    }

    // 尝试查找下一页按钮
    let nextBtn = Array.from(document.querySelectorAll("button")).find(b => {
      const aria = b.getAttribute("aria-label") || "";
      const text = b.innerText.toLowerCase();
      return aria.includes("Next") || aria.includes("next") ||
             text.includes("arrow_forward") || text.includes("next");
    });

    // === 第二步：获取当前页码信息 ===
    const currentPageBtn = pageButtons.find(b =>
      b.getAttribute("aria-label")?.includes("Current") ||
      b.classList.contains("mat-mdc-button-active") ||
      b.disabled === true
    );

    const currentPage = currentPageBtn ? parseInt(currentPageBtn.innerText) : 1;
    const totalPages = pageButtons.length > 0 ? parseInt(pageButtons[pageButtons.length - 1].innerText) : 1;

    // === 第三步：执行翻页 ===
    let action = "none";
    let newPage = currentPage;

    if (targetPage !== undefined && targetPage > 0 && targetPage <= totalPages) {
      // 跳转到指定页码
      const targetBtn = pageButtons.find(b => b.innerText === String(targetPage));
      if (targetBtn && targetPage !== currentPage) {
        targetBtn.click();
        action = "goto_page_" + targetPage;
        newPage = targetPage;
      }
    } else if (nextBtn && currentPage < totalPages) {
      // 点击下一页
      nextBtn.click();
      action = "clicked_next";
      newPage = currentPage + 1;
    } else if (pageButtons.length > 0) {
      // 尝试点击下一页码
      const nextPageNum = Math.min(currentPage + 1, totalPages);
      const nextPageBtn = pageButtons.find(b => b.innerText === String(nextPageNum));
      if (nextPageBtn && nextPageNum > currentPage) {
        nextPageBtn.click();
        action = "clicked_page_" + nextPageNum;
        newPage = nextPageNum;
      }
    }

    return {
      action: action,
      currentPage: currentPage,
      newPage: newPage,
      totalPages: totalPages,
      hasNextPage: newPage < totalPages,
      availablePages: pageButtons.map(b => parseInt(b.innerText))
    };

  } catch (e) {
    return {
      error: "翻页失败",
      errorMessage: e.message,
      availableButtons: Array.from(document.querySelectorAll("button"))
        .map(b => b.innerText.substring(0, 20))
        .slice(0, 20)
    };
  }
})