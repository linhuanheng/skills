/**
 * Web of Science 论文信息提取脚本 (v2.0)
 *
 * 功能：从搜索结果页面提取论文信息，核心字段为标题、期刊、作者、摘要
 *       其余字段（日期、卷号、WOS ID、被引次数等）为可选，提取失败则忽略
 *       要求：先执行 click-show-more.js 展开全部摘要
 *
 * DOM 结构：
 *   app-record → .summary-record → .data-section
 *     → app-summary-title        → 标题
 *     → app-summary-authors      → 作者
 *     → .jcr-and-pub-info-section → 期刊 + 日期 + 卷号
 *     → .abstract                → 摘要
 *
 * @returns {Object} 提取结果，包含 papers 数组
 */

(function() {
  try {
    console.log('=== 开始提取论文信息 ===');

    var papers = [];
    var records = document.querySelectorAll('app-record');
    console.log('找到记录数:', records.length);

    if (records.length === 0) {
      return {
        success: false,
        error: '未找到论文记录（app-record 元素为空）',
        url: window.location.href
      };
    }

    var validIndex = 0;
    records.forEach(function(record, index) {
      // Skip empty/lazy-loaded records (innerHTML.len <= 100 means not yet rendered)
      if (record.innerHTML.length <= 100) return;

      validIndex++;
      var paper = { index: validIndex };

      // ====== 标题（核心） ======
      var titleLink = record.querySelector('app-summary-title a[data-ta=summary-record-title-link], app-summary-title a.title-link');
      if (titleLink) {
        paper.title = titleLink.innerText.trim();
      } else {
        var titleSpan = record.querySelector('app-summary-title span.title, app-summary-title span[class*=title]');
        paper.title = titleSpan ? titleSpan.innerText.trim() : (record.querySelector('app-summary-title') || {}).innerText?.trim() || '';
      }

      // ====== 期刊（核心） ======
      var pubInfoEl = record.querySelector('.jcr-and-pub-info-section');
      if (pubInfoEl) {
        var journalEl = pubInfoEl.querySelector('.source-title-link, .summary-source-title-link');
        if (journalEl) {
          paper.journal = journalEl.innerText.trim().replace(/arrow_drop_down\s*$/, '').replace(/arrow_drop_up\s*$/, '').trim();
        } else {
          // 降级：pubInfo 第二行非日期文本
          var lines = pubInfoEl.innerText.trim().split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
          for (var li = 0; li < lines.length; li++) {
            if (!/^\d{4}|^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(lines[li])) {
              paper.journal = lines[li].replace(/arrow_drop_down\s*$/, '').trim();
              break;
            }
          }
        }
      }

      // ====== 作者（核心） ======
      var authorsEl = record.querySelector('app-summary-authors');
      if (authorsEl) {
        var authorLinks = authorsEl.querySelectorAll('a.authors');
        if (authorLinks.length > 0) {
          var names = [];
          authorLinks.forEach(function(a) { names.push(a.innerText.trim()); });
          paper.authors = names.join('; ');
        } else {
          paper.authors = authorsEl.innerText.trim();
        }
      }

      // ====== 摘要（核心） ======
      var abstractEl = record.querySelector('.abstract');
      if (abstractEl) {
        var abstractText = abstractEl.innerText.trim();
        abstractText = abstractText.replace(/\s*Show (more|less)\s*(expand_more|expand_less)?\s*$/, '').trim();
        if (abstractText) {
          paper.abstract = abstractText;
        }
      }

      // ====== 可选字段 ======
      if (titleLink) {
        var wosMatch = (titleLink.href || '').match(/WOS:[A-Za-z0-9]+/);
        if (wosMatch) { paper.wosId = wosMatch[0]; }
      }

      if (pubInfoEl) {
        var dateEl = pubInfoEl.querySelector('[name=pubdate]');
        if (dateEl) {
          var dateText = dateEl.innerText.trim();
          if (dateText) { paper.publishDate = dateText; }
        }

        var allSpans = pubInfoEl.querySelectorAll('span');
        for (var si = 0; si < allSpans.length; si++) {
          var sp = allSpans[si];
          var spText = sp.innerText.trim();
          var spCls = sp.className || '';
          if (spCls === '' && spText && (/^\d+\(/.test(spText) || /pp\.\d/.test(spText))) {
            paper.volume = spText;
            break;
          }
        }
      }

      var statsEl = record.querySelector('.stats-container');
      if (statsEl) {
        var citeMatch = statsEl.innerText.trim().match(/^(\d[\d,]*)\s*\n?\s*Citations/i);
        if (citeMatch) { paper.citations = citeMatch[1]; }
      }

      papers.push(paper);
    });

    // ====== 页面元信息 ======
    var totalCount = '';
    var titleMatch = document.title.match(/[\u2013\u2014\-]\s*(\d[\d,]*)\s*[\u2013\u2014\-]/);
    if (titleMatch) { totalCount = titleMatch[1]; }

    var searchQuery = '';
    var queryMatch = document.title.match(/^(.+?)[\u2013\u2014]\s*\d/);
    if (queryMatch) { searchQuery = queryMatch[1].trim(); }

    console.log('=== 论文信息提取完成 ===');
    console.log('提取论文数:', papers.length);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      searchQuery: searchQuery,
      totalResults: totalCount,
      paperCount: papers.length,
      papers: papers
    };

  } catch (error) {
    console.error('论文信息提取失败：', error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
})()