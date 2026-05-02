---
title: 多变量分位数回归与VAR for VaR
type: method
domain: econometrics
difficulty: 4
prerequisites: [动态风险度量模型的理论依据, 时间序列基础概念]
applications: [多资产尾部风险, 系统性风险传导, 风险溢出]
tags: [多变量分位数, VAR, VaR, 脉冲响应, 尾部依赖]
created: 2026-05-02
---

# 多变量分位数回归与VAR for VaR

## 核心问题

> **如何将单变量的尾部风险度量扩展到多资产框架？多变量分位数回归的方法论基础是什么？它如何服务于多资产 ES 的时间序列建模？**

## 从单变量到多变量：方法论的必要性

### 为什么不能只用单变量模型？

在研究多资产 ES 的时间序列时，逐资产独立建模存在根本性缺陷：

| 维度 | 逐资产单变量建模 | 多变量联合建模 |
|------|-----------------|---------------|
| 尾部依赖 | ✗ 假定尾部独立 | ✓ 捕获尾部协同运动 |
| 风险传导 | ✗ 无法识别 | ✓ 量化跨资产传导 |
| 投资组合ES | 需额外聚合步骤 | ✓ 直接提供联合信息 |
| 脉冲响应 | ✗ 无法分析尾部冲击 | ✓ 尾部冲击传播分析 |

### 多资产 ES 建模的两个路径

```
路径 A: 先单变量再聚合
    各资产 ES_t → 协方差矩阵/连接函数 → 投资组合 ES

路径 B: 直接多变量建模
    多变量分位数框架 → 联合尾部动态 → 资产条件 ES
```

**方法论选择依据**:
- 路径 A 更简单，依赖成熟的两步法，但可能丢失跨资产尾部交互信息
- 路径 B 更一致，但参数维度高，需要降维

## White, Kim & Manganelli (2015) 的理论框架

### 模型设定

考虑 $N$ 个资产在多个分位水平 $\alpha_1, \alpha_2, ..., \alpha_K$ 上的 VaR：

考虑一个 $M = N \times K$ 维的多变量分位数过程：

$$
Q_t(\alpha) = 
\begin{bmatrix}
Q_t^{(1)}(\alpha_1) \\
\vdots \\
Q_t^{(N)}(\alpha_1) \\
\vdots \\
Q_t^{(1)}(\alpha_K) \\
\vdots \\
Q_t^{(N)}(\alpha_K)
\end{bmatrix}
$$

**VAR(p) 形式的动态结构**：

$$Q_t(\alpha) = \mathbf{c} + \sum_{j=1}^{p} \mathbf{A}_j Q_{t-j}(\alpha) + \sum_{j=0}^{q} \mathbf{B}_j \mathbf{x}_{t-j}$$

其中 $\mathbf{x}_t$ 是外生变量向量（如滞后收益率、波动率等）。

### 核心创新

**1. 多变量多分位联合建模**

传统分位数回归仅针对单变量单分位点。WKM (2015) 将框架扩展到：
- **多变量**: 同时建模多个资产的尾部行为
- **多分位**: 同时建模多个置信水平（如 1%, 5%, 10%）

**2. 分位数脉冲响应**

基于 Pesaran & Shin (1998) 的广义脉冲响应函数，WKM 提出了**分位数脉冲响应函数** (Quantile Impulse Response Function, QIRF)：

$$
\text{QIRF}(h, \delta, \mathcal{F}_{t-1}) = \mathbb{E}[Q_{t+h} \mid \delta_t = \delta, \mathcal{F}_{t-1}] - \mathbb{E}[Q_{t+h} \mid \mathcal{F}_{t-1}]
$$

其中 $\delta_t$ 是 $t$ 期的冲击。

**3. 估计方法**

使用**多变量分位数回归**估计参数：

$$\hat{\theta} = \arg\min_{\theta} \sum_{t=1}^{T} \sum_{i=1}^{N} \sum_{k=1}^{K} \rho_{\alpha_k}(r_t^{(i)} - Q_t^{(i)}(\alpha_k))$$

其中 $\rho_{\alpha}(u) = u(\alpha - \mathbf{1}\{u < 0\})$ 是分位数损失函数（tick loss）。

## 扩展到 ES 的多变量建模

### 方法论基础

WKM (2015) 的框架为多变量 VaR 提供了基础，结合 Fissler & Ziegel (2016) 的联合 elicitability，可以自然地扩展到 (VaR, ES) 的多变量联合建模。

### 多变量 ES-CAViaR 模型

对于 $N$ 个资产，定义 $2N$ 维向量：

