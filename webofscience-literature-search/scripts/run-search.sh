#!/bin/bash
# run-search.sh — One-shot WoS search pipeline
# Usage: bash run-search.sh "SEARCH_KEYWORDS" "JOURNAL_SCOPE" "YEAR_RANGE" "SEARCH_TOPIC"
# Example: bash run-search.sh '"liquidity" AND "asset pricing"' "Journal of Finance,Journal of Financial Economics" "2021-2026" "liquidity and asset pricing"
#
# This script combines steps 1-4 into a single automated pipeline:
#   Step 1: Initialize page + find interactive elements
#   Step 2: Build query + input into search box
#   Step 3: Click search + wait for results + scroll + extract
#   Step 4: Retry on failure (refresh or direct URL)
#
# All variables are passed within this single shell process, no cross-call state loss.

set -euo pipefail

SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"
source "$SKILL_DIR/scripts/search-utils.sh" 2>/dev/null || true

# ── Arguments ──────────────────────────────────────────────
SEARCH_KEYWORDS="${1:?Usage: run-search.sh KEYWORDS JOURNAL_SCOPE YEAR_RANGE TOPIC}"
JOURNAL_SCOPE="${2:-}"           # empty = all journals
YEAR_RANGE="${3:-recent-5-years}"
SEARCH_TOPIC="${4:-search}"

RESULTS_DIR="SEARCH_RESULTS"
mkdir -p "$RESULTS_DIR"

PORT="${CDP_PROXY_PORT:-3457}"
TARGET=""   # will be set when we open the page

# ── Helper functions ───────────────────────────────────────

# CDP Proxy returns {"value": {...}} wrapper.
# strip_value: piped before json-helper to remove .value wrapper
strip_value() {
  node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{
        const o=JSON.parse(d);
        const v=o.value!==undefined?o.value:o;
        process.stdout.write(JSON.stringify(v))
      }catch(e){process.stdout.write(d)}
    })
  "
}

json_read_stdin()  { strip_value | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin "$1"; }
json_read()        { node "$SKILL_DIR/scripts/json-helper.mjs" read "$1" "$2"; }
json_save_pretty() { strip_value | node "$SKILL_DIR/scripts/json-helper.mjs" save-pretty "$1"; }

# Build WoS query string from parameters
build_query() {
  local keywords="$1"
  local journal="$2"
  local year_range="$3"

  local query="TS=(${keywords})"

  if [ -n "$journal" ]; then
    local journal_part
    journal_part=$(echo "$journal" | sed 's/,/" OR "/g' | sed 's/^/"/;s/$/"/')
    query="${query} AND SO=(${journal_part})"
  fi

  local year_part=""
  local yr_lower
  yr_lower=$(echo "$year_range" | tr '[:upper:]' '[:lower:]')

  if echo "$yr_lower" | grep -qE 'recent[- ]?[0-9]+[- ]?years?'; then
    local years_ago
    years_ago=$(echo "$yr_lower" | grep -oE '[0-9]+' | head -1)
    local start_year=$(( $(date +%Y) - years_ago ))
    year_part="PY=(${start_year}-$(date +%Y))"
  elif echo "$yr_lower" | grep -qE '^[0-9]{4}-[0-9]{4}$'; then
    year_part="PY=(${year_range})"
  elif echo "$yr_lower" | grep -qE '^[0-9]{4}$'; then
    year_part="PY=(${year_range})"
  fi

  if [ -n "$year_part" ]; then
    query="${query} AND ${year_part}"
  fi

  echo "$query"
}

# Adaptive step-scroll: 500px increments with delay, repeat until page height stabilizes
adaptive_scroll() {
  echo "[scroll] Starting adaptive step-scroll..."
  local prev_height=0
  for round in {1..10}; do
    local offset=0
    local curr_height=0
    while true; do
      local scroll_result
      scroll_result=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
        --data-raw "($(cat $SKILL_DIR/scripts/scroll-to-render.js))($offset)")
      curr_height=$(echo "$scroll_result" | json_read_stdin '.scrollHeight // 0' || echo 0)
      if [ "$offset" -ge "$curr_height" ]; then break; fi
      offset=$((offset + 500))
      # Give virtual scrolling time to render between steps
      sleep 0.3
    done
    echo "[scroll] Round $round: height=$curr_height (prev=$prev_height)"
    if [ "$curr_height" -eq "$prev_height" ] && [ "$curr_height" -gt 0 ]; then
      echo "[scroll] Height stable at $curr_height"
      break
    fi
    prev_height=$curr_height
    sleep 2
  done
}

