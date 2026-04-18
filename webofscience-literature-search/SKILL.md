---
name: webofscience-literature-search
description: 指导 AI 使用 web-access 在 Web of Science 平台进行专业学术文献检索。支持基础关键词检索、高级检索（作者、期刊、年份等）、引文检索和引用分析、检索结果导出。提供经济学/金融学期刊列表供用户选择，支持多期刊组合检索。必须使用 web-access 进行网页交互，处理 Web of Science 的登录认证流程，包括检测登录页面、询问用户处理方式、登录成功后自动跳转高级检索界面。
---

# Web of Science 学术文献检索工具

本 skill 指导 AI 使用 web-access 在 Web of Science 平台进行专业学术文献检索。Web of Science 是权威的学术文献数据库，包含 SCI、SSCI、AHCI 等核心期刊论文。

**注意：** Web of Science 通常需要机构订阅和个人账户登录。本 skill 提供完整的登录处理流程，包括检测登录页面、询问用户处理方式、指导手动登录等交互。支持在登录成功后自动跳转到高级检索界面。

## 核心原则

### 1. 网页交互优先
- **必须使用 web-access**：所有 Web of Science 访问必须通过 web-access 的 CDP 浏览器模式进行
- **真实浏览器交互**：模拟真实用户操作，避免触发反爬机制
- **登录态利用**：利用用户 Chrome 中已有的 Web of Science 登录态

### 2. 检索功能完整
1. **基础关键词检索**：主题、标题、摘要关键词搜索
2. **高级检索**：作者、期刊、年份、文献类型、DOI 等多字段组合检索
3. **引文检索**：检索特定文献的引用文献（Cited References）和被引文献（Times Cited）
4. **结果导出**：将检索结果导出为结构化格式（CSV/Markdown）

### 3. 结果处理规范
- **结构化提取**：系统提取文献元数据（标题、作者、期刊、年份、摘要、关键词等）
- **批量处理**：支持多页结果遍历和批量导出
- **格式标准化**：遵循学术文献引用规范

## 准备工作

在开始检索前，必须确保：
1. **web-access 已配置**：运行`node scripts/check-deps.mjs`检查依赖
2. **Chrome 已登录 Web of Science**：在 Chrome 地址栏打开 `chrome://inspect/#remote-debugging`启用远程调试
3. **温馨提示**：部分学术数据库对自动化操作检测严格，存在账号封禁风险。已内置防护措施但无法完全避免，Agent 继续操作即视为接受。

## 主要功能

### 1. 基础关键词检索
**目标**：根据用户提供的主题或关键词在 Web of Science 进行基础检索

**操作流程**：
1. 导航到 Web of Science 主页（https://www.webofscience.com/）
2. 在搜索框中输入关键词
3. 选择检索字段（主题、标题、作者等）
4. 执行搜索
5. 解析搜索结果页面
6. 提取文献列表信息

### 2. 期刊选择检索
**目标**：根据用户选择的特定期刊列表进行定向检索

**经济学/金融学核心期刊列表**：
- **顶级综合期刊**：American Economic Review, Econometrica, Journal of Political Economy, Quarterly Journal of Economics, Review of Economic Studies
- **计量经济学**：Journal of Econometrics, Econometric Theory, Journal of Applied Econometrics, Econometric Reviews
- **宏观经济学**：Journal of Monetary Economics, Journal of Money, Credit and Banking, Review of Economics and Statistics
- **微观经济学**：Journal of Economic Theory, Games and Economic Behavior, International Economic Review
- **金融学**：Journal of Finance, Journal of Financial Economics, Review of Financial Studies, Journal of Financial and Quantitative Analysis
- **发展经济学**：Journal of Development Economics, World Development, Economic Development and Cultural Change
- **劳动经济学**：Journal of Labor Economics, Industrial and Labor Relations Review, Labour Economics
- **国际经济学**：Journal of International Economics, Review of International Economics, International Finance
- **公共经济学**：Journal of Public Economics, National Tax Journal, Public Choice

**期刊选择方式**：
1. **全部期刊**：不限制期刊范围
2. **单期刊检索**：指定单个期刊
3. **多期刊组合**：选择多个相关期刊
4. **期刊类别检索**：按期刊类别（如"计量经济学"、"金融学"）选择

**操作流程**：
1. 通过 AskUserQuestion 工具展示期刊列表供用户选择
2. 根据用户选择构建期刊限定检索式
3. 在高级检索中使用 SO 字段限制期刊来源
4. 执行检索并返回结果

**提取信息**：
- 文献标题
- 作者列表
- 期刊名称和卷期
- 出版年份
- DOI 链接
- 摘要（如果可用）
- 被引次数
- 参考文献链接

### 2. 高级检索
**目标**：使用高级检索界面进行多字段组合检索

**支持字段**：
- **TI**：标题
- **AU**：作者
- **SO**：期刊来源
- **PY**：出版年份
- **AB**：摘要
- **KW**：关键词
- **DO**：DOI

