---
name: webofscience-literature-search
description: 指导 AI 使用 web-access 在 Web of Science 平台进行专业学术文献检索。依赖 web-access 提供 CDP 浏览器能力，必须在初始化时先检测 web-access 状态并获取 CDP Proxy 端口（禁止硬编码）。**先与用户确认检索需求**（提炼关键词、确认期刊范围和时间范围），再执行检索。**校园网环境无需登录**，直接尝试检索。**支持多页翻页提取**，自动翻阅所有结果页面并合并文献数据。检索完成后**先询问用户感兴趣的具体话题**，再启动相关性分析。自动保存 JSON 和 Markdown 报告到 SEARCH_RESULTS/ 文件夹。
---

# Web of Science 学术文献检索工具

本 SKILL 指导 AI 使用 web-access 在 Web of Science 平台进行专业学术文献检索。所有 JavaScript 脚本已提取到 `scripts/` 目录。

## 核心原则

### 1. 校园网无需登录
- **适用场景**：高校/研究机构校园网内可直接访问 Web of Science
- **直接尝试检索**：不检查登录状态，直接执行检索操作
- **结果导向**：通过检索结果判断是否成功，不考虑登录状态
- **失败重试**：最多尝试 3 种不同方式，全部失败后记录原因并结束
- **支持时间范围**：使用 PY= 字段限制发表年份

### 2. web-access 依赖
- **先检测，后操作**：必须先运行 check-env.sh 脚本获取端口
- **禁止硬编码端口**：使用 `${CDP_PROXY_PORT:-3457}` 获取端口号

### 3. 脚本文件调用
- 所有 JS 脚本位于 skill 目录下的 `scripts/` 子目录
- **必须在每个 Bash 脚本开头设置 `SKILL_DIR` 变量**，指向 skill 的绝对路径，后续所有脚本引用均基于此变量
- 使用 `--data-raw "$(cat $SKILL_DIR/scripts/filename.js")"` 方式调用（**必须用双引号**，确保 `$SKILL_DIR` 变量展开）

**路径设置规则**（每个 Bash 调用的第一行）：
```bash
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"
```

**错误示例**（禁止使用）：
```bash
# ❌ 单引号：变量不展开，cat 报错 No such file or directory
$(cat '$SKILL_DIR/scripts/scroll-to-render.js')
# ❌ 相对路径：CWD 是项目目录而非 skill 目录，找不到脚本
$(cat scripts/scroll-to-render.js)
# ❌ 硬编码绝对路径：换环境即失效
$(cat 'C:/Users/15815/.claude/skills/.../scripts/scroll-to-render.js')
```

**正确示例**：
```bash
# ✅ 在 --data-raw "..." 内：$() 替换中不加引号（外层已有双引号，变量可以展开）
--data-raw "$(cat $SKILL_DIR/scripts/scroll-to-render.js)"
# ✅ 需要传参时：JS 函数体 + 单引号参数（防止 shell 注入）
--data-raw "($(cat $SKILL_DIR/scripts/input-search-query.js))('${INPUT_SELECTOR}', '${SEARCH_QUERY}')"
# ✅ 在独立赋值中：使用双引号包裹含空格的路径
INPUT_SELECTOR=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "$SKILL_DIR/scripts/interactive-elements.json" '...')
```

### 4. 结果保存
- **保存位置**：项目目录下的 `SEARCH_RESULTS/` 文件夹
- **文件格式**：先保存 JSON（原始数据），再从 JSON 生成 Markdown 报告

## 操作流程

### 第零步：需求确认

**执行方式**：使用 AskUserQuestion 工具与用户交互

**流程**：
1. **提炼关键词**：从用户的文献检索需求描述中，自动识别并提炼 2-4 个核心学术关键词
2. **确认关键词**：展示提炼的关键词列表，请用户确认或修改
3. **询问期刊范围**：展示经济金融学国际顶刊列表供用户选择，或指定其他范围
4. **询问时间范围**：请用户指定发表年份范围（**必须指定**，不接受"全部年份"）
   - 选项：最近 5 年、最近 10 年、最近 20 年、或指定起止年份（如 2018-2024）
   - 如果用户不指定，默认使用**最近 5 年**

**示例用户需求**：用户说"我想检索关于机器学习在金融风险预测中的应用的文献"
- **提炼的关键词**：机器学习 (machine learning)，金融风险 (financial risk)，预测 (prediction)，应用 (application)
- **确认后的关键词**：machine learning，financial risk prediction
- **期刊范围**：全部期刊
- **时间范围**：2018-2024年

**关键点**：
- 关键词应使用英文，这是 Web of Science 检索的标准
- 期刊范围可以使用学科领域代码（如 "Business, Finance"）
- 时间范围格式为 YYYY-YYYY 或 "recent 5 years"

### 经济金融学国际顶刊列表

在询问期刊范围时，展示以下列表供用户选择：

**重要：Web of Science 期刊检索必须使用期刊全称**

**金融学顶刊（常用）**：
1. The Journal of Finance
2. Journal of Financial Economics
3. Review of Financial Studies
4. Journal of Financial and Quantitative Analysis
5. Review of Finance

**综合性顶刊**：
1. American Economic Review
2. Quarterly Journal of Economics
3. Journal of Political Economy
4. Econometrica
5. Review of Economic Studies

**计量/方法顶刊**：
1. Journal of Econometrics
2. Journal of Applied Econometrics

**选择方式**：
- 用户可选择"全部期刊"（默认，输入为空）
- 用户可选择单个或多个期刊全称（用逗号分隔）
- 示例：`The Journal of Finance,Review of Financial Studies` 表示只在金融学两大顶刊检索
- **注意**：多个期刊使用逗号分隔

**AskUserQuestion 示例**：
```
问题：请选择您希望检索的期刊范围
选项：
1. 全部期刊（不限制）
2. 金融学顶刊（The Journal of Finance, Journal of Financial Economics, Review of Financial Studies）
3. 综合顶刊（American Economic Review, Quarterly Journal of Economics, Journal of Political Economy, Econometrica）
4. 计量/方法顶刊（Journal of Econometrics, Journal of Applied Econometrics）
5. 指定期刊（手动输入期刊全称，用逗号分隔）
```

**确认完成后**，将用户确认的检索参数保存为变量，供后续脚本使用：

1. **提取关键词**：`SEARCH_KEYWORDS="关键词1,关键词2,关键词3"`
2. **生成检索式**：`SEARCH_QUERY="TS=("关键词1" OR "关键词2" OR "关键词3")"`
3. **记录范围**：
   - `JOURNAL_SCOPE`：**期刊全称（使用逗号分隔）**
     - 示例：`The Journal of Finance,Journal of Financial Economics`
     - 多个期刊用逗号分隔：`The Journal of Finance,Journal of Financial Economics,Review of Financial Studies`
   - `YEAR_RANGE`：时间范围（例如：2018-2024、recent-5-years）
   - `SEARCH_TOPIC`：检索主题描述（中文或英文）

**生成检索式示例**：
- 关键词: machine learning, financial risk, prediction
- 期刊: The Journal of Finance, Journal of Financial Economics
- 时间范围: 2018-2024
- 完整检索式: `TS=("machine learning" OR "financial risk" OR "prediction") AND SO=("The Journal of Finance" OR "Journal of Financial Economics") AND PY=(2018-2024)`

**时间范围格式**（**必填**，默认最近 5 年）：
- `recent-5-years`：最近 5 年（**推荐默认值**）
- `recent-10-years`：最近 10 年
- `recent-20-years`：最近 20 年
- `YYYY-YYYY`：年份范围（如 `2018-2024`）
- `YYYY TO YYYY`：Web of Science 格式（如 `2018 TO 2024`）
- `YYYY`：单一年份（如 `2024`）

### 自动化流水线（推荐方式）

**第零步确认检索参数后，直接调用 `run-search.sh` 一次性完成步骤 1-5，无需中间交互。**

脚本内部自动完成：初始化页面 → 查找交互元素 → 构建检索式 → 输入检索式 → 点击搜索 → 等待结果 → 滚动渲染 → 提取文献 → 失败重试 → 多页翻页 → 合并数据 → 生成报告。

```bash
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"

# 构建关键词参数（WoS 检索语法）
# 关键词之间用 AND/OR 连接，整个词组用引号包裹
SEARCH_KEYWORDS='"liquidity" AND "asset pricing"'

# 期刊范围（逗号分隔期刊全称，空字符串=不限制）
JOURNAL_SCOPE="The Journal of Finance,Journal of Financial Economics,Review of Financial Studies,Journal of Financial and Quantitative Analysis,Review of Finance"

# 时间范围
YEAR_RANGE="2021-2026"

# 检索主题（用于文件命名，中文或英文）
SEARCH_TOPIC="liquidity and asset pricing"

# 执行自动化流水线（单条命令，无需后续干预）
bash "$SKILL_DIR/scripts/run-search.sh" "$SEARCH_KEYWORDS" "$JOURNAL_SCOPE" "$YEAR_RANGE" "$SEARCH_TOPIC"
```

**参数说明**：

