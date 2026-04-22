/**
 * Web of Science 下一页点击脚本 (v1.0)
 *
 * 功能：点击结果页面的 "Top Next Page" 按钮，翻到下一页
 *       若当前是最后一页（按钮 disabled）或只有一页结果，则不执行
 *
 * 按钮定位：
 *   - aria-label="Top Next Page"
 *   - 可用时：class 含 mdc-icon-button，disabled=false
 *   - 不可用时：class 含 mat-mdc-button-disabled，disabled=true
 *
 * @returns {Object} 翻页操作结果
 */

(function() {
  try {
    console.log('=== 开始翻页到下一页 ===');

    // ====== 检查是否在结果页面 ======
    var isResultsPage = window.location.href.includes('summary') || document.title.includes('Results');
    if (!isResultsPage) {
      return {
        success: false,
        error: '当前不在搜索结果页面',
        url: window.location.href,
        title: document.title
      };
    }

    // ====== 查找 Next Page 按钮 ======
    var nextBtn = document.querySelector('button[aria-label="Top Next Page"]');

    // 降级：通过 class + icon 文本查找
    if (!nextBtn) {
      var iconBtns = document.querySelectorAll('button.mdc-icon-button');
      for (var i = 0; i < iconBtns.length; i++) {
        var btn = iconBtns[i];
        var label = btn.getAttribute('aria-label') || '';
        if (label === 'Top Next Page') {
          nextBtn = btn;
          break;
        }
      }
    }

    if (!nextBtn) {
      return {
        success: false,
        error: '未找到 Top Next Page 按钮（可能页面结构不包含分页）',
        hasNextPage: false,
        url: window.location.href
      };
    }

    // ====== 检查按钮是否可用 ======
    if (nextBtn.disabled) {
      console.log('已是最后一页，Next Page 按钮为 disabled');
      return {
        success: false,
        error: '已是最后一页，无法翻页',
        hasNextPage: false,
        url: window.location.href
      };
    }

    // ====== 记录当前页信息 ======
    var pageControls = document.querySelector('app-page-controls');
    var currentInfo = pageControls ? pageControls.innerText.trim().substring(0, 80) : '';

    console.log('当前页面信息:', currentInfo);
    console.log('点击 Next Page 按钮...');

    // ====== 点击按钮 ======
    nextBtn.click();

    console.log('=== 翻页完成 ===');

    return {
      success: true,
      action: 'next_page',
      hasNextPage: true,
      pageBeforeClick: currentInfo,
      url: window.location.href
    };

  } catch (error) {
    console.error('翻页失败：', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
})()