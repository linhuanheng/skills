# Claude Code Skills 开发项目

这是一个 Claude Code Skills 开发项目，包含一系列专业技能的开发与集成，主要面向经济学研究和学术文献管理领域。

## 📁 项目结构

```
skills/
├── academic-paper-ppt/                           # 学术论文 PPT 制作技能
├── data-analysis/                               # 数据分析技能
├── economic-model-derivation-guidance/          # 经济模型推导指导技能
├── literature-review-economics/                 # 经济金融学文献整理总结技能
├── quantitative-theory-kb/                      # 数理理论框架知识库构建技能
│   ├── evals/                                   # 评估用例
│   ├── examples/                                # 完整案例（含已构建知识库）
│   └── scripts/                                 # 工具脚本（文献交叉核对等）
└── webofscience-literature-search/              # Web of Science 学术文献检索技能
    └── scripts/                                 # 检索与分析脚本
        ├── run-search.sh                        # 自动化流水线脚本（一键检索）
        ├── analyze-relevance.py                 # 相关性分析（TF-IDF）
        ├── analyze-relevance-sbert.py           # 相关性分析（SBERT 语义匹配）
        └── ...
```

## 🔧 技能清单

### 1. **data-analysis** — 数据分析

使用 Python 脚本对数据进行描述性统计、缺失值分析、异常值检测、数据类型识别、自相关分析和平稳性检验，并生成结构化的 Markdown 报告。

**核心特点**：

- 自动识别数据类型（横截面/时间序列/面板数据）
- 完整的缺失值分析（整体统计、分类、模式识别、相关性分析），根据缺失程度提供针对性处理建议
- IQR 方法检测异常值，AI 交互式语义异常值分析（根据变量说明文档检测不符合现实情况的异常值）
- 时间序列/面板数据的自相关分析（自相关系数、Ljung-Box 检验）和平稳性检验（ADF 检验、KPSS 检验）

**适用场景**：数据探索和初步分析、数据质量检查、时间序列/面板数据分析、生成数据报告

### 2. **economic-model-derivation-guidance** — 经济学模型推导指导

详细指导和规范经济学模型推导过程，从问题设定到均衡分析和比较静态，遵循严谨的经济学建模规范。

**核心特点**：

- 纯理论推导，仅生成 Markdown 文档
- 支持消费者理论、厂商理论、宏观模型、金融模型、博弈论模型等
- 五部分结构：问题背景 → 模型设定 → 数学推导 → 均衡分析 → 比较静态分析
- 可选集成项目知识库：优先查阅 `knowledge-base/`（由 quantitative-theory-kb 构建）获取理论参考，无知识库时则直接推导

**适用场景**：经济学理论模型推导、学术研究中的数学建模、经济学课程作业辅导

### 3. **literature-review-economics** — 经济金融学文献综述整理

依赖 zotero-mcp 服务器与 Zotero 交互，提供结构化整理、综述生成、对比分析等功能。

**核心特点**：

- 智能文献类型判断（基于摘要和引言内容区分实证/理论文章）
- 实证文章侧重实证设计、数据质量、识别策略；理论文章侧重经济直觉、模型构建逻辑、命题推导
- 多维度文献分析：主题归类、方法学分析、结论对比、研究脉络
- 支持 MarkItDown MCP 高质量 PDF 解析

**适用场景**：学术文献综述撰写、研究课题文献整理、文献对比分析

### 4. **quantitative-theory-kb** — 数理理论框架知识库构建

为经济学和金融学研究者系统地构建数理知识库，涵盖计量理论、运筹学、数学分析、泛函分析等数学工具，以及经济学/金融学理论框架的结构化整理与持续更新。

**七个工作阶段**：

| 阶段 | 名称 | 说明 |
|------|------|------|
| 一 | 需求调研 | 领域选择 → 目标定位 → 深度偏好（三级） → 文献源确认 → 相关性评估 |
| 二 | 知识库初始化 | 创建目录结构、生成总索引和子领域索引、建立交叉引用 |
| 三 | 知识条目构建 | 逐条目构建，构建前必须精读相关文献核心章节（模型构建/方法论推导/理论框架），标注文献来源 |
| 四 | 质量控制 | 完整性、一致性、链接有效性、数学正确性检查 |
| 五 | 文献扩展 | 从核心文献引言+文献综述提取引用 → `cross_check_refs.py` 交叉核对 → 顶刊筛选 → 归纳提炼 |
| 六 | 增量更新 | 支持 Zotero/本地来源，提供多文献归纳和单文献深度提炼两种模式，含扩展式更新和新建式更新 |
| 七 | 知识库整合 | 不删除任何条目，偏离方向压缩，一致方向深化扩展，含整合日志 |

