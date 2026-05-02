---
title: 动态风险度量模型的理论依据
type: method
domain: econometrics
difficulty: 3
prerequisites: [ES的Elicitability问题与联合建模框架]
applications: [动态ES预测, 时变风险建模]
tags: [动态模型, 时变风险, 风险聚集, 状态驱动, 参数驱动]
created: 2026-05-02
---

# 动态风险度量模型的理论依据

## 核心问题

> **为什么风险度量模型需要是动态的？对 ES 进行动态建模的方法论依据是什么？在多资产背景下，如何理性地引入动态结构？**

## 金融收益率的典型事实

任何动态风险度量模型的构建都必须基于金融收益率的经验特征——**典型事实** (stylized facts)：

### 1. 波动率聚集 (Volatility Clustering)

收益率序列表现出明显的波动聚集现象：大幅波动后往往跟随大幅波动，小幅波动后跟随小幅波动。

$$
\text{Corr}(|r_t|, |r_{t-k}|) > 0 \quad \text{对于较大的} k
$$

**对风险度量的含义**: 尾部分布不是恒定的，高风险时期倾向于在时间上聚集。这意味着静态模型（假定尾部风险恒定）会严重低估高风险时期的 ES。

### 2. 肥尾性 (Fat Tails)

金融收益率的无条件分布具有比正态分布更厚的尾部：

$$
\mathbb{P}(|r_t| > x) \sim x^{-\alpha}, \quad \alpha \in (2, 5)
$$

**对风险度量的含义**: 尾部事件发生的频率高于正态分布的预测，这直接影响了 ES 的估计——使用正态假定会系统性低估 ES。

### 3. 杠杆效应 (Leverage Effect)

负收益率对波动率的冲击大于正收益率：

$$
\text{Corr}(r_t, \sigma_{t+1}^2) < 0
$$

**对风险度量的含义**: 负冲击（损失）会推高未来波动率，进而推高未来的尾部风险。这对 ES 建模有直接影响——需要在动态结构中对正负冲击进行非对称处理。

### 4. 尾部依赖性 (Tail Dependence)

在多资产背景下，极端回报之间的相关性高于正常回报之间的相关性：

$$
\lim_{\alpha \to 1} \mathbb{P}(L_i > \text{VaR}_\alpha(L_i) \mid L_j > \text{VaR}_\alpha(L_j)) > 0
$$

**对风险度量的含义**: 多资产 ES 建模不能假设尾部独立，必须考虑尾部相依结构。

## 动态建模的方法论框架

### 两种动态结构

| 特性 | 观察值驱动 (Observation-Driven) | 参数驱动 (Parameter-Driven) |
|------|-------------------------------|---------------------------|
| 动态更新机制 | 滞后因变量 + 滞后冲击 | 潜在状态变量 + 状态转移方程 |
| 代表模型 | GARCH, CAViaR, ES-CAViaR | 随机波动率(SV), 状态空间模型 |
| 似然函数 | 封闭形式 | 需滤波（粒子滤波/Kalman） |
| 估计复杂度 | 低（MLE 可行） | 高（需数值积分或模拟） |
| 多变量扩展 | 维度诅咒明显 | 相对可控 |

### 对 ES 建模的方法论含义

在 ES 建模的上下文中，选择哪种动态结构需要基于以下考虑：

**选择观察值驱动模型的理由**：
1. ES 的联合评分函数可以通过 **M-estimation** 直接估计，无需完整似然
2. 计算效率更高，适合多资产场景
3. 更新机制透明，便于回测和监管审查

**选择参数驱动模型的理由**：
1. 能更自然地区分"冲击"和"状态"（如波动率 vs 波动率的不确定性）
2. 在分布假设方面更具灵活性
3. 理论上能更有效地处理测量误差

## 动态 ES 模型的具体构建方法

### 方法一：两步法（GARCH + 半参数尾部）

**结构**:

$$
\begin{aligned}
r_t &= \sigma_t \epsilon_t \\
\sigma_t^2 &= \omega + \alpha r_{t-1}^2 + \beta \sigma_{t-1}^2 \quad (\text{GARCH}) \\
\text{VaR}_{\alpha, t} &= \sigma_t \cdot q_\alpha(\epsilon) \\
\text{ES}_{\alpha, t} &= \sigma_t \cdot s_\alpha(\epsilon)
\end{aligned}
$$

其中 $q_\alpha(\epsilon)$ 和 $s_\alpha(\epsilon)$ 从标准化残差的经验分布中估计。

