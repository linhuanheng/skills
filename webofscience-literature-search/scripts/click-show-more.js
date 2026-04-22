/**
 * Web of Science "Show more" 按钮点击脚本 (v2.0)
 *
 * 功能：点击搜索结果页面中所有 "Show more" 按钮，展开全部摘要
 *       按钮位于类名 "show-more-wrapper ng-star-inserted" 元素下
 *       只点击文本为 "Show more" 的按钮，跳过 "Show less"（已展开的）
 *
 * @returns {Object} 点击操作结果
 */

(function() {
  try {
    console.log('=== 开始查找并点击所有 Show more 按钮 ===');

    // ====== 收集所有未展开的 Show more 按钮 ======
    var showMoreButtons = [];

    // 方法1：通过 .show-more-wrapper.ng-star-inserted 下的按钮查找
    var wrappers = document.querySelectorAll('.show-more-wrapper.ng-star-inserted');
    if (wrappers.length > 0) {
      wrappers.forEach(function(wrapper) {
        var btn = wrapper.querySelector('button');
        if (btn) {
          var text = btn.innerText.trim().toLowerCase();
          // 只收集 "Show more"，跳过 "Show less"（已展开）
          if (text.includes('show') && text.includes('more') && !text.includes('less')) {
            showMoreButtons.push(btn);
          }
        }
      });
      console.log('方法1: 通过 wrapper 找到', showMoreButtons.length, '个 Show more 按钮');
    }

    // 方法2：如果方法1未找到，通过按钮类名查找
    if (showMoreButtons.length === 0) {
      var classButtons = document.querySelectorAll('button[class*="show-more"]');
      classButtons.forEach(function(btn) {
        var text = btn.innerText.trim().toLowerCase();
        if (text.includes('show') && text.includes('more') && !text.includes('less')) {
          showMoreButtons.push(btn);
        }
      });
      console.log('方法2: 通过类名找到', showMoreButtons.length, '个 Show more 按钮');
    }

    // 方法3：如果仍未找到，通过 aria-label 查找
    if (showMoreButtons.length === 0) {
      var allButtons = document.querySelectorAll('button');
      allButtons.forEach(function(btn) {
        var ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        var text = btn.innerText.trim().toLowerCase();
        if ((text.includes('show') && text.includes('more') && !text.includes('less')) ||
            (ariaLabel.includes('show more') && !ariaLabel.includes('show less'))) {
          showMoreButtons.push(btn);
        }
      });
      console.log('方法3: 通过文本/aria-label 找到', showMoreButtons.length, '个 Show more 按钮');
    }

    // ====== 检查是否找到按钮 ======
    var totalWrappers = document.querySelectorAll('.show-more-wrapper').length;
    var alreadyExpanded = 0;
    document.querySelectorAll('.show-more-wrapper button').forEach(function(btn) {
      if (btn.innerText.trim().toLowerCase().includes('less')) {
        alreadyExpanded++;
      }
    });

    if (showMoreButtons.length === 0) {
      console.log('未找到需要点击的 Show more 按钮');
      return {
        success: true,
        action: 'show_more_click_all',
        clickedCount: 0,
        totalWrappers: totalWrappers,
        alreadyExpanded: alreadyExpanded,
        message: alreadyExpanded > 0
          ? '所有摘要均已展开（' + alreadyExpanded + '/' + totalWrappers + '）'
          : '当前页面无 Show more 按钮（可能不在结果页面）',
        pageStatus: {
          url: window.location.href,
          title: document.title,
          isResultsPage: window.location.href.includes('summary') || document.title.includes('Results')
        }
      };
    }

    // ====== 逐个点击所有 Show more 按钮 ======
    var clickResults = [];
    var successCount = 0;
    var failCount = 0;

    showMoreButtons.forEach(function(btn, index) {
      var btnText = btn.innerText.trim().substring(0, 30);
      var btnAriaLabel = (btn.getAttribute('aria-label') || '').substring(0, 60);
      var clicked = false;
      var clickMethod = '';

      // 方法1：直接 click()
      try {
        btn.click();
        clicked = true;
        clickMethod = 'click()';
      } catch (e) {
        // 方法2：MouseEvent click
        try {
          btn.focus();
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          clicked = true;
          clickMethod = 'MouseEvent click';
        } catch (e2) {
          // 方法3：mousedown → mouseup → click
          try {
            btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            clicked = true;
            clickMethod = 'mousedown→mouseup→click';
          } catch (e3) {
            // ignore
          }
        }
      }

      if (clicked) {
        successCount++;
      } else {
        failCount++;
      }

      clickResults.push({
        index: index,
        text: btnText,
        ariaLabel: btnAriaLabel,
        success: clicked,
        method: clickMethod
      });

      console.log('按钮 ' + (index + 1) + '/' + showMoreButtons.length + ': ' + btnText + ' — ' + (clicked ? '成功 (' + clickMethod + ')' : '失败'));
    });

    console.log('=== Show more 按钮点击完成 ===');
    console.log('成功:', successCount, '/', showMoreButtons.length);
    console.log('已展开（之前）:', alreadyExpanded);

    return {
      success: failCount === 0,
      action: 'show_more_click_all',
      clickedCount: successCount,
      failedCount: failCount,
      totalWrappers: totalWrappers,
      alreadyExpanded: alreadyExpanded,
      totalAfterClick: alreadyExpanded + successCount,
      clickResults: clickResults,
      pageStatus: {
        url: window.location.href,
        title: document.title,
        isResultsPage: window.location.href.includes('summary') || document.title.includes('Results')
      }
    };

  } catch (error) {
    console.error('Show more 按钮点击失败：', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      action: 'show_more_click_all'
    };
  }
})()