**核心特点**：

- 六大领域 × 五种条目类型 × 三级深度控制
- 统一知识条目模板（YAML frontmatter + LaTeX 数学表述 + `source_sections` 文献追溯）
- 深入级模式：Zotero 文库集成 + 文献-领域相关性评估 + 逐条目精读文献核心
- 文献扩展：引言+文献综述提取候选 → Python 脚本交叉核对参考文献列表 → 顶刊筛选
- 增量更新：单文献深度提炼（理论框架/实证方法论分型 + 扩展已有条目 vs 新建条目）
- 知识库整合：不删除原则 + 偏离压缩/一致深化 + consolidation-log 可追溯
- 内置 `scripts/cross_check_refs.py` v2.0 — 多格式兼容、安全解析、48 条连续文本分条
- 内置完整示例（多资产 ES 时间序列建模，28 文件/16 条目+方法论决策树）

### 5. **webofscience-literature-search** — Web of Science 学术文献检索

指导使用 web-access 在 Web of Science 平台进行专业学术文献检索，支持自动化流水线一键检索、多页翻页提取、虚拟滚动处理，以及检索后的文献相关性分析。

**核心特点**：

- **需求确认环节**：提炼关键词 → 确认期刊范围（20+ 经济金融顶刊）→ 确认时间范围
- **自动化流水线**：`run-search.sh` 一键完成检索、多页翻页提取、增量步进自适应滚动
- **相关性分析**（检索完成后先询问用户兴趣方向再启动）：
  - TF-IDF 方案：关键词密度 + 余弦相似度，轻量快速
  - SBERT 方案：all-MiniLM-L6-v2 语义匹配，支持离线模式
- **导出格式**：JSON 原始数据 + Markdown 报告（含分布统计、高引论文、Top 20 相关文献）

### 6. **academic-paper-ppt** — 学术论文 PPT 制作

从学术论文（PDF 或 Zotero 条目）生成 LaTeX beamer 学术幻灯片，覆盖文献阅读→总结→侧重→PPT 编译的完整流程。

**核心特点**：

- 双输入模式：支持 PDF 文件直接读取 或 Zotero 条目自动提取全文
- 三步报告产出：初步总结（类型判断+贡献+概要）→ 侧重详细报告 → 关联映射报告
- 六类展示侧重点：理论框架/实证方法设计/实证结果/数据变量/文献贡献/自定义
- 事实核查：所有定量数字、统计结论标注原文出处（Section/Table/Row）
- 图片占位→替换两阶段编译：先用 `[Figure X insert here]` 占位编译检查排版，用户确认图片路径后再替换重编译
- 九条排版规则：字体统一、表格居中、垂直布局、页面防溢出等

**适用场景**：学术组会汇报、论文答辩 slides、期刊俱乐部演示、学术报告幻灯片

### 7. **web-access** — 网页访问（基础依赖）

