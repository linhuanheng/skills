# Web of Science Literature Search - Scripts Documentation

This directory contains all JavaScript scripts used by the Web of Science literature search skill. These scripts are executed in the browser via the CDP Proxy `/eval` endpoint.

## Script Files

### Core Search & Extraction Scripts (v3.5)

| File | Function | Called When |
|------|----------|-------------|
| `find-interactive-elements.js` | Scan all interactive elements, locate input box and button, return JSON | After page load, before any operation |
| `input-search-query.js` | Input search query (params: `inputSelector`, `query`) | After find-interactive-elements.js, selector read from JSON |
| `click-search-button.js` | Click the search button (params: `inputSelector`, `buttonSelector`) | After input-search-query.js, selectors read from JSON |
| `scroll-to-render.js` | Incremental step-scroll: accepts `scrollTo` parameter, bash loops with +500px steps to trigger virtual scroll rendering incrementally, then multi-round height stability check | On results page, before click-show-more.js |
| `extract-papers-v2.js` | Extract paper info (title, authors, abstract, journal, date, volume, WOS ID, citations). Filters out empty `app-record` elements (virtual scroll placeholders) | After click-show-more.js, before save |
| `extract-papers.js` | Extract paper list from search results (legacy) | After search completes, after pagination |
| `extract-detail.js` (v2) | Extract complete info (abstract, keywords, DOI, etc.) | On paper detail page |
| `open-paper-detail.js` | Click paper title to open in new tab | On results page, before detail extraction |
| `click-show-more.js` | Click all "Show more" buttons to expand abstracts | On results page, after scroll-to-render.js |
| `next-page.js` | Click "Top Next Page" button to go to next page (**deprecated in loop** — loop uses inline code to separate check and click) | On results page with multiple pages, after extraction |
| `scroll-to-bottom.js` | Scroll page to bottom, trigger lazy loading (**deprecated** — replaced by scroll-to-render.js incremental step-scrolling) | On results page, before click-show-more.js |
| `diagnose-page.js` | Diagnose page structure and troubleshoot | When scripts fail |
| `generate-markdown-report.js` | Generate Markdown report from JSON data (**deprecated in SKILL.md** — uses local Node.js instead) | After data extraction |
| `json-helper.mjs` | Node.js JSON processing tool (jq replacement). Subcommands: read, read-stdin, save-pretty, pretty-stdin, url-encode, length-stdin, add-page-number, merge-arrays, build-final-json, extract-field-stdin, merge-page-files, build-final-from-pages | Throughout the workflow |
| `analyze-relevance.py` | **Relevance analysis (Plan A)**: keyword density + TF-IDF cosine similarity. Scores each paper's abstract against topic keywords, outputs enriched JSON with `relevance` field per paper | After search JSON generation, before user review |
| `analyze-relevance-sbert.py` | **Relevance analysis (Plan B)**: Sentence-BERT semantic matching (all-MiniLM-L6-v2, 384-dim embeddings). Captures synonyms/paraphrases that literal matching misses. Outputs sbert_enriched JSON | After search JSON generation, when deeper semantic understanding needed |

### Data Flow (JSON File)

```
find-interactive-elements.js
    ↓ returns JSON → bash saves as scripts/interactive-elements.json
    ├─ targetElements.searchInput.selector  → CSS selector string
    ├─ targetElements.searchButton.selector → CSS selector string
    └─ elementStatus.ready                  → boolean
    ↓ bash reads selectors, passes as parameters
input-search-query.js(inputSelector, query)  → document.querySelector(inputSelector)
    ↓
click-search-button.js(inputSelector, buttonSelector)  → document.querySelector(buttonSelector)
    ↓
Pagination Loop (repeated per page):
    check-page-ready.js  → wait for page load
    scroll-to-render.js  → incremental step-scroll (+500px), trigger virtual scroll rendering, multi-round height stability check
    click-show-more.js   → expand all abstracts
    extract-papers-v2.js → extract current page papers (filters empty app-record placeholders)
    json-helper.mjs add-page-number + save-pretty → page_NNN.json (immediate per-page save)
    inline code check next button → only check disabled, DO NOT click
    ↓ hasNext=true → click next button → continue loop
    ↓ hasNext=false → exit loop
    ↓
json-helper.mjs build-final-from-pages → merge page_NNN.json → save final JSON
    ↓
Local node -e script → generate Markdown report from final JSON
    ↓
analyze-relevance.py → Plan A: keyword density + TF-IDF cosine similarity → output enriched JSON
    ↓ OR
analyze-relevance-sbert.py → Plan B: Sentence-BERT semantic matching → output sbert_enriched JSON
```