| 参数 | 位置 | 说明 | 示例 |
|------|------|------|------|
| SEARCH_KEYWORDS | $1 | WoS 检索关键词（含逻辑运算符） | `'"liquidity" AND "asset pricing"'` |
| JOURNAL_SCOPE | $2 | 期刊全称（逗号分隔，空=不限） | `"The Journal of Finance,Journal of Financial Economics"` |
| YEAR_RANGE | $3 | 发表年份范围 | `"2021-2026"` 或 `"recent-5-years"` |
| SEARCH_TOPIC | $4 | 检索主题（用于输出文件命名） | `"liquidity and asset pricing"` |

**输出文件**：
- JSON：`SEARCH_RESULTS/[topic]_[timestamp].json`
- Markdown：`SEARCH_RESULTS/[topic]_[timestamp].md`
- 失败记录：`SEARCH_RESULTS/[topic]_failure_[timestamp].md`

**执行后**：读取生成的 Markdown 报告，向用户展示检索结果摘要。

### 相关性分析（检索后执行）

**检索完成并生成 JSON 后，先询问用户感兴趣的具体话题，再启动相关性分析**，帮助用户快速筛选高相关文献。

#### 第零步：确认用户感兴趣的话题

检索完成后，不要立即启动相关性分析。先向用户展示检索结果摘要，然后询问用户的兴趣方向：

1. **展示检索结果摘要**：读取生成的 Markdown 报告，向用户展示检索到的文献总数、年份分布、主要期刊等信息
2. **询问用户具体兴趣**：使用 AskUserQuestion 工具，询问用户对哪些具体方向或话题感兴趣
   - 提示用户："检索已覆盖了较宽泛的主题。在相关性分析中，您希望重点关注哪些具体方向？"
   - **示例**：用户最初检索"机器学习与金融风险预测"，可能回答"我关注深度学习模型在信用风险评估中的应用"
   - 用户可以用中文或英文描述
3. **提取并确认关键词**：从用户的描述中提取 2-5 个英文关键词短语作为 `TOPIC_KEYWORDS`
   - 如果用户用中文回答，AI 自动翻译并提取核心英文关键词短语
   - 展示提取的关键词列表，请用户确认或修改
4. **确认完成后**，将 `TOPIC_KEYWORDS` 设为用户确认的关键词，然后启动相关性分析

**AskUserQuestion 示例**：
```
问题：检索已完成，共找到 XX 篇文献。在相关性分析中，您希望重点关注哪些具体方向？
描述您感兴趣的具体话题（中英文均可），我将从中提取关键词进行相关性评分。

例如，如果您最初检索的是"机器学习与金融风险预测"，您可以回答：
"我重点关注深度学习模型在信用风险评估中的应用"
或 "deep learning for credit risk assessment"

您当前检索结果摘要：
- 总文献数：XX 篇
- 主要期刊：The Journal of Finance (X篇), ...
- 年份范围：2020-2026
```

**确认完成后**，使用用户确认的 `TOPIC_KEYWORDS` 执行相关性分析。

**下一步：询问用户选择哪种相关性分析方案**

使用 AskUserQuestion 工具，让用户从以下两种方案中选择：

```
问题：请选择您希望使用的相关性分析方法

选项：
1. 方案一：关键词密度 + TF‑IDF 余弦相似度（轻量快速）
   - 原理：基于关键词命中率和 TF‑IDF 向量余弦相似度
   - 优势：速度快（秒级），关键词精确匹配优先
   - 依赖：scikit-learn（可选，有纯 Python 回退）
   - 推荐阈值：0.15

2. 方案二：Sentence‑BERT 语义匹配（深层语义理解）
   - 原理：用 all-MiniLM-L6-v2 将关键词和论文摘要编码为语义向量，计算余弦相似度
   - 优势：能捕捉同义词/近义词关系（如 "volatility" vs "risk"），语义理解更深入
   - 依赖：sentence-transformers（必须安装）
   - 注意：首次运行需要下载模型（~80MB），支持离线模式
   - 推荐阈值：0.3
```

| 维度 | 方案一（TF‑IDF） | 方案二（SBERT） |
|------|------------------|-----------------|
| 语义理解 | 字面匹配 | 深层语义，捕捉同义/近义 |
| 区分度 | 中等 | 高 |
| 速度 | 秒级 | 首次加载模型 ~7s，编码 ~1s |
| 依赖 | scikit-learn（可选） | sentence-transformers（必须） |
| 适用场景 | 关键词精确、词面匹配即可 | 需要语义推理、同义表达 |

#### 方案一：关键词密度 + TF‑IDF 余弦相似度

**核心思路**：将 topic 关键词合并成一串"理想摘要"，计算待检摘要与这条理想文本的 TF‑IDF 向量余弦相似度，同时统计关键词命中率作为辅助信号。综合分数 = 0.6 × TF‑IDF 余弦相似度 + 0.4 × 关键词命中率。

```bash
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"

# 用第零步确认的关键词（逗号分隔英文短语，去掉 WoS 运算符）
TOPIC_KEYWORDS="liquidity,asset pricing,market microstructure,liquidity risk"

# 输入：检索生成的 JSON 和 Markdown 文件
INPUT_JSON="SEARCH_RESULTS/liquidity_and_asset_pricing_20260422_234641.json"
INPUT_MD="SEARCH_RESULTS/liquidity_and_asset_pricing_20260422_234641.md"

# 执行相关性分析（方案一）
# --md-file 将 Top 20 相关文献详细信息追加到检索报告 Markdown 末尾
python "$SKILL_DIR/scripts/analyze-relevance.py" "$INPUT_JSON" "$TOPIC_KEYWORDS" --threshold 0.15 --md-file "$INPUT_MD"

# 输出文件：
#   同目录下自动生成 *_enriched.json（每篇论文追加 relevance 字段）
#   原检索报告 .md 末尾追加 Relevance Analysis 章节（Top 20 详细卡片）
```

**方案一参数说明**：

| 参数 | 位置 | 说明 | 默认值 |
|------|------|------|--------|
| input_json | $1 | 合并后的文献 JSON 文件路径 | — |
| topic_keywords | $2 | 逗号分隔的英文关键词短语 | — |
| --output | -o | 输出 enriched JSON 路径 | 自动加 `_enriched` 后缀 |
| --threshold | -t | 综合相关性阈值 [0,1] | 0.15 |
| --similarity-only | — | 仅使用 TF‑IDF 相似度，忽略关键词命中率 | 关闭 |
| --md-file | — | 检索报告 Markdown 路径，将 Top 20 相关文献追加到该文件末尾 | 不追加 |

**方案一 relevance 字段**：
```json
{
  "tfidf_similarity": 0.1926,
  "keyword_hit_rate": 0.75,
  "relevance_score": 0.4155
}
```

| 字段 | 说明 |
|------|------|
| tfidf_similarity | TF‑IDF 余弦相似度 (0~1) |
| keyword_hit_rate | 关键词命中率 (0~1) |
| relevance_score | 0.6 × tfidf + 0.4 × hit_rate |

#### 方案二：Sentence‑BERT 语义匹配

**核心思路**：用 SBERT (all-MiniLM-L6-v2) 将关键词扩展为自然语言 query（如 "Research about liquidity, asset pricing, and market microstructure"）与论文的 title+abstract 分别编码为 384 维语义向量，计算余弦相似度。语义匹配能捕捉同义词/近义词关系（如 "volatility" vs "risk"），比字面匹配更鲁棒。综合分数 = 0.7 × SBERT 相似度 + 0.3 × 关键词命中率。

```bash
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"

TOPIC_KEYWORDS="liquidity,asset pricing,market microstructure,liquidity risk"
INPUT_JSON="SEARCH_RESULTS/liquidity_and_asset_pricing_20260422_234641.json"
INPUT_MD="SEARCH_RESULTS/liquidity_and_asset_pricing_20260422_234641.md"

# 执行相关性分析（方案二）
# --md-file 将 Top 20 相关文献详细信息追加到检索报告 Markdown 末尾
python "$SKILL_DIR/scripts/analyze-relevance-sbert.py" "$INPUT_JSON" "$TOPIC_KEYWORDS" --threshold 0.3 --md-file "$INPUT_MD"

# 可选：提供自然语言描述替代关键词拼接 query（语义更精准）
python "$SKILL_DIR/scripts/analyze-relevance-sbert.py" "$INPUT_JSON" "$TOPIC_KEYWORDS" \
  --topic-desc "the relationship between stock market liquidity and asset pricing theories" \
  --md-file "$INPUT_MD"

# 输出文件：
#   同目录下自动生成 *_sbert_enriched.json（每篇论文追加 relevance 字段）
#   原检索报告 .md 末尾追加 Relevance Analysis 章节（Top 20 详细卡片）
```

**方案二参数说明**：

