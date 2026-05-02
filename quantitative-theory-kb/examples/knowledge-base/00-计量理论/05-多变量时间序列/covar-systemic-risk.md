---
title: CoVaR与系统性风险度量
type: method
domain: econometrics
difficulty: 4
prerequisites: [多变量分位数回归与VAR for VaR]
applications: [系统性风险, 尾部风险传导, 系统重要性评估]
tags: [CoVaR, ΔCoVaR, 系统性风险, 尾部溢出, 分位数回归]
created: 2026-05-02
---

# CoVaR与系统性风险度量

## 核心问题

> **在多资产 ES 建模的背景下，如何度量单个机构的尾部风险对系统整体尾部风险的贡献？ΔCoVaR 与 ES 之间是什么关系？**

## CoVaR 的定义

Adrian & Brunnermeier (2016) 提出 CoVaR 作为系统性风险度量：

**CoVaR** 定义为条件于机构 $i$ 处于困境时，整个金融系统的 VaR：

$$\Pr\left( X^{\text{system}} \leq \text{CoVaR}_{\alpha}^{\text{system} \mid i} \mid X^i = \text{VaR}_{\alpha}^i \right) = \alpha$$

**ΔCoVaR** 定义为机构 $i$ 处于困境（$\alpha$-分位数）与处于正常状态（中位数）时，系统 VaR 之差：

$$\Delta\text{CoVaR}_{\alpha}^i = \text{CoVaR}_{\alpha}^{\text{system} \mid X^i = \text{VaR}_{\alpha}^i} - \text{CoVaR}_{\alpha}^{\text{system} \mid X^i = \text{VaR}_{0.5}^i}$$

**直观理解**: ΔCoVaR 回答的问题是："当某家机构陷入困境时，整个系统的风险增加了多少？"

## 估计方法

CoVaR 通过**分位数回归**（quantile regression）在 $\alpha$ 分位水平上估计：

$$X_t^{\text{system}} = \beta_{0,\alpha} + \beta_{1,\alpha} X_t^i + \varepsilon_{t,\alpha}$$

$$\text{CoVaR}_{\alpha}^{\text{system} \mid i} = \hat{\beta}_{0,\alpha} + \hat{\beta}_{1,\alpha} \text{VaR}_{\alpha}^i$$

其中 $\text{VaR}_{\alpha}^i$ 由单变量分位数回归（如 CAViaR）得到。

**ΔCoVaR 估计**:

$$\Delta\text{CoVaR}_{\alpha}^i = \hat{\beta}_{1,\alpha} \left( \text{VaR}_{\alpha}^i - \text{VaR}_{0.5}^i \right)$$

### 状态变量调节

为控制随时间变化的风险因素，加入状态变量 $\mathbf{M}_{t-1}$：

$$X_t^{\text{system}} = \beta_{0,\alpha} + \beta_{1,\alpha} X_t^i + \boldsymbol{\gamma}_{\alpha}^\top \mathbf{M}_{t-1} + \varepsilon_{t,\alpha}$$

常用状态变量包括：VIX、流动性利差、利率期限结构斜率、信用利差等。

## CoVaR 与 ES 的关系

### 概念对比

| 维度 | CoVaR / ΔCoVaR | ES |
|------|----------------|-----|
| **度量对象** | 系统对单个机构的条件风险 | 单个资产/组合的尾部平均损失 |
| **条件方向** | 系统 | 机构 | 无条件或条件于自身 |
| **估计方法** | 分位数回归 | 联合评分函数 M-estimation |
| **尾部信息** | VaR 水平（单分位点） | 整条尾部平均 |
| **用途** | 系统重要性识别 | 风险资本计量 |

### 互补性

在多资产 ES 研究中，CoVaR 和 ES 提供互补信息：

1. **ES 度量各资产的自身尾部风险水平**（边际风险）
2. **ΔCoVaR 度量资产尾部风险对系统的溢出强度**（系统风险贡献）
3. **结合使用**：高 ES + 高 ΔCoVaR → 既自身风险大又具有系统重要性的机构

## MES 与 SES

Acharya et al. (2017) 提出了另一种系统性风险度量：**边际预期亏损** (Marginal Expected Shortfall, MES) 和 **系统性预期亏损** (Systemic Expected Shortfall, SES)。

### MES

MES 度量当整个系统处于尾部事件时，单个机构的预期损失：

$$\text{MES}_{\alpha}^i = \mathbb{E}[r^i \mid R^{\text{system}} \leq \text{VaR}_{\alpha}^{\text{system}}]$$

**估计**: 通过尾部样本均值或参数化方法：

$$\widehat{\text{MES}}_{\alpha}^i = \frac{1}{T \cdot \alpha} \sum_{t=1}^{T} r_t^i \cdot \mathbf{1}\{R_t^{\text{system}} \leq \widehat{\text{VaR}}_{\alpha}^{\text{system}}\}$$

### SES

SES 度量机构在系统性危机中的资本不足程度：

$$\text{SES}^i = \mathbb{E}\left[ \text{资本不足}^i \mid \text{系统性危机} \right]$$

SES 与 MES 和杠杆率相关：

$$\text{SES}^i \propto \text{MES}_{\alpha}^i + \text{杠杆率}^i$$

### 方法论比较

| 度量 | 定义方向 | 回归方法 | 尾部信息 | 多资产扩展 |
|------|---------|---------|---------|---------|
| ΔCoVaR | 机构 → 系统 | 分位数回归 | VaR 水平 | 需逐对估计 |
| MES | 系统 → 机构 | 尾部样本均值 | ES 尾部平均 | 直接联合估计 |
| ES-CAViaR | 机构自身 | 联合评分函数 | ES 尾部平均 | VAR 结构自然扩展 |

## 对多资产 ES 建模的方法论意义

1. **风险传导方向识别**：CoVaR 的机构→系统方向与 ES-CAViaR 的 VAR 结构互补
2. **系统重要性排序**：ΔCoVaR 提供了跨资产重要性排序的指标
3. **条件 ES 扩展**：可将 CoVaR 方法扩展到条件 ES（CoES）：
   $$\text{CoES}_{\alpha}^{\text{system} \mid i} = \mathbb{E}[X^{\text{system}} \mid X^{\text{system}} \leq \text{CoVaR}_{\alpha}^{\text{system} \mid i}]$$
4. **多变量方法融合**：ΔCoVaR 的多变量分位数回归与 VAR for VaR 框架在方法论上高度一致

## 参考文献

- Adrian, T., & Brunnermeier, M. K. (2016). CoVaR. *American Economic Review*, 106(7), 1705–1741.
- Acharya, V. V., Pedersen, L. H., Philippon, T., & Richardson, M. (2017). Measuring systemic risk. *Review of Financial Studies*, 30(1), 2–47.
- Brownlees, C., & Engle, R. F. (2017). SRISK: A conditional capital shortfall measure of systemic risk. *Review of Financial Studies*, 30(1), 48–79.

## 相关条目

- Prerequisite: [多变量分位数回归与VAR for VaR](var-for-var.md)
- See also: [广义脉冲响应在尾部风险分析中的应用](generalized-irf.md)
- See also: [风险度量选择：VaR与ES的方法论比较](04-ES建模/risk-measure-comparison.md)
- Applied in: [系统性风险传导网络分析]
