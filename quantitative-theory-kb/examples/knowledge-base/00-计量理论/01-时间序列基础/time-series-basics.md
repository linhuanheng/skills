---
title: 时间序列基础概念
type: concept
domain: econometrics
difficulty: 1
prerequisites: []
applications: [动态ES建模, 波动率建模, 多变量时间序列]
tags: [平稳性, 自相关, ARMA, 时间序列]
created: 2026-05-02
---

# 时间序列基础概念

## 核心概念

### 平稳性 (Stationarity)

**严格平稳**: 序列 $\{y_t\}$ 的联合分布在时间平移下不变。

**弱平稳**（协方差平稳）:

- $\mathbb{E}[y_t] = \mu$（常数均值）
- $\text{Var}(y_t) = \gamma_0 < \infty$（常数方差）
- $\text{Cov}(y_t, y_{t-k}) = \gamma_k$（协方差仅依赖滞后阶数）

**方法论含义**: 弱平稳是大多数时间序列计量方法的基础。在 ES 建模中，收益率序列通常被近似视为弱平稳（虽存在条件异方差），这是 GARCH 建模的前提。

### 自相关函数 (ACF)

$$\rho_k = \frac{\text{Cov}(y_t, y_{t-k})}{\text{Var}(y_t)} = \frac{\gamma_k}{\gamma_0}$$

**方法论含义**: ACF 识别线性依赖结构。对 ES 建模而言，收益率的 ACF 通常较弱，但绝对值收益率的 ACF 下降缓慢，指示波动率聚集的存在。

### Wold 分解定理

任何弱平稳过程可以表示为：

$$y_t = \mu + \sum_{j=0}^{\infty} \psi_j \varepsilon_{t-j}, \quad \psi_0 = 1$$

其中 $\varepsilon_t$ 是白噪声。

**方法论含义**: 这意味着平稳时间序列的动态完全由线性滤波器 $\{\psi_j\}$ 刻画，为 ARMA 建模提供了理论基础。

## 关键模型

| 模型 | 结构 | 用途 |
|------|------|------|
| AR(p) | $y_t = c + \phi_1 y_{t-1} + ... + \phi_p y_{t-p} + \varepsilon_t$ | 捕获均值回归 |
| MA(q) | $y_t = \mu + \varepsilon_t + \theta_1 \varepsilon_{t-1} + ... + \theta_q \varepsilon_{t-q}$ | 捕获冲击的持久性 |
| ARMA(p,q) | 两者结合 | 简约参数化 |
| ARIMA(p,d,q) | 差分后 ARMA | 处理单位根 |

### 方法论含义

在 ES 建模中，ARMA 类模型通常不是直接建模对象——收益率序列的均值动态较弱。但 ARMA 结构出现在：
- **波动率方程**: GARCH 可视为 $\varepsilon_t^2$ 的 ARMA
- **VaR/ES 动态**: CAViaR/ES-CAViaR 是 VaR 和 ES 的 AR 结构
- **多变量扩展**: VAR 是 AR 的多变量版本

## 自相关检验

| 检验 | 原假设 | 统计量 | 应用 |
|------|--------|--------|------|
| Ljung-Box | 前 $m$ 阶自相关均为零 | $Q = T(T+2)\sum_{k=1}^m \hat{\rho}_k^2/(T-k)$ | 模型诊断 |
| Durbin-Watson | AR(1) 自相关为零 | $d = \sum(\hat{\varepsilon}_t - \hat{\varepsilon}_{t-1})^2 / \sum \hat{\varepsilon}_t^2$ | 残差检验 |

## 参考文献

- Box, G. E. P., Jenkins, G. M., Reinsel, G. C., & Ljung, G. M. (2015). *Time Series Analysis: Forecasting and Control* (5th ed.). Wiley.
- Hamilton, J. D. (1994). *Time Series Analysis*. Princeton University Press.

## 相关条目

- Applied in: [动态风险度量模型的理论依据](04-ES建模/dynamic-es-models.md)
- Applied in: [多变量分位数回归与VAR for VaR](05-多变量时间序列/var-for-var.md)