# Extract papers from current page, return totalPapers count
extract_papers() {
  local extract_result
  extract_result=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
    --data-raw "$(cat $SKILL_DIR/scripts/extract-papers-v2.js)")
  local total
  # json_read_stdin already strips .value wrapper
  total=$(echo "$extract_result" | json_read_stdin '.totalResults // .totalPapers // "0"' 2>/dev/null || echo "0")
  # Also try numeric totalPapers from paperCount
  if [ "$total" = "0" ] || [ -z "$total" ]; then
    total=$(echo "$extract_result" | json_read_stdin '.paperCount // 0' 2>/dev/null || echo 0)
  fi
  # Save raw result for debugging
  echo "$extract_result" | json_save_pretty "${RESULTS_DIR}/_last_extract.json"
  echo "$total"
}

# ── Step 1: Initialize page ────────────────────────────────

echo "=== Step 1: Initialize page ==="

# Check environment
bash "$SKILL_DIR/scripts/check-env.sh"
PORT="${CDP_PROXY_PORT:-3457}"

# If proxy switched to a non-default port, kill the old proxy on 3457 first
# to avoid stale Tab state leaking across proxy instances
if [ "$PORT" != "3457" ]; then
  echo "[init] Port conflict detected (using $PORT instead of 3457)"
  echo "[init] Shutting down stale proxy on port 3457..."
  curl -s "http://localhost:3457/shutdown" 2>/dev/null || true
  sleep 2
  # Restart on the default port now that it's free
  echo "[init] Restarting proxy on default port 3457..."
  bash "$SKILL_DIR/scripts/check-env.sh"
  PORT="${CDP_PROXY_PORT:-3457}"
  echo "[init] Proxy now on port $PORT"
fi

# Open WoS advanced search
OPEN_RESULT=$(curl -s "http://localhost:$PORT/new?url=https://webofscience.clarivate.cn/wos/alldb/advanced-search")
TARGET=$(echo "$OPEN_RESULT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const o=JSON.parse(d);console.log(o.targetId||'')}catch(e){console.log('')}})")
echo "[init] Target ID: $TARGET"

sleep 5

# Find interactive elements (with retry)
echo "[init] Finding interactive elements..."
INTERACTIVE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
  --data-raw "$(cat $SKILL_DIR/scripts/find-interactive-elements.js)")

echo "$INTERACTIVE_RESULT" | json_save_pretty "$SKILL_DIR/scripts/interactive-elements.json"

READY=$(echo "$INTERACTIVE_RESULT" | json_read_stdin '.elementStatus.ready // .elementStatus.ready // false')

if [ "$READY" != "true" ]; then
  echo "[init] Elements not ready, retrying in 5s..."
  sleep 5
  INTERACTIVE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
    --data-raw "$(cat $SKILL_DIR/scripts/find-interactive-elements.js)")
  echo "$INTERACTIVE_RESULT" | json_save_pretty "$SKILL_DIR/scripts/interactive-elements.json"
  READY=$(echo "$INTERACTIVE_RESULT" | json_read_stdin '.elementStatus.ready // .elementStatus.ready // false')
fi

INPUT_SELECTOR=$(json_read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchInput.selector // .targetElements.searchInput.selector // ""')
BUTTON_SELECTOR=$(json_read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchButton.selector // .targetElements.searchButton.selector // ""')

echo "[init] Input selector: $INPUT_SELECTOR"
echo "[init] Button selector: $BUTTON_SELECTOR"

if [ -z "$INPUT_SELECTOR" ] || [ -z "$BUTTON_SELECTOR" ]; then
  echo "[FATAL] Could not locate search input or button. Aborting."
  exit 1
fi

# ── Step 2: Build query + input ────────────────────────────

echo ""
echo "=== Step 2: Build query + input ==="

SEARCH_QUERY=$(build_query "$SEARCH_KEYWORDS" "$JOURNAL_SCOPE" "$YEAR_RANGE")
echo "[query] $SEARCH_QUERY"

INPUT_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
  --data-raw "($(cat $SKILL_DIR/scripts/input-search-query.js))('${INPUT_SELECTOR}', '${SEARCH_QUERY}')")

INPUT_SUCCESS=$(echo "$INPUT_RESULT" | json_read_stdin '.success // .success // false')
echo "[input] Success: $INPUT_SUCCESS"

# ── Step 3: Click search + wait + scroll + extract ─────────

echo ""
echo "=== Step 3: Click search + extract ==="

CLICK_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
  --data-raw "($(cat $SKILL_DIR/scripts/click-search-button.js))('${INPUT_SELECTOR}', '${BUTTON_SELECTOR}')")