### Navigation & Control Scripts

| File | Function | Called When |
|------|----------|-------------|
| `check-page-ready.js` | Check page loading status | After navigation, after pagination |

### Data Export Scripts

| File | Function | Output Format |
|------|----------|---------------|
| `check-data-quality.js` | Check data quality and completeness | Quality report |

### Environment Scripts

| File | Function |
|------|----------|
| `check-env.sh` | Environment detection and web-access dependency check |

## Call Methods

### Basic Call Format (Recommended)

```bash
PORT="${CDP_PROXY_PORT:-3457}"
curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" --data-raw "$(cat scripts/extract-papers.js)"
```

### Call with Parameters

For scripts that require parameters, use function call format:

```bash
# Step 1: Find interactive elements (locates input box and search button)
PORT="${CDP_PROXY_PORT:-3457}"
curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "$(cat scripts/find-interactive-elements.js)"

# Step 1.5: Save result and extract selectors (using json-helper.mjs instead of jq)
echo "$RESULT" | node scripts/json-helper.mjs save-pretty scripts/interactive-elements.json
INPUT_SEL=$(node scripts/json-helper.mjs read scripts/interactive-elements.json '.targetElements.searchInput.selector // ""')
BUTTON_SEL=$(node scripts/json-helper.mjs read scripts/interactive-elements.json '.targetElements.searchButton.selector // ""')

# Step 2: Input search query (reads selector from JSON)
curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "($(cat scripts/input-search-query.js))('${INPUT_SEL}', 'TS=(\"volatility\" OR \"asset pricing\") AND SO=(\"Journal of Finance\") AND PY=(2020-2024)')"

# Step 3: Click search button (reads selectors from JSON)
curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "($(cat scripts/click-search-button.js))('${INPUT_SEL}', '${BUTTON_SEL}')"
```

## Script Return Values

### find-interactive-elements.js Return Example

```json
{
  "success": true,
  "elementStatus": {
    "hasSearchInput": true,
    "hasSearchButton": true,
    "ready": true
  },
  "targetElements": {
    "searchInput": { "tagName": "TEXTAREA", "id": "advancedSearchInputArea", "selector": "#advancedSearchInputArea" },
    "searchButton": { "tagName": "BUTTON", "text": "Search", "selector": "button.mdc-button__label.interactive-highlight" }
  }
}
```

### input-search-query.js Return Example

```json
{
  "success": true,
  "action": "query_input",
  "query": "TS=(\"volatility\" OR \"asset pricing\") AND SO=(\"Journal of Finance\") AND PY=(2020-2024)",
  "inputVerified": true,
  "currentValue": "TS=(\"volatility\" OR \"asset pricing\") AND SO=(\"Journal of Finance\") AND PY=(2020-2024)",
  "inputSelector": "#advancedSearchInputArea",
  "method": "direct"
}
```

### click-search-button.js Return Example

```json
{
  "success": true,
  "action": "button_click",
  "buttonText": "Search",
  "buttonSelector": "button.mdc-button__label.interactive-highlight",
  "methodsAttempted": 5,
  "pageStatus": {
    "url": "https://webofscience.clarivate.cn/wos/alldb/advanced-search"
  }
}
```

### extract-papers.js Return Example

```json
{
  "pageType": "summary",
  "totalPapers": 15,
  "papers": [
    {
      "index": "1",
      "title": "Paper Title",
      "authors": "Author 1; Author 2",
      "year": "2024",
      "journal": "Journal Name",
      "extractionMethod": "text-regex"
    }
  ],
  "fallback": "text-regex-primary"
}
```

## Error Handling

All scripts include try-catch error handling with a unified return format:

```json
{
  "error": "Error description",
  "errorMessage": "Specific error message",
  "stack": "Error stack (for debugging)"
}
```

If the response contains an `error` field, the script execution failed. Check:
1. Whether the page loaded correctly
2. Whether the page structure matches expectations
3. Whether selectors need updating

## Web of Science Field Tags

The scripts use standard Web of Science field tags:

| Tag | Meaning | Example |
|-----|---------|---------|
| TS | Topic (title/abstract) | `TS=("volatility" OR "risk")` |
| SO | Source (journal name) | `SO=("Journal of Finance")` |
| AU | Author | `AU=("Fama E")` |
| PY | Publication Year | `PY=(2024)` |

When combining conditions, use `AND`:
```
TS=("volatility" OR "asset pricing") AND SO=("Journal of Finance" OR "Journal of Financial Economics")
```

## Call Examples

### Complete Search Flow