[web-access](https://web-access.eze.is)所有联网操作必须通过此 skill 处理，包括搜索、网页抓取、登录后操作、网络交互等。

**核心特点**：

- CDP 浏览器模式：直连用户日常 Chrome，天然携带登录态
- 联网策略自动选择：WebSearch / WebFetch / curl / Jina / CDP
- 站点经验积累：按域名存储操作经验，跨 session 复用
- 端口可用校验和端口冲突切换由[某个不想干体力活的PhD Student](https://github.com/linhuanheng)补充开发

**技术依赖**：Node.js 22+ 和 Chrome 开启远程调试

## 🔄 技能依赖关系

```
academic-paper-ppt
    ├── pdf（PDF 文件读取）
    ├── zotero-mcp（Zotero 文献条目提取）
    ├── pdflatex / xelatex（LaTeX beamer 编译）
    └── markitdown MCP（PDF 解析，可选）

quantitative-theory-kb
    ├── zotero-mcp（深入级模式、文献扩展、增量更新时依赖 Zotero 文库访问）
    ├── Python 3.8+（参考文献交叉核对脚本 cross_check_refs.py）
    └── markitdown MCP（本地 PDF 文献解析，可选）

economic-model-derivation-guidance
    └── knowledge-base/（可选，优先查阅由 quantitative-theory-kb 构建的知识库获取理论参考）

web-access
    ├── webofscience-literature-search（依赖 web-access 进行网页访问）
    │   ├── Python + scikit-learn（相关性分析方案一，TF-IDF，可选）
    │   └── Python + sentence-transformers（相关性分析方案二，SBERT，推荐）
    └── literature-review-economics（可结合 webofscience-literature-search 获取文献）

data-analysis
    └── 独立运行（依赖 Python 及 pandas、numpy、scipy、statsmodels）
```

## 🚀 使用流程示例

### 学术研究完整流程

1. **理论基础构建**：使用 `quantitative-theory-kb` 建立数理知识和理论框架
2. **数据准备**：使用 `data-analysis` 进行数据探索和质量检查
3. **文献检索**：使用 `webofscience-literature-search` 检索相关文献
4. **文献整理**：使用 `literature-review-economics` 整理检索到的文献
5. **理论建模**：使用 `economic-model-derivation-guidance` 构建理论模型
6. **汇报展示**：使用 `academic-paper-ppt` 将论文转化为学术幻灯片

### 单一技能使用
各技能可独立使用，无需按顺序执行。

## 📂 检索结果

检索结果保存在 `SEARCH_RESULTS/` 目录下：

- `*.json`：原始检索数据
- `*_enriched.json` / `*_sbert_enriched.json`：相关性分析结果
- `*.md`：Markdown 检索报告（含文献表格、统计分布、高引摘要、Top 20 相关性分析）

## ⚙️ 环境要求

### 必备配置

1. **Node.js 22+**：所有技能运行的基础环境
2. **Chrome 浏览器**：开启远程调试（chrome://inspect/#remote-debugging）
3. **Zotero 及 zotero-mcp 服务器**：用于 `literature-review-economics` 和 `academic-paper-ppt` 技能
4. **Web of Science 校园网访问**：用于 `webofscience-literature-search` 技能（需机构订阅）
5. **MarkItDown MCP 服务**：用于 `literature-review-economics` 和 `academic-paper-ppt` 技能
6. **LaTeX 发行版**（TeX Live / MiKTeX）：用于 `academic-paper-ppt` 的 beamer 编译，建议安装 xelatex 以支持中文
7. **Python 3.8+**：用于 `data-analysis` 和文献相关性分析
8. **Python 依赖库**：
   - `data-analysis`：pandas、numpy、scipy、statsmodels
   - `webofscience-literature-search`：scikit-learn（TF-IDF，可选）、sentence-transformers（SBERT，推荐）

## 🔍 注意事项

1. **权限配置**：确保 `.claude/settings.local.json` 中的权限设置支持所需的 Bash 命令
2. **账号安全**：使用 `web-access` 访问社交平台时建议使用小号，避免账号风险
3. **学术伦理**：使用 `webofscience-literature-search` 时遵守学术数据库使用规范
4. **数据隐私**：`literature-review-economics` 依赖 Zotero 本地数据库，确保数据安全

## 📙 问题反馈

目前项目主要由[某个不想干体力活的 PhD Student](https://github.com/linhuanheng)开发，只是位稍微懂一丢丢代码的金融学博士。很多都是摸着石头过河，感谢愿意把宝贵的 token 用在我开发的 skills 上。若有什么问题，可以让 AI 生成完整详细的执行记录并保存下来后在 Issues 上留言！感谢各位支持！

## 📚 相关资源

- [Claude Code 官方文档](https://claude.com/claude-code)
- [web-access 官网](https://web-access.eze.is)
- [Zotero MCP 服务器](https://github.com/cookjohn/zotero-mcp)
- [skills CLI 包管理器](https://github.com/vercel-labs/skills)
- [MarkItDown MCP 服务器](https://github.com/mcp/microsoft/markitdown)

## 👥 作者与贡献

- **web-access**：由 [一泽 Eze](https://github.com/eze-is) 开发
- **其他技能**：[某个不想干体力活的 PhD Student](https://github.com/linhuanheng)

---

最后更新：2026 年 5 月 12 日
