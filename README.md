# Claude Code Skills 开发项目

这是一个 Claude Code Skills 开发项目，包含一系列专业技能的开发与集成，主要面向经济学研究和学术文献管理领域。

## 📁 项目结构

```
skills/
├── data-analysis/                        # 数据分析技能
├── economic-model-derivation-guidance/    # 经济模型推导指导技能
├── literature-review-economics/           # 经济金融学文献整理总结技能
├── web-access/                           # 网页访问技能（基础依赖）
└── webofscience-literature-search/       # Web of Science 学术文献检索技能
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

### 5. **webofscience-literature-search** - Web of Science 学术文献检索工具
**功能**：指导使用 web-access 在 Web of Science 平台进行专业学术文献检索。

**核心特点**：
- 必须使用 web-access 进行网页交互
- 完整的登录认证流程处理
- 支持基础检索、高级检索、引文检索
- 提供经济学/金融学期刊列表供用户选择
- 检索结果结构化导出（CSV/Markdown）

**主要功能**：
1. 基础关键词检索
2. 高级检索（作者、期刊、年份等）
3. 引文检索和引用分析
4. 检索结果导出和批量处理

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
4. **Web of Science 账号**：用于 `webofscience-literature-search` 技能（需机构订阅）
5. **MarkItDown MCP 服务**: 用于 `literature-review-economics` 技能
6. **Python 3.8+**：用于 `data-analysis` 技能
7. **Python 依赖库**：pandas、numpy、scipy、statsmodels（用于 `data-analysis` 技能）


## 📝 开发状态

- ✅ **data-analysis**：完整，包含描述性统计、缺失值分析、异常值检测、数据类型识别、自相关分析、平稳性检验
- ✅ **economic-model-derivation-guidance**：完整，已包含完整推导流程
- ✅ **literature-review-economics**：完整，已实现智能文献类型判断
- ✅ **web-access**：完整，v2.4.3 版本
- ✅ **webofscience-literature-search**：完整，集成 web-access 使用

## 🔍 注意事项

1. **权限配置**：确保 `.claude/settings.local.json` 中的权限设置支持所需的 Bash 命令
2. **账号安全**：使用 `web-access` 访问社交平台时建议使用小号，避免账号风险
3. **学术伦理**：使用 `webofscience-literature-search` 时遵守学术数据库使用规范
4. **数据隐私**：`literature-review-economics` 依赖 Zotero 本地数据库，确保数据安全

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

*最后更新：2026 年 4 月 19 日*