| 参数 | 位置 | 说明 | 默认值 |
|------|------|------|--------|
| input_json | $1 | 合并后的文献 JSON 文件路径 | — |
| topic_keywords | $2 | 逗号分隔的英文关键词短语 | — |
| --output | -o | 输出 enriched JSON 路径 | 自动加 `_sbert_enriched` 后缀 |
| --threshold | -t | 综合相关性阈值 [0,1] | 0.3 |
| --model | -m | SBERT 模型名 | all-MiniLM-L6-v2 |
| --similarity-only | — | 仅使用 SBERT 相似度，忽略关键词命中率 | 关闭 |
| --topic-desc | -d | 对主题的自然语言描述（比关键词更能表达语义） | 自动从关键词生成 |
| --md-file | — | 检索报告 Markdown 路径，将 Top 20 相关文献追加到该文件末尾 | 不追加 |

**方案二 relevance 字段**：
```json
{
  "sbert_similarity": 0.6917,
  "keyword_hit_rate": 0.75,
  "relevance_score": 0.7092
}
```

| 字段 | 说明 |
|------|------|
| sbert_similarity | SBERT 余弦相似度 (0~1) |
| keyword_hit_rate | 关键词命中率 (0~1) |
| relevance_score | 0.7 × sbert + 0.3 × hit_rate |

**两种方案对比**（注意：AI 执行前应已通过 AskUserQuestion 询问用户选择方案一还是方案二）：

| 维度 | 方案一（TF‑IDF） | 方案二（SBERT） |
|------|------------------|-----------------|
| 语义理解 | 字面匹配 | 深层语义，捕捉同义/近义 |
| 区分度 | 中等（受词汇重合度限制） | 高（向量空间连续） |
| 速度 | 秒级 | 首次加载模型 ~7s，编码 ~1s |
| 依赖 | scikit-learn（可选，有纯 Python 回退） | sentence-transformers（必须） |
| 推荐阈值 | 0.15 | 0.3 |
| 适用场景 | 关键词精确、词面重合即可判断 | 需要语义推理、同义表达 |

**执行后**：向用户展示相关性分析摘要（高/低相关文献数量、Top 3 最相关文献、平均分数）。若指定 `--md-file`，Top 20 最相关文献的详细信息（含摘要全文）将追加到检索报告 Markdown 末尾的 `## Relevance Analysis` 章节。

---

### 手动分步执行（备用方式）

以下步骤仅在 `run-search.sh` 失败需要调试，或需要更精细控制时使用。正常情况下应优先使用自动化流水线。

### 第一步：初始化并打开页面

```bash
# 0. Set skill directory (REQUIRED: must be first line in every bash call)
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"

# 1. Check web-access status
bash "$SKILL_DIR/scripts/check-env.sh"

# 2. Get port and open WoS advanced search
PORT="${CDP_PROXY_PORT:-3457}"
curl -s "http://localhost:$PORT/new?url=https://webofscience.clarivate.cn/wos/alldb/advanced-search"

# 3. Wait for page load
sleep 5

# 4. Find interactive elements, locate search input and search button
#    Results saved as interactive-elements.json, later scripts read selectors from this file
echo "Finding interactive elements..."
INTERACTIVE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "$(cat $SKILL_DIR/scripts/find-interactive-elements.js)")

echo "Interactive elements result: $INTERACTIVE_RESULT"

# Save as JSON file
echo "$INTERACTIVE_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" save-pretty "$SKILL_DIR/scripts/interactive-elements.json"
echo "Interactive elements saved to $SKILL_DIR/scripts/interactive-elements.json"

# Verify key elements are ready
READY=$(echo "$INTERACTIVE_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.elementStatus.ready // false')
HAS_INPUT=$(echo "$INTERACTIVE_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.elementStatus.hasSearchInput // false')
HAS_BUTTON=$(echo "$INTERACTIVE_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.elementStatus.hasSearchButton // false')
echo "Ready: $READY (input: $HAS_INPUT, button: $HAS_BUTTON)"

# Extract selectors from JSON file for later steps
INPUT_SELECTOR=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchInput.selector // ""')
BUTTON_SELECTOR=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchButton.selector // ""')
echo "Input selector: $INPUT_SELECTOR"
echo "Button selector: $BUTTON_SELECTOR"

if [ "$READY" != "true" ]; then
  echo "Warning: elements not ready, retrying..."
  sleep 5
  INTERACTIVE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
    --data-raw "$(cat $SKILL_DIR/scripts/find-interactive-elements.js)")
  echo "$INTERACTIVE_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" save-pretty "$SKILL_DIR/scripts/interactive-elements.json"
  READY=$(echo "$INTERACTIVE_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.elementStatus.ready // false')
  INPUT_SELECTOR=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchInput.selector // ""')
  BUTTON_SELECTOR=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchButton.selector // ""')
  echo "Ready after retry: $READY"
fi
```

**操作说明**：
```
Note: Access Web of Science directly on campus network, no login needed.
Use find-interactive-elements.js to locate search input (id="advancedSearchInputArea")
and search button (class="mdc-button__label interactive-highlight", text="Search").
Results saved as scripts/interactive-elements.json, later scripts read selectors from this file,
then use document.querySelector(selector) to re-locate DOM elements on the page.
```

### 第二步：输入检索式

```bash
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"
PORT="${CDP_PROXY_PORT:-3457}"

# 1. Read input selector from interactive-elements.json
INPUT_SELECTOR=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchInput.selector // ""')

if [ -z "$INPUT_SELECTOR" ]; then
  echo "Error: no input selector in interactive-elements.json, re-run step 1"
  exit 1
fi

# 2. Build search query (from step 0 parameters)
echo "Building search query..."
echo "Keywords: ${SEARCH_KEYWORDS}"
echo "Journal scope: ${JOURNAL_SCOPE:-all}"
echo "Year range: ${YEAR_RANGE:-recent-5-years} (required)"

# Generate WoS query (example, AI assembles from parameters)
# Format: TS=("keyword1" OR "keyword2") AND SO=("journal1" OR "journal2") AND PY=(start-end)
SEARCH_QUERY="TS=(${SEARCH_KEYWORDS//,/ OR })"

if [ -n "${JOURNAL_SCOPE}" ]; then
  JOURNAL_PART=$(echo "$JOURNAL_SCOPE" | sed 's/,/" OR "/g' | sed 's/^/"/;s/$/"/')
  SEARCH_QUERY="${SEARCH_QUERY} AND SO=(${JOURNAL_PART})"
fi

# Year range processing
YEAR_PART=""
YR="${YEAR_RANGE:-recent-5-years}"
YR_LOWER=$(echo "$YR" | tr '[:upper:]' '[:lower:]')

if echo "$YR_LOWER" | grep -qE 'recent[- ]?[0-9]+[- ]?years?'; then
  YEARS_AGO=$(echo "$YR_LOWER" | grep -oE '[0-9]+' | head -1)
  CURRENT_YEAR=$(date +%Y)
  START_YEAR=$((CURRENT_YEAR - YEARS_AGO))
  YEAR_PART="PY=(${START_YEAR}-${CURRENT_YEAR})"
elif echo "$YR_LOWER" | grep -qE '^[0-9]{4}-[0-9]{4}$'; then
  YEAR_PART="PY=(${YR})"
elif echo "$YR_LOWER" | grep -qE '^[0-9]{4}$'; then
  YEAR_PART="PY=(${YR})"
fi

if [ -n "$YEAR_PART" ]; then
  SEARCH_QUERY="${SEARCH_QUERY} AND ${YEAR_PART}"
fi

echo "Final query: $SEARCH_QUERY"

# 3. Input search query (pass inputSelector and query)
echo "Inputting search query..."
INPUT_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "($(cat $SKILL_DIR/scripts/input-search-query.js))('${INPUT_SELECTOR}', '${SEARCH_QUERY}')")

echo "Input result: $INPUT_RESULT"

INPUT_SUCCESS=$(echo "$INPUT_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.success // false')
INPUT_VERIFIED=$(echo "$INPUT_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.inputVerified // false')

if [ "$INPUT_SUCCESS" != "true" ]; then
  echo "Error: search query input failed"
  ERROR_MSG=$(echo "$INPUT_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.error // "unknown error"')
  echo "Error: $ERROR_MSG"
fi

echo "Input verified: $INPUT_VERIFIED"
```

### 第三步：点击搜索按钮

