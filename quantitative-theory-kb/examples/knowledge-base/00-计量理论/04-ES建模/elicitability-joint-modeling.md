---
title: ES的Elicitability问题与联合建模框架
type: theorem
domain: econometrics
difficulty: 4
prerequisites: [风险度量选择：VaR与ES的方法论比较]
applications: [动态ES建模, 风险度量回测]
tags: [elicitability, 联合建模, ES, VaR, Osband原理, 评分函数]
created: 2026-05-02
---

# ES的Elicitability问题与联合建模框架

## 核心问题

> **ES 不是 elicitable 的，那如何对 ES 进行预测和模型评估？这是否意味着 ES 无法用于实证建模？**

## 方法论的困境：ES 的不可 Elicitability

### Elicitability 的定义

一个风险度量 $\rho$ 被称为 **elicitable**，若存在一个评分函数 $S: \mathbb{R} \times \mathbb{R} \to \mathbb{R}$，使得：

$$\rho(Y) = \arg\min_{x \in \mathbb{R}} \mathbb{E}[S(x, Y)]$$

其中 $Y$ 是随机变量。直观上，elicitable 意味着我们可以通过最小化期望评分损失来"预测"该风险度量。

### Gneiting (2011) 的关键结论

Gneiting (2011) 证明了一个重要但令人困扰的结论：

> **ES 在单变量层面上不是 elicitable 的**。

这意味着不存在一个评分函数 $S$，使得 $\text{ES}_\alpha$ 可以直接作为最小化期望评分损失的解。这给 ES 的**模型估计**和**预测评估**带来了理论障碍。

**方法论含义**：如果我们不能直接"预测"ES，那应该如何处理？

### 为什么 VaR 是 elicitable 的

VaR 是 elicitable 的，其对应的评分函数是 **分位数损失函数**（也称为 tick loss 或 pinball loss）：

$$S_\alpha(x, y) = (\alpha - \mathbf{1}\{y < x\})(y - x)$$

$$\text{VaR}_\alpha(Y) = \arg\min_{x} \mathbb{E}[S_\alpha(x, Y)]$$

这一性质使得 VaR 可以直接作为分位数回归的目标函数（Koenker & Bassett, 1978），也为 CAViaR 等动态 VaR 模型提供了理论支撑。

## 解决方案：高阶 Elicitability 与联合建模

### Fissler & Ziegel (2016) 的突破

Fissler & Ziegel (2016) 提出了 **高阶 elicitability** (higher order elicitability) 的概念，证明了：

> **虽然 ES 本身不是 elicitable 的，但 (VaR, ES) 这一对组合是 jointly elicitable 的。**

这意味着存在一个 **二维评分函数** $S: \mathbb{R}^2 \times \mathbb{R} \to \mathbb{R}$，使得：

$$(\text{VaR}_\alpha(Y), \text{ES}_\alpha(Y)) = \arg\min_{(x_1, x_2)} \mathbb{E}[S((x_1, x_2), Y)]$$

### Osband 原理

Fissler & Ziegel (2016) 基于 Osband 原理给出了联合 elicitability 的一般性刻画。对于 (VaR, ES) 这一对，评分函数的一般形式为：

$$S((x_1, x_2), y) = \left( \mathbf{1}\{y \leq x_1\} - \alpha \right) \left( G_1(x_1) - G_1(y) \right) + \frac{1}{\alpha} \mathbf{1}\{y \leq x_1\}(y - x_1)G_2(x_2) - \mathcal{G}_2(x_2)$$

其中 $G_1$, $G_2$, $\mathcal{G}_2$ 是满足特定条件的函数，$G_2$ 是严格递增且凸的，$\mathcal{G}_2 = G_2'$。

**简化形式**（常用形式）：

$$S((x_1, x_2), y) = \frac{\mathbf{1}\{y \leq x_1\} - \alpha}{\alpha} y - \frac{\mathbf{1}\{y \leq x_1\}}{\alpha} x_1 + x_2 + \exp(x_2) \left( x_2 - \frac{\mathbf{1}\{y \leq x_1\}}{\alpha}(y - x_1) - x_2 \right)$$

### 方法论含义：从"不能"到"如何做"

这一理论突破对 ES 建模的方法论构建产生了决定性影响：

