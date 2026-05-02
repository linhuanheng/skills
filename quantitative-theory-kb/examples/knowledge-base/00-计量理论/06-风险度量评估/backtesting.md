---
title: 风险度量回测与模型比较
type: method
domain: econometrics
difficulty: 3
prerequisites: [半参数ES建模方法及其合理性]
applications: [模型验证, 模型选择, 监管合规]
tags: [回测, 模型比较, Diebold-Mariano, 条件覆盖]
created: 2026-05-02
---

# 风险度量回测与模型比较

## 核心问题

> **如何验证一个ES模型的预测是否合理？在多个候选模型之间，如何基于统计证据做出理性选择？**

## 回测的方法论框架

### 回测的基本逻辑

回测 (backtesting) 的本质是**模型预测与实现的系统性对比**：

- 模型在 $t-1$ 期预测 $\text{VaR}_{\alpha, t}$ 和 $\text{ES}_{\alpha, t}$
- 在 $t$ 期观测到实际收益率 $r_t$
- 比较预测值与实现值，评估预测质量

### VaR 回测 vs ES 回测

| 维度 | VaR 回测 | ES 回测 |
|------|---------|---------|
| 检验对象 | 二值事件 $r_t \leq \text{VaR}_{\alpha,t}$ | 连续尾部损失 $r_t \mid r_t \leq \text{VaR}_{\alpha,t}$ |
| 信息含量 | 仅是否违反，忽略违反幅度 | 包含违反深度信息 |
| 统计功效 | 较低（二值信息损失） | 较高（利用尾部信息） |
| 理论成熟度 | 成熟（Kupiec, Christoffersen） | 较新（基于联合评分函数） |
| 监管标准 | Basel II 标准 | Basel III 要求 |

## VaR 回测方法

### 1. Kupiec 无条件覆盖检验 (1995)

**零假设**: 违反率等于名义水平 $\alpha$

$$\hat{\pi} = \frac{1}{T} \sum_{t=1}^{T} \mathbf{1}\{r_t < \text{VaR}_{\alpha,t}\}$$

$$LR_{uc} = -2 \ln\left( \frac{(1-\alpha)^{T_0}\alpha^{T_1}}{(1-\hat{\pi})^{T_0}\hat{\pi}^{T_1}} \right) \xrightarrow{d} \chi^2(1)$$

**局限性**: 仅检验平均覆盖，无法检测违反的聚集性。

### 2. Christoffersen 条件覆盖检验 (1998)

**零假设**: 违反事件在时间上独立且覆盖正确

$$LR_{cc} = LR_{uc} + LR_{ind} \xrightarrow{d} \chi^2(2)$$

$LR_{ind}$ 检验违反事件的一阶马尔可夫独立性。

**方法论含义**: 条件覆盖检验同时验证了准确性和动态充分性，是更严格的检验。若模型通过条件覆盖检验，表明动态结构充分捕获了尾部风险的时变性。

## ES 回测方法

### 1. 基于联合评分函数的回测

利用 Fissler & Ziegel (2016) 的联合评分函数，比较不同模型的平均评分值。

对两个模型 A 和 B，定义评分差：

$$d_t = S((v_t^A, e_t^A), r_t) - S((v_t^B, e_t^B), r_t)$$

通过 Diebold-Mariano 检验评估 $d_t$ 是否显著异于零。

### 2. 残差条件矩检验

若模型正确，标准化残差应满足：

$$\mathbb{E}\left[ \frac{r_t}{\text{ES}_{\alpha,t}} - 1 \;\Big|\; \mathcal{F}_{t-1}, r_t \leq \text{VaR}_{\alpha,t} \right] = 0$$

检验这一条件矩是否成立（McNeil & Frey, 2000）。

### 3. 超额损失检验

检验尾部损失的无条件/条件矩：

$$\text{ES}_{\alpha,t}^{realized} = \mathbb{E}[r_t \mid r_t \leq \text{VaR}_{\alpha,t}]$$