```bash
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"
PORT="${CDP_PROXY_PORT:-3457}"

# 1. Read selectors from interactive-elements.json
INPUT_SELECTOR=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchInput.selector // ""')
BUTTON_SELECTOR=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchButton.selector // ""')

if [ -z "$BUTTON_SELECTOR" ]; then
  echo "Error: no button selector in interactive-elements.json, re-run step 1"
  exit 1
fi

# 2. Click search button (pass inputSelector and buttonSelector)
echo "Clicking search button..."
CLICK_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "($(cat $SKILL_DIR/scripts/click-search-button.js))('${INPUT_SELECTOR}', '${BUTTON_SELECTOR}')")

echo "Click result: $CLICK_RESULT"

CLICK_SUCCESS=$(echo "$CLICK_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.success // false')
if [ "$CLICK_SUCCESS" != "true" ]; then
  echo "Error: search button click failed"
  ERROR_MSG=$(echo "$CLICK_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.error // "unknown error"')
  echo "Error: $ERROR_MSG"
fi

# 3. Wait for page load and redirect to results
echo "Waiting for results page..."
PAGE_LOADED=false
for i in {1..10}; do
  sleep 3
  PAGE_STATUS=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
    --data-raw "$(cat $SKILL_DIR/scripts/check-page-ready.js)")
  echo "Waited $((i*3))s - page status: $(echo "$PAGE_STATUS" | tr '\n' ' ')"

  # Check if on results page
  if echo "$PAGE_STATUS" | grep -q '"pageType":"results"'; then
    echo "Navigated to results page"
    PAGE_LOADED=true
    break
  fi

  # Or check if page is ready
  if echo "$PAGE_STATUS" | grep -q '"ready":true'; then
    echo "Page ready"
    PAGE_LOADED=true
    break
  fi
done

# 5. Diagnose page status
echo "Diagnosing page..."
DIAGNOSE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "$(cat $SKILL_DIR/scripts/diagnose-page.js)")
echo "Page diagnosis: $DIAGNOSE_RESULT"

# 6. Adaptive scroll to render all records (WoS virtual scrolling)
#    Direct scrollTo(0, height) skips intermediate records — virtual scroll only renders viewport.
#    Must step incrementally (500px at a time), then repeat until page height stabilizes.
echo "Scrolling to load all records (adaptive step-scroll)..."
PREV_HEIGHT=0
for scroll_round in {1..10}; do
  offset=0
  while true; do
    SCROLL_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
      --data-raw "($(cat $SKILL_DIR/scripts/scroll-to-render.js))($offset)")
    CURR_HEIGHT=$(echo "$SCROLL_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.scrollHeight // 0')
    if [ "$offset" -ge "$CURR_HEIGHT" ]; then break; fi
    offset=$((offset + 500))
  done
  echo "Scroll round $scroll_round: height=$CURR_HEIGHT (prev=$PREV_HEIGHT)"
  if [ "$CURR_HEIGHT" -eq "$PREV_HEIGHT" ] && [ "$CURR_HEIGHT" -gt 0 ]; then
    echo "Page height stable at $CURR_HEIGHT, all records rendered"
    break
  fi
  PREV_HEIGHT=$CURR_HEIGHT
  sleep 1
done

echo "Extracting results..."
EXTRACT_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "$(cat $SKILL_DIR/scripts/extract-papers-v2.js)")
echo "Extract result: $EXTRACT_RESULT"
```

**判断**：
- 如果 `totalPapers > 0`：成功，跳到第五步
- 如果 `totalPapers = 0` 或有错误：继续尝试

### 第四步：失败重试

**尝试 2 - 刷新页面后重试**：
```bash
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"
curl -s "http://localhost:$PORT/navigate?target=TARGET_ID&url=https://webofscience.clarivate.cn/wos/alldb/advanced-search"
sleep 3

# Re-find interactive elements (needed after page refresh)
echo "Re-finding interactive elements..."
INTERACTIVE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "$(cat $SKILL_DIR/scripts/find-interactive-elements.js)")

echo "$INTERACTIVE_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" save-pretty "$SKILL_DIR/scripts/interactive-elements.json"
READY=$(echo "$INTERACTIVE_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.elementStatus.ready // false')
if [ "$READY" != "true" ]; then
  echo "Page not fully loaded, waiting..."
  sleep 5
  INTERACTIVE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
    --data-raw "$(cat $SKILL_DIR/scripts/find-interactive-elements.js)")
  echo "$INTERACTIVE_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" save-pretty "$SKILL_DIR/scripts/interactive-elements.json"
fi

# Read selectors from updated JSON file
INPUT_SELECTOR=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchInput.selector // ""')
BUTTON_SELECTOR=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "$SKILL_DIR/scripts/interactive-elements.json" '.targetElements.searchButton.selector // ""')

# Re-input search query
INPUT_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "($(cat $SKILL_DIR/scripts/input-search-query.js))('${INPUT_SELECTOR}', '${SEARCH_QUERY}')")
echo "Retry input result: $INPUT_RESULT"

# Re-click search button
CLICK_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "($(cat $SKILL_DIR/scripts/click-search-button.js))('${INPUT_SELECTOR}', '${BUTTON_SELECTOR}')")
echo "Retry click result: $CLICK_RESULT"

# Wait for page redirect
sleep 8

# Adaptive step-scroll to render all records
PREV_HEIGHT=0
for scroll_round in {1..10}; do
  offset=0
  while true; do
    SCROLL_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
      --data-raw "($(cat $SKILL_DIR/scripts/scroll-to-render.js))($offset)")
    CURR_HEIGHT=$(echo "$SCROLL_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.scrollHeight // 0')
    if [ "$offset" -ge "$CURR_HEIGHT" ]; then break; fi
    offset=$((offset + 500))
  done
  if [ "$CURR_HEIGHT" -eq "$PREV_HEIGHT" ] && [ "$CURR_HEIGHT" -gt 0 ]; then break; fi
  PREV_HEIGHT=$CURR_HEIGHT
  sleep 1
done

EXTRACT_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "$(cat $SKILL_DIR/scripts/extract-papers-v2.js)")
echo "Retry extract result: $EXTRACT_RESULT"
```

**尝试 3 - 直接访问结果页**：
```bash
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"
# Build result page URL (with dynamic query)
QUERY_FOR_URL=$(echo "${SEARCH_QUERY}" | node "$SKILL_DIR/scripts/json-helper.mjs" url-encode)
curl -s "http://localhost:$PORT/navigate?target=TARGET_ID&url=https://webofscience.clarivate.cn/wos/alldb/result?count=50&Q=$QUERY_FOR_URL"
sleep 5

# Adaptive step-scroll to render all records
PREV_HEIGHT=0
for scroll_round in {1..10}; do
  offset=0
  while true; do
    SCROLL_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
      --data-raw "($(cat $SKILL_DIR/scripts/scroll-to-render.js))($offset)")
    CURR_HEIGHT=$(echo "$SCROLL_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.scrollHeight // 0')
    if [ "$offset" -ge "$CURR_HEIGHT" ]; then break; fi
    offset=$((offset + 500))
  done
  if [ "$CURR_HEIGHT" -eq "$PREV_HEIGHT" ] && [ "$CURR_HEIGHT" -gt 0 ]; then break; fi
  PREV_HEIGHT=$CURR_HEIGHT
  sleep 1
done

# Extract results
curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "$(cat $SKILL_DIR/scripts/extract-papers-v2.js)"
```

### 第五步：成功 - 多页数据提取

如果检索成功（`totalPapers > 0`），进入翻页循环提取所有页面的文献：

**重要说明**：WoS 使用虚拟滚动（virtual scrolling），只渲染视口内可见的 DOM 元素。**直接 `scrollTo(0, height)` 跳到底部会跳过中间记录，导致虚拟滚动不渲染被跳过的部分**（测试中50篇仅提取6篇）。必须使用 `scroll-to-render.js` 增量步进滚动（每次+500px），逐步触发虚拟滚动渲染，然后多轮检测页面高度是否稳定。固定偏移量 `for offset in ...` 和 `scroll-to-bottom.js` 均已弃用。此外，翻页检查和点击必须分开执行，避免 `next-page.js` 检查时同时点击导致页面跳跃。

