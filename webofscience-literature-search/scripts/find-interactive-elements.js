/**
 * Web of Science 交互元素查找脚本 (v3.0)
 *
 * 功能：查找页面上的所有交互元素，精确定位检索输入框和搜索按钮
 *       返回 JSON 结果，由 bash 调用方保存为 interactive-elements.json 文件
 *       后续脚本（input-search-query.js / click-search-button.js）通过读取该文件获取选择器，
 *       再用 document.querySelector(selector) 重新定位 DOM 元素
 *
 * 目标元素：
 *   - 输入框：id="advancedSearchInputArea"
 *   - 搜索按钮：class="mdc-button__label interactive-highlight"，文本为 "Search"
 *
 * @returns {Object} 交互元素查找结果（纯 JSON，可序列化保存）
 */

(function() {
  try {
    console.log('=== 开始查找交互元素 ===');

    // ====== 查找所有交互元素 ======

    // 1. 查找所有 <a> 元素
    const interactiveLinks = Array.from(document.querySelectorAll('a')).filter(link => {
      const href = link.getAttribute('href') || '';
      return href && !href.startsWith('javascript:') && href !== '#';
    }).map(link => ({
      tagName: link.tagName,
      text: link.innerText.trim().substring(0, 50),
      href: link.getAttribute('href') || '',
      id: link.id || '',
      className: (link.className || '').substring(0, 60),
      hasOnClick: link.hasAttribute('onclick'),
      role: link.getAttribute('role') || '',
      tabIndex: link.getAttribute('tabindex') || 'none'
    }));

    // 2. 查找所有 <button> 元素
    const allButtons = document.querySelectorAll('button');
    const interactiveButtons = Array.from(allButtons).map(button => ({
      tagName: button.tagName,
      text: button.innerText.trim().substring(0, 50),
      id: button.id || '',
      className: (button.className || '').substring(0, 80),
      type: button.type || 'button',
      hasOnClick: button.hasAttribute('onclick'),
      ariaLabel: button.getAttribute('aria-label') || '',
      role: button.getAttribute('role') || '',
      tabIndex: button.getAttribute('tabindex') || 'none',
      disabled: button.disabled
    }));

    // 3. 查找所有表单控件
    const interactiveInputs = Array.from(document.querySelectorAll('input, textarea, select')).map(input => ({
      tagName: input.tagName,
      type: input.type || 'text',
      id: input.id || '',
      name: input.name || '',
      className: (input.className || '').substring(0, 60),
      placeholder: input.placeholder || '',
      value: (input.value || '').substring(0, 50),
      ariaLabel: input.getAttribute('aria-label') || '',
      role: input.getAttribute('role') || '',
      tabIndex: input.getAttribute('tabindex') || 'none',
      disabled: input.disabled,
      readonly: input.readOnly
    }));

    // 4. 查找带有 onclick 属性的元素（排除标准交互元素）
    const interactiveOnclickElements = Array.from(document.querySelectorAll('[onclick]'))
      .filter(el => !['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
      .map(el => ({
        tagName: el.tagName,
        text: el.innerText.trim().substring(0, 50),
        id: el.id || '',
        className: (el.className || '').substring(0, 60),
        onclick: el.getAttribute('onclick')?.substring(0, 100) || '',
        role: el.getAttribute('role') || '',
        tabIndex: el.getAttribute('tabindex') || 'none'
      }));

    // 5. 查找 ARIA 角色为交互类的元素
    const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'textbox', 'searchbox', 'combobox', 'slider', 'tab', 'menuitem', 'option'];
    const ariaInteractiveElements = [];
    interactiveRoles.forEach(role => {
      Array.from(document.querySelectorAll(`[role="${role}"]`)).forEach(el => {
        if (!['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) && !el.hasAttribute('onclick')) {
          ariaInteractiveElements.push({
            tagName: el.tagName,
            text: el.innerText.trim().substring(0, 50),
            id: el.id || '',
            className: (el.className || '').substring(0, 60),
            role: role,
            tabIndex: el.getAttribute('tabindex') || 'none'
          });
        }
      });
    });

    // 6. 查找正数 tabindex 的元素
    const positiveTabindexElements = [];
    Array.from(document.querySelectorAll('*')).forEach(el => {
      const tabindex = el.getAttribute('tabindex');
      if (tabindex && parseInt(tabindex) > 0) {
        const tagName = el.tagName;
        const isCovered = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) ||
                          el.hasAttribute('onclick') ||
                          interactiveRoles.some(role => el.getAttribute('role') === role);
        if (!isCovered) {
          positiveTabindexElements.push({
            tagName: tagName,
            text: el.innerText.trim().substring(0, 50),
            id: el.id || '',
            className: (el.className || '').substring(0, 60),
            tabIndex: tabindex
          });
        }
      }
    });

    // 7. 模糊匹配包含 btn 或 button 的 class 名
    const btnClassElements = Array.from(document.querySelectorAll('*'))
      .filter(el => {
        const cls = (el.className || '').toString().toLowerCase();
        return (cls.includes('btn') || cls.includes('button')) &&
               !['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) &&
               !el.hasAttribute('onclick') &&
               !interactiveRoles.some(role => el.getAttribute('role') === role);
      })
      .map(el => ({
        tagName: el.tagName,
        text: el.innerText.trim().substring(0, 50),
        id: el.id || '',
        className: (el.className || '').substring(0, 60)
      }));

    // ====== 定位目标元素 ======

    // --- 输入框：id="advancedSearchInputArea" ---
    let searchInputElement = document.getElementById('advancedSearchInputArea');
    let inputSelector = null;

    if (searchInputElement) {
      inputSelector = '#advancedSearchInputArea';
      console.log('找到检索输入框：#advancedSearchInputArea');
    } else {
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
          searchInputElement = el;
          inputSelector = sel;
          console.log('找到降级输入框：', sel);
          break;
        }
      }
    }

    // --- 搜索按钮：class="mdc-button__label interactive-highlight"，文本 "Search" ---
    let searchButtonElement = null;
    let buttonSelector = null;

    // 方法1：精确匹配 — 按钮本身 class 同时包含 mdc-button__label 和 interactive-highlight
    const exactBtn = Array.from(allButtons).find(btn => {
      const cls = btn.className || '';
      const text = btn.innerText.trim();
      return cls.includes('mdc-button__label') &&
             cls.includes('interactive-highlight') &&
             text === 'Search';
    });

    if (exactBtn) {
      searchButtonElement = exactBtn;
      buttonSelector = 'button.mdc-button__label.interactive-highlight';
      console.log('找到精确匹配搜索按钮');
    }

    // 方法2：按钮内部有 .mdc-button__label.interactive-highlight 子元素
    if (!searchButtonElement) {
      const mdcLabel = document.querySelector('.mdc-button__label.interactive-highlight');
      if (mdcLabel && mdcLabel.innerText.trim() === 'Search') {
        searchButtonElement = mdcLabel.closest('button') || mdcLabel;
        // 使用可被 querySelector 识别的选择器
        buttonSelector = 'button .mdc-button__label.interactive-highlight';
        console.log('找到搜索按钮（通过 mdc-button__label 子元素）');
      }
    }

    // 方法3：id 为 search 的按钮（WoS 搜索按钮常见 id）
    if (!searchButtonElement) {
      const idBtn = document.querySelector('button#search');
      if (idBtn) {
        searchButtonElement = idBtn;
        buttonSelector = 'button#search';
        console.log('找到搜索按钮（id=search）');
      }
    }

    // 方法4：class 含 search 且文本为 Search 的按钮（排除 disabled）
    if (!searchButtonElement) {
      const searchBtn = Array.from(allButtons).find(btn => {
        const cls = (btn.className || '').toString().toLowerCase();
        const text = btn.innerText.trim().toLowerCase();
        return cls.includes('search') && text === 'search' && !btn.disabled;
      });
      if (searchBtn) {
        searchButtonElement = searchBtn;
        // 优先使用含 ng-star-inserted 的选择器（区分 "Add to query" 和 "Search"）
        if ((searchBtn.className || '').includes('ng-star-inserted')) {
          buttonSelector = 'button.search.ng-star-inserted:not([disabled])';
        } else if (searchBtn.id) {
          buttonSelector = 'button#' + searchBtn.id;
        } else {
          // 使用 class 组合 + not disabled
          const classes = (searchBtn.className || '').split(/\s+/).filter(c => c && !c.startsWith('mat-'));
          buttonSelector = 'button.' + classes.join('.') + ':not([disabled])';
        }
        console.log('找到搜索按钮（class 含 search, 文本 Search, 非 disabled）');
      }
    }

    // 方法5：ARIA label
    if (!searchButtonElement) {
      const ariaBtn = document.querySelector('button[aria-label*="Search"]');
      if (ariaBtn) {
        searchButtonElement = ariaBtn;
        buttonSelector = 'button[aria-label*="Search"]';
        console.log('找到搜索按钮（ARIA label）');
      }
    }

    // 方法6：在所有 button 中按文本查找（排除 disabled），提取可用选择器
    if (!searchButtonElement) {
      const textBtn = Array.from(allButtons).find(btn => {
        const text = btn.innerText.trim().toLowerCase();
        return text === 'search' && !btn.disabled;
      });
      if (textBtn) {
        searchButtonElement = textBtn;
        if (textBtn.id) {
          buttonSelector = 'button#' + textBtn.id;
        } else if ((textBtn.className || '').includes('ng-star-inserted')) {
          buttonSelector = 'button.search.ng-star-inserted:not([disabled])';
        } else {
          // 使用按钮在 allButtons 中的索引作为最终降级
          const btnIdx = Array.from(allButtons).indexOf(textBtn);
          buttonSelector = 'button:nth-of-type(' + (btnIdx + 1) + ')';
        }
        console.log('找到搜索按钮（文本匹配）');
      }
    }

    // ====== 构建返回结果 ======
    const hasInput = !!searchInputElement;
    const hasButton = !!searchButtonElement;
    const ready = hasInput && hasButton;

    console.log('=== 交互元素查找完成 ===');
    console.log('输入框:', hasInput ? inputSelector : '未找到');
    console.log('搜索按钮:', hasButton ? buttonSelector : '未找到');
    console.log('就绪状态:', ready);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      title: document.title,

      // 交互元素统计
      interactiveElements: {
        links: { count: interactiveLinks.length, elements: interactiveLinks.slice(0, 20) },
        buttons: { count: interactiveButtons.length, elements: interactiveButtons.slice(0, 20) },
        formControls: { count: interactiveInputs.length, elements: interactiveInputs.slice(0, 20) },
        onclickElements: { count: interactiveOnclickElements.length, elements: interactiveOnclickElements.slice(0, 10) },
        ariaInteractiveElements: { count: ariaInteractiveElements.length, elements: ariaInteractiveElements.slice(0, 10) },
        positiveTabindexElements: { count: positiveTabindexElements.length, elements: positiveTabindexElements.slice(0, 10) },
        btnClassElements: { count: btnClassElements.length, elements: btnClassElements.slice(0, 10) }
      },

      // 目标元素（含选择器，供后续脚本读取）
      targetElements: {
        searchInput: searchInputElement ? {
          tagName: searchInputElement.tagName,
          type: searchInputElement.type || 'text',
          id: searchInputElement.id || '',
          className: (searchInputElement.className || '').substring(0, 60),
          placeholder: searchInputElement.placeholder || '',
          selector: inputSelector
        } : null,
        searchButton: searchButtonElement ? {
          tagName: searchButtonElement.tagName,
          text: searchButtonElement.innerText.trim().substring(0, 30),
          id: searchButtonElement.id || '',
          className: (searchButtonElement.className || '').substring(0, 80),
          type: searchButtonElement.type || 'button',
          selector: buttonSelector
        } : null
      },

      // 整体状态
      elementStatus: {
        hasSearchInput: hasInput,
        hasSearchButton: hasButton,
        ready: ready,
        isPageInteractive: interactiveButtons.length > 0 || interactiveLinks.length > 0,
        pageReady: document.readyState === 'complete'
      }
    };

  } catch (error) {
    console.error('交互元素查找失败：', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
  }
})();