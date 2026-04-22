# Claude Code Skills 开发项目

这是一个 Claude Code Skills 开发项目，包含一系列专业技能的开发与集成，主要面向经济学研究和学术文献管理领域。

## 📁 项目结构

```
skills/
├── data-analysis/                         # 数据分析技能
├── economic-model-derivation-guidance/    # 经济模型推导指导技能
├── literature-review-economics/           # 经济金融学文献整理总结技能
├── web-access/                            # 网页访问技能（基础依赖）
└── webofscience-literature-search/        # Web of Science 学术文献检索技能 (v3.5)
    └── scripts/                           # 检索脚本文件（15 个 JS + 1 个 MJS + 1 个 SH）
```

## 🔧 技能清单

### 1. **data-analysis** - 数据分析技能
**功能**：使用 Python 脚本对数据进行描述性统计、缺失值分析、异常值检测、数据类型识别、自相关分析和平稳性检验，并生成结构化的 Markdown 报告。

**核心特点**：
- 自动识别数据类型（横截面/时间序列/面板数据）
- 完整的缺失值分析（整体统计、分类、模式识别、相关性分析）
- 根据缺失程度提供针对性处理建议（轻度/中度/严重）
- IQR 方法检测异常值
- 时间序列/面板数据的自相关分析（自相关系数、Ljung-Box 检验）
- 平稳性检验（ADF 检验、KPSS 检验）
- AI 交互式语义异常值分析（根据变量说明文档检测不符合现实情况的异常值）
- 生成结构化的 Markdown 报告

**适用场景**：
- 数据探索和初步分析
- 数据质量检查（缺失值、异常值）
- 时间序列数据分析（宏观经济数据、金融数据等）
- 面板数据分析（企业数据、地区数据等）
- 生成数据报告用于分享或文档记录

**使用方法**：
```bash
cd data-analysis
python scripts/descriptive_stats.py --input your_data.csv --output report.md
```

### 2. **economic-model-derivation-guidance** - 经济学模型推导指导
**功能**：详细指导和规范经济学模型推导过程，从问题设定到均衡分析和比较静态，遵循严谨的经济学建模规范。

**核心特点**：
- 纯理论推导导向，仅生成 Markdown 文档
- 支持消费者理论、厂商理论、宏观模型、金融模型、博弈论模型等
- 完整的五部分结构：问题背景、模型设定、数学推导、均衡分析、比较静态分析
- 强调经济直觉阐释和数学严谨性

**适用场景**：
- 经济学理论模型推导
- 学术研究中的数学建模
- 经济学课程作业辅导
- 专业经济学论文撰写

### 3. **literature-review-economics** - 经济金融学文献综述整理总结工具
**功能**：依赖 zotero-mcp 服务器与 Zotero 交互，提供结构化整理、综述生成、对比分析等功能。

**核心特点**：
- 完全依赖 Zotero MCP 服务器进行文献访问
- 智能文献类型判断（基于摘要和引言内容）
- 实证文章与理论文章差异化分析：
  - 实证文章：侧重实证设计、数据质量、识别策略
  - 理论文章：侧重经济直觉、模型构建逻辑、命题推导
- 多维度文献分析：主题归类、方法学分析、结论对比、研究脉络

**适用场景**：
- 学术文献综述撰写
- 研究课题文献整理
- 文献对比分析
- 学术论文背景研究

### 4. **web-access** - 网页访问技能（基础依赖）
**功能**：所有联网操作必须通过此 skill 处理，包括搜索、网页抓取、登录后操作、网络交互等。

