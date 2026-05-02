#!/bin/bash
# webofscience-literature-search 环境检测脚本
# 检测 web-access 技能路径并获取 CDP 端口

set -e

echo "=== Web of Science 文献检索 - 环境检测 ==="
echo "检测时间: $(date)"
echo ""

# 检测操作系统
OS="$(uname -s)"
case "${OS}" in
    Linux*)     OS_NAME=Linux ;;
    Darwin*)    OS_NAME=macOS ;;
    CYGWIN*)    OS_NAME=Windows ;;
    MINGW*)     OS_NAME=Windows ;;
    MSYS*)      OS_NAME=Windows ;;
    *)          OS_NAME="Unknown:${OS}" ;;
esac

echo "操作系统: $OS_NAME"

# 尝试多种可能的 web-access 路径
WEB_ACCESS_PATHS=(
    # Unix-like 系统
    "$HOME/.claude/skills/web-access"
    # Windows 系统
    "$USERPROFILE/.claude/skills/web-access"
    "$APPDATA/.claude/skills/web-access"
    "$LOCALAPPDATA/.claude/skills/web-access"
    # 通过环境变量
    "${CLAUDE_SKILLS_PATH:-}/web-access"
    "${CLAUDE_PROJECT_HOME:-}/skills/web-access"
    # 相对路径（如果从技能目录运行）
    "../web-access"
    "../../web-access"
    # 当前目录
    "./web-access"
)

# 寻找有效的 web-access 路径
WEB_ACCESS_PATH=""
for path in "${WEB_ACCESS_PATHS[@]}"; do
    if [ -f "$path/scripts/check-deps.mjs" ]; then
        WEB_ACCESS_PATH="$path"
        echo "找到 web-access 技能: $WEB_ACCESS_PATH"
        break
    fi
done

if [ -z "$WEB_ACCESS_PATH" ]; then
    echo "错误: 未找到 web-access 技能"
    echo "可能的路径:"
    for path in "${WEB_ACCESS_PATHS[@]}"; do
        echo "  $path"
    done
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装或不在 PATH 中"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "Node.js 版本: $NODE_VERSION"

# 运行 web-access 的检查脚本
echo ""
echo "=== 启动 web-access 依赖检测 ==="

# 统一路径处理，Node.js 可以处理正斜杠路径
node "$WEB_ACCESS_PATH/scripts/check-deps.mjs"

# 将检测到的端口写入临时文件，供父脚本读取
# 子进程环境变量隔离导致 CDP_PROXY_PORT 无法传播到父进程
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "${CDP_PROXY_PORT:-3456}" > "$SCRIPT_DIR/.cdp_port"

# 检查端口变量
echo ""
echo "=== 环境变量检查 ==="
echo "CDP_PROXY_PORT: ${CDP_PROXY_PORT:-未设置}"
echo "CLAUDE_SKILLS_PATH: ${CLAUDE_SKILLS_PATH:-未设置}"
echo "CLAUDE_PROJECT_HOME: ${CLAUDE_PROJECT_HOME:-未设置}"

echo ""
echo "环境检测完成。"