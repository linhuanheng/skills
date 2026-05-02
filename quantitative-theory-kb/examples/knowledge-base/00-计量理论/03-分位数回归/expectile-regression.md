---
title: 非对称最小二乘与Expectile回归
type: method
domain: econometrics
difficulty: 4
prerequisites: [分位数回归基础, 风险度量选择]
applications: [Expectile回归, ES替代度量, 同方差检验]
tags: [expectile, 非对称最小二乘, ALS, 条件分布]
created: 2026-05-02
---

# 非对称最小二乘与Expectile回归

## 核心问题

> **分位数回归通过最小化非对称绝对值（tick loss）实现，但其不可微性导致计算复杂。是否存在一种光滑且可微的替代方案？它如何与 ES 方法论产生关联？**

## Expectile的定义

Newey & Powell (1987) 引入的 **非对称最小二乘**（Asymmetric Least Squares, ALS）定义了 **expectile**，它是期望的"分位数化"：

### 单变量 Expectile

对于随机变量 $Y$ 和 $\tau \in (0, 1)$，第 $\tau$ 个 expectile $\mu(\tau)$ 是以下非对称二次损失函数的最小化器：

$$\mu(\tau) = \arg\min_{m} \mathbb{E}\left[ |\tau - \mathbf{1}\{Y < m\}| \cdot (Y - m)^2 \right]$$

等价地，$\mu(\tau)$ 满足一阶条件：

$$\tau \int_{\mu}^{\infty} (y - \mu) \, dF(y) = (1 - \tau) \int_{-\infty}^{\mu} (\mu - y) \, dF(y)$$

### 与分位数的类比

| 维度 | 分位数 (Quantile) | Expectile |
|------|------------------|-----------|
| 损失函数 | $\rho_\tau(u) = u(\tau - \mathbf{1}\{u<0\})$ | $\rho_\tau^2(u) = \|\tau - \mathbf{1}\{u<0\}\| \cdot u^2$ |
| 可微性 | 在 0 处不可微 | **处处可微** |
| 推广大 | 中位数 → 分位数 | 均值 → expectile |
| 表征分布 | ✓ 完整刻画分布 | ✓ 完整刻画分布 |
| 性质 | 单调变换不变 | 仿射变换不变 |
| Elicitability | ✓ | ✓ |

### Expectile 的基本性质

**定理 1** (Newey & Powell, 1987):
- $\mu(\tau)$ 在 $\tau \in (0, 1)$ 上严格单调递增
- $\mu(\tau)$ 的值域为 $(\inf Y, \sup Y)$
- 仿射变换等变性：若 $Y' = sY + t$ ($s > 0$)，则 $\mu'(\tau) = s\mu(\tau) + t$
- $\mu(\tau)$ 连续可微（当 $F$ 连续可微时）

### 表征等式

对于 $y \neq \mathbb{E}[Y]$，分布函数的反显式：

$$F(y) = \frac{\|y - \mathbb{E}[Y] + \tau \mu'(\tau)(1 - 2\tau)\|}{(1 - 2\tau)^2 \mu'(\tau)}$$

其中 $\tau$ 满足 $\mu(\tau) = y$。

**含义**: expectile 函数完全表征了分布，与分位数等价。

## Expectile 回归模型

对于线性回归模型 $y_i = \mathbf{x}_i'\beta + u_i$，第 $\tau$ 个 expectile 回归估计量为：

$$\hat{\beta}(\tau) = \arg\min_{\beta} \sum_{i=1}^{n} |\tau - \mathbf{1}\{y_i < \mathbf{x}_i'\beta\}| \cdot (y_i - \mathbf{x}_i'\beta)^2$$

### 渐进性质

在正则条件下：

$$\sqrt{n}(\hat{\beta}(\tau) - \beta_0(\tau)) \xrightarrow{d} N(0, \mathbf{W}^{-1}\mathbf{V}\mathbf{W}^{-1})$$

其中 $\mathbf{W} = \mathbb{E}[\omega_i \mathbf{x}_i \mathbf{x}_i']$, $\mathbf{V} = \mathbb{E}[\psi_i^2 \mathbf{x}_i \mathbf{x}_i']$，$\omega_i$ 和 $\psi_i$ 为基于 expectile 权重和得分的设计矩阵调整。

### 计算优势

相比分位数回归需要线性规划求解，expectile 回归的平滑损失函数使其可通过**加权最小二乘法**迭代求解——每一步求解一个解析的线性系统，大幅简化计算。

## Test 统计量

### 同方差检验

Expectile 回归提供了自然的同方差检验：

在**同方差**假设下，不同 expectile 水平的回归斜率应相同：

$$H_0: \beta(\tau_1) = \beta(\tau_2) = \cdots = \beta(\tau_m)$$

检验统计量：

$$\mathcal{T} = n(\hat{\beta}(\tau_1) - \hat{\beta}(\tau_2)) \xrightarrow{d} \chi^2$$

### 条件对称检验

若误差分布条件对称，则 $\beta(0.5 - \tau) - \beta(0.5) = \beta(0.5) - \beta(0.5 + \tau)$。

## 与ES方法论的关联

### Expectile 作为风险度量

Expectile 是**唯一同时满足一致性（coherent）和可被预测性（elicitable）**的风险度量（Ziegel, 2016; Bellini et al., 2014）。

| 度量 | Coherent | Elicitable | 尾部敏感度 |
|------|---------|-----------|----------|
| VaR | ✗ | ✓ | 低（单分位点） |
| ES | ✓ | ✗（单变量） | 高（整条尾部） |
| **Expectile** | **✓** | **✓** | **中（加权尾部）** |

### 与 ES 的数值等价

对于给定的 $\alpha$ 水平，存在唯一的 $\tau^*$ 使得：

$$\text{Expectile}_{\tau^*} \approx \text{ES}_\alpha$$

在正态分布下，$\tau^* = 0.99855$ 等价于 $\text{VaR}_{0.99}$ 和 $\text{ES}_{0.975}$（Bellini & Di Bernardino, 2017）。

**方法论含义**: Expectile 为 ES 建模提供了一个"回避 elicitability 问题"的替代路径——通过 expectile 回归直接建模一个同时 coherent 且 elicitable 的风险度量，无需联合建模 VaR。

### 在 ES-CAViaR 中的角色

Kuan, Yeh & Hsu (2009) 的 CARE 模型（Conditional Autoregressive Expectile）直接将 CAViaR 框架扩展到 expectile 建模，为 ES 估计提供了另一种思路。

## 参考文献

- Newey, W. K., & Powell, J. L. (1987). Asymmetric least squares estimation and testing. *Econometrica*, 55(4), 819–847.
- Ziegel, J. F. (2016). Coherence and elicitability. *Mathematical Finance*, 26(4), 901–918.
- Bellini, F., Klar, B., Müller, A., & Gianin, E. R. (2014). Generalized quantiles as risk measures. *Insurance: Mathematics and Economics*, 54, 41–48.

## 相关条目

- Prerequisite: [风险度量选择：VaR与ES的方法论比较](04-ES建模/risk-measure-comparison.md)
- See also: [ES的Elicitability问题与联合建模框架](04-ES建模/elicitability-joint-modeling.md)
- See also: [CAViaR模型与动态分位数检验](04-ES建模/caviar-dq-test.md)
