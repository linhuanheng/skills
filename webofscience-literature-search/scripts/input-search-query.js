/**
 * Web of Science 检索式输入脚本 (v2.0)
 *
 * 功能：根据选择器定位输入框，将检索式填入
 * 前置依赖：find-interactive-elements.js 已执行，其结果已保存为 interactive-elements.json
 *           bash 调用方从 JSON 文件读取 selector 参数传入
 *
 * 参数：
 *   - inputSelector (string) — 输入框的 CSS 选择器，来自 interactive-elements.json 的 targetElements.searchInput.selector
 *   - query (string) — 完整的 WoS 检索式
 *
 * @param {string} inputSelector - CSS 选择器
 * @param {string} query - WoS 检索式
 * @returns {Object} 输入操作结果
 */

(function(inputSelector, query) {
  try {
    console.log('=== 输入检索式 ===');
    console.log('输入框选择器:', inputSelector);
    console.log('检索式:', query);

    // ====== 通过选择器定位输入框 ======
    if (!inputSelector) {
      return {
        success: false,
        error: '未提供输入框选择器（inputSelector 为空），请先执行 find-interactive-elements.js'
      };
    }

    const input = document.querySelector(inputSelector);

    if (!input) {
      // 选择器失效，尝试降级
      console.log('选择器失效，尝试降级查找...');
      const fallbackSelectors = [
        '#advancedSearchInputArea',
        'textarea#advancedSearchInputArea',
        'app-advanced-search textarea',
        'textarea[placeholder*="Query"]',
        'textarea[placeholder*="search" i]',
        'textarea[aria-label*="search" i]',
        '.search-input-area textarea',
        'textarea'
      ];
      for (const sel of fallbackSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          console.log('降级找到输入框:', sel);
          return inputSearchQuery(el, query, sel);
        }
      }
      return {
        success: false,
        error: '输入框未找到（选择器 "' + inputSelector + '" 失效且降级查找也失败）'
      };
    }

    return inputSearchQuery(input, query, inputSelector);

  } catch (error) {
    console.error('检索式输入失败：', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }

  function inputSearchQuery(input, query, selector) {
    // 方法1：直接赋值 + 事件触发（Angular 兼容）
    input.focus();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    input.value = query;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    let verified = input.value === query || input.value.includes('TS=(');
    console.log('方法1（直接赋值）验证:', verified, '当前值:', input.value.substring(0, 80));

    // 方法2：execCommand
    if (!verified) {
      input.focus();
      input.select();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, query);
      verified = input.value === query || input.value.includes('TS=(');
      console.log('方法2（execCommand）验证:', verified);
    }

    // 方法3：InputEvent
    if (!verified) {
      input.focus();
      input.value = '';
      input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, data: query }));
      input.value = query;
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: query }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      verified = input.value === query || input.value.includes('TS=(');
      console.log('方法3（InputEvent）验证:', verified);
    }

    console.log('=== 检索式输入完成 ===');
    console.log('输入成功:', verified);

    return {
      success: verified,
      action: 'query_input',
      query: query,
      inputVerified: verified,
      currentValue: input.value.substring(0, 100),
      inputSelector: selector,
      method: verified ? (input.value === query ? 'direct' : 'partial') : 'failed'
    };
  }
})