对比预测的 $\text{ES}_{\alpha,t}$ 与实现的 $realized$。

## 模型比较的统计框架

### Diebold-Mariano 检验

假设有两个竞争模型 A 和 B，产生预测 $\{e_t^A\}$ 和 $\{e_t^B\}$：

**步骤 1**: 定义损失差

$$d_t = S((v_t^A, e_t^A), r_t) - S((v_t^B, e_t^B), r_t)$$

**步骤 2**: DM 统计量

$$\text{DM} = \frac{\bar{d}}{\sqrt{\hat{V}(\bar{d})}} \xrightarrow{d} N(0,1)$$

其中 $\hat{V}(\bar{d})$ 是 HAC 方差估计量。

**步骤 3**: 判断

- $\text{DM} < -1.96$: 模型 A 显著优于 B
- $\text{DM} > 1.96$: 模型 B 显著优于 A
- $|\text{DM}| \leq 1.96$: 无法区分

### 模型置信集 (Model Confidence Set, MCS)

Hansen, Lunde & Nason (2011) 的 MCS 方法是对 DM 检验的多模型比较扩展：

1. 从全模型集 $\mathcal{M}^0$ 开始
2. 进行相等预测能力的逐对检验
3. 剔除显著劣于其他的模型
4. 重复直到无法剔除

MCS 保留了在给定置信水平下"无法被区分"的最佳模型集。

## 方法论合理性：模型比较的关键原则

### 原则 1: 统一评估标准

所有竞争模型必须在**同一评分函数**下进行比较。评分函数的选择应事先确定，避免"选择有利于自己模型的评分函数"的数据窥探 (data snooping)。

### 原则 2: 考虑抽样不确定性

点估计的比较不够充分，必须报告：
- 评分均值的标准误
- DM 检验的 p 值
- MCS 的包含概率

### 原则 3: 经济显著性 vs 统计显著性

两个模型之间的评分差异在统计上显著，但可能在经济上不重要。使用 **经济价值检验**（如 hedging effectiveness、资本金节省）补充统计检验。

### 原则 4: 跨周期稳健性

模型表现可能随市场状态变化。应在不同子时期（危机期 vs 正常期）分别评估。

## 回测的综合评估框架

| 检验维度 | 检验方法 | 检验内容 | 通过标准 |
|---------|---------|---------|---------|
| 覆盖正确性 | Kupiec / Christoffersen | VaR 违反率是否等于 $\alpha$ | p > 0.05 |
| 预测准确性 | 联合评分函数 | 平均评分是否最低 | 基础基准 |
| 相对表现 | DM 检验 | 是否显著优于基准模型 | DM < 1.96 |
| 稳健性 | MCS | 是否在最优模型集中 | p > 0.05 |
| 经济价值 | 资本金 / 效用 | 模型是否带来经济改善 | 降低资本要求 |

## 参考文献

- Kupiec, P. (1995). Techniques for verifying the accuracy of risk measurement models. *Journal of Derivatives*, 3(2), 73–84.
- Christoffersen, P. (1998). Evaluating interval forecasts. *International Economic Review*, 39(4), 841–862.
- Diebold, F. X., & Mariano, R. S. (1995). Comparing predictive accuracy. *Journal of Business & Economic Statistics*, 13(3), 253–263.
- Hansen, P. R., Lunde, A., & Nason, J. M. (2011). The model confidence set. *Econometrica*, 79(2), 453–497.
- McNeil, A. J., & Frey, R. (2000). Estimation of tail-related risk measures for heteroscedastic financial time series. *Journal of Empirical Finance*, 7(3–4), 271–300.

## 相关条目

- Prerequisite: [半参数ES建模方法及其合理性](04-ES建模/semiparametric-es.md)
- Prerequisite: [评分函数与模型选择](scoring-functions.md)
- See also: [动态风险度量模型的理论依据](04-ES建模/dynamic-es-models.md)
