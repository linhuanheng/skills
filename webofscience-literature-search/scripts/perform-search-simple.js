/**
 * Web of Science 简化版检索脚本 (v1.0)
 *
 * 功能：构建检索式并返回检索参数，但不执行点击操作
 * 输入：searchKeywords, journalScope, yearRange
 * 输出：检索式、按钮选择器、输入框选择器等参数
 *
 * 使用方式：此脚本仅构建参数，实际点击操作由外部脚本通过 /click 端点执行
 */

(function(searchKeywords, journalScope, yearRange) {
  try {
    console.log('=== 简化检索脚本开始 ===');

    // ====== Parse Keywords ======
    let keywordArray = [];
    if (searchKeywords) {
      if (Array.isArray(searchKeywords)) {
        keywordArray = searchKeywords.map(k => String(k).trim()).filter(k => k);
      } else {
        const str = String(searchKeywords);
        keywordArray = str.split(/[,;，；]/)
          .map(k => k.trim())
          .filter(k => k && k.length > 0);
      }
    }

    if (keywordArray.length === 0) {
      keywordArray = ["volatility", "asset pricing"];
    }

    // Build topic query (TS=)
    let tsQuery = 'TS=(' + keywordArray.map(k => '"' + k + '"').join(' OR ') + ')';

    // ====== Parse Journal Scope ======
    let soQuery = '';
    if (journalScope) {
      let journalArray = [];
      if (Array.isArray(journalScope)) {
        journalArray = journalScope.map(j => String(j).trim()).filter(j => j);
      } else {
        const str = String(journalScope);
        journalArray = str.split(/[,;，；]/)
          .map(j => j.trim())
          .filter(j => j && j.length > 0);
      }

      if (journalArray.length > 0) {
        soQuery = 'SO=(' + journalArray.map(j => '"' + j + '"').join(' OR ') + ')';
      }
    }

    // ====== Parse Year Range ======
    let pyQuery = '';
    let effectiveYearRange = yearRange;

    if (!effectiveYearRange || String(effectiveYearRange).trim() === '' || String(effectiveYearRange).trim().toLowerCase() === 'all') {
      effectiveYearRange = 'recent-5-years';
    }

    const yr = String(effectiveYearRange).trim().toLowerCase();
    const currentYear = new Date().getFullYear();

    // Handle "recent-X-years" format
    const recentMatch = yr.match(/recent(\s*-\s*)?(\d+)\s*years?/);
    if (recentMatch) {
      const yearsAgo = parseInt(recentMatch[2]) || 5;
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

    // ====== Combine Queries ======
    let query = tsQuery;
    if (soQuery) {
      query += ' AND ' + soQuery;
    }
    if (pyQuery) {
      query += ' AND ' + pyQuery;
    }

    console.log('关键词:', keywordArray.join(', '));
    console.log('期刊范围:', journalScope || '全部');
    console.log('时间范围:', effectiveYearRange);
    console.log('检索式:', query);

    // ====== 查找页面元素 ======
    // 输入框选择器（使用之前诊断发现的有效选择器）
    const inputSelectors = [
      '#advancedSearchInputArea',
      'textarea[placeholder*="Query"]',
      'textarea[placeholder*="query"]',
      'textarea'
    ];

    let inputSelector = '';
    for (const selector of inputSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        inputSelector = selector;
        console.log('找到输入框选择器:', selector);
        break;
      }
    }

    // 按钮选择器
    const buttonSelectors = [
      'button[aria-label*="Search"]',
      'button:contains("Search")',
      'button[type="submit"]',
      'button.primary',
      'button'
    ];

    let buttonSelector = '';
    let buttonText = '';
    for (const selector of buttonSelectors) {
      const btn = selector === 'button:contains("Search")'
        ? Array.from(document.querySelectorAll('button')).find(b =>
            b.innerText.toLowerCase().includes('search') ||
            b.getAttribute('aria-label')?.toLowerCase().includes('search'))
        : document.querySelector(selector);

      if (btn) {
        buttonSelector = selector === 'button:contains("Search")' ? 'button[包含"Search"文本]' : selector;
        buttonText = btn.innerText.trim().substring(0, 30);
        console.log('找到按钮选择器:', buttonSelector, '按钮文本:', buttonText);
        break;
      }
    }

    // 如果没有找到具体选择器，尝试获取第一个按钮
    if (!buttonSelector) {
      const firstButton = document.querySelector('button');
      if (firstButton) {
        buttonSelector = 'button';
        buttonText = firstButton.innerText.trim().substring(0, 30);
        console.log('使用第一个按钮:', buttonText);
      }
    }

    return {
      success: true,
      action: 'parameters_ready',
      query: query,
      inputSelector: inputSelector,
      buttonSelector: buttonSelector,
      buttonText: buttonText,
      parameters: {
        keywords: keywordArray,
        journalScope: journalScope || 'all',
        yearRange: effectiveYearRange,
        queryLength: query.length
      },
      instructions: {
        step1: `设置输入框值: document.querySelector('${inputSelector}').value = '${query.substring(0, 50)}...'`,
        step2: `点击按钮: document.querySelector('${buttonSelector}').click()`,
        step3: '或者使用web-access的/click端点直接点击按钮'
      }
    };

  } catch (e) {
    return {
      success: false,
      error: "简化检索脚本失败: " + e.message,
      stack: e.stack
    };
  }
})