**合理性分析**:
- **优势**: 简单、透明、利用成熟的 GARCH 方法论
- **问题**: 两步估计效率损失；残差分布的同质性假设过强（尾部动态可能不同于波动率动态）
- **适用**: 适用于尾部主要由波动率驱动的情形

### 方法二：一步法（联合 ES-CAViaR）

参考 Patton, Ziegel & Chen (2019) 的动态半参数模型：

$$
\begin{aligned}
\text{VaR}_{\alpha, t} &= \beta_0 + \beta_1 \text{VaR}_{\alpha, t-1} + \beta_2 |r_{t-1}| + \beta_3 \text{ES}_{\alpha, t-1} \\
\text{ES}_{\alpha, t} &= \gamma_0 + \gamma_1 \text{ES}_{\alpha, t-1} + \gamma_2 |r_{t-1}| + \gamma_3 \text{VaR}_{\alpha, t-1}
\end{aligned}
$$

**合理性分析**:
- **优势**: 直接对 (VaR, ES) 进行联合动态建模；参数使用联合评分函数一步估计；灵活捕获 VaR 和 ES 的不同动态特征
- **问题**: 参数增多；VaR 和 ES 的动态交互可能不稳定
- **适用**: 适用于 VaR 和 ES 具有不同动态行为的情形

### 方法三：多变量结构（VAR for VaR 扩展）

基于 White, Kim & Manganelli (2015) 的多变量分位数回归框架，扩展到 ES：

对于 $N$ 个资产：

$$
\begin{bmatrix}
\text{VaR}_{\alpha, t}^{(1)} \\
\vdots \\
\text{VaR}_{\alpha, t}^{(N)} \\
\text{ES}_{\alpha, t}^{(1)} \\
\vdots \\
\text{ES}_{\alpha, t}^{(N)}
\end{bmatrix}
= \mathbf{C} + \mathbf{A}
\begin{bmatrix}
\text{VaR}_{\alpha, t-1}^{(1)} \\
\vdots \\
\text{VaR}_{\alpha, t-1}^{(N)} \\
\text{ES}_{\alpha, t-1}^{(1)} \\
\vdots \\
\text{ES}_{\alpha, t-1}^{(N)}
\end{bmatrix}
+ \mathbf{B}
\begin{bmatrix}
|r_{t-1}^{(1)}| \\
\vdots \\
|r_{t-1}^{(N)}|
\end{bmatrix}
$$

**合理性分析**:
- **优势**: 系统性捕获跨资产的尾部风险传导；脉冲响应分析尾部冲击传播
- **问题**: 参数维度高（$O(N^2)$）；需降维处理（如 LASSO、因子结构）
- **适用**: 适用于系统风险管理、尾部风险溢出分析

## 动态结构选择的方法论原则

### 原则 1: 简约性 (Parsimony)

$$
\text{模型复杂度} \propto \text{参数数量} \times \text{资产数量}^2
$$

多资产背景下必须引入参数约束（稀疏性、因子结构、分块对角结构）。

### 原则 2: 经验一致性

动态结构必须与数据的经验特征一致：
- 若存在杠杆效应 → 引入非对称项
- 若存在尾部依赖性 → 引入跨资产交互
- 若波动率聚集明显 → GARCH 类结构更合适

### 原则 3: 可验证性

动态结构必须可被回测验证——所选结构应能通过模型比较检验被证明优于替代结构。

## 参考文献

- Engle, R. F. (1982). Autoregressive conditional heteroscedasticity with estimates of the variance of United Kingdom inflation. *Econometrica*, 50(4), 987–1007.
- Patton, A. J., Ziegel, J. F., & Chen, R. (2019). Dynamic semiparametric models for expected shortfall (and Value-at-Risk). *Journal of Econometrics*, 211(2), 388–413.
- White, H., Kim, T.-H., & Manganelli, S. (2015). VAR for VaR: Measuring tail dependence using multivariate regression quantiles. *Journal of Econometrics*, 187(1), 169–188.
- Creal, D., Koopman, S. J., & Lucas, A. (2013). Generalized autoregressive score models with applications. *Journal of Applied Econometrics*, 28(5), 777–795.

## 相关条目

- Prerequisite: [ES的Elicitability问题与联合建模框架](elicitability-joint-modeling.md)
- Next: [半参数ES建模方法及其合理性](semiparametric-es.md)
- See also: [多变量分位数回归与VAR for VaR](05-多变量时间序列/var-for-var.md)
- See also: [多变量GARCH模型方法论](02-波动率建模/multivariate-garch.md)