```bash
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"
# Results directory (under project root)
RESULTS_DIR="SEARCH_RESULTS"
TEMP_DIR="${RESULTS_DIR}/temp_pages_$$"
mkdir -p "$TEMP_DIR"
mkdir -p "$RESULTS_DIR"

# Generate timestamp for filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TOPIC_SLUG=$(echo "${SEARCH_TOPIC:-search}" | tr ' ' '_' | tr -dc 'a-zA-Z0-9_')

# Initialize loop variables
PAGE_NUMBER=1
MAX_PAGES=50          # prevent infinite loop
CONSECUTIVE_EMPTY=0   # consecutive empty page count

echo "=== Multi-page extraction started ==="
echo "Max pages limit: $MAX_PAGES"
echo "Temp dir: $TEMP_DIR"

while [ "$PAGE_NUMBER" -le "$MAX_PAGES" ]; do
  echo ""
  echo "--- Page $PAGE_NUMBER ---"

  # 1. Wait for page to be ready (needed after pagination)
  PAGE_READY=false
  for wait_i in {1..5}; do
    sleep 3
    PAGE_STATUS=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
      --data-raw "$(cat $SKILL_DIR/scripts/check-page-ready.js)")
    if echo "$PAGE_STATUS" | grep -q '"ready":true'; then
      PAGE_READY=true
      break
    fi
    echo "Waiting for page ${PAGE_NUMBER} to load... ($((${wait_i}*3))s)"
  done

  if [ "$PAGE_READY" != "true" ]; then
    echo "Warning: page ${PAGE_NUMBER} load timeout, extra 5s wait..."
    sleep 5
  fi

  # 2. Adaptive step-scroll to render all records (WoS virtual scrolling)
  #    Direct scrollTo(0, height) skips intermediate records — virtual scroll only renders viewport.
  #    Must step incrementally (500px at a time), then repeat until page height stabilizes.
  echo "Scrolling to load all records (adaptive step-scroll)..."
  PREV_HEIGHT=0
  for scroll_round in {1..10}; do
    offset=0
    while true; do
      SCROLL_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
        --data-raw "($(cat $SKILL_DIR/scripts/scroll-to-render.js))($offset)")
      CURR_HEIGHT=$(echo "$SCROLL_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.scrollHeight // 0')
      if [ "$offset" -ge "$CURR_HEIGHT" ]; then break; fi
      offset=$((offset + 500))
    done
    echo "  Scroll round $scroll_round: height=$CURR_HEIGHT (prev=$PREV_HEIGHT)"
    if [ "$CURR_HEIGHT" -eq "$PREV_HEIGHT" ] && [ "$CURR_HEIGHT" -gt 0 ]; then
      echo "  Page height stable at $CURR_HEIGHT"
      break
    fi
    PREV_HEIGHT=$CURR_HEIGHT
    sleep 1
  done

  # 3. Expand all abstracts on current page (click Show more)
  SHOW_MORE_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
    --data-raw "$(cat $SKILL_DIR/scripts/click-show-more.js)")
  SHOW_MORE_CLICKED=$(echo "$SHOW_MORE_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.clickedCount // 0')
  echo "Expanded abstracts: $SHOW_MORE_CLICKED"

  # 4. Extract papers on current page
  EXTRACT_JSON=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
    --data-raw "$(cat $SKILL_DIR/scripts/extract-papers-v2.js)")

  PAGE_PAPERS=$(echo "$EXTRACT_JSON" | node "$SKILL_DIR/scripts/json-helper.mjs" extract-field-stdin '.papers // []')
  PAGE_COUNT=$(echo "$PAGE_PAPERS" | node "$SKILL_DIR/scripts/json-helper.mjs" length-stdin)
  EXTRACT_SUCCESS=$(echo "$EXTRACT_JSON" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.success // "true"')

  echo "Page ${PAGE_NUMBER}: extracted $PAGE_COUNT papers"

  if [ "$EXTRACT_SUCCESS" = "true" ] && [ "$PAGE_COUNT" -gt 0 ]; then
    # Extract success: tag page number and save to temp file immediately
    CONSECUTIVE_EMPTY=0
    PAGE_PAPERS_TAGGED=$(echo "$PAGE_PAPERS" | node "$SKILL_DIR/scripts/json-helper.mjs" add-page-number "$PAGE_NUMBER")
    echo "$PAGE_PAPERS_TAGGED" | node "$SKILL_DIR/scripts/json-helper.mjs" save-pretty "${TEMP_DIR}/page_$(printf '%03d' $PAGE_NUMBER).json"
    echo "Saved page ${PAGE_NUMBER} to temp file"
  else
    # Extract failed or empty page
    CONSECUTIVE_EMPTY=$((CONSECUTIVE_EMPTY + 1))
    echo "Warning: page ${PAGE_NUMBER} empty (consecutive: $CONSECUTIVE_EMPTY)"
    if [ "$CONSECUTIVE_EMPTY" -ge 2 ]; then
      echo "2 consecutive empty pages, stopping"
      break
    fi
  fi

  # 5. Check if next page exists (CHECK ONLY, do NOT click)
  HAS_NEXT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
    --data-raw "(function() {
      var nextBtn = document.querySelector('button[aria-label=\"Top Next Page\"]');
      if (!nextBtn) return false;
      return !nextBtn.disabled;
    })()")
  HAS_NEXT_VAL=$(echo "$HAS_NEXT" | node "$SKILL_DIR/scripts/json-helper.mjs" read-stdin '.')

  if [ "$HAS_NEXT_VAL" != "true" ]; then
    echo "No more pages"
    break
  fi

  # 6. Click next page button (separate from check to avoid double-click)
  curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
    --data-raw "(function() {
      var nextBtn = document.querySelector('button[aria-label=\"Top Next Page\"]');
      if (nextBtn) nextBtn.click();
    })()"
  echo "Clicked next page button"

  PAGE_NUMBER=$((PAGE_NUMBER + 1))
  sleep 5
done

echo ""
echo "=== Multi-page extraction complete ==="
echo "Page files in: $TEMP_DIR"

# 7. Merge all temp page files into final JSON and save
node "$SKILL_DIR/scripts/json-helper.mjs" build-final-from-pages "$TEMP_DIR" \
  --query "${SEARCH_QUERY}" \
  --topic "${SEARCH_TOPIC}" \
  --journal "${JOURNAL_SCOPE}" \
  --year-range "${YEAR_RANGE}" \
  --timestamp "$TIMESTAMP" \
  --output "${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json"

# 8. Generate Markdown report (using local Node.js, not browser eval)
#    generate-markdown-report.js uses IIFE + global variable detection,
#    which fails in CDP Proxy eval. Use local Node.js script instead.
TOPIC_SLUG_SAFE="${TOPIC_SLUG:-search}"
TIMESTAMP_SAFE="${TIMESTAMP:-$(date +%Y%m%d_%H%M%S)}"
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('${RESULTS_DIR}/${TOPIC_SLUG_SAFE}_${TIMESTAMP_SAFE}.json', 'utf8'));
const papers = data.papers || [];

const validResults = papers.filter(r => r && (r.title || '').trim().length > 3);
const sorted = [...validResults].sort((a, b) => {
  const ca = parseInt(String(a.citations || a.cited || '0').replace(/,/g, '')) || 0;
  const cb = parseInt(String(b.citations || b.cited || '0').replace(/,/g, '')) || 0;
  return cb - ca;
});

const yearStats = {};
validResults.forEach(r => {
  const year = (r.publishDate || '').match(/\d{4}/)?.[0] || 'Unknown';
  yearStats[year] = (yearStats[year] || 0) + 1;
});

const journalStats = {};
validResults.forEach(r => {
  const journal = (r.journal || '').trim();
  if (journal) journalStats[journal] = (journalStats[journal] || 0) + 1;
});
const topJournals = Object.entries(journalStats).sort((a, b) => b[1] - a[1]).slice(0, 10);

let md = '# Web of Science Literature Search Report\n\n';
md += '## Search Overview\n\n';
md += '- **Search Time**: ' + data.timestamp + '\n';
md += '- **Topic**: ' + (data.topic || 'N/A') + '\n';
md += '- **Query**: ' + (data.searchQuery || 'N/A') + '\n';
md += '- **Journal Scope**: ' + (data.journalScope || 'All') + '\n';
md += '- **Year Range**: ' + (data.yearRange || 'All') + '\n';
md += '- **Total Results**: ' + data.totalPapers + ' papers from ' + data.totalPages + ' pages\n';
md += '- **Source**: Web of Science Core Collection\n\n';

md += '## Paper List (Sorted by Citations)\n\n';
md += '| # | Title | Authors | Journal | Date | Citations |\n';
md += '|---|-------|---------|---------|------|----------|\n';
sorted.slice(0, 100).forEach((r, i) => {
  const title = (r.title || '').substring(0, 60).replace(/\|/g, '\\\\|');
  const authors = (r.authors || '').substring(0, 25).replace(/\|/g, '\\\\|');
  const journal = (r.journal || '').substring(0, 20).replace(/\|/g, '\\\\|');
  const date = r.publishDate || '';
  const cites = r.citations || '-';
  md += '| ' + (i+1) + ' | ' + title + ' | ' + authors + ' | ' + journal + ' | ' + date + ' | ' + cites + ' |\n';
});

md += '\n## Year Distribution\n\n';
Object.entries(yearStats).sort((a, b) => a[0].localeCompare(b[0])).forEach(([year, count]) => {
  md += '- **' + year + '**: ' + count + ' papers\n';
});

md += '\n## Top Journals\n\n';
topJournals.forEach(([journal, count], i) => {
  md += (i+1) + '. **' + journal + '**: ' + count + ' papers\n';
});

md += '\n## Top 20 Most Cited Papers\n\n';
sorted.slice(0, 20).forEach((r, i) => {
  const cites = r.citations || '-';
  md += (i+1) + '. **' + (r.title || 'No title') + '**\n';
  md += '   - Authors: ' + (r.authors || 'N/A') + '\n';
  md += '   - Journal: ' + (r.journal || 'N/A') + ' (' + (r.publishDate || 'N/A') + ')\n';
  md += '   - Citations: ' + cites + '\n';
  if (r.abstract) md += '   - Abstract: ' + r.abstract.substring(0, 300) + '...\n';
  md += '\n';
});

md += '---\n*Report generated: ' + new Date().toISOString() + '*\n';

fs.writeFileSync('${RESULTS_DIR}/${TOPIC_SLUG_SAFE}_${TIMESTAMP_SAFE}.md', md, 'utf8');
console.log('Markdown saved: ${RESULTS_DIR}/${TOPIC_SLUG_SAFE}_${TIMESTAMP_SAFE}.md');
"

# 9. Clean up temp directory
rm -rf "$TEMP_DIR"
echo "Temp files cleaned up"

# 10. Display result summary
echo "=== Search complete ==="
echo "Keywords: ${SEARCH_KEYWORDS}"
echo "Year range: ${YEAR_RANGE:-recent-5-years}"
echo "Journal scope: ${JOURNAL_SCOPE:-all}"
# Read total from final JSON
TOTAL_PAPERS=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json" '.totalPapers // 0')
TOTAL_PAGES=$(node "$SKILL_DIR/scripts/json-helper.mjs" read "${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json" '.totalPages // 0')
echo "Total pages: $TOTAL_PAGES"
echo "Total papers: $TOTAL_PAPERS"
echo "Result files:"
echo "  - JSON: ${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.json"
echo "  - Markdown: ${RESULTS_DIR}/${TOPIC_SLUG}_${TIMESTAMP}.md"
```