```bash
# 1. Initialize web-access, get port (using check-env.sh)
bash scripts/check-env.sh
PORT="${CDP_PROXY_PORT:-3457}"

# 2. Navigate to Web of Science (use Chinese mirror, alldb path)
curl -s "http://localhost:$PORT/new?url=https://webofscience.clarivate.cn/wos/alldb/advanced-search"
sleep 5

# 3. Find interactive elements (save to JSON file)
INTERACTIVE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=ID" \
  --data-raw "$(cat scripts/find-interactive-elements.js)")
echo "$INTERACTIVE_RESULT" | node scripts/json-helper.mjs save-pretty scripts/interactive-elements.json

INPUT_SEL=$(node scripts/json-helper.mjs read scripts/interactive-elements.json '.targetElements.searchInput.selector // ""')
BUTTON_SEL=$(node scripts/json-helper.mjs read scripts/interactive-elements.json '.targetElements.searchButton.selector // ""')

# 4. Input search query (pass selector from JSON)
INPUT_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=ID" \
  --data-raw "($(cat scripts/input-search-query.js))('${INPUT_SEL}', 'TS=(\"volatility\" OR \"asset pricing\") AND SO=(\"Journal of Finance\") AND PY=(2020-2024)')")
echo "Input result: $INPUT_RESULT"

# 5. Click search button (pass selectors from JSON)
CLICK_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=ID" \
  --data-raw "($(cat scripts/click-search-button.js))('${INPUT_SEL}', '${BUTTON_SEL}')")
echo "Click result: $CLICK_RESULT"

# 6. Wait for results page to load
echo "Waiting for results page..."
for i in {1..10}; do
  sleep 3
  PAGE_STATUS=$(curl -s -X POST "http://localhost:$PORT/eval?target=ID" \
    --data-raw "$(cat scripts/check-page-ready.js)")
  echo "Page status: $(echo "$PAGE_STATUS" | tr '\n' ' ')"

  if echo "$PAGE_STATUS" | grep -q '"pageType":"results"'; then
    echo "On results page"
    break
  fi

  if echo "$PAGE_STATUS" | grep -q '"ready":true'; then
    echo "Page ready"
    break
  fi
done

# 7. Adaptive step-scroll to render all records, then extract results
PREV_HEIGHT=0
for scroll_round in {1..10}; do
  offset=0
  while true; do
    SCROLL_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=ID" \
      --data-raw "($(cat scripts/scroll-to-render.js))($offset)")
    CURR_HEIGHT=$(echo "$SCROLL_RESULT" | node scripts/json-helper.mjs read-stdin '.scrollHeight // 0')
    if [ "$offset" -ge "$CURR_HEIGHT" ]; then break; fi
    offset=$((offset + 500))
  done
  if [ "$CURR_HEIGHT" -eq "$PREV_HEIGHT" ] && [ "$CURR_HEIGHT" -gt 0 ]; then break; fi
  PREV_HEIGHT=$CURR_HEIGHT
  sleep 1
done
curl -s -X POST "http://localhost:$PORT/eval?target=ID" --data-raw "$(cat scripts/extract-papers-v2.js)"

# 8. Check data quality
QUALITY_SCRIPT=$(cat scripts/check-data-quality.js)
curl -s -X POST "http://localhost:$PORT/eval?target=ID" \
  --data-raw "(function() { const results = [...]; return ${QUALITY_SCRIPT}(results); })()"
```

## Script Version (v3.5)

**Last Updated**: 2026-04-22

### Key Changes in v3.5
- **Fixed: Incremental step-scrolling** — Direct `scrollTo(0, height)` skips intermediate records, virtual scroll does NOT render skipped content (tested: 50 records page yielded only 6). `scroll-to-render.js` v2.0 now accepts `scrollTo` parameter; bash loops with `offset += 500` call it incrementally to trigger virtual scroll rendering step-by-step, then multi-round height stability check ensures all records are loaded
- **Deprecated**: Fixed offset `for offset in 0 1000 ... 12000` loops, direct `scrollTo(0, height)`, and `scroll-to-bottom.js` — all miss records
- **Updated**: All scrolling logic in SKILL.md Steps 3, 4, 5 now uses `scroll-to-render.js` + bash incremental step loop