**检索语法**：
- 布尔运算符：AND, OR, NOT
- 通配符：*, ?
- 短语搜索："quoted phrase"

**操作流程**：
1. 进入高级检索界面
2. 构建检索式（如：TI=(machine learning) AND PY=(2020-2024)）
3. 执行检索
4. 解析结果

### 3. 引文检索
**目标**：分析特定文献的引用关系

**两种模式**：
1. **参考文献检索**：查找某文献引用了哪些文献
2. **被引检索**：查找某文献被哪些文献引用

**操作流程**：
1. 找到目标文献的详情页面
2. 点击"Cited References"或"Times Cited"链接
3. 解析引用文献列表
4. 提取引用网络信息

### 4. 检索结果导出
**目标**：将检索结果导出为结构化格式

**支持格式**：
1. **CSV 格式**：适合导入 Excel 或数据分析工具
2. **Markdown 格式**：适合生成文献综述文档
3. **BibTeX 格式**：适合 LaTeX 文档引用

**导出字段**：
- 标题、作者、期刊、年份、卷期、页码
- DOI、PMID、WOS 号
- 摘要、关键词
- 被引次数、参考文献数
- 文献类型、研究领域

## 操作指南

### 第一步：初始化 web-access
```bash
node "C:/Users/15815/.claude/plugins/cache/web-access/web-access/2.4.2/scripts/check-deps.mjs"
```

### 第二步：导航到 Web of Science
```bash
curl -s "http://localhost:3456/new?url=https://www.webofscience.com"
```

### 第三步：页面状态检查和登录处理
检查页面是否正常加载，是否要求登录。如果出现登录页面或身份验证弹窗，需要与用户交互处理登录流程：

**完整的身份验证处理流程**：

#### 阶段一：页面状态检测
1. **检测页面加载状态**：检查页面是否正常加载完成
2. **检测身份验证弹窗**：特别注意检查以下类型的身份验证相关元素：
   - 账户选择弹窗（"Choose an account"、"Select an account to continue"）
   - 记住登录选择提示（"Remember this choice"、"Don't ask again"）
   - 权限请求弹窗（"Allow Web of Science to access your information"）
   - 机构登录选择（如"访问通过 Shibboleth"、"登录方式选择"）
   - 单点登录（SSO）重定向页面
   - 登录表单页面（username/password 输入框）

#### 阶段二：身份验证首选项处理
如果检测到身份验证选择弹窗或首选项提示，使用 AskUserQuestion 工具询问用户处理方式：

```
question: "检测到身份验证选择界面，请选择处理方式"
header: "身份验证选择"
options:
  - label: "使用默认账户登录"
    description: "选择第一个或默认账户继续登录（适用于个人账户）"
  - label: "选择特定账户"
    description: "需要用户指定要使用的账户或登录方式"
  - label: "拒绝记住选择"
    description: "选择"仅本次"或"不记住"，避免浏览器记住登录选择"
  - label: "允许记住选择"
    description: "选择"记住此选择"或"总是允许"，让浏览器记住登录偏好"
  - label: "取消登录"
    description: "放弃登录，尝试访问公开内容"
  - label: "需要手动干预"
    description: "用户需要在浏览器中手动处理身份验证选择"
multiSelect: false
```

**根据用户选择的处理方式**：

**A. 使用默认账户登录**：
- 检查页面中是否有"使用此账户"、"Continue with this account"或默认高亮选项
- 尝试点击第一个账户选择按钮
- 等待页面跳转或刷新

**B. 选择特定账户**：
- 使用 AskUserQuestion 进一步询问用户：
  ```
  question: "请选择要使用的账户或登录方式"
  header: "账户选择"
  options:
    - label: "机构账户（SSO）"
      description: "通过机构单点登录（如学校、研究机构账户）"
    - label: "个人账户"
      description: "个人注册的 Web of Science 账户"
    - label: "试用账户"
      description: "试用期或临时访问账户"
    - label: "自定义输入"
      description: "手动输入账户名称或邮箱"
  multiSelect: false
  ```
- 根据用户选择执行相应操作：
  - 机构账户：点击机构登录相关选项
  - 个人账户：点击个人账户登录选项
  - 试用账户：点击试用或访客访问选项
  - 自定义输入：指导用户手动输入账户信息

**C. 拒绝记住选择**：
- 查找"仅本次"、"Just once"、"Don't remember"、"不记住"等选项
- 点击相应按钮或取消勾选"记住选择"复选框
- 等待页面继续

**D. 允许记住选择**：
- 查找"记住此选择"、"Always allow"、"Remember my choice"等选项
- 点击相应按钮或勾选"记住选择"复选框
- 等待页面继续

**E. 取消登录**：
- 查找"取消"、"Cancel"、"返回"等按钮
- 点击取消按钮，返回上一页面
- 尝试访问公开检索功能