**结果保存位置**: 项目目录下的 `SEARCH_RESULTS/` 文件夹
- JSON 文件：合并所有页面的检索结果，每篇论文标记 `pageNumber` 字段
- Markdown 文件：人类可读的检索报告（按被引次数排序）

**翻页循环退出条件**：
1. "Top Next Page" 按钮不存在或 `disabled=true`（已到末页）
2. 连续2页提取到0篇文献（页面加载异常）
3. 页码达到 `MAX_PAGES=50` 上限

**重要注意事项**：
1. **增量步进自适应滚动（必须）**：WoS 使用虚拟滚动，仅渲染视口内的 DOM 元素。直接 `scrollTo(0, height)` 跳到底部会跳过中间记录，虚拟滚动不渲染被跳过的部分（测试中50篇仅提取6篇）。必须使用 `scroll-to-render.js` 增量步进（每次+500px）逐步触发渲染，然后多轮检测页面高度是否稳定。否则 `extract-papers-v2.js` 会遗漏大量记录
2. **翻页检查与点击分离（必须）**：`next-page.js` 同时检查和点击按钮，在循环中调用会导致检查时即翻页。必须用内联代码仅检查按钮状态，然后在确认有下一页后才单独执行点击
3. **Markdown 生成使用本地 Node.js**：`generate-markdown-report.js` 使用 IIFE + 全局变量检测，在 CDP Proxy `/eval` 中无法正确执行（返回 `undefined`）。改用本地 `node -e` 脚本生成报告

在检索结果页面，可以点击任意文献标题在新标签页打开详细信息，并提取摘要等关键字段。

```bash
SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"
# 1. List papers on current page, confirm index
EXTRACT_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "$(cat $SKILL_DIR/scripts/extract-papers-v2.js)")
echo "$EXTRACT_RESULT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const o=JSON.parse(d);const s={totalPapers:o.totalPapers,papers:o.papers.slice(0,3).map(p=>({index:p.index,title:p.title,year:p.year,journal:p.journal}))};console.log(JSON.stringify(s,null,2))})"

# 2. Open paper detail page in new tab
# Parameter: paperIndex (1-based, default 1)
OPEN_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=TARGET_ID" \
  --data-raw "(function(){ return $(cat $SKILL_DIR/scripts/open-paper-detail.js)(3); })()")
echo "Open detail page: $OPEN_RESULT"

# 3. Wait for new tab to load
sleep 5

# 4. List all open tabs
PAGES=$(curl -s "http://localhost:$PORT/list-pages")
echo "Available tabs: $PAGES"

# 5. Switch to new tab (usually pageId=2)
curl -s "http://localhost:$PORT/select-page?pageId=2&bringToFront=true"
sleep 3

# 6. Extract detail page info (abstract, year, journal, keywords, DOI, etc.)
DETAIL_RESULT=$(curl -s -X POST "http://localhost:$PORT/eval?target=2" \
  --data-raw "$(cat $SKILL_DIR/scripts/extract-detail.js)")
echo "Paper detail: $DETAIL_RESULT"

# 7. Save detail to file
echo "$DETAIL_RESULT" | node "$SKILL_DIR/scripts/json-helper.mjs" save-pretty "${RESULTS_DIR}/paper_detail_${TIMESTAMP}.json"
echo "Detail saved: ${RESULTS_DIR}/paper_detail_${TIMESTAMP}.json"
```

**提取的文献详情字段**：
| 字段 | 说明 |
|------|------|
| title | 文献标题 |
| authors | 作者列表 |
| year | 发表年份 |
| journal | 期刊名称 |
| volume/issue/pages | 卷期页码 |
| abstract | 摘要 |
| keywords | 关键词 |
| doi | DOI 标识符 |
| wosId | WOS 论文编号 |
| citedBy | 被引次数 |
| references | 参考文献数量 |
| researchAreas | 研究领域 |
| funding | 基金信息 |

**切换标签页操作**：
```bash
# List all pages
curl -s "http://localhost:$PORT/list-pages"

# Switch to specific page (pageId from list)
curl -s "http://localhost:$PORT/select-page?pageId=2&bringToFront=true"

# Or use index
curl -s "http://localhost:$PORT/select-page?index=1&bringToFront=true"
```

### 第六步：全部失败 - 生成失败记录

如果 3 次尝试都失败，生成失败记录文件并结束任务：

```bash
# Results directory (under project root)
RESULTS_DIR="SEARCH_RESULTS"
mkdir -p "$RESULTS_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TOPIC_SLUG=$(echo "${SEARCH_TOPIC:-search}" | tr ' ' '_' | tr -dc 'a-zA-Z0-9_')

# Generate failure record file
cat > "${RESULTS_DIR}/${TOPIC_SLUG}_failure_${TIMESTAMP}.md" << EOF
# Web of Science Search Failure Record

## Basic Info
- **Search task**: ${SEARCH_TOPIC:-literature search}
- **Search query**: ${SEARCH_QUERY:-TS=("volatility spillover" OR "volatility overflow" OR "risk spillover")}
- **Failure time**: $(date -Iseconds)
- **Target database**: Web of Science Core Collection

## Failure Analysis

### Campus Network - No Login Required
This skill assumes campus network access, no login needed for Web of Science.

**Possible causes**:
1. **Network access restriction**: Campus IP may not be authorized for Web of Science
2. **Page structure change**: Web of Science UI update broke script data extraction
3. **Page load timeout**: Network delay caused search results to not load in time

**Actions taken**:
- Skill tried 3 different search methods (advanced search, refresh retry, direct result page)
- If all failed, verify campus IP is authorized for Web of Science access
- "Sign In" prompt shown on page is generic UI, no login action needed on campus network

### Other Possible Causes

| Cause | Symptom | Solution |
|-------|---------|----------|
| Network issue | Page load timeout, connection failed | Check network, refresh page |
| Page structure change | extract-papers-v2.js returns empty | Run diagnose-page.js |
| Port conflict | CDP connection failed | Re-run check-deps.mjs |
| Chrome unauthorized | Debug connection failed | Visit chrome://inspect and enable |

## Actions Attempted
- [x] Attempt 1: Advanced search page
- [x] Attempt 2: Refresh page and retry
- [x] Attempt 3: Direct result page URL

## Suggested Next Steps
1. Verify campus network connection is normal
2. Check if network can access Web of Science
3. If still failing, run diagnose-page.js for further diagnosis

---
*Auto-generated at $(date)*
EOF

echo "Failure record saved: ${RESULTS_DIR}/${TOPIC_SLUG}_failure_${TIMESTAMP}.md"
```

**结束任务**，向用户报告：
> 检索任务失败，已生成失败记录文件。技能尝试了 3 种不同方式检索均未成功。在校园网环境下，最可能原因是网络访问限制或页面结构变化。

## 脚本文件一览

| 文件 | 功能 |
|------|------|
| `find-interactive-elements.js` | 查找交互元素，定位输入框和按钮，结果保存为 `interactive-elements.json` |
| `input-search-query.js` | 向输入框中填入检索式（参数：inputSelector, query） |
| `click-search-button.js` | 点击搜索按钮（参数：inputSelector, buttonSelector） |
| `interactive-elements.json` | find-interactive-elements.js 的输出，存储选择器信息 |
| `scroll-to-render.js` | 增量步进自适应滚动（接受 scrollTo 参数，bash 每次+500px 调用，逐段触发虚拟滚动渲染，多轮检测高度稳定性） |
| `scroll-to-bottom.js` | 异步滚动到底部（**已弃用**，改用 scroll-to-render.js） |
| `click-show-more.js` | 点击页面中所有 "Show more" 按钮展开摘要 |
| `extract-papers-v2.js` | 提取当前页文献列表（标题、期刊、作者、摘要等），自动过滤空 app-record |
| `next-page.js` | 点击 "Top Next Page" 按钮翻页（**已弃用**，循环中使用内联代码分离检查和点击） |
| `check-page-ready.js` | 检查页面加载状态，翻页后等待页面就绪 |
| `extract-detail.js` | 提取文献详情（摘要、关键词、DOI等） |
| `open-paper-detail.js` | 点击文献标题在新标签页打开详情 |
| `generate-markdown-report.js` | 从 JSON 生成 Markdown 报告 |
| `check-data-quality.js` | 数据质量检查 |
| `check-env.sh` | 环境检测和路径查找 |
| `run-search.sh` | **自动化流水线**：一步完成步骤 1-5（初始化→输入→搜索→提取→翻页→报告），无需中间互联 |
| `analyze-relevance.py` | **相关性分析（方案一）**：关键词密度 + TF‑IDF 余弦相似度，为每篇论文计算 relevance_score，输出 enriched JSON |
| `analyze-relevance-sbert.py` | **相关性分析（方案二）**：Sentence-BERT 语义匹配 (all-MiniLM-L6-v2)，深层语义相似度 + 关键词命中率，输出 sbert_enriched JSON |
| `diagnose-page.js` | 页面诊断 |
| `json-helper.mjs` | Node.js JSON 处理工具，替代 jq（读取字段、美化保存、URL编码、数组操作、页面文件合并等） |

