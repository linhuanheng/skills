/**
 * Web of Science 搜索按钮点击脚本 (v2.0)
 *
 * 功能：根据选择器定位搜索按钮和输入框，执行点击操作
 * 前置依赖：find-interactive-elements.js 已执行，其结果已保存为 interactive-elements.json
 *           bash 调用方从 JSON 文件读取 selector 参数传入
 *
 * 参数：
 *   - inputSelector (string) — 输入框的 CSS 选择器，用于 Enter 键和 form submit 降级方案
 *   - buttonSelector (string) — 搜索按钮的 CSS 选择器
 *
 * @param {string} inputSelector - 输入框 CSS 选择器
 * @param {string} buttonSelector - 按钮 CSS 选择器
 * @returns {Object} 点击操作结果
 */

(function(inputSelector, buttonSelector) {
  try {
    console.log('=== 点击搜索按钮 ===');
    console.log('输入框选择器:', inputSelector);
    console.log('按钮选择器:', buttonSelector);

    // ====== 定位按钮 ======
    let btn = null;

    if (buttonSelector) {
      btn = document.querySelector(buttonSelector);
    }

    if (!btn) {
      // 选择器失效，尝试降级
      console.log('按钮选择器失效，尝试降级查找...');

      // 尝试1：ng-star-inserted + search class + 非 disabled
      btn = document.querySelector('button.search.ng-star-inserted:not([disabled])');
      if (btn) console.log('降级找到按钮（ng-star-inserted）');

      // 尝试2：id=search 的按钮
      if (!btn) {
        btn = document.querySelector('button#search');
        if (btn) console.log('降级找到按钮（id=search）');
      }

      // 尝试3：.mdc-button__label.interactive-highlight 的父元素
      if (!btn) {
        const mdcLabel = document.querySelector('.mdc-button__label.interactive-highlight');
        if (mdcLabel && mdcLabel.innerText.trim() === 'Search') {
          btn = mdcLabel.closest('button') || mdcLabel;
          console.log('降级找到按钮（mdc-button__label 父元素）');
        }
      }

      // 尝试4：class 含 search 且文本为 Search 且非 disabled 的按钮
      if (!btn) {
        const allButtons = document.querySelectorAll('button');
        btn = Array.from(allButtons).find(b => {
          const cls = (b.className || '').toString().toLowerCase();
          const text = b.innerText.trim().toLowerCase();
          return cls.includes('search') && text === 'search' && !b.disabled;
        });
        if (btn) console.log('降级找到按钮（class 含 search, 非 disabled）');
      }

      // 尝试5：文本为 Search 的按钮（非 disabled）
      if (!btn) {
        const allButtons = document.querySelectorAll('button');
        btn = Array.from(allButtons).find(b => {
          const text = b.innerText.trim().toLowerCase();
          return text === 'search' && !b.disabled;
        });
        if (btn) console.log('降级找到按钮（文本匹配）');
      }

      if (!btn) {
        return {
          success: false,
          error: '搜索按钮未找到（选择器 "' + buttonSelector + '" 失效且降级查找也失败）'
        };
      }
    }

    // ====== 定位输入框（用于降级方案） ======
    let inputEl = null;
    if (inputSelector) {
      inputEl = document.querySelector(inputSelector);
    }

    // ====== 执行点击（多种方法依次尝试） ======
    let clicked = false;

    // 方法1：直接 click()
    try {
      btn.click();
      clicked = true;
      console.log('方法1: click() — 成功');
    } catch (e) {
      console.log('方法1: click() — 失败:', e.message);
    }

    // 方法2：聚焦 + MouseEvent click
    try {
      btn.focus();
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      clicked = true;
      console.log('方法2: focus + MouseEvent click — 成功');
    } catch (e) {
      console.log('方法2: focus + MouseEvent click — 失败:', e.message);
    }

    // 方法3：mousedown → mouseup → click 完整序列
    try {
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      clicked = true;
      console.log('方法3: mousedown→mouseup→click — 成功');
    } catch (e) {
      console.log('方法3: mousedown→mouseup→click — 失败:', e.message);
    }

    // 方法4：Enter 键提交（需要输入框）
    if (inputEl) {
      try {
        inputEl.focus();
        inputEl.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
        }));
        inputEl.dispatchEvent(new KeyboardEvent('keypress', {
          key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
        }));
        inputEl.dispatchEvent(new KeyboardEvent('keyup', {
          key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true
        }));
        clicked = true;
        console.log('方法4: Enter 键 — 成功');
      } catch (e) {
        console.log('方法4: Enter 键 — 失败:', e.message);
      }
    }

    // 方法5：form submit
    if (inputEl) {
      try {
        const form = inputEl.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          clicked = true;
          console.log('方法5: form.submit — 成功');
        }
      } catch (e) {
        console.log('方法5: form.submit — 失败:', e.message);
      }
    }

    console.log('=== 搜索按钮点击完成 ===');
    console.log('点击成功:', clicked);

    return {
      success: clicked,
      action: 'button_click',
      buttonText: btn.innerText.trim().substring(0, 30),
      buttonSelector: buttonSelector,
      methodsAttempted: 5,
      pageStatus: {
        url: window.location.href,
        title: document.title
      }
    };

  } catch (error) {
    console.error('搜索按钮点击失败：', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
})