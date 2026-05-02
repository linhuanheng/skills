---
title: GAS框架与参数驱动模型的方法论比较
type: method
domain: econometrics
difficulty: 4
prerequisites: [动态风险度量模型的理论依据, 半参数ES建模方法及其合理性]
applications: [动态模型选择, GAS-ES-CAViaR, 状态空间模型]
tags: [GAS, 参数驱动, 观测驱动, 状态空间, 得分更新]
created: 2026-05-02
---

# GAS框架与参数驱动模型的方法论比较

## 核心问题

> **在构建动态 ES 模型时，Patton (2019) 为何选择基于广义自回归得分（GAS）框架？参数驱动（state space）和观测驱动（GAS）两种方法各有什么方法论优势？**

## 两类动态模型的根本区别

Cox (1981) 将时变参数模型分为两类：

### 参数驱动模型 (Parameter-Driven)

参数驱动模型中，时变参数 $\theta_t$ 本身是一个潜在随机过程：

$$y_t \mid \theta_t \sim p(y_t \mid \theta_t; \psi), \quad \theta_{t+1} = \delta + \phi \theta_t + \eta_t, \quad \eta_t \sim N(0, \sigma_\eta^2)$$

**特点**：
- $\theta_t$ 是**隐变量**（latent variable）
- 预测分布需积分：$p(y_t \mid \mathcal{F}_{t-1}) = \int p(y_t \mid \theta_t) p(\theta_t \mid \mathcal{F}_{t-1}) d\theta_t$
- 似然函数通常无解析解，需**模拟方法**（粒子滤波、Kalman滤波、重要性采样）
- 代表模型：随机波动率 (SV)、随机条件久期 (SCD)

### 观测驱动模型 (Observation-Driven)

观测驱动模型中，$\theta_t$ 是过去观测的确定性函数：

$$y_t \mid \theta_t \sim p(y_t \mid \theta_t; \psi), \quad \theta_{t+1} = \kappa + A s_t + B \theta_t$$

其中 $s_t$ 是基于数据的更新向量。

**特点**：
- $\theta_t$ 在 $\mathcal{F}_{t-1}$ 下是**完全已知**的
- 似然函数具有**封闭形式**（通过预测误差分解）
- 估计简单，无需模拟
- 代表模型：GARCH、CAViaR、GAS

### 方法论权衡

| 维度 | 参数驱动 (State Space) | 观测驱动 (GAS) |
|------|---------------------|--------------|
| 似然评估 | 需模拟（粒子滤波） | 封闭形式 |
| 估计效率 | 渐近最优（正确设定下） | M-estimation 效率 |
| 对模型设定的敏感度 | 较高 | 较低（稳健） |
| 过离散/肥尾处理 | 自然（混合分布） | 需明确建模 |
| 预测区间 | 可自带不确定性 | 需额外 bootstrap |
| ES建模适用性 | 关注"真实"尾部状态 | 关注尾部预测精度 |

## GAS 框架的核心机制

### 得分驱动更新

Creal, Koopman & Lucas (2013) 提出的 GAS 模型使用**预测似然函数的得分**驱动参数更新：

$$\theta_{t+1} = \kappa + A \cdot \mathbf{S}_t \cdot \nabla_t + B \cdot \theta_t$$

其中：
- $\nabla_t = \partial \ln p(y_t \mid \theta_t) / \partial \theta_t$ — 得分向量
- $\mathbf{S}_t$ — 缩放矩阵（通常取 Fisher 信息矩阵的逆平方根：$\mathbf{S}_t = \mathbf{I}_t^{-1/2}$）

### 为什么选择得分作为驱动？

**方法论依据**：

1. **信息最大化**：得分是观测数据对参数提供的**最陡峭的信息方向**——在正确的参数值附近，得分指向最大化对数似然的方向

2. **理论统一性**：选择 $\mathbf{S}_t = \mathbf{I}_t^{-1}$ 使得 GAS 更新等价于在参数空间中执行**类似 Newton 步**的更新

3. **无所不包的框架**：GARCH、ACD、CAViaR 均可表为 GAS 的特例（选择特定的观测密度 $p(y_t \mid \theta_t)$）

### GARCH 作为 GAS 特例

若 $y_t \sim N(0, \sigma_t^2)$，参数为 $\theta_t = \sigma_t^2$，则：

$$\nabla_t = \frac{y_t^2 - \sigma_t^2}{2\sigma_t^4}, \quad \mathbf{S}_t \propto \sigma_t^4$$

$$\sigma_{t+1}^2 = \kappa + A \cdot (y_t^2 - \sigma_t^2) + B \cdot \sigma_t^2$$

这等价于 GARCH(1,1)。

## Koopman, Lucas & Scharth (2016) 的关键发现

### 核心实证结论

**发现 1**：GAS 模型（观测驱动）与正确设定的状态空间模型（参数驱动）具有**相似的预测精度**。

- 在状态空间是真实 DGP 的情况下，GAS 的相对 MSE 接近 1
- GAS 即使"设定错误"也表现良好

**发现 2**：GAS 显著优于 ACM（基于条件矩的模型）。

- ACM 更新使用 $s_t = y_t$（对均值）或 $s_t = (y_t - \mu_t)^2$（对方差）
- GAS 的得分驱动更新比 ACM 的矩驱动更新更高效

**发现 3**：在波动率预测的实证应用中，GAS + 肥尾观测密度的表现与带有杠杆效应的随机波动率模型相当。

### 方法论文献

| 发现 | 对内含 |
|------|------|
| GAS $\approx$ 正确SV | 在不牺牲预测精度的前提下避开模拟 |
| GAS $\gg$ ACM | 得分驱动的信息利用优于矩驱动 |
| 肥尾 GAS $\approx$ 杠杆 SV | 灵活观测密度可弥补状态空间的结构优势 |

## 对 ES 建模的方法论意义

### 为什么 Patton (2019) 选择 GAS 框架

1. **似然函数的可访问性**：ES-CAViaR 基于联合评分函数的 M-estimation，GAS 框架允许直接在正确的评分函数下进行更新

2. **预测精度**：Koopman et al. (2016) 表明 GAS 模型在不依赖昂贵模拟的情况下可实现与状态空间模型相当的预测精度——对多资产场景至关重要

3. **模型灵活性**：GAS 框架天然适应各种观测密度（肥尾、非对称），只需替换得分函数

4. **简约性**：GAS 模型的参数数量远小于多变量状态空间模型——避免多资产场景下的维度诅咒

### 方法论决策：何时选择哪种框架

```
需要参数不确定性的完整刻画？
    ├─ 是 → 状态空间（粒子滤波提供后验分布的完整信息）
    └─ 否 → 仅关注点预测准确性
                ├─ 多资产 → GAS（避免高维模拟）
                └─ 单资产 → GAS 或 SV 均可
```

## 参考文献

- Koopman, S. J., Lucas, A., & Scharth, M. (2016). Predicting time-varying parameters with parameter-driven and observation-driven models. *Review of Economics and Statistics*, 98(1), 97–110.
- Creal, D., Koopman, S. J., & Lucas, A. (2013). Generalized autoregressive score models with applications. *Journal of Applied Econometrics*, 28(5), 777–795.
- Cox, D. R. (1981). Statistical analysis of time series: Some recent developments. *Scandinavian Journal of Statistics*, 8(2), 93–115.
- Patton, A. J., Ziegel, J. F., & Chen, R. (2019). Dynamic semiparametric models for expected shortfall. *Journal of Econometrics*, 211(2), 388–413.

## 相关条目

- Prerequisite: [动态风险度量模型的理论依据](dynamic-es-models.md)
- See also: [半参数ES建模方法及其合理性](semiparametric-es.md)
- See also: [风险度量回测与模型比较](06-风险度量评估/backtesting.md)
