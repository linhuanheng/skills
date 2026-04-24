/**
 * Web of Science 自适应滚动脚本 (v2.0)
 *
 * 功能：读取当前页面高度，并滚动到指定位置（或增量步进）。
 *       WoS 使用虚拟滚动，必须逐步 scrollTo 触发中间记录渲染，
 *       直接跳到底部会跳过中间记录导致未渲染。
 *
 * 调用方式 1 — 增量步进（推荐）：
 *   bash 端维护 offset，每次步进 500px 并调用：
 *   curl -s -X POST "http://localhost:$PORT/eval?target=ID" \
 *     --data-raw "($(cat scripts/scroll-to-render.js))($OFFSET)"
 *
 * 调用方式 2 — 无参数调用：仅读取当前高度，不滚动
 *   curl -s -X POST "http://localhost:$PORT/eval?target=ID" \
 *     --data-raw "$(cat scripts/scroll-to-render.js)"
 *
 * 完整 bash 循环示例：
 *   PREV_HEIGHT=0
 *   for round in {1..10}; do
 *     # Step 1: 增量滚动到当前高度
 *     offset=0
 *     while true; do
 *       RESULT=$(curl -s -X POST ... --data-raw "($(cat scripts/scroll-to-render.js))($offset)")
 *       PAGE_H=$(echo "$RESULT" | node scripts/json-helper.mjs read-stdin '.scrollHeight // 0')
 *       if [ "$offset" -ge "$PAGE_H" ]; then break; fi
 *       offset=$((offset + 500))
 *     done
 *     # Step 2: 检查高度是否稳定
 *     if [ "$PAGE_H" -eq "$PREV_HEIGHT" ] && [ "$PAGE_H" -gt 0 ]; then break; fi
 *     PREV_HEIGHT=$PAGE_H
 *     sleep 1
 *   done
 *
 * @param {number} [scrollTo] - 滚动到的目标位置（像素），省略则仅读取高度
 * @returns {Object} scrollHeight (当前页面高度), scrolledTo (实际滚动位置)
 */

(function(scrollTo) {
  try {
    if (typeof scrollTo === 'number' && scrollTo >= 0) {
      window.scrollTo(0, scrollTo);
    }

    // Give virtual scrolling time to render newly visible elements.
    // WoS uses async rendering; without this delay the DOM hasn't updated
    // yet when we (or the next call) query scrollHeight.
    return new Promise(function(resolve) {
      setTimeout(function() {
        var pageHeight = Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight
        );
        resolve({
          success: true,
          scrollHeight: pageHeight,
          scrolledTo: typeof scrollTo === 'number' ? Math.min(scrollTo, pageHeight) : -1
        });
      }, 150);
    });

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
})