**F. 需要手动干预**：
- 指导用户在浏览器中手动处理：
  1. 在打开的页面中查看身份验证弹窗
  2. 选择要使用的账户或登录方式
  3. 选择是否记住登录选择
  4. 点击确认或继续按钮
- 等待用户确认完成操作
- 刷新页面验证状态

#### 阶段三：登录状态检测与处理
身份验证首选项处理完成后，检测页面状态：

1. **检测登录状态**：检查页面是否显示登录表单、登录按钮或要求认证的提示
2. **询问用户选择**：如果仍然需要登录，使用 AskUserQuestion 工具询问用户如何处理登录需求：

```
question: "检测到需要登录 Web of Science，请选择处理方式"
header: "登录处理"
options:
  - label: "使用现有会话继续"
    description: "检查浏览器中是否已有有效登录会话，尝试刷新页面或使用现有会话"
  - label: "需要手动登录"
    description: "用户需要手动登录 Web of Science 账户，请指导用户完成登录"
  - label: "跳过登录，仅浏览公开内容"
    description: "不登录直接访问，可能无法使用完整检索功能"
  - label: "取消检索"
    description: "放弃本次检索任务"
multiSelect: false
```

3. **根据用户选择处理**：
   
   **A. 使用现有会话继续**：
   - 检查当前页面 URL，尝试刷新页面
   - 检查是否有"Continue without login"或"Skip login"选项
   - 尝试访问首页或高级检索页面直接跳转
   
   **B. 需要手动登录**：
   - 指导用户在 Chrome 浏览器中手动登录 Web of Science
   - 提供登录步骤：
     1. 在 Chrome 地址栏打开：https://www.webofscience.com
     2. 点击"Sign In"或"登录"按钮
     3. 输入机构或个人账户凭证
     4. 完成登录后返回并继续
   - 等待用户确认登录完成
   - 刷新页面验证登录状态
   
   **C. 跳过登录，仅浏览公开内容**：
   - 尝试访问公开检索功能
   - 注意：可能无法访问高级检索和完整结果
   
   **D. 取消检索**：
   - 结束当前检索任务
   - 清理已打开的页面

4. **登录成功验证**：
   - 检测页面是否显示用户信息（如用户名、机构名）
   - 检查是否有"Logout"或"Sign Out"选项
   - 验证是否可以访问高级检索页面

5. **自动跳转高级检索**：
   - 登录成功后，自动导航到高级检索界面：https://www.webofscience.com/wos/woscc/advanced-search
   - 或点击页面上的"Advanced Search"链接
   - 等待高级检索页面完全加载

### 第四步：需求确认与期刊选择（使用 AskUserQuestion）

**4.1 检索主题确认**
询问用户检索主题或关键词，例如：
- "请输入您要检索的研究主题或关键词（如：causal inference, machine learning in economics）"

**4.2 期刊范围选择（使用 AskUserQuestion 工具）**

向用户展示期刊选择菜单，使用 AskUserQuestion 配置：

```
question: "请选择要检索的期刊范围（可多选）"
header: "期刊选择"
options:
  - label: "全部期刊"
    description: "不限制期刊范围，检索所有期刊"
  - label: "顶级综合期刊 (AER, Econometrica, QJE 等)"
    description: "经济学五大 Top 期刊"
    preview: "American Economic Review, Econometrica, Journal of Political Economy, Quarterly Journal of Economics, Review of Economic Studies"
  - label: "计量经济学 (Journal of Econometrics 等)"
    description: "计量经济学专业期刊"
    preview: "Journal of Econometrics, Econometric Theory, Journal of Applied Econometrics, Econometric Reviews"
  - label: "宏观经济学 (JME, JMCB 等)"
    description: "宏观经济学领域期刊"
    preview: "Journal of Monetary Economics, Journal of Money Credit and Banking, Review of Economics and Statistics"
  - label: "金融学 (Journal of Finance 等)"
    description: "金融学三大顶刊"
    preview: "Journal of Finance, Journal of Financial Economics, Review of Financial Studies"
  - label: "自定义期刊"
    description: "手动输入特定期刊名称"
multiSelect: true
```

**4.3 年份范围确认**
询问用户需要检索的年份范围：
- "请选择年份范围：全部年份 / 最近 5 年 / 最近 10 年 / 自定义范围"

### 第五步：构建检索式

根据用户选择构建高级检索式：

**A. 不限期刊（全部期刊）**
```
TS=(causal inference) AND PY=(2020-2024)
```

**B. 单期刊检索**
```
TS=(causal inference) AND SO=(Journal of Econometrics) AND PY=(2020-2024)
```

**C. 多期刊组合检索**
```
TS=(causal inference) AND (SO=(Journal of Econometrics) OR SO=(Econometric Theory) OR SO=(Journal of Applied Econometrics)) AND PY=(2020-2024)
```

**D. 期刊类别检索**
```
TS=(causal inference) AND (SO=(American Economic Review) OR SO=(Econometrica) OR SO=(Quarterly Journal of Economics)) AND PY=(2020-2024)
```