**核心特点**：
- CDP 浏览器模式：直连用户日常 Chrome，天然携带登录态
- 联网策略自动选择：WebSearch / WebFetch / curl / Jina / CDP
- 站点经验积累：按域名存储操作经验，跨 session 复用
- 并行分治：多目标时分发子 Agent 并行执行
- 自动关闭功能：默认 5 分钟空闲超时自动关闭 Proxy ([由某个不想干体力活的 PhD Student](https://github.com/linhuanheng) 开发补充)

**技术依赖**：
- Node.js 22+ 和 Chrome 开启远程调试
- 支持端口冲突自动检测并切换 ([由某个不想干体力活的 PhD Student](https://github.com/linhuanheng) 开发补充)

### 5. **webofscience-literature-search** - Web of Science 学术文献检索工具 (v3.5)
**功能**：指导使用 web-access 在 Web of Science 平台进行专业学术文献检索，支持多页翻页提取、虚拟滚动处理、增量步进自适应滚动。

**核心特点 (v3.5)**：
- 必须使用 web-access 进行网页交互
- **需求确认环节**：先与用户确认检索需求再执行操作
  - 提炼关键词：从用户描述中识别 2-4 个核心学术关键词
  - 确认关键词：展示提炼列表供用户确认或修改
  - 期刊范围选择：提供经济金融学国际顶刊列表（20+ 本顶刊）
  - 时间范围确认：支持多种格式（YYYY-YYYY、YYYY、recent-X-years、all）
- **三步检索模式**：查找交互元素 → 输入检索式 → 点击搜索按钮，选择器保存为 JSON 文件
- **增量步进自适应滚动**：WoS 虚拟滚动下直接 `scrollTo` 跳到底部会跳过中间记录，必须每次+500px 逐步触发渲染，多轮检测页面高度稳定性
- **多页翻页提取**：自动翻阅所有结果页面，每页立即保存为临时文件 `page_NNN.json`，循环结束后合并
- **翻页检查与点击分离**：`next-page.js` 检查时同时点击导致跳页，改用内联代码分离检查和点击
- **校园网优化**：默认无需登录检测，直接尝试检索
- **本地 Markdown 生成**：`generate-markdown-report.js` 在 CDP Proxy 中返回 undefined，改用本地 `node -e` 脚本
- **Node.js 替代 jq**：`json-helper.mjs` 替代 Windows 缺失的 jq，支持读取字段、美化保存、URL编码、数组操作、页面文件合并等
- **失败重试机制**：三级重试（高级检索 → 刷新重试 → 直接结果页）
- **结构化导出**：先保存 JSON 原始数据，再从 JSON 生成 Markdown 报告（含年份分布、期刊分布、Top100按被引排序、Top20含摘要）

**期刊列表覆盖**（经济金融学国际顶刊）：
- 综合性顶刊：AER, QJE, JPE, Econometrica, RESTUD, AEJ 系列
- 金融学顶刊：JF, JFE, RFS, JFQA, RF
- 国际金融/宏观经济：Journal of International Economics, Journal of Monetary Economics 等
- 计量/方法顶刊：Journal of Econometrics, Econometric Journal 等
- 微观经济学顶刊：Journal of Economic Theory, Games and Economic Behavior 等

**主要功能**：
1. 需求确认与关键词提炼
2. 期刊范围选择（顶刊列表/自定义）
3. 时间范围设定
4. 高级检索（三步模式：查找元素 → 输入检索式 → 点击搜索）
5. 多页翻页自动提取（每页独立保存，循环结束合并）
6. 增量步进自适应滚动（确保虚拟滚动记录全部渲染）
7. 文献详情查看（新标签页打开并提取摘要、关键词、DOI等）
8. 检索结果导出（JSON + Markdown 报告，含统计分析和高被引论文摘要）
9. 失败自动记录与诊断

**脚本文件**：
所有脚本已提取至 `scripts/` 目录，共 17 个文件：
- 检索操作：`find-interactive-elements.js`, `input-search-query.js`, `click-search-button.js`
- 滚动渲染：`scroll-to-render.js`（增量步进自适应滚动）
- 数据提取：`extract-papers-v2.js`, `extract-papers.js`, `extract-detail.js`
- 页面交互：`click-show-more.js`, `next-page.js`（弃用）, `open-paper-detail.js`
- 导航控制：`check-page-ready.js`, `diagnose-page.js`
- 数据导出：`check-data-quality.js`, `generate-markdown-report.js`
- 工具脚本：`json-helper.mjs`（Node.js 替代 jq）, `check-env.sh`
- 已弃用：`scroll-to-bottom.js`, `perform-search.js`, `export-csv.js`, `export-json.js`, `export-markdown.js`, `flip-page.js`

## 🔄 技能依赖关系

```
web-access
    ├── webofscience-literature-search（依赖 web-access 进行网页访问）
    └── literature-review-economics（可结合 webofscience-literature-search 获取文献）

data-analysis
    └── 独立运行（依赖 Python 及 pandas、numpy、scipy、statsmodels）
```

## 🚀 使用流程示例

### 学术研究完整流程
1. **数据准备**：使用 `data-analysis` 进行数据探索和质量检查
2. **文献检索**：使用 `webofscience-literature-search` 检索相关文献
3. **文献整理**：使用 `literature-review-economics` 整理检索到的文献
4. **理论建模**：使用 `economic-model-derivation-guidance` 构建理论模型
5. **实证分析**：如有实证部分，可结合其他工具进行分析

### 单一技能使用
- 仅需数据分析时：直接使用 `data-analysis`
- 仅需文献整理时：直接使用 `literature-review-economics`
- 仅需理论推导时：直接使用 `economic-model-derivation-guidance`
- 仅需网页访问时：直接使用 `web-access`

## ⚙️ 环境要求

### 必备配置
1. **Node.js 22+**：所有技能运行的基础环境
2. **Chrome 浏览器**：开启远程调试（chrome://inspect/#remote-debugging）
3. **Zotero 及 zotero-mcp 服务器**：用于 `literature-review-economics` 技能
4. **Web of Science 校园网访问**：用于 `webofscience-literature-search` 技能（需机构订阅，校园网无需登录）
5. **MarkItDown MCP 服务**: 用于 `literature-review-economics` 技能
6. **Python 3.8+**：用于 `data-analysis` 技能
7. **Python 依赖库**：pandas、numpy、scipy、statsmodels（用于 `data-analysis` 技能）


## 📝 开发状态

- ✅ **data-analysis**：完整，包含描述性统计、缺失值分析、异常值检测、数据类型识别、自相关分析、平稳性检验
- ✅ **economic-model-derivation-guidance**：完整，已包含完整推导流程
- ✅ **literature-review-economics**：完整，已实现智能文献类型判断
- ✅ **web-access**：完整，v2.4.3 版本
- ✅ **webofscience-literature-search**：v3.5，集成 web-access，三步检索模式、增量步进自适应滚动、多页翻页提取、本地 Markdown 生成、Node.js 替代 jq

## 🔍 注意事项

1. **权限配置**：确保 `.claude/settings.local.json` 中的权限设置支持所需的 Bash 命令
2. **账号安全**：使用 `web-access` 访问社交平台时建议使用小号，避免账号风险
3. **学术伦理**：使用 `webofscience-literature-search` 时遵守学术数据库使用规范
4. **数据隐私**：`literature-review-economics` 依赖 Zotero 本地数据库，确保数据安全

## 📙 问题反馈
目前项目主要由[某个不想干体力活的Ph D Student](https://github.com/linhuanheng)开发，只是位稍微懂一丢丢代码的金融学博士。很多都是摸着石头过河，感谢愿意把宝贵的token用在我开发的skills上，若有什么问题。可以让AI生成完整详细的执行记录并保存下来后在Issues上留言！感谢各位支持！

## 📚 相关资源

- [Claude Code 官方文档](https://claude.com/claude-code)
- [web-access 官网](https://web-access.eze.is)
- [Zotero MCP 服务器](https://github.com/cookjohn/zotero-mcp)
- [skills CLI 包管理器](https://github.com/vercel-labs/skills)
- [MarkItDown MCP 服务器](https://github.com/mcp/microsoft/markitdown)

## 👥 作者与贡献

本项目为 Claude Code Skills 开发项目，各技能基于开源社区成果和自定义开发。

**技能来源**：
- `web-access`：由 [一泽 Eze](https://github.com/eze-is) 开发
- `其他技能`：[某个不想干体力活的 PhD Student](https://github.com/linhuanheng)

---

*最后更新：2026 年 4 月 22 日 (webofscience-literature-search v3.5 同步)*