echo "[click] Done"

# Wait for results page
echo "[wait] Waiting for results page..."
PAGE_LOADED=false
for i in {1..10}; do
  sleep 3
  PAGE_STATUS=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
    --data-raw "$(cat $SKILL_DIR/scripts/check-page-ready.js)")
  if echo "$PAGE_STATUS" | grep -qE '"pageType":"results"|"ready":true'; then
    PAGE_LOADED=true
    break
  fi
  echo "[wait] $((i*3))s elapsed..."
done

if [ "$PAGE_LOADED" != "true" ]; then
  echo "[wait] Timeout, extra 5s..."
  sleep 5
fi

# Diagnose page
DIAGNOSE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
  --data-raw "$(cat $SKILL_DIR/scripts/diagnose-page.js)")
PAGE_TITLE=$(echo "$DIAGNOSE_RESULT" | json_read_stdin '.pageInfo.title // ""' 2>/dev/null || echo "")
echo "[diagnose] Page title: $PAGE_TITLE"

# Scroll + extract first attempt
adaptive_scroll
TOTAL_PAPERS=$(extract_papers)
echo "[extract] Attempt 1: totalPapers=$TOTAL_PAPERS"

# ── Step 4: Retry on failure ───────────────────────────────

if [ "$TOTAL_PAPERS" = "0" ] || [ -z "$TOTAL_PAPERS" ]; then
  echo ""
  echo "=== Step 4: Retry (refresh page) ==="

  curl -s "http://localhost:$PORT/navigate?target=$TARGET&url=https://webofscience.clarivate.cn/wos/alldb/advanced-search"
  sleep 3

  # Re-find elements
  INTERACTIVE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
    --data-raw "$(cat $SKILL_DIR/scripts/find-interactive-elements.js)")
  echo "$INTERACTIVE_RESULT" | json_save_pretty "$SKILL_DIR/scripts/interactive-elements.json"

  INPUT_SELECTOR=$(json_read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchInput.selector // .targetElements.searchInput.selector // ""')
  BUTTON_SELECTOR=$(json_read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchButton.selector // .targetElements.searchButton.selector // ""')

  # Re-input + re-click
  curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
    --data-raw "($(cat $SKILL_DIR/scripts/input-search-query.js))('${INPUT_SELECTOR}', '${SEARCH_QUERY}')"

  curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
    --data-raw "($(cat $SKILL_DIR/scripts/click-search-button.js))('${INPUT_SELECTOR}', '${BUTTON_SELECTOR}')"

  sleep 8
  adaptive_scroll
  TOTAL_PAPERS=$(extract_papers)
  echo "[extract] Attempt 2 (refresh): totalPapers=$TOTAL_PAPERS"
fi

if [ "$TOTAL_PAPERS" = "0" ] || [ -z "$TOTAL_PAPERS" ]; then
  echo ""
  echo "=== Step 4: Retry (direct URL) ==="

  QUERY_FOR_URL=$(echo "${SEARCH_QUERY}" | node "$SKILL_DIR/scripts/json-helper.mjs" url-encode)
  curl -s "http://localhost:$PORT/navigate?target=$TARGET&url=https://webofscience.clarivate.cn/wos/alldb/result?count=50&Q=$QUERY_FOR_URL"
  sleep 5

  adaptive_scroll
  TOTAL_PAPERS=$(extract_papers)
  echo "[extract] Attempt 3 (direct URL): totalPapers=$TOTAL_PAPERS"
fi

# ── Step 5: Multi-page extraction (if success) ─────────────

if [ "$TOTAL_PAPERS" = "0" ] || [ -z "$TOTAL_PAPERS" ]; then
  echo ""
  echo "=== ALL ATTEMPTS FAILED ==="
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  TOPIC_SLUG=$(echo "${SEARCH_TOPIC}" | tr ' ' '_' | tr -dc 'a-zA-Z0-9_')
  cat > "${RESULTS_DIR}/${TOPIC_SLUG}_failure_${TIMESTAMP}.md" << EOF
# Web of Science Search Failure Record

## Basic Info
- **Search task**: ${SEARCH_TOPIC}
- **Search query**: ${SEARCH_QUERY}
- **Failure time**: $(date -Iseconds 2>/dev/null || date)
- **Target database**: Web of Science Core Collection

## Actions Attempted
- [x] Attempt 1: Advanced search page
- [x] Attempt 2: Refresh page and retry
- [x] Attempt 3: Direct result page URL

---
*Auto-generated by run-search.sh*
EOF
  echo "Failure record saved."
  exit 1
fi

echo ""
echo "=== Step 5: Multi-page extraction ==="

# Reset scroll to top before multi-page extraction starts.
# After Step 3 the page is scrolled to the bottom, and virtual scrolling
# unloads DOM elements outside the viewport.  Without scrolling back to top,
# the re-scroll in Step 5 cannot re-render those unloaded elements, resulting
# in 0 papers extracted.
echo "[reset] Scrolling to top to reset virtual scroll state..."
curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
  --data-raw "(function(){ window.scrollTo(0,0); return 'ok'; })()"
sleep 2

TEMP_DIR="${RESULTS_DIR}/temp_pages_$$"
mkdir -p "$TEMP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TOPIC_SLUG=$(echo "${SEARCH_TOPIC}" | tr ' ' '_' | tr -dc 'a-zA-Z0-9_')

PAGE_NUMBER=1
MAX_PAGES=50
CONSECUTIVE_EMPTY=0

while [ "$PAGE_NUMBER" -le "$MAX_PAGES" ]; do
  echo ""
  echo "--- Page $PAGE_NUMBER ---"

  # Wait for page ready
  for wait_i in {1..5}; do
    sleep 3
    PAGE_STATUS=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
      --data-raw "$(cat $SKILL_DIR/scripts/check-page-ready.js)")
    if echo "$PAGE_STATUS" | grep -q '"ready":true'; then break; fi
  done

  # Reset scroll to top (needed after pagination, which may leave page scrolled)
  if [ "$PAGE_NUMBER" -gt 1 ]; then
    curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
      --data-raw "(function(){ window.scrollTo(0,0); return 'ok'; })()"
    sleep 1
  fi

  # Scroll
  adaptive_scroll

  # Expand abstracts
  SHOW_MORE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
    --data-raw "$(cat $SKILL_DIR/scripts/click-show-more.js)")
  SHOW_MORE_CLICKED=$(echo "$SHOW_MORE_RESULT" | json_read_stdin '.clickedCount // 0' || echo 0)
  echo "  Expanded $SHOW_MORE_CLICKED abstracts"

  # Extract
  EXTRACT_JSON=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
    --data-raw "$(cat $SKILL_DIR/scripts/extract-papers-v2.js)")

  PAGE_PAPERS=$(echo "$EXTRACT_JSON" | strip_value | node "$SKILL_DIR/scripts/json-helper.mjs" extract-field-stdin '.papers // []' 2>/dev/null || echo "[]")
  PAGE_COUNT=$(echo "$PAGE_PAPERS" | node "$SKILL_DIR/scripts/json-helper.mjs" length-stdin 2>/dev/null || echo 0)
  EXTRACT_SUCCESS=$(echo "$EXTRACT_JSON" | json_read_stdin '.success // "true"' 2>/dev/null || echo "true")

  echo "  Page $PAGE_NUMBER: extracted $PAGE_COUNT papers"

  if [ "$EXTRACT_SUCCESS" = "true" ] && [ "$PAGE_COUNT" -gt 0 ]; then
    CONSECUTIVE_EMPTY=0
    PAGE_PAPERS_TAGGED=$(echo "$PAGE_PAPERS" | node "$SKILL_DIR/scripts/json-helper.mjs" add-page-number "$PAGE_NUMBER" 2>/dev/null || echo "$PAGE_PAPERS")
    echo "$PAGE_PAPERS_TAGGED" | json_save_pretty "${TEMP_DIR}/page_$(printf '%03d' $PAGE_NUMBER).json"
  else
    CONSECUTIVE_EMPTY=$((CONSECUTIVE_EMPTY + 1))
    echo "  Warning: empty page (consecutive: $CONSECUTIVE_EMPTY)"
    if [ "$CONSECUTIVE_EMPTY" -ge 2 ]; then
      echo "  2 consecutive empty pages, stopping"
      break
    fi
  fi

  # Check next page
  HAS_NEXT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
    --data-raw "(function(){ var b=document.querySelector('button[aria-label=\"Top Next Page\"]'); return b?!b.disabled:false; })()")
  HAS_NEXT_VAL=$(echo "$HAS_NEXT" | json_read_stdin '.' 2>/dev/null || echo "false")

  if [ "$HAS_NEXT_VAL" != "true" ]; then
    echo "  No more pages"
    break
  fi

  # Click next page
  curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET" \
    --data-raw "(function(){ var b=document.querySelector('button[aria-label=\"Top Next Page\"]'); if(b)b.click(); })()"
  echo "  Clicked next page"

  PAGE_NUMBER=$((PAGE_NUMBER + 1))
  sleep 5