### 第六步：执行检索

#### A. 进入高级检索界面
1. 点击 Web of Science 首页的"高级检索"链接
2. 等待高级检索页面加载

#### B. 输入检索式
1. 在检索式输入框中填入构建好的检索式
2. 检查检索式语法是否正确

#### C. 执行检索
1. 点击"检索"按钮
2. 等待结果页面加载

### 第七步：结果解析
**使用`/eval`提取页面数据**：

在检索结果解析时，确保完整提取并结构化保存以下核心信息：摘要、年份、作者、期刊、被引用量、标题、DOI 等。

#### 核心数据结构定义
每个文献条目应包含以下结构化字段：

```javascript
{
  // 核心信息（必须保留）
  "title": "文献标题",
  "authors": "作者列表（多个作者用逗号分隔）", 
  "source": "期刊名称",
  "year": "出版年份",
  "abstract": "摘要内容",
  "cited": "被引用次数（数值）",
  "doi": "DOI 链接",
  
  // 扩展信息
  "volume": "卷号",
  "issue": "期号", 
  "pages": "页码",
  "keywords": "关键词",
  "documentType": "文献类型（Article, Review 等）",
  "wosId": "Web of Science ID",
  "url": "文献详情页链接"
}
```

#### 增强的数据提取脚本
```bash
# 提取文献条目（增强版）
curl -s -X POST "http://localhost:3456/eval?target=ID" -d '
Array.from(document.querySelectorAll(".search-results .record, .wos-record")).map(record => {
  // 基础信息提取
  const titleEl = record.querySelector(".title a, .title-value a, [data-ta="title-link"]");
  const authorsEl = record.querySelector(".authors, .author-value, [data-ta="author-value"]");
  const sourceEl = record.querySelector(".source, .source-value, .journal-title");
  const yearEl = record.querySelector(".year, .published-year, [data-ta="published-year"]");
  const citedEl = record.querySelector(".cited-count, .times-cited, .citation-count");
  const abstractEl = record.querySelector(".abstract, .abstract-value, .abstract-content");
  const doiEl = record.querySelector(".doi a, [data-ta="doi-link"]");
  
  // 扩展信息提取
  const volumeIssueEl = record.querySelector(".source-part, .volume-issue, .journal-info");
  const keywordsEl = record.querySelector(".keywords, .keyword-list");
  const typeEl = record.querySelector(".document-type, .type-badge");
  const wosIdEl = record.querySelector(".uid, .wos-id, [data-ta="uid-value"]");
  const urlEl = record.querySelector(".title a")?.href || "";
  
  // 处理被引用次数（转换为纯数字）
  let citedCount = "0";
  if (citedEl) {
    const citedText = citedEl.innerText.trim();
    citedCount = citedText.replace(/[^0-9]/g, "") || "0";
  }
  
  // 处理年份（提取 4 位数字）
  let yearValue = "";
  if (yearEl) {
    const yearText = yearEl.innerText.trim();
    const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
    yearValue = yearMatch ? yearMatch[0] : yearText;
  }
  
  // 处理卷期信息
  let volume = "", issue = "", pages = "";
  if (volumeIssueEl) {
    const text = volumeIssueEl.innerText.trim();
    // 匹配卷号：Vol. 123 或 Volume 123
    const volumeMatch = text.match(/[Vv]ol(?:ume)?\.?\s*(\d+)/);
    volume = volumeMatch ? volumeMatch[1] : "";
    // 匹配期号：Issue 4 或 No. 4
    const issueMatch = text.match(/[Ii]ssue\s*(\d+)|[Nn]o\.?\s*(\d+)/);
    issue = issueMatch ? (issueMatch[1] || issueMatch[2]) : "";
    // 匹配页码：pp. 123-145 或 Pages 123-145
    const pagesMatch = text.match(/[Pp](?:ages?|p)\.?\s*(\d+(?:-\d+)?)/);
    pages = pagesMatch ? pagesMatch[1] : "";
  }
  
  return {
    // 核心结构化信息（必须保留）
    title: titleEl?.innerText.trim() || "",
    authors: authorsEl?.innerText.trim() || "",
    source: sourceEl?.innerText.trim() || "",
    year: yearValue,
    abstract: abstractEl?.innerText.trim() || "",
    cited: citedCount,
    doi: doiEl?.href || doiEl?.innerText.trim() || "",
    
    // 扩展结构化信息
    volume: volume,
    issue: issue,
    pages: pages,
    keywords: keywordsEl?.innerText.trim() || "",
    documentType: typeEl?.innerText.trim() || "Article",
    wosId: wosIdEl?.innerText.trim() || "",
    url: urlEl,
    
    // 元数据
    extractionTime: new Date().toISOString(),
    pageNumber: window.location.href.match(/page=(\d+)/)?.[1] || "1"
  };
})
'
```