| 方法 | 可预测性 | 方法论代价 |
|------|---------|-----------|
| 单变量 VaR | ✓ 直接 elicitability | 无联合信息 |
| 单变量 ES | ✗ 不可 elicitability | 无法直接预测 |
| **联合 (VaR, ES)** | **✓ 联合 elicitability** | **需同时建模两个度量** |

**核心方法论原则**：在构建 ES 的预测模型时，**不能单独建模 ES**，而必须同时建模 VaR 和 ES。

## 联合建模框架的方法论优势

### 1. 信息互补性

联合建模 VaR 和 ES 并非纯粹的"技术妥协"，而具有实质性的方法论优势：

- VaR 提供分位点位置信息
- ES 提供尾部平均严重程度信息
- 两者结合提供了比单独 VaR 更完整的尾部风险画像

### 2. 模型估计可行性

联合 elicitability 使得 ES 模型参数可以通过 **M-estimation** 进行估计：

$$(\hat{\theta}, \hat{\phi}) = \arg\min_{\theta, \phi} \sum_{t=1}^{T} S((v_t(\theta), e_t(\phi)), y_t)$$

其中 $v_t(\theta) = \text{VaR}_{\alpha, t}$ 和 $e_t(\phi) = \text{ES}_{\alpha, t}$ 是参数化的 VaR 和 ES 的动态模型。

### 3. 模型比较与验证可行性

联合评分函数为比较不同 ES 模型的预测性能提供了统一的评估标准：

- 模型 A 优于模型 B，当且仅当 $\mathbb{E}[S((v_t^A, e_t^A), y_t)] < \mathbb{E}[S((v_t^B, e_t^B), y_t)]$
- 可以通过 Diebold-Mariano 检验评估模型差异的统计显著性

## 模型框架的一般结构

基于联合 elicitability 的 ES 建模框架一般结构为：

$$
\begin{aligned}
\text{VaR}_{\alpha, t} &= \sigma_t \cdot q_{\alpha}(\epsilon_t) \\
\text{ES}_{\alpha, t} &= \sigma_t \cdot s_{\alpha}(\epsilon_t)
\end{aligned}
$$

其中 $\sigma_t$ 是波动率过程，$q_{\alpha}$ 和 $s_{\alpha}$ 是标准化残差 $\epsilon_t$ 的 $\alpha$-分位数和期望亏损。

这引出了两个关键的方法论选择：
1. **波动率过程的规范**：何种波动率模型（见[波动率建模方法论](02-波动率建模/volatility-modeling.md)）
2. **残差分布的规范**：参数化 vs 非参数化（见[半参数ES建模方法](04-ES建模/semiparametric-es.md)）

## 方法论决策要点

构建 ES 模型时，以下理论要点必须明确：

1. **ES 不可单独预测**：任何声称能直接建模 ES 的方法都违背了 elicitability 理论
2. **联合建模是必要条件**：VaR 和 ES 必须同时建模，不能仅汇报 ES
3. **评分函数选择影响估计效率**：不同的 $G_1$, $G_2$ 函数选择对应不同的估计效率
4. **动态结构是建模的关键**：条件分布随时间变化是 ES 动态建模的核心驱动力（见[动态风险度量模型](04-ES建模/dynamic-es-models.md)）

## 参考文献

- Fissler, T., & Ziegel, J. F. (2016). Higher order elicitability and Osband‘s principle. *The Annals of Statistics*, 44(4), 1680–1707.
- Gneiting, T. (2011). Making and evaluating point forecasts. *Journal of the American Statistical Association*, 106(494), 746–762.
- Koenker, R., & Bassett, G. (1978). Regression quantiles. *Econometrica*, 46(1), 33–50.
- Patton, A. J., Ziegel, J. F., & Chen, R. (2019). Dynamic semiparametric models for expected shortfall (and Value-at-Risk). *Journal of Econometrics*, 211(2), 388–413.

## 相关条目

- Prerequisite: [风险度量选择：VaR与ES的方法论比较](risk-measure-comparison.md)
- Next: [动态风险度量模型的理论依据](04-ES建模/dynamic-es-models.md)
- See also: [评分函数与模型选择](06-风险度量评估/scoring-functions.md)