done

# Merge pages into final JSON
echo ""
echo "=== Merging pages ==="
node "$SKILL_DIR/scripts/json-helper.mjs" build-final-from-pages "$TEMP_DIR" \
  --query "${SEARCH_QUERY}" \
  --topic "${SEARCH_TOPIC}" \
  --journal "${JOURNAL_SCOPE}" \
  --year-range "${YEAR_RANGE}" \
  --timestamp "$TIMESTAMP" \
  --output "${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json"

# Generate Markdown report
echo "=== Generating Markdown report ==="
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json', 'utf8'));
const papers = data.papers || [];
const valid = papers.filter(r => r && (r.title || '').trim().length > 3);
const sorted = [...valid].sort((a, b) => {
  const ca = parseInt(String(a.citations || '0').replace(/,/g, '')) || 0;
  const cb = parseInt(String(b.citations || '0').replace(/,/g, '')) || 0;
  return cb - ca;
});
const yearStats = {};
valid.forEach(r => { const y = (r.publishDate||'').match(/\\d{4}/)?.[0]||'Unknown'; yearStats[y]=(yearStats[y]||0)+1; });
const jStats = {};
valid.forEach(r => { const j=(r.journal||'').trim(); if(j) jStats[j]=(jStats[j]||0)+1; });
const topJ = Object.entries(jStats).sort((a,b)=>b[1]-a[1]).slice(0,10);