### 第八步：翻页处理
如果需要获取多页结果：
1. 检查是否有下一页按钮
2. 点击下一页或输入页码跳转
3. 重复结果提取

### 第九步：文献详情获取
对于需要详细信息的文献：
1. 点击文献标题进入详情页
2. 提取完整摘要、关键词、作者单位、参考文献等
3. 返回检索结果页

### 第十步：结果导出

#### 结构化数据导出
为确保完整保留摘要、年份、作者、期刊以及被引用量的结构信息，提供多种导出格式：

**A. 完整 CSV 导出（推荐）**
导出所有结构化字段，包括核心信息和扩展信息：

```javascript
// 构建完整 CSV 内容
const headers = [
  "标题", "作者", "期刊", "年份", "摘要", "被引次数", "DOI",
  "卷号", "期号", "页码", "关键词", "文献类型", "WOS ID", "URL"
];

const rows = results.map(r => [
  `"${(r.title || "").replace(/"/g, '""')}"`,
  `"${(r.authors || "").replace(/"/g, '""')}"`,
  `"${(r.source || "").replace(/"/g, '""')}"`,
  r.year || "",
  `"${(r.abstract || "").replace(/"/g, '""')}"`,
  r.cited || "0",
  r.doi || "",
  r.volume || "",
  r.issue || "",
  r.pages || "",
  `"${(r.keywords || "").replace(/"/g, '""')}"`,
  r.documentType || "Article",
  r.wosId || "",
  r.url || ""
]);

const csvContent = [headers.join(","), ...rows].join("\n");
```

**B. 简化 CSV 导出**
仅导出核心信息（摘要、年份、作者、期刊、被引用量）：

```javascript
// 构建简化 CSV 内容（核心结构化信息）
const coreHeaders = ["标题", "作者", "期刊", "年份", "摘要", "被引次数", "DOI"];

const coreRows = results.map(r => [
  `"${(r.title || "").replace(/"/g, '""')}"`,
  `"${(r.authors || "").replace(/"/g, '""')}"`,
  `"${(r.source || "").replace(/"/g, '""')}"`,
  r.year || "",
  `"${(r.abstract || "").replace(/"/g, '""')}"`,
  r.cited || "0",
  r.doi || ""
]);

const coreCsvContent = [coreHeaders.join(","), ...coreRows].join("\n");
```

**C. JSON 格式导出**
保留完整的结构化数据，便于后续程序处理：

```javascript
// 构建 JSON 导出内容
const exportData = {
  metadata: {
    searchDate: new Date().toISOString(),
    totalResults: results.length,
    searchQuery: "用户检索式", // 实际使用中替换为真实检索式
    exportFormat: "structured"
  },
  results: results.map(r => ({
    // 核心结构化信息
    title: r.title || "",
    authors: r.authors || "",
    source: r.source || "",
    year: r.year || "",
    abstract: r.abstract || "",
    cited: parseInt(r.cited) || 0,
    doi: r.doi || "",
    
    // 扩展信息
    volume: r.volume || "",
    issue: r.issue || "",
    pages: r.pages || "",
    keywords: r.keywords ? r.keywords.split(/[,;]/).map(k => k.trim()).filter(k => k) : [],
    documentType: r.documentType || "Article",
    wosId: r.wosId || "",
    url: r.url || "",
    
    // 元数据
    extractionTime: r.extractionTime || new Date().toISOString()
  }))
};

const jsonContent = JSON.stringify(exportData, null, 2);
```

#### 文件保存

**保存完整 CSV 文件**：
```bash
echo "$csvContent" > "webofscience_full_results_$(date +%Y%m%d_%H%M%S).csv"
```

**保存简化 CSV 文件**：
```bash
echo "$coreCsvContent" > "webofscience_core_results_$(date +%Y%m%d_%H%M%S).csv"
```

**保存 JSON 文件**：
```bash
echo "$jsonContent" > "webofscience_structured_results_$(date +%Y%m%d_%H%M%S).json"
```

#### 数据验证和完整性检查
导出前检查数据的完整性：

```javascript
// 数据完整性检查
const completenessStats = {
  total: results.length,
  withTitle: results.filter(r => r.title && r.title.trim()).length,
  withAuthors: results.filter(r => r.authors && r.authors.trim()).length,
  withSource: results.filter(r => r.source && r.source.trim()).length,
  withYear: results.filter(r => r.year && r.year.trim()).length,
  withAbstract: results.filter(r => r.abstract && r.abstract.trim()).length,
  withCited: results.filter(r => r.cited && parseInt(r.cited) > 0).length,
  withDOI: results.filter(r => r.doi && r.doi.trim()).length
};

console.log("数据完整性统计:", completenessStats);

