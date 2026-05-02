#!/bin/bash
# Web of Science 分步检索执行脚本
# 将复杂的检索过程分解为简单步骤，避免eval复杂JavaScript
# Windows兼容版本

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 获取端口
PORT="${CDP_PROXY_PORT:-3456}"

# 简单jq替代函数
jq_value() {
    local key="$1"
    local input="$2"
    node -e "const d=$input; const k='$key'; const v=k.split('.').reduce((o,i)=>o&&o[i], d); console.log(v||'')"
}

jq_bool() {
    local key="$1"
    local input="$2"
    node -e "const d=$input; const k='$key'; const v=k.split('.').reduce((o,i)=>o&&o[i], d); console.log(v===true?'true':'false')"
}

echo "=== Web of Science 分步检索 ==="
echo "开始时间: $(date)"

# 参数设置
SEARCH_KEYWORDS="${1:-volatility, asset pricing}"
JOURNAL_SCOPE="${2:-Journal of Finance, Journal of Financial Economics, Review of Financial Studies}"
YEAR_RANGE="${3:-recent-5-years}"

echo "检索参数:"
echo "  关键词: $SEARCH_KEYWORDS"
echo "  期刊范围: $JOURNAL_SCOPE"
echo "  时间范围: $YEAR_RANGE"
echo "使用端口: $PORT"

# 步骤1: 打开高级检索页面
echo ""
echo "=== 步骤1: 打开高级检索页面 ==="
RESPONSE=$(curl -s "http://localhost:$PORT/new?url=https://webofscience.clarivate.cn/wos/woscc/advanced-search")
echo "响应: $RESPONSE"

# 提取targetId (简单字符串处理)
TARGET_ID=$(echo "$RESPONSE" | sed 's/.*"targetId":"\([^"]*\)".*/\1/')
if [ -z "$TARGET_ID" ] || [ "$TARGET_ID" = "$RESPONSE" ]; then
    TARGET_ID=$(echo "$RESPONSE" | sed 's/.*targetId.*:.*"\([^"]*\)".*/\1/')
fi
echo "目标页面ID: $TARGET_ID"

if [ -z "$TARGET_ID" ]; then
    echo "错误: 无法获取targetId，请检查web-access代理状态"
    exit 1
fi

sleep 3

# 步骤2: 诊断页面状态
echo ""
echo "=== 步骤2: 诊断页面状态 ==="
DIAGNOSE_SCRIPT=$(cat "$SCRIPT_DIR/diagnose-page.js")
DIAGNOSE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET_ID" --data-raw "$DIAGNOSE_SCRIPT")
echo "页面诊断完成"

# 提取按钮文本
BUTTONS_TEXT=$(echo "$DIAGNOSE_RESULT" | sed 's/.*"buttons":\[/[/' | sed 's/\].*/]/' | head -c 500)
echo "按钮信息: ${BUTTONS_TEXT:0:200}..."

# 步骤3: 点击输入框激活焦点
echo ""
echo "=== 步骤3: 点击输入框 ==="
CLICK_RESULT=$(curl -s -X POST "http://localhost:$PORT/click?target=$TARGET_ID" --data-raw "#advancedSearchInputArea")
echo "点击结果: $CLICK_RESULT"
sleep 1

# 步骤4: 使用简单脚本构建检索式
echo ""
echo "=== 步骤4: 构建检索式 ==="
SIMPLE_SEARCH_SCRIPT=$(cat "$SCRIPT_DIR/perform-search-simple.js")
SEARCH_PARAMS=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET_ID" --data-raw "($SIMPLE_SEARCH_SCRIPT)('$SEARCH_KEYWORDS', '$JOURNAL_SCOPE', '$YEAR_RANGE')")

echo "检索参数结果: $SEARCH_PARAMS"

# 提取关键字段
QUERY=$(echo "$SEARCH_PARAMS" | sed 's/.*"query":"\([^"]*\)".*/\1/' | sed 's/\\"/"/g')
INPUT_SELECTOR=$(echo "$SEARCH_PARAMS" | sed 's/.*"inputSelector":"\([^"]*\)".*/\1/')
BUTTON_SELECTOR=$(echo "$SEARCH_PARAMS" | sed 's/.*"buttonSelector":"\([^"]*\)".*/\1/')

if [ -z "$INPUT_SELECTOR" ] || [ "$INPUT_SELECTOR" = "null" ]; then
    INPUT_SELECTOR="#advancedSearchInputArea"