let md = '# Web of Science Literature Search Report\\n\\n';
md += '## Search Overview\\n\\n';
md += '- **Search Time**: ' + data.timestamp + '\\n';
md += '- **Topic**: ' + (data.topic||'N/A') + '\\n';
md += '- **Query**: ' + (data.searchQuery||'N/A') + '\\n';
md += '- **Journal Scope**: ' + (data.journalScope||'All') + '\\n';
md += '- **Year Range**: ' + (data.yearRange||'All') + '\\n';
md += '- **Total Results**: ' + data.totalPapers + ' papers from ' + data.totalPages + ' pages\\n\\n';

md += '## Paper List (Sorted by Citations)\\n\\n';
md += '| # | Title | Authors | Journal | Date | Citations |\\n';
md += '|---|-------|---------|---------|------|----------|\\n';
sorted.forEach((r,i) => {
  md += '| '+(i+1)+' | '+(r.title||'').substring(0,70).replace(/\\|/g,'\\\\|')+' | '+(r.authors||'').substring(0,25).replace(/\\|/g,'\\\\|')+' | '+(r.journal||'').substring(0,25).replace(/\\|/g,'\\\\|')+' | '+(r.publishDate||'')+' | '+(r.citations||'-')+' |\\n';
});

md += '\\n## Year Distribution\\n\\n';
Object.entries(yearStats).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([y,c]) => { md += '- **'+y+'**: '+c+' papers\\n'; });

md += '\\n## Journal Distribution\\n\\n';
topJ.forEach(([j,c],i) => { md += (i+1)+'. **'+j+'**: '+c+' papers\\n'; });

md += '\\n## Top 20 Most Cited Papers (with Abstracts)\\n\\n';
sorted.slice(0,20).forEach((r,i) => {
  md += '### '+(i+1)+'. '+(r.title||'No title')+'\\n\\n';
  md += '- **Authors**: '+(r.authors||'N/A')+'\\n';
  md += '- **Journal**: '+(r.journal||'N/A')+' ('+(r.publishDate||'N/A')+')\\n';
  md += '- **Citations**: '+(r.citations||'-')+'\\n';
  if(r.abstract) md += '- **Abstract**: '+r.abstract+'\\n';
  md += '\\n';
});

md += '---\\n*Report generated: '+new Date().toISOString()+'*\\n';
fs.writeFileSync('${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.md', md, 'utf8');
console.log('Markdown saved: ${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.md');
"

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Final summary
FINAL_TOTAL=$(json_read "${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json" '.totalPapers // 0')
FINAL_PAGES=$(json_read "${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json" '.totalPages // 0')

echo ""
echo "========================================="
echo "  Search Complete"
echo "========================================="
echo "  Keywords:  $SEARCH_KEYWORDS"
echo "  Journal:   ${JOURNAL_SCOPE:-all}"
echo "  Year:      $YEAR_RANGE"
echo "  Papers:    $FINAL_TOTAL"
echo "  Pages:     $FINAL_PAGES"
echo "  JSON:      ${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json"
echo "  Markdown:  ${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.md"
echo "========================================="