// 生成完整性报告
const completenessReport = `
## 数据完整性报告

- 总文献数：${completenessStats.total}
- 包含标题：${completenessStats.withTitle} (${(completenessStats.withTitle/completenessStats.total*100).toFixed(1)}%)
- 包含作者：${completenessStats.withAuthors} (${(completenessStats.withAuthors/completenessStats.total*100).toFixed(1)}%)
- 包含期刊：${completenessStats.withSource} (${(completenessStats.withSource/completenessStats.total*100).toFixed(1)}%)
- 包含年份：${completenessStats.withYear} (${(completenessStats.withYear/completenessStats.total*100).toFixed(1)}%)
- 包含摘要：${completenessStats.withAbstract} (${(completenessStats.withAbstract/completenessStats.total*100).toFixed(1)}%)
- 包含被引次数：${completenessStats.withCited} (${(completenessStats.withCited/completenessStats.total*100).toFixed(1)}%)
- 包含 DOI: ${completenessStats.withDOI} (${(completenessStats.withDOI/completenessStats.total*100).toFixed(1)}%)
`;
```

### 第十一步：结果汇总维度选择

在检索并导出原始结果后，使用 AskUserQuestion 工具询问用户是否希望按特定维度汇总文献：

```
question: "检索已完成，请选择文献汇总分析维度（可多选）"
header: "汇总维度"
options:
  - label: "按年份分布分析"
    description: "统计各年份文献数量，分析研究趋势变化"
    preview: "2018: 12 篇，2019: 18 篇，2020: 25 篇，2021: 32 篇，2022: 28 篇"
  - label: "按期刊来源分布"
    description: "分析文献在期刊间的分布，识别核心期刊"
    preview: "Journal of Econometrics: 15 篇，Econometrica: 8 篇，American Economic Review: 6 篇"
  - label: "按作者产出分析"
    description: "统计高产作者及其合作网络"
    preview: "Smith J: 5 篇，Johnson A: 4 篇，Lee C: 3 篇"
  - label: "按研究主题聚类"
    description: "基于关键词或摘要进行主题聚类分析"
    preview: "主题 1: 机器学习应用 (15 篇), 主题 2: 因果推断方法 (12 篇), 主题 3: 实证研究设计 (8 篇)"
  - label: "按被引次数分层"
    description: "按被引次数对文献进行分层分析"
    preview: "高被引 (>100): 8 篇，中引 (10-100): 25 篇，低引 (<10): 42 篇"
  - label: "不需要汇总分析"
    description: "仅导出原始数据，不进行汇总分析"
multiSelect: true
```

#### 汇总分析执行

根据用户选择的维度，生成相应的汇总报告。所有分析都基于完整保留的结构化信息（摘要、年份、作者、期刊、被引用量）。

**A. 按年份分布分析**：
```javascript
// 统计年份分布（基于结构化 year 字段）
const yearStats = results.reduce((acc, r) => {
  const year = r.year?.trim() || "未知年份";
  acc[year] = (acc[year] || 0) + 1;
  return acc;
}, {});

// 生成趋势分析
const yearReport = `## 按年份文献分布\n\n` +
  Object.entries(yearStats)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, count]) => `- ${year}: ${count}篇`)
    .join('\n') + `\n\n总计：${results.length}篇文献`;

// 可选：生成年度趋势图表数据
const trendData = Object.entries(yearStats)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([year, count]) => ({ year, count }));
```

**B. 按期刊来源分布**：
```javascript
// 统计期刊分布（基于结构化 source 字段）
const journalStats = results.reduce((acc, r) => {
  const journal = (r.source || "未知期刊").trim();
  acc[journal] = (acc[journal] || 0) + 1;
  return acc;
}, {});

// 生成期刊分布报告
const journalReport = `## 按期刊文献分布\n\n` +
  Object.entries(journalStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20) // 显示前 20 个期刊
    .map(([journal, count]) => `- ${journal}: ${count}篇`)
    .join('\n') + `\n\n总计期刊：${Object.keys(journalStats).length}种`;

// 扩展：计算期刊平均被引次数
const journalCitationStats = {};
results.forEach(r => {
  const journal = (r.source || "未知期刊").trim();
  if (!journalCitationStats[journal]) {
    journalCitationStats[journal] = { count: 0, totalCited: 0 };
  }
  journalCitationStats[journal].count++;
  journalCitationStats[journal].totalCited += parseInt(r.cited) || 0;
});

const journalImpactReport = Object.entries(journalCitationStats)
  .map(([journal, data]) => ({
    journal,
    count: data.count,
    avgCited: (data.totalCited / data.count).toFixed(1)
  }))
  .sort((a, b) => b.avgCited - a.avgCited)
  .slice(0, 10);
```

**C. 按作者产出分析**：
```javascript
// 提取并统计作者（基于结构化 authors 字段）
const authorStats = {};
results.forEach(r => {
  // 支持多种作者分隔符
  const authors = (r.authors || "").split(/[,;&|]/).map(a => a.trim()).filter(a => a);
  authors.forEach(author => {
    // 规范化作者名字格式
    const normalizedAuthor = author.replace(/\s+/g, ' ').trim();
    authorStats[normalizedAuthor] = (authorStats[normalizedAuthor] || 0) + 1;
  });
});