## 失败重试逻辑

```
find-interactive-elements.js（查找元素，保存为 interactive-elements.json）
    ↓
input-search-query.js（输入检索式）→ click-search-button.js（点击搜索）
    ↓
totalPapers > 0? → 是 → 进入第五步翻页循环
    ↓ 否                       ↓
刷新页面 → 重新定位          循环：自适应滚动 → show more → 提取 → 翻页?
    ↓                              ↓ hasNext=false
input-search-query.js         保存合并 JSON → 本地生成 Markdown 报告
→ click-search-button.js
    ↓
totalPapers > 0? → 是 → 进入第五步翻页循环
    ↓ 否
尝试 3: 直接访问结果页 URL
    ↓
totalPapers > 0? → 是 → 进入第五步翻页循环
    ↓ 否
生成失败记录文件 → 结束任务
```

## 数据传递机制

```
find-interactive-elements.js
    ↓ 返回 JSON（bash 通过 json-helper.mjs save-pretty 保存为 scripts/interactive-elements.json）
    ├─ targetElements.searchInput.selector  → 输入框 CSS 选择器
    ├─ targetElements.searchButton.selector → 按钮 CSS 选择器
    └─ elementStatus.ready                  → boolean
    ↓ bash 通过 json-helper.mjs read 从 JSON 文件读取选择器，作为参数传入
input-search-query.js(inputSelector, query)  → document.querySelector(inputSelector) 定位输入框
    ↓
click-search-button.js(inputSelector, buttonSelector)  → document.querySelector(buttonSelector) 定位按钮
    ↓ 等待结果页加载
第五步翻页循环（每页重复以下操作）：
    ↓
    check-page-ready.js  → 等待页面加载就绪
    scroll-to-render.js  → 增量步进滚动（每次+500px），逐段触发虚拟滚动渲染，多轮检测高度稳定性
    click-show-more.js   → 展开所有摘要
    extract-papers-v2.js → 提取当前页文献（papers 数组，已过滤空 app-record）
    json-helper.mjs add-page-number + save-pretty → page_NNN.json（每页立即保存到临时文件）
    内联代码检查 next 按钮  → 仅检查按钮状态（disabled?），不点击
    ↓ hasNext=true → 点击 next 按钮 → 继续循环
    ↓ hasNext=false → 退出循环
    ↓
json-helper.mjs build-final-from-pages（合并所有 page_NNN.json）→ 保存最终 JSON
    ↓
本地 node -e 脚本 → 从最终 JSON 生成 Markdown 报告
    ↓
analyze-relevance.py（方案一：关键词密度 + TF‑IDF 余弦相似度）→ 输出 enriched JSON（每篇论文追加 relevance 字段）
    ↓ 或
analyze-relevance-sbert.py（方案二：Sentence-BERT 语义匹配）→ 输出 sbert_enriched JSON
```

---
*版本：3.9（相关性分析方案选择版）*
*更新日期：2026-04-24*

## 修复日志

### v3.9 (2026-04-24) - 相关性分析方案选择版
- **新增流程：询问用户选择相关性分析方案**：确认用户感兴趣的话题和关键词后，新增 AskUserQuestion 步骤询问用户选择方案一（TF‑IDF）还是方案二（SBERT）。提供完整的方案说明、对比表格和推荐阈值，让用户根据自身需求和环境（如是否安装 sentence-transformers）做出选择
- **SKILL.md 更新**：「相关性分析」章节在「确认用户感兴趣的话题」和「执行分析」之间新增「询问选择哪种相关性分析方案」步骤，包含 AskUserQuestion 示例和方案对比表

### v3.8 (2026-04-24) - 相关性分析交互+离线模式版
- **新增流程：相关性分析前确认用户兴趣**：「相关性分析」章节新增「第零步：确认用户感兴趣的话题」。检索完成后不再直接启动相关性分析，而是先向用户展示检索结果摘要，使用 AskUserQuestion 询问用户感兴趣的具体方向，从用户描述中提取关键词并确认后才启动分析
- **修复：SBERT 模型离线加载**：`analyze-relevance-sbert.py` 新增离线模式检测逻辑。脚本启动时自动检测 HuggingFace 本地缓存是否存在 `all-MiniLM-L6-v2` 模型，若存在则设置 `HF_HUB_OFFLINE=1` 跳过在线检查，避免网络不可达时模型加载失败。同时增加加载失败后的自动回退：离线模式加载失败则切换到在线模式重试
- **SKILL.md 更新**：「相关性分析」章节开头改为「先询问用户感兴趣的具体话题，再启动相关性分析」，新增第零步子章节含完整交互流程和 AskUserQuestion 示例

### v3.7 (2026-04-23) - 相关性分析版
- **新增功能：文献相关性分析**：检索完成后可调用分析脚本对每篇论文的摘要与用户感兴趣的关键词进行相关性评分，提供两种方案
- **方案一**：`scripts/analyze-relevance.py` — 关键词密度 + TF‑IDF 余弦相似度。将 topic 关键词合并成"理想摘要"，计算 TF‑IDF 向量余弦相似度 + 关键词命中率，综合得分 = 0.6 × TF‑IDF + 0.4 × 命中率。依赖 scikit-learn（可选，有纯 Python 回退）
- **方案二**：`scripts/analyze-relevance-sbert.py` — Sentence‑BERT 语义匹配。用 all-MiniLM-L6-v2 将关键词扩展为自然语言 query 与论文 title+abstract 编码为 384 维向量，计算余弦相似度。语义匹配能捕捉同义词/近义词关系，综合得分 = 0.7 × SBERT + 0.3 × 命中率。依赖 sentence-transformers
- **`--md-file` 参数**：两个脚本均支持 `--md-file` 参数，指定检索报告 Markdown 文件路径，将 Top 20 最相关文献详细信息（含摘要全文）追加到该文件末尾的 `## Relevance Analysis` 章节。若已存在该章节则替换（支持两种方案覆盖切换）
- **SKILL.md 新增**：「相关性分析」章节（含两种方案对比表）、脚本一览表新增两个脚本、数据流图追加分析步骤
- **Windows 兼容**：两个脚本均强制 stdout/stderr 使用 UTF-8 编码，避免 GBK 编码错误

### v3.6 (2026-04-22) - SKILL_DIR 绝对路径修复版
- **核心修复：统一使用 SKILL_DIR 绝对路径变量**：原 SKILL.md 中所有脚本引用使用相对路径 `scripts/xxx.js`，但 Claude Code 的 Bash 工具 CWD 是项目目录而非 skill 目录，导致 `cat scripts/xxx.js` 找不到文件。改为在每个 bash 代码块开头声明 `SKILL_DIR="C:/Users/15815/.claude/skills/webofscience-literature-search"`，所有脚本引用改为 `$SKILL_DIR/scripts/xxx.js`
- **核心修复：Shell 引号规则**：`--data-raw "..."` 内部的 `$(cat ...)` 不加额外双引号（外层已有双引号，变量可正常展开），独立 `node` 命令的路径参数使用双引号包裹
- **新增路径设置规则**：核心原则第 3 节增加详细的路径设置规则、错误示例（单引号、相对路径、硬编码绝对路径）和正确示例
- **新增自动化流水线脚本**：`run-search.sh` 将步骤 1-5 合并为单次 bash 调用，所有变量在同一 shell 进程内传递，无需 AI 在中间步骤读取变量和手动拼接命令
- **SKILL.md 新增「自动化流水线」章节**：位于手动分步执行之前，推荐 AI 优先使用 `run-search.sh`
- **影响范围**：全文 25 处 `$(cat scripts/...)` → `$(cat $SKILL_DIR/scripts/...)`，10+ 处 `node scripts/...` → `node "$SKILL_DIR/scripts/..."`，所有 bash 代码块添加 `SKILL_DIR=` 声明

### v3.5 (2026-04-22) - 自适应滚动修复版
- **核心修复：增量步进自适应滚动**：WoS 虚拟滚动下直接 `scrollTo(0, height)` 跳到底部会跳过中间记录，虚拟滚动不渲染被跳过的部分（测试中50篇仅提取6篇）。`scroll-to-render.js` 改为接受参数模式：bash 端用 `offset` 变量每次+500px 逐步调用，逐段触发虚拟滚动渲染，然后多轮检测页面高度是否稳定，直到不再增长
- **新增脚本**：`scroll-to-render.js` v2.0 — 接受 `scrollTo` 参数指定滚动位置，bash 端增量步进调用
- **更新第三步/第四步/第五步**：所有滚动逻辑替换为 `scroll-to-render.js` + bash 增量步进循环
- **弃用标记**：固定偏移量 `for offset in 0 1000 ... 12000`、直接 `scrollTo(0, height)` 和 `scroll-to-bottom.js` 均已弃用