### Key Changes in v3.4
- **Fixed: Virtual scrolling** — WoS uses virtual scrolling, only renders viewport-visible DOM elements. `scroll-to-bottom.js` (async Promise) doesn't work with CDP Proxy `/eval`. Replaced with incremental `window.scrollTo(0, offset)` (0→12000, step 1000, 0.5s each)
- **Fixed: Pagination double-click** — `next-page.js` checks and clicks in one call, causing page-skip in loops. Loop now uses inline code to check `button.disabled`, then clicks separately
- **Fixed: extract-papers-v2.js empty records** — WoS virtual scrolling creates empty `app-record` placeholders (innerHTML.length <= 100). Added filter to skip them
- **Fixed: Markdown generation** — `generate-markdown-report.js` returns `undefined` in CDP Proxy `/eval` (IIFE + global variable detection fails). Replaced with local `node -e` script
- **Deprecated**: `scroll-to-bottom.js` and `next-page.js` no longer used in SKILL.md loop flow
- **New**: `json-helper.mjs` subcommands `merge-page-files` and `build-final-from-pages` for per-page file merging

### Key Changes in v3.0
- **New: find-interactive-elements.js**: Scans page for all interactive elements, returns JSON saved as `scripts/interactive-elements.json`
- **New: input-search-query.js**: Input search query only (params: `inputSelector`, `query`)
- **New: click-search-button.js**: Click search button only (params: `inputSelector`, `buttonSelector`)
- **Removed: perform-search.js**: Replaced by three independent scripts (find → input → click)
- **JSON File Pattern**: Selectors saved to `interactive-elements.json`, bash reads and passes as parameters
  - Input box: `id="advancedSearchInputArea"`
  - Search button: `class="mdc-button__label interactive-highlight"` with text "Search"
- **Three-Step Search Pattern**: First locate elements with find-interactive-elements.js, then input query with input-search-query.js, then click with click-search-button.js
- **alldb Path Support**: All URLs updated from `woscc` to `alldb` for broader database access
- **Enhanced Click Methods**: Added mousedown→mouseup→click sequence and complete Enter key event chain
- **Element Verification**: Confirms both input box and search button are present before attempting search

### Key Changes in v2.6.1
- **Enhanced Auto-click Search**: Multiple click methods (click(), focus+dispatchEvent, form.submit(), Enter key) - ensures search execution
- **Enhanced Button Search**: Support multiple selectors including Angular Web Components
- **Detailed Logging**: Shows found button selector and button text

### Key Changes in v2.6
- **Forced Time Range**: Time range is mandatory! Empty or "all" will automatically use "recent-5-years" as default
- **Enhanced Execution Flow**: Check page readiness before executing search (using diagnose-page.js)
- **Time Range Support**: Added `yearRange` parameter with PY= field support (now in input-search-query.js)
- **Campus Network Optimization**: Simplified login detection, assumes direct access
- **Independent Markdown Generation**: Added generate-markdown-report.js for standalone report generation
- **New: Paper Detail Extraction**: Added open-paper-detail.js and enhanced extract-detail.js

### Time Range Format (Required)
- `"recent-5-years"`: **Default - Recent 5 years (REQUIRED IF NO USER INPUT)**
- `"recent-10-years"`: Recent 10 years
- `"recent-20-years"`: Recent 20 years
- `"YYYY-YYYY"`: Year range (e.g., "2018-2024")
- `"YYYY TO YYYY"`: Web of Science format
- `"YYYY"`: Single year
- `"all"` or `""`: **Will be converted to "recent-5-years" automatically**

## Notes

1. **Script Encoding**: All scripts use UTF-8 encoding
2. **Parameter Passing**: Parameters are passed to script functions via inline JS code
3. **Result Caching**: Results from `extract-papers-v2.js` should be saved to JSON files via `json-helper.mjs`
4. **Error Logging**: It is recommended to save script returns as logs for debugging
5. **Selector Updates**: If Web of Science updates page structure, update selectors in `extract-papers-v2.js`
6. **Journal Names**: Use full journal names (not abbreviations) for journal scope searches
7. **Network Environment**: The skill assumes campus network environment where Web of Science is accessible without login. It attempts search directly and reports failure only after all retry attempts fail.
8. **Virtual Scrolling**: WoS uses virtual scrolling — only viewport-visible elements are in DOM. **Direct `scrollTo(0, height)` skips intermediate records** — virtual scroll does NOT render skipped content (tested: 50 records page yielded only 6). Must use `scroll-to-render.js` with incremental step-scrolling: bash loops with `offset += 500`, calling `scroll-to-render.js($offset)` each step to trigger rendering incrementally, then multi-round height stability check. Do NOT use `scroll-to-bottom.js` (async Promise), fixed offset `for offset in ...` loops, or direct `scrollTo(0, height)` — all will miss records.
9. **Pagination in Loops**: When implementing pagination loops, check button state and click in separate steps. `next-page.js` does both simultaneously, causing page-skip bugs in loops.