// 生成作者分析报告
const authorReport = `## 高产作者分析\n\n` +
  Object.entries(authorStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15) // 显示前 15 位作者
    .map(([author, count]) => `- ${author}: ${count}篇`)
    .join('\n') + `\n\n总计作者：${Object.keys(authorStats).length}位`;

// 扩展：计算作者的总被引次数（第一作者权重更高）
const authorCitationStats = {};
results.forEach((r, index) => {
  const authors = (r.authors || "").split(/[,;&|]/).map(a => a.trim()).filter(a => a);
  const cited = parseInt(r.cited) || 0;
  
  authors.forEach((author, idx) => {
    const normalizedAuthor = author.replace(/\s+/g, ' ').trim();
    if (!authorCitationStats[normalizedAuthor]) {
      authorCitationStats[normalizedAuthor] = { papers: 0, firstAuthorPapers: 0, totalCited: 0 };
    }
    authorCitationStats[normalizedAuthor].papers++;
    authorCitationStats[normalizedAuthor].totalCited += cited;
    if (idx === 0) {
      authorCitationStats[normalizedAuthor].firstAuthorPapers++;
    }
  });
});
```

**D. 按研究主题聚类**：
```javascript
// 基于关键词和摘要的主题分析（利用结构化的 keywords 和 abstract 字段）
const topicKeywords = results.reduce((acc, r) => {
  const text = ((r.title || "") + " " + (r.abstract || "") + " " + (r.keywords || "")).toLowerCase();
  
  // 经济学/金融学常见关键词分类
  const topicCategories = {
    "因果推断": ["causal inference", "difference-in-differences", "instrumental variable", "RDD", "regression discontinuity", "propensity score"],
    "机器学习": ["machine learning", "deep learning", "neural network", "random forest", "LASSO", "gradient boosting"],
    "面板数据": ["panel data", "fixed effects", "random effects", "dynamic panel", "GMM"],
    "时间序列": ["time series", "VAR", "VECM", "cointegration", "unit root", "ARIMA"],
    "实验方法": ["experiment", "RCT", "randomized controlled trial", "field experiment", "lab experiment"],
    "博弈论": ["game theory", "nash equilibrium", "mechanism design", "auction", "signaling"],
    "契约理论": ["contract theory", "moral hazard", "adverse selection", "principal-agent"],
    "宏观经济学": ["monetary policy", "fiscal policy", "economic growth", "business cycle", "inflation"],
    "金融学": ["asset pricing", "corporate finance", "financial market", "portfolio", "risk premium"],
    "发展经济学": ["development", "poverty", "microfinance", "education", "health economics"]
  };
  
  Object.entries(topicCategories).forEach(([topic, keywords]) => {
    const matchCount = keywords.filter(kw => text.includes(kw)).length;
    if (matchCount > 0) {
      acc[topic] = (acc[topic] || 0) + 1;
    }
  });
  
  return acc;
}, {});

const topicReport = `## 研究主题分布\n\n` +
  Object.entries(topicKeywords)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => `- ${topic}: ${count}篇`)
    .join('\n') + `\n\n注：基于标题、摘要和关键词的语义匹配`;
```

**E. 按被引次数分层**：
```javascript
// 基于结构化 cited 字段进行被引次数分层
const citedStats = results.reduce((acc, r) => {
  const cited = parseInt(r.cited) || 0;
  let level = "未知";
  
  // 分层标准可根据文献数量和年份调整
  if (cited > 500) level = "极高被引 (>500)";
  else if (cited > 100) level = "高被引 (100-500)";
  else if (cited >= 50) level = "中引 (50-100)";
  else if (cited > 0) level = "低引 (1-49)";
  else level = "零被引";
  
  acc[level] = (acc[level] || 0) + 1;
  return acc;
}, {});

const citedReport = `## 被引次数分层\n\n` +
  Object.entries(citedStats)
    .map(([level, count]) => `- ${level}: ${count}篇`)
    .join('\n') + `\n\n总计文献：${results.length}篇`;

// 扩展：列出高被引论文
const highlyCitedPapers = results
  .filter(r => (parseInt(r.cited) || 0) >= 50)
  .sort((a, b) => (parseInt(b.cited) || 0) - (parseInt(a.cited) || 0))
  .slice(0, 10)
  .map((r, i) => `${i+1}. ${r.title} (${r.year}) - ${r.cited}次引用`);