### v3.4 (2026-04-22) - 虚拟滚动修复版
- **核心修复：增量滚动替代 scroll-to-bottom.js**：WoS 使用虚拟滚动，仅渲染视口内 DOM 元素。`scroll-to-bottom.js` 基于异步 Promise，CDP Proxy `/eval` 不会等待 Promise 解析，且一次性滚到底无法触发虚拟滚动逐段渲染。改用 `window.scrollTo(0, offset)` 增量滚动（0→12000，步长1000，每步 0.5s）
- **核心修复：翻页检查与点击分离**：`next-page.js` 同时检查按钮状态并点击，循环中调用会导致"检查时即翻页"的 double-click 问题。改用内联代码仅检查 `button.disabled`，确认有下一页后再单独点击
- **核心修复：extract-papers-v2.js 过滤空记录**：WoS 虚拟滚动下 `app-record` 元素包含空占位符（innerHTML.length <= 100），添加过滤条件跳过空记录
- **核心修复：Markdown 生成改用本地 Node.js**：`generate-markdown-report.js` 使用 IIFE + `typeof papers !== 'undefined'` 全局变量检测，在 CDP Proxy `/eval` 中返回 `undefined`。改用 `node -e` 本地脚本从最终 JSON 文件生成 Markdown
- **更新第三步/第四步**：所有 `scroll-to-bottom.js` 调用替换为增量滚动
- **弃用标记**：`scroll-to-bottom.js` 和 `next-page.js` 标记为已弃用，循环流程不再使用
- **更新数据传递机制图**：反映增量滚动和本地 Markdown 生成
- **核心修改**：第五步翻页循环不再使用 `ALL_PAPERS` shell 变量累积数据
- **原因**：Claude Code 的 Bash 工具每次调用创建独立 shell 进程，shell 变量无法跨调用持久化，导致数据丢失
- **新增机制**：每页提取后立即保存到临时文件 `page_NNN.json`，循环结束后合并
- **新增子命令**：`json-helper.mjs merge-page-files`、`json-helper.mjs build-final-from-pages`
- **两阶段执行**：Phase A（提取循环）和 Phase B（合并报告）可在不同 Bash 调用中执行
- **增量持久化**：即使循环中断，已提取页面的数据已保存在临时文件中，不会丢失
- **清理临时文件**：合并完成后自动删除临时目录

### v3.2 (2026-04-22) - Node.js 替代 jq 版
- **移除 jq 依赖**：新增 `scripts/json-helper.mjs`，用 Node.js 替代所有 `jq` 命令调用（共 41 处）
- **原因**：Windows 环境默认未安装 `jq`，导致 `interactive-elements.json` 保存为空文件，后续步骤全部失败
- **新增子命令**：read、read-stdin、save-pretty、pretty-stdin、url-encode、length-stdin、add-page-number、merge-arrays、build-final-json、extract-field-stdin
- **表达式解析**：支持 `.field.subfield`、`.field // "default"`、`length` 等 SKILL.md 实际使用的模式
- **更新数据传递机制图**：标注 json-helper.mjs 在流程中的位置
- **更新脚本一览表**：添加 json-helper.mjs

### v3.1 (2026-04-22) - 多页翻页循环版
- **第五步升级**：单页线性导出改为多页翻页循环提取
- **新增 next-page.js 调用**：点击 "Top Next Page" 按钮翻页，根据 hasNextPage 判断是否继续
- **循环结构**：每页执行 等待加载→滚动→展开摘要→提取→翻页，重复直至无下一页
- **数据合并**：所有页论文合并到单个 JSON 文件，每篇标记 pageNumber 字段
- **边界处理**：
  - 单页结果：next-page.js 返回 hasNextPage=false，循环自然结束
  - 连续空页：检测到连续2页提取为空则退出循环
  - 页面加载超时：等待最多15秒，超时后额外等待5秒
- **MAX_PAGES=50**：防止无限循环
- **更新脚本一览表**：新增 scroll-to-bottom.js、click-show-more.js、next-page.js
- **更新失败重试逻辑图**：成功分支指向翻页循环
- **更新数据传递机制图**：添加翻页循环数据流

### v3.0 (2026-04-22) - 交互元素精确定位版
- **新增 find-interactive-elements.js**：全面扫描页面交互元素（<a>、<button>、表单控件、onclick 元素、ARIA 交互角色、正数 tabindex、btn/button class），精确定位：
  - 检索输入框：`id="advancedSearchInputArea"`
  - 搜索按钮：`class="mdc-button__label interactive-highlight"`，文本为 "Search"
- **JSON 文件传递机制**：find-interactive-elements.js 返回 JSON 结果，由 bash 保存为 `scripts/interactive-elements.json`，后续脚本从该文件读取选择器参数
- **新增 input-search-query.js**：仅负责向输入框填入检索式，参数为 `inputSelector` 和 `query`
- **新增 click-search-button.js**：仅负责点击搜索按钮，参数为 `inputSelector` 和 `buttonSelector`
- **删除 perform-search.js**：原脚本合并了查找、输入、点击三个职责，已拆分为三个独立脚本
- **三步检索模式**：
  1. find-interactive-elements.js → 保存 interactive-elements.json
  2. input-search-query.js(inputSelector, query) → 输入检索式
  3. click-search-button.js(inputSelector, buttonSelector) → 点击搜索
- **alldb 路径支持**：所有 URL 从 `woscc` 更新为 `alldb`，支持全库检索
- **更新 open-paper-detail.js**：支持 alldb 路径的文献详情链接

### v2.6.1 (2026-04-21) - 修复自动点击 Search 版
- **增强 Search 按钮点击**：多种点击方法依次尝试，确保搜索执行
  - 方法1: 直接 click()
  - 方法2: focus + dispatchEvent
  - 方法3: form.submit()
  - 方法4: 模拟 Enter 键
- 增强按钮查找逻辑：支持多种选择器和 Angular Web Components
- 详细日志输出：显示找到的按钮选择器、按钮文本

### v2.6 (2026-04-21) - 强制时间范围版
- **强制时间范围**：检索必须包含时间范围条件，不得为空或 "all"
- 自动默认值：如果用户未指定时间范围，强制使用 `recent-5-years`（最近 5 年）
- 脚本日志增强：显示原始时间范围和实际生效的时间范围
- **完善执行流程**：在执行检索前先检查页面是否正常加载（ diagnose-page.js）
- 新增文献详情查看功能：open-paper-detail.js 点击文献在新标签页打开详情
- 增强 extract-detail.js：提取摘要、关键词、DOI、WOS号、研究领域、基金信息等

### v2.5 (2026-04-21) - 时间范围支持版
- **新增时间范围支持**：perform-search.js 支持 yearRange 参数，使用 PY= 字段
- 支持格式：`YYYY-YYYY`、`recent-X-years`、`YYYY`、`all`
- 完善检索流程：增加检索结果验证，确保查询条件输入成功
- 增加页面类型检测：等待跳转到结果页后再提取数据
- 移除所有登录检测逻辑：完全基于校园网环境

### v2.4 (2026-04-21) - 校园网优化版
- **核心修改**：默认校园网环境下无需登录，直接尝试检索
- 修改等待逻辑：直接进行页面状态检查，不中断流程
- 简化页面状态检查逻辑：减少等待次数
- 更新失败原因分析：专注于校园网环境问题
- 更新失败记录消息：不再提及登录问题，改为"尝试3种方式均失败"
- 简化重试流程：重试时直接执行检索和提取，不做复杂状态判断

### v2.3 (2026-04-21)
- 修改结果保存路径：从 ~/.claude/ 目录改为项目目录 SEARCH_RESULTS/
- 新增 generate-markdown-report.js 独立脚本，用于从 JSON 数据生成 Markdown 报告
- 优化第四步流程：先保存 JSON，再从 JSON 生成 Markdown 报告
- 修复 check-env.sh 路径查找逻辑
- 修复 perform-search.js 关键词解析问题（支持多种分隔符）
- 增强 check-page-ready.js 页面状态检测
- 重写 extract-papers-v2.js 提取逻辑
- 统一脚本调用语法为 `--data-raw "$(cat ...)"`

### v2.2 (2026-04-21)
- 修复 check-env.sh 路径查找逻辑问题
- 修复 perform-search.js 关键词解析问题（支持多种分隔符）
- 增强 check-page-ready.js 页面状态检测
- 重写 extract-papers-v2.js 提取逻辑
- 改进 SKILL.md 执行流程，增加页面滚动步骤
- 统一脚本调用语法为 `--data-raw "$(cat ...)"`

### v2.1 (2026-04-21)
- 初始版本