$$
\mathbf{Y}_t = 
\begin{bmatrix}
\text{VaR}_{\alpha, t}^{(1)}, ..., \text{VaR}_{\alpha, t}^{(N)}, \text{ES}_{\alpha, t}^{(1)}, ..., \text{ES}_{\alpha, t}^{(N)}
\end{bmatrix}^\top
$$

VAR 动态结构：

$$\mathbf{Y}_t = \mathbf{c} + \mathbf{\Phi} \mathbf{Y}_{t-1} + \mathbf{\Gamma} |\mathbf{r}_{t-1}|$$

估计采用联合评分函数：

$$\hat{\theta} = \arg\min_{\theta} \sum_{t=1}^{T} \sum_{i=1}^{N} S((v_t^{(i)}(\theta), e_t^{(i)}(\theta)), r_t^{(i)})$$

### 参数维度问题

$N$ 个资产的全参数化会导致 $O(N^2)$ 个参数，需要降维策略：

| 降维方法 | 方法描述 | 适用场景 |
|---------|---------|---------|
| **稀疏性约束** | LASSO/Adaptive LASSO 惩罚 | 资产间连接稀疏时 |
| **因子结构** | 假设动态由少数公共因子驱动 | 资产高度相关时 |
| **分块对角** | 按行业/类别分块，仅块内交互 | 有先验分组信息 |
| **网络结构** | 基于网络邻接矩阵约束交互形式 | 关注系统重要性机构 |

## 方法论合理性：多变量框架 vs 聚合方法

### 多变量框架的优势

1. **系统性风险视角**: 直接建模跨资产的尾部传导机制
2. **一致性**: 各资产的 ES 在同一框架下联合估计，避免不一致性
3. **脉冲响应分析**: 可量化尾部冲击的跨资产传播路径和速度
4. **条件预测**: 给定一个资产的尾部事件，可更新其他资产的 ES 预测

### 多变量框架的代价

1. **维度诅咒**: 参数随资产数量二次增长
2. **估计不确定性**: 高维估计会放大估计误差
3. **解释复杂性**: 大量参数的经-济意义难以逐一验证

### 方法论决策树

```
多资产 ES 建模
    |
    ├── 资产数量少 (N ≤ 5) → 全参数多变量ES-CAViaR
    │                          理由: 维度可控，信息完整
    │
    ├── 资产数量中等 (5 < N ≤ 30) → 因子ES-CAViaR 或 LASSO约束
    │                                理由: 降维+稀疏，平衡偏差-方差
    │
    └── 资产数量多 (N > 30) → 两步法: 先聚类/因子提取，再对因子建模
                                 理由: 直接多变量建模不稳定
```

## 多资产 ES 建模中的脉冲响应分析

### 尾部冲击的定义

在 VAR for VaR 框架下，尾部冲击定义为一个资产在 $t$ 期的收益率低于其条件 VaR：

$$\delta_t^{(i)} = r_t^{(i)} - \text{VaR}_{\alpha, t}^{(i)} < 0$$

### 冲击传导路径

```
冲击 (机构i) → VaR(机构i)上升 → VaR(机构j)上升 → ES(机构i)上升 → ES(机构j)上升
                              ↕
                        反馈效应
```

### 系统性风险度量

基于多变量框架，可以定义系统性风险度量：

- **尾部关联度**: $\text{Corr}(\text{VaR}_t^{(i)}, \text{VaR}_t^{(j)})$ — 尾部风险同步性
- **溢出强度**: $\partial \text{ES}_t^{(i)} / \partial \text{ES}_{t-1}^{(j)}$ — 跨资产 ES 传导强度
- **系统风险贡献**: 某个资产尾部冲击对其他资产的总影响

## 参考文献

- White, H., Kim, T.-H., & Manganelli, S. (2015). VAR for VaR: Measuring tail dependence using multivariate regression quantiles. *Journal of Econometrics*, 187(1), 169–188.
- Pesaran, H. H., & Shin, Y. (1998). Generalized impulse response analysis in linear multivariate models. *Economics Letters*, 58(1), 17–29.
- Engle, R. F., & Manganelli, S. (2004). CAViaR: Conditional autoregressive value at risk by regression quantiles. *Journal of Business & Economic Statistics*, 22(4), 367–381.
- Corsi, F. (2009). A simple approximate long-memory model of realized volatility. *Journal of Financial Econometrics*, 7(2), 174–196.

## 相关条目

- Prerequisite: [动态风险度量模型的理论依据](04-ES建模/dynamic-es-models.md)
- See also: [广义脉冲响应在尾部风险分析中的应用](generalized-irf.md)
- See also: [半参数ES建模方法及其合理性](04-ES建模/semiparametric-es.md)
- See also: [多变量GARCH模型方法论](02-波动率建模/multivariate-garch.md)