```

**F. 综合分析报告**：
当用户选择多个维度时，生成综合分析摘要：

```javascript
// 综合分析报告模板
const comprehensiveReport = `
# Web of Science 文献检索综合分析报告

## 检索概况
- 检索时间：${new Date().toLocaleString('zh-CN')}
- 文献总数：${results.length}篇

## ${yearReport}

## ${journalReport}

## ${authorReport}

## ${topicReport}

## ${citedReport}

## 高被引论文 Top 10
${highlyCitedPapers.join('\n')}

---
报告生成时间：${new Date().toISOString()}
`;
```

#### 汇总报告导出

将选择的汇总维度报告保存为 Markdown 文件：
```bash
echo "$summaryReport" > "webofscience_summary_$(date +%Y%m%d_%H%M%S).md"
```

## 注意事项

### 1. 登录态维护
- Web of Science 使用会话 cookie，CDP 模式自动携带用户 Chrome 中的登录态
- 如果会话过期，需要提示用户重新登录

### 2. 反爬机制
- 控制操作频率，避免短时间内大量请求
- 添加随机延迟模拟人工操作
- 优先使用 GUI 交互而非程序化操作

### 3. 页面结构变化
- Web of Science 可能更新页面结构，选择器需要灵活调整
- 使用通用选择器优先（如类名、属性）
- 添加备用选择器和错误处理

### 4. 结果数量限制
- 免费账户可能有检索结果数量限制
- 机构订阅可能有并发限制
- 注意 API 调用频率限制

## 错误处理

### 常见错误及解决方案

1. **身份验证首选择择弹窗**：
   - 检测到"Choose an account"、"Remember this choice"等身份验证选择界面
   - 使用 AskUserQuestion 询问用户身份验证处理方式
   - 根据用户选择：使用默认账户登录、选择特定账户、拒绝/允许记住选择等
   - 执行相应操作后继续流程

2. **登录页面**：
   - 检测登录表单存在，使用 AskUserQuestion 询问用户登录处理方式
   - 根据用户选择：使用现有会话继续、指导手动登录、跳过登录或取消检索
   - 登录成功后自动跳转高级检索界面

3. **访问限制**：
   - 检测"Access Denied"或"403"错误
   - 检查 IP 地址或机构订阅状态
   - 建议用户联系图书馆管理员

4. **身份验证超时**：
   - 身份验证弹窗未及时响应
   - 检查网络连接和页面加载状态
   - 可能需要重新加载页面或手动处理

5. **页面超时**：
   - 增加等待时间
   - 重试操作
   - 检查网络连接

6. **选择器失效**：
   - 使用备用选择器
   - 手动检查页面结构
   - 更新选择器逻辑

### 身份验证首选择择的具体处理策略

当遇到身份验证首选择择时，按以下优先级处理：

1. **账户选择弹窗**：
   - 优先询问用户选择处理方式，避免自动选择
   - 如果用户选择"使用默认账户登录"，检查是否有默认高亮账户
   - 点击默认账户或第一个账户选项

2. **记住选择提示**：
   - 默认建议用户选择"拒绝记住选择"（更安全）
   - 如果用户有隐私或安全顾虑，选择"仅本次"选项
   - 如果用户希望便捷登录，可选择"允许记住选择"

3. **机构登录选择**：
   - 检测是否有机构登录选项（如 Shibboleth）
   - 询问用户是否使用机构账户
   - 选择相应的机构登录方式

4. **手动干预场景**：
   - 复杂身份验证流程建议用户手动处理
   - 提供清晰的操作指导
   - 等待用户确认完成

## 最佳实践

### 1. 操作流程优化
- 先少量测试确认流程可行
- 逐步增加数据量
- 定期保存中间结果

### 2. 数据验证
- 检查提取数据的完整性
- 验证 DOI 链接有效性
- 去重处理重复文献

### 3. 资源管理
- 及时关闭不需要的标签页
- 清理临时数据
- 保存重要结果到本地

## 输出示例

### 检索结果表格（Markdown）

| 序号 | 标题 | 作者 | 期刊 | 年份 | 被引 | DOI |
|------|------|------|------|------|------|-----|
| 1 | Deep Learning for Image Recognition | Krizhevsky A, et al. | NIPS | 2012 | 85000 | 10.1145/3065386 |
| 2 | Attention Is All You Need | Vaswani A, et al. | NeurIPS | 2017 | 45000 | 10.48550/arXiv.1706.03762 |

### 文献详情卡片

**标题**：Attention Is All You Need  
**作者**：Vaswani A, Shazeer N, Parmar N, et al.  
**期刊**：Advances in Neural Information Processing Systems (NeurIPS)  
**年份**：2017  
**卷期**：30  
**DOI**：10.48550/arXiv.1706.03762  
**被引次数**：45,000+  
**摘要**：我们提出了一个新的简单网络架构——Transformer，完全基于注意力机制，摒弃了循环和卷积...  
**关键词**：attention, transformer, neural networks, machine translation  

## 后续步骤建议

1. **文献综述生成**：基于检索结果生成结构化文献综述
2. **引文网络分析**：构建文献引用关系网络图
3. **研究趋势分析**：按年份分析研究热点变化
4. **作者合作网络**：分析作者合作关系和影响力

**重要提示**：使用本 skill 进行学术研究时，请遵守学术伦理和版权规定，合理使用检索结果。