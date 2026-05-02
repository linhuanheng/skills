---
title: GARCH+EVT两步法ES估计
type: method
domain: econometrics
difficulty: 4
prerequisites: [半参数ES建模方法及其合理性, 动态风险度量模型的理论依据]
applications: [ES预测, 极值尾部估计, 条件VaR]
tags: [GARCH, EVT, 极值理论, 两步法, POT, 广义帕累托分布]
created: 2026-05-02
---

# GARCH+EVT两步法ES估计

## 核心问题

> **如何结合 GARCH 对波动率的动态建模能力和极值理论对尾部的精确刻画，进行 ES 估计？两部分如何衔接？**

## 方法论的动机

McNeil & Frey (2000) 提出的方法结合了两种主流方法各自的优势：

| 方法 | 优势 | 劣势 |
|------|------|------|
| GARCH 模型 | 动态波动率建模 | 尾部形状假定（正态/t分布）不准确 |
| 极值理论 (EVT) | 尾部精确刻画 | 忽略条件异方差（假定独立同分布） |
| **GARCH+EVT** | **动态 + 精确尾部** | **需两步估计** |

## 模型结构

### 步骤 1: GARCH 滤波

假设收益率服从 AR(1)-GARCH(1,1) 过程：

$$
\begin{aligned}
r_t &= \mu_t + \sigma_t Z_t \\
\mu_t &= \phi_0 + \phi_1 r_{t-1} \\
\sigma_t^2 &= \omega + \alpha_1 e_{t-1}^2 + \beta_1 \sigma_{t-1}^2
\end{aligned}
$$

其中 $e_t = r_t - \mu_t$ 是均值调整后的序列，$Z_t$ 是独立同分布的创新，分布函数为 $F_Z(z)$。

### 步骤 2: EVT 尾部估计

#### 阈值超量模型 (POT)

对标准化残差 $\{\hat{Z}_t\}$，选择阈值 $u$（通常是 $k+1$ 大阶统计量 $z_{(k+1)}$），超过阈值部分用广义帕累托分布 (GPD) 拟合：

$$G_{\xi, \beta}(y) = 1 - \left(1 + \frac{\xi y}{\beta}\right)^{-1/\xi}, \quad y \geq 0$$

其中 $\xi$ 是形状参数（尾指数），$\beta$ 是尺度参数。

#### 尾部估计量

残差分布 $F_Z(z)$ 的右尾估计为：

$$\hat{F}_Z(z) = 1 - \frac{k}{n} \left(1 + \hat{\xi} \frac{z - z_{(k+1)}}{\hat{\beta}}\right)^{-1/\hat{\xi}}, \quad z > z_{(k+1)}$$

## ES 的点估计

### 条件 VaR

$$\widehat{\text{VaR}}_{\alpha, t+1} = \hat{\mu}_{t+1} + \hat{\sigma}_{t+1} \cdot \hat{z}_\alpha$$

其中 $\hat{z}_\alpha$ 是从 EVT 尾部估计中得到的残差的 $\alpha$-分位数。

### 条件 ES

$$\widehat{\text{ES}}_{\alpha, t+1} = \hat{\mu}_{t+1} + \hat{\sigma}_{t+1} \cdot \mathbb{E}[Z \mid Z > \hat{z}_\alpha]$$

在 GPD 假设下（$\xi < 1$）：

$$\mathbb{E}[Z - z_\alpha \mid Z > z_\alpha] = \frac{\beta + \xi(z_\alpha - u)}{1 - \xi}$$

因此条件 ES 为：

$$\widehat{\text{ES}}_{\alpha, t+1} = \hat{\mu}_{t+1} + \hat{\sigma}_{t+1} \cdot \left[ \hat{z}_\alpha + \frac{\hat{\beta} + \hat{\xi}(\hat{z}_\alpha - u)}{1 - \hat{\xi}} \right]$$

### ES/分位数比率

在 GPD 下，ES 与 VaR 的比率具有简洁形式：

$$\frac{\text{ES}_\alpha}{\text{VaR}_\alpha} = 1 + \frac{\beta - \xi u}{(1-\xi)z_\alpha}$$

这一比率提供了关于尾部厚度的直观度量：$\xi$ 越大，比率越高，尾部越厚。

## 方法论文献：为何 GARCH+EVT 是合理的

### 1. 半参数优势

- **参数部分**（GARCH）：捕获波动率的时变结构
- **非参数/半参数部分**（EVT）：精确刻画尾部形状
- 不需要假设整个分布形式，仅对尾部使用极值理论

### 2. 阈值选择的权衡

阈值 $u$ 的选择是该方法的关键：

| 阈值 | $k$（超过数） | 方差 | 偏差 |
|------|-------------|------|------|
| 低 | 多 | 低 | 高（非尾部数据干扰） |
| 高 | 少 | 高 | 低（仅尾部，但数据少） |

McNeil & Frey 建议使用固定比例（如 10% 的极端值）或基于模拟的 MSE 最小化。

### 3. 回测验证

McNeil & Frey (2000) 对多个金融序列的回测表明：
- GARCH+EVT 方法在 95%、99%、99.5% 置信水平下的 VaR 均优于条件正态方法和条件 t 方法
- GARCH+EVT 方法显著减少了违反次数（尤其在 99% 以上的高置信水平）
- ES 的超额残差（标准化后的超额值）在合理范围内

## 与半参数 ES-CAViaR 的比较

| 维度 | GARCH+EVT (McNeil-Frey) | 半参数 ES-CAViaR (Patton) |
|------|------------------------|--------------------------|
| 动态机制 | 先 GARCH 滤波，再尾部估计 | 直接对 (VaR,ES) 联合动态建模 |
| 尾部处理 | EVT (GPD) 参数化尾部 | 经验分布尾部 |
| 估计方法 | 两步 PML + MLE | 一步 M-estimation |
| 条件密度 | 间接通过 GARCH | 无显式密度假定 |
| 多变量扩展 | 需额外处理 | VAR 结构自然扩展 |
| 外推能力 | EVT 可外推至未观测极端值 | 限于已观测范围内的尾部 |

**方法论选择建议**: 若研究关注极端尾部外推（超出历史观测范围），GARCH+EVT 更有优势；若关注（VaR, ES）联合动态的规范和模型比较，ES-CAViaR 更一致。

## 参考文献

- McNeil, A. J., & Frey, R. (2000). Estimation of tail-related risk measures for heteroscedastic financial time series: An extreme value approach. *Journal of Empirical Finance*, 7(3–4), 271–300.
- Balkema, A. A., & de Haan, L. (1974). Residual life time at great age. *Annals of Probability*, 2(5), 792–804.
- Pickands, J. (1975). Statistical inference using extreme order statistics. *The Annals of Statistics*, 3(1), 119–131.
- Embrechts, P., Klüppelberg, C., & Mikosch, T. (1997). *Modelling Extremal Events for Insurance and Finance*. Springer.

## 相关条目

- Prerequisite: [半参数ES建模方法及其合理性](semiparametric-es.md)
- Alternative to: [动态风险度量模型的理论依据](dynamic-es-models.md)
- See also: [CAViaR模型与动态分位数检验](caviar-dq-test.md)
