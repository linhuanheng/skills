/**
 * Web of Science 滚动到底部脚本 (v1.0)
 *
 * 功能：将页面滚动到底部，触发懒加载（适用于搜索结果列表）
 *       检测滚动前后页面高度变化，若发生变化则继续滚动直到不再变化
 *
 * @param {number} maxAttempts - 最大滚动尝试次数，默认 5
 * @param {number} intervalMs - 每次滚动后的等待间隔（毫秒），默认 2000
 * @returns {Object} 滚动操作结果
 */

(function(maxAttempts, intervalMs) {
  try {
    maxAttempts = maxAttempts || 5;
    intervalMs = intervalMs || 2000;

    console.log('=== 开始滚动到底部 ===');
    console.log('最大尝试次数:', maxAttempts);
    console.log('等待间隔:', intervalMs, 'ms');

    let attempts = 0;
    let lastHeight = 0;
    let currentHeight = document.body.scrollHeight || document.documentElement.scrollHeight;

    const results = {
      attempts: [],
      totalScrollDistance: 0,
      triggeredLazyLoad: false
    };

    function wait(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function scrollPage() {
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`滚动尝试 ${attempts}/${maxAttempts}`);

        // 记录滚动前的高度
        const beforeHeight = document.body.scrollHeight || document.documentElement.scrollHeight;
        console.log('滚动前页面高度:', beforeHeight);

        // 记录当前滚动位置
        const beforeScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

        // 滚动到底部
        window.scrollTo({
          top: beforeHeight,
          left: 0,
          behavior: 'smooth'
        });

        // 等待内容加载
        await wait(intervalMs);

        // 记录滚动后的高度
        const afterHeight = document.body.scrollHeight || document.documentElement.scrollHeight;
        const afterScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        const scrollDistance = afterScroll - beforeScroll;

        console.log('滚动后页面高度:', afterHeight);
        console.log('滚动距离:', scrollDistance);

        // 检查高度是否增加（表示懒加载触发）
        const heightIncreased = afterHeight > beforeHeight;

        results.attempts.push({
          attempt: attempts,
          beforeHeight: beforeHeight,
          afterHeight: afterHeight,
          heightIncrease: heightIncreased,
          scrollDistance: scrollDistance,
          timestamp: new Date().toISOString()
        });

        results.totalScrollDistance += scrollDistance;

        if (heightIncreased) {
          console.log('检测到页面高度增加，可能触发了懒加载');
          results.triggeredLazyLoad = true;

          // 继续下一轮滚动
          continue;
        } else {
          console.log('页面高度未增加，滚动完成');
          break;
        }
      }

      return results;
    }

    return scrollPage().then(scrollResults => {
      const finalHeight = document.body.scrollHeight || document.documentElement.scrollHeight;

      console.log('=== 滚动完成 ===');
      console.log('总尝试次数:', attempts);
      console.log('最终页面高度:', finalHeight);
      console.log('是否触发懒加载:', scrollResults.triggeredLazyLoad);
      console.log('总滚动距离:', scrollResults.totalScrollDistance);

      return {
        success: true,
        action: 'scroll_to_bottom',
        scrollStatus: {
          finalHeight: finalHeight,
          attempts: attempts,
          maxAttempts: maxAttempts,
          triggeredLazyLoad: scrollResults.triggeredLazyLoad,
          totalScrollDistance: scrollResults.totalScrollDistance
        },
        attempts: scrollResults.attempts,
        pageStatus: {
          url: window.location.href,
          title: document.title,
          readyState: document.readyState
        }
      };
    });

  } catch (error) {
    console.error('滚动失败：', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      action: 'scroll_to_bottom'
    };
  }
})