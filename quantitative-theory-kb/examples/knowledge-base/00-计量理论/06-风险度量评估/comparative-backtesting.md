---
title: 比较回测框架与三区域方法
type: method
domain: econometrics
difficulty: 4
prerequisites: [风险度量回测与模型比较, 评分函数与模型选择]
applications: [ES模型选择, 监管合规, 模型比较]
tags: [比较回测, 三区域方法, 校准检验, 评分函数]
created: 2026-05-02
---

# 比较回测框架与三区域方法

## 核心问题

> **传统回测只能检验"模型是否正确"，但无法回答"哪个模型更好"。在 ES 建模的上下文中，如何通过比较回测指导模型选择？**

## 传统回测 vs 比较回测

Nolde & Ziegel (2017) 系统区分了两种回测类型：

| 维度 | 传统回测 | 比较回测 |
|------|---------|---------|
| **原假设** | $H_0$: 风险度量程序是"正确的" | $H_0$: 两模型预测精度相同 |
| **检验工具** | 识别函数 (identification function) | 评分函数 (scoring function) |
| **输出** | 通过/不通过 | 排序/分级 |
| **激励** | 最小合规 | 持续改进 |
| **对 ES 的适用性** | 需通过联合(VaR,ES) | 需通过联合评分函数 |

**方法论含义**: 传统回测是"合规检查"，比较回测是"择优机制"。两者互补而非替代。

## 校准检验 (Calibration Test)

### 条件校准的定义

设 $\{R_t\}_{t \in \mathbb{N}}$ 是风险度量的预测序列，$\{X_t\}_{t \in \mathbb{N}}$ 是实现值序列。

**定义**: 预测序列 $\{R_t\}$ 相对于信息集 $\mathcal{F}_{t-1}$ 是**条件校准**的，若：

$$\mathbb{E}[V(R_t, X_t) \mid \mathcal{F}_{t-1}] = 0 \quad \text{a.s.}, \forall t$$

其中 $V$ 是该风险度量的识别函数。

### VaR 的校准检验

VaR 的识别函数为：$V(r, x) = \alpha - \mathbf{1}\{x > r\}$

条件校准检验等价于检验：
1. **无条件覆盖**: $\mathbb{E}[V(R_t, X_t)] = 0$（类似于 Kupiec 检验）
2. **独立性**: $V(R_t, X_t)$ 独立于 $\mathcal{F}_{t-1}$（类似于 Christoffersen 检验）

### (VaR, ES) 的联合校准检验

对于 (VaR, ES)，识别函数为二维向量：

$$V((r_1, r_2), x) = \begin{pmatrix} \alpha - \mathbf{1}\{x > r_1\} \\ r_1 - r_2 - \frac{1}{1-\alpha} \mathbf{1}\{x > r_1\}(r_1 - x) \end{pmatrix}$$

**方法论含义**: ES 的校准检验**必须**与 VaR 联合进行，不能单独检验 ES。这与联合 elicitability 的要求完全一致。

### McNeil-Frey 检验的再解释

Nolde & Ziegel (2017) 证明，McNeil & Frey (2000) 的 ES 回测方法本质上可以看作一个条件校准检验，其中检验函数为 $h_t = (\sigma_t^{-1}(r_{2,t} - r_{1,t})/(1-\alpha), 1)$。

## 比较回测框架

### 评分函数比较

设 $S$ 是严格一致的评分函数。对两个模型 A 和 B：

$$\bar{S}_A = \frac{1}{T} \sum_{t=1}^{T} S(R_t^A, X_t)$$

$$\bar{S}_B = \frac{1}{T} \sum_{t=1}^{T} S(R_t^B, X_t)$$

若 $\bar{S}_A < \bar{S}_B$，则模型 A 预测更优。

### 三区域方法 (Three-Zone Approach)

Nolde & Ziegel (2017) 提出了一种面向监管实践的三区域方法：

| 区域 | 条件 | 监管含义 |
|------|------|---------|
| **绿区** | 模型 A 显著优于基准 | 模型合格，正常使用 |
| **黄区** | 模型 A 不显著差于基准 | 需持续监控 |
| **红区** | 模型 A 显著劣于基准 | 需采取纠正措施 |

### 评分函数的选择问题

比较回测的结果依赖评分函数的选择。对 (VaR, ES) 的联合评分函数族：

$$S((r_1, r_2), x) = \mathbf{1}\{x > r_1\}(-G_1(r_1) + G_1(x) - G_2(r_2)(r_1 - x)) + (1-\alpha)(G_1(r_1) - G_2(r_2)(r_2 - r_1) + \mathcal{G}_2(r_2))$$

**推荐形式**（零均质评分函数）：

$$S_0((r_1, r_2), x) = \frac{\mathbf{1}\{x > r_1\}}{2\sqrt{r_2}}(x - r_1) + (1-\alpha)\frac{r_1 + r_2}{2\sqrt{r_2}}$$

当 $G_1(x)=0$, $G_2(x) = -1/(2\sqrt{x})$ 时得到上述形式。这一选择具有正齐次性（对尺度变换稳健），有利于跨资产比较。

## 对 ES 建模的方法论指导

1. **模型选择**: 应使用比较回测在多个 ES 模型间做出选择
2. **多个评分函数**: 为增强结论稳健性，应同时使用多个评分函数
3. **传统回测补充**: 先通过校准检验确保模型"正确"，再用比较回测"择优"
4. **三区域报告**: 在实证中报告模型在绿区/黄区/红区的表现

## 参考文献

- Nolde, N., & Ziegel, J. F. (2017). Elicitability and backtesting: Perspectives for banking regulation. *The Annals of Applied Statistics*, 11(4), 1833–1874.
- McNeil, A. J., & Frey, R. (2000). Estimation of tail-related risk measures for heteroscedastic financial time series. *Journal of Empirical Finance*, 7(3–4), 271–300.
- Giacomini, R., & White, H. (2006). Tests of conditional predictive ability. *Econometrica*, 74(6), 1545–1578.

## 相关条目

- Prerequisite: [风险度量回测与模型比较](backtesting.md)
- Prerequisite: [评分函数与模型选择](scoring-functions.md)
- See also: [ES的Elicitability问题与联合建模框架](04-ES建模/elicitability-joint-modeling.md)