fi

if [ -z "$BUTTON_SELECTOR" ] || [ "$BUTTON_SELECTOR" = "null" ]; then
    BUTTON_SELECTOR="button"
fi

echo "检索式: ${QUERY:0:100}..."
echo "输入框选择器: $INPUT_SELECTOR"
echo "按钮选择器: $BUTTON_SELECTOR"

# 步骤5: 设置输入框值
echo ""
echo "=== 步骤5: 设置输入框值 ==="

# 转义查询字符串中的引号
QUERY_ESCAPED=$(echo "$QUERY" | sed 's/"/\\"/g')
SET_VALUE_SCRIPT="const input = document.querySelector('${INPUT_SELECTOR}'); if (input) { input.value = \"${QUERY_ESCAPED}\"; return {success: true, valueSet: input.value.substring(0, 50)}; } else { return {success: false, error: '找不到输入框'}; }"

SET_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET_ID" --data-raw "$SET_VALUE_SCRIPT")
echo "设置结果: $SET_RESULT"

# 步骤6: 点击Search按钮
echo ""
echo "=== 步骤6: 点击Search按钮 ==="

# 尝试多种按钮选择器
BUTTON_CLICK_RESULT=""
for selector in "button[aria-label*='Search']" "button[type='submit']" "button"; do
    echo "尝试选择器: $selector"
    BUTTON_CLICK_RESULT=$(curl -s -X POST "http://localhost:$PORT/click?target=$TARGET_ID" --data-raw "$selector")
    echo "  结果: $BUTTON_CLICK_RESULT"

    # 检查是否点击成功
    if echo "$BUTTON_CLICK_RESULT" | grep -q '"clicked":true'; then
        echo "  点击成功!"
        break
    fi
done

# 步骤7: 等待页面跳转
echo ""
echo "=== 步骤7: 等待页面跳转 ==="
echo "等待8秒让页面跳转到结果页..."
sleep 8

# 检查当前页面URL
PAGE_INFO=$(curl -s "http://localhost:$PORT/info?target=$TARGET_ID")
echo "页面信息: $PAGE_INFO"

CURRENT_URL=$(echo "$PAGE_INFO" | sed 's/.*"url":"\([^"]*\)".*/\1/')
CURRENT_TITLE=$(echo "$PAGE_INFO" | sed 's/.*"title":"\([^"]*\)".*/\1/')

echo "当前页面:"
echo "  标题: $CURRENT_TITLE"
echo "  URL: $CURRENT_URL"

# 检查是否在结果页面
if echo "$CURRENT_URL" | grep -q "result"; then
    echo "成功跳转到结果页面！"

    # 步骤8: 提取结果
    echo ""
    echo "=== 步骤8: 提取结果 ==="
    EXTRACT_SCRIPT=$(cat "$SCRIPT_DIR/extract-papers.js")
    EXTRACT_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=$TARGET_ID" --data-raw "$EXTRACT_SCRIPT")

    echo "提取结果: ${EXTRACT_RESULT:0:500}..."

    # 提取论文数量
    PAPER_COUNT=$(echo "$EXTRACT_RESULT" | sed 's/.*"totalPapers":\([0-9]*\).*/\1/')
    echo "检索到论文数量: $PAPER_COUNT"

    if [ "$PAPER_COUNT" -gt 0 ] 2>/dev/null; then
        # 保存结果
        RESULTS_DIR="E:/Claude code/test/SEARCH_RESULTS"
        mkdir -p "$RESULTS_DIR"
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        TOPIC_SLUG="volatility_asset_pricing"

        # 保存JSON
        echo "$EXTRACT_RESULT" > "${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json"
        echo "结果已保存: ${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json"

        # 简单提取标题
        echo ""
        echo "=== 前3篇文献标题 ==="
        echo "$EXTRACT_RESULT" | grep -o '"title":"[^"]*"' | head -3 | sed 's/"title":"//' | sed 's/"//'

    else
        echo "警告: 未能提取论文数量或检索到0篇"
    fi

else
    echo "可能未成功跳转到结果页面"
    echo ""
    echo "=== 手动操作建议 ==="
    echo "检索式已准备好，请手动:"
    echo "1. 在Web of Science页面输入框中粘贴以下检索式:"
    echo "=========================================="
    echo "$QUERY"
    echo "=========================================="
    echo "2. 点击Search按钮"
fi

echo ""
echo "=== 分步检索完成 ==="
echo "结束时间: $(date)"