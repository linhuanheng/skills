/**
 * Web of Science Search Execution Script (v2.6.1)
 *
 * Function: Input search query with keywords, journal scope, and year range, then click search button
 * Input: searchKeywords (string or array), journalScope (string, optional), yearRange (string, optional)
 *
 * @returns {Object} Operation result
 *
 * Web of Science field tags:
 * TS = Topic (title/abstract)
 * SO = Source (journal name)
 * PY = Publication Year
 * AU = Author
 *
 * Year range format examples:
 * - "2020-2024" or "2020 TO 2024" for range
 * - "2024" for single year
 * - "recent-5-years" (will be converted to appropriate range)
 * - "all" or empty: will be forced to "recent-5-years"
 */

(function(searchKeywords, journalScope, yearRange) {
  try {
    // ====== Parse Keywords ======
    let keywordArray = [];
    if (searchKeywords) {
      if (Array.isArray(searchKeywords)) {
        keywordArray = searchKeywords.map(k => String(k).trim()).filter(k => k);
      } else {
        const str = String(searchKeywords);
        // 支持逗号、分号、中文逗号等多种分隔符
        keywordArray = str.split(/[,;，；]/)
          .map(k => k.trim())
          .filter(k => k && k.length > 0);
      }
    }

    // 如果关键词为空，使用默认值
    if (keywordArray.length === 0) {
      keywordArray = ["volatility", "asset pricing", "risk premium"];
      console.log('Warning: No keywords provided, using defaults');
    }

    // Build topic query (TS=)
    let tsQuery = '';
    if (keywordArray.length > 0) {
      tsQuery = 'TS=(' + keywordArray.map(k => '"' + k + '"').join(' OR ') + ')';
    } else {
      tsQuery = 'TS=("volatility" OR "asset pricing" OR "risk premium")';
    }

    // ====== Parse Journal Scope ======
    let soQuery = '';
    if (journalScope) {
      let journalArray = [];
      if (Array.isArray(journalScope)) {
        journalArray = journalScope.map(j => String(j).trim()).filter(j => j);
      } else {
        const str = String(journalScope);
        // 支持逗号、分号、中文逗号等多种分隔符
        journalArray = str.split(/[,;，；]/)
          .map(j => j.trim())
          .filter(j => j && j.length > 0);
      }

      if (journalArray.length > 0) {
        // Use full journal names as provided by user (not abbreviations)
        soQuery = 'SO=(' + journalArray.map(j => '"' + j + '"').join(' OR ') + ')';
      }
    }

    // ====== Parse Year Range ======
    // 强制要求时间范围！不得为空或 "all"
    let pyQuery = '';
    let effectiveYearRange = yearRange;

    // 如果为空或 "all"，强制使用最近 5 年
    if (!effectiveYearRange || String(effectiveYearRange).trim() === '' || String(effectiveYearRange).trim().toLowerCase() === 'all') {
      console.log('Warning: Empty year range, forcing to recent-5-years');
      effectiveYearRange = 'recent-5-years';
    }

    const yr = String(effectiveYearRange).trim().toLowerCase();

    // Handle "recent-X-years" format
    const recentMatch = yr.match(/recent(\s*-\s*)?(\d+)\s*years?/);
    if (recentMatch) {
      const yearsAgo = parseInt(recentMatch[2]) || 5;
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - yearsAgo;
      pyQuery = 'PY=(' + startYear + '-' + currentYear + ')';
    }
    // Handle "YYYY-YYYY" or "YYYY TO YYYY" range format
    else if (yr.includes('-') || yr.toLowerCase().includes(' to ')) {
      const rangeStr = yr.replace(/\s+to\s+/i, '-');
      pyQuery = 'PY=(' + rangeStr + ')';
    }
    // Handle single year "YYYY"
    else if (/^\d{4}$/.test(yr)) {
      pyQuery = 'PY=(' + yr + ')';
    }
    // Handle multiple years "2020,2021,2022"
    else if (yr.includes(',')) {
      const years = yr.split(',').map(y => y.trim()).filter(y => /^\d{4}$/.test(y));
      if (years.length > 0) {
        pyQuery = 'PY=((' + years.join(') OR (') + '))';
      }
    }

    // ====== Combine Queries ======
    // Order: TS= AND SO= AND PY=
    let query = tsQuery;
    if (soQuery) {
      query += ' AND ' + soQuery;
    }
    if (pyQuery) {
      query += ' AND ' + pyQuery;
    }

    console.log('=== Web of Science Search ===');
    console.log('Keywords:', keywordArray.join(', '));
    console.log('Journal Scope:', journalScope || 'all');
    console.log('Year Range:', effectiveYearRange);
    console.log('Final Query:', query);

    // ====== Find Search Input Box (新版 Angular UI) ======
    // 尝试多种选择器
    const inputSelectors = [
      '#advancedSearchInputArea',                  // Angular Web Component ID
      'app-advanced-search textarea',              // Angular component
      'textarea[placeholder*="Query"]',            // Placeholder
      'textarea[aria-label*="search"]',            // ARIA label
      '.search-input-area textarea',               // CSS class
      'textarea#q'                                 // ID q
    ];

    let textarea = null;
    for (const selector of inputSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        textarea = el;
        console.log('Found input box with selector:', selector);
        break;
      }
    }

    if (!textarea) {
      // 尝试查找所有文本框
      const allTextareas = document.querySelectorAll('textarea');
      const availableTextareas = Array.from(allTextareas).map(el => ({
        id: el.id,
        name: el.name,
        placeholder: el.placeholder?.substring(0, 30),
        className: el.className?.substring(0, 30)
      }));
      return {
        success: false,
        error: "Search input box not found",
        availableTextareas: availableTextareas
      };
    }

    // ====== Input Search Query ======
    textarea.value = query;
    // 触发 input 和 change 事件，确保 Angular 能捕获到
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    // 额外触发 keydown 事件（模拟回车）
    textarea.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    }));

    // Verify input was accepted
    setTimeout(() => {
      const inputValue = textarea.value;
      console.log('Input box current value:', inputValue.substring(0, 100));
    }, 100);

    // ====== Find and Click Search Button (增强版) ======
    // 尝试多种选择器
    const buttonSelectors = [
      // Angular Web Components
      'app-search-button button',                  // Angular component
      'app-advanced-search button.search-button', // Search button
      // 标准选择器
      'button[type="submit"]',                     // Submit button
      'button:contains("Search")',                // Text contains
      // 通用选择器
      'button[aria-label*="Search"]',             // ARIA label
      'button[data-ta="search"]',                 // Data attribute
      'button.primary',                           // Primary class
      'button.search-btn',                        // Search btn class
      // 备选：查找所有按钮
      'button'
    ];

    let searchBtn = null;
    let foundSelector = '';

    // 方法1：按选择器查找
    for (const selector of buttonSelectors) {
      if (selector === 'button') {
        // 最后尝试：查找所有按钮
        const allButtons = document.querySelectorAll('button');
        // 优先找包含"Search"文本的按钮
        searchBtn = Array.from(allButtons).find(btn => {
          const text = btn.innerText.toLowerCase();
          return text.includes('search') || text.includes('检索') || btn.getAttribute('aria-label')?.toLowerCase().includes('search');
        });
        if (searchBtn) {
          foundSelector = 'button:contains(Search)';
          console.log('Found search button: text =', searchBtn.innerText.substring(0, 20));
          break;
        }
      } else {
        const btn = document.querySelector(selector);
        if (btn) {
          searchBtn = btn;
          foundSelector = selector;
          console.log('Found search button with selector:', selector, 'text =', btn.innerText.substring(0, 20));
          break;
        }
      }
    }

    if (!searchBtn) {
      // 返回所有可用的按钮供调试
      const allButtons = document.querySelectorAll('button');
      const availableButtons = Array.from(allButtons).slice(0, 10).map(btn => ({
        text: btn.innerText.substring(0, 30),
        type: btn.type,
        aria: btn.getAttribute('aria-label') || ''
      }));
      return {
        success: false,
        error: "Search button not found after trying multiple selectors",
        availableButtons: availableButtons,
        query: query
      };
    }

    // ====== Click the Search Button (多次尝试) ======
    console.log('Clicking search button...');

    // 方法1：直接点击
    try {
      searchBtn.click();
      console.log('Method 1: click() executed');
    } catch (e) {
      console.log('Method 1 failed:', e.message);
    }

    // 方法2：如果是 Angular 按钮，可能需要先聚焦
    setTimeout(() => {
      try {
        searchBtn.focus();
        searchBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        console.log('Method 2: focus + dispatchEvent executed');
      } catch (e) {
        console.log('Method 2 failed:', e.message);
      }
    }, 200);

    // 方法3：尝试触发 form 提交
    setTimeout(() => {
      try {
        // 找到包含输入框的 form 并提交
        const form = textarea.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          console.log('Method 3: form.submit() executed');
        }
      } catch (e) {
        console.log('Method 3 failed:', e.message);
      }
    }, 400);

    // 方法4：模拟键盘回车
    setTimeout(() => {
      try {
        textarea.focus();
        textarea.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true
        }));
        console.log('Method 4: Enter key dispatched from textarea');
      } catch (e) {
        console.log('Method 4 failed:', e.message);
      }
    }, 600);

    // ====== Return Result ======
    // 等待一小段时间让按钮点击生效
    setTimeout(() => {
      console.log('Search action completed');
    }, 800);

    return {
      success: true,
      action: "search_executed",
      query: query,
      inputVerified: textarea.value.includes('TS=('),
      keywords: keywordArray,
      journalScope: journalScope || "all",
      yearRange: effectiveYearRange,
      effectiveYearRange: effectiveYearRange,
      originalYearRange: yearRange,
      message: "Search query entered. Click methods: click(), focus+dispatchEvent, form.submit(), Enter key",
      buttonFound: foundSelector,
      buttonText: searchBtn.innerText.substring(0, 30),
      pageStatus: {
        url: window.location.href,
        title: document.title
      }
    };

  } catch (e) {
    return {
      success: false,
      error: "Search execution failed: " + e.message,
      stack: e.stack
    };
  }
})