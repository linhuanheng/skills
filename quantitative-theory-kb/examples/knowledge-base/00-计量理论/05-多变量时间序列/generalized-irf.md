---
title: 广义脉冲响应在尾部风险分析中的应用
type: method
domain: econometrics
difficulty: 3
prerequisites: [多变量分位数回归与VAR for VaR]
applications: [尾部风险传导, 系统性风险分析, 风险溢出]
tags: [脉冲响应, 广义脉冲响应, 尾部冲击, 传导机制]
created: 2026-05-02
---

# 广义脉冲响应在尾部风险分析中的应用

## 核心问题

> **在 ES 的多变量模型中，如何量化一个资产的尾部冲击对其他资产尾部风险的影响？传统脉冲响应的正交化问题如何在尾部风险分析中解决？**

## 传统脉冲响应的前提与局限

### 正交化假设的问题

传统 VAR 脉冲响应分析依赖 **Cholesky 分解** 对冲击进行正交化，这要求变量具有**递归排序**。这一假设在尾部风险分析中存在问题：

1. **排序依赖性**：不同变量排序会导致不同的脉冲响应结果
2. **经济含义模糊**：尾部风险传导方向往往是不明确的
3. **同期相关性不可忽略**：金融资产尾部风险高度同步，正交化会扭曲经济含义

## 广义脉冲响应函数 (GIRF)

### Pesaran & Shin (1998) 的基本思想

广义脉冲响应函数 (GIRF) 的核心创新在于：**不对冲击进行正交化，而是直接考虑一个变量受到的具体冲击，同时积分掉其他变量的同期相关性**。

### 标准 VAR 下的 GIRF

对于标准 VAR(1) 模型：

$$\mathbf{y}_t = \mathbf{\Phi} \mathbf{y}_{t-1} + \boldsymbol{\varepsilon}_t, \quad \boldsymbol{\varepsilon}_t \sim (0, \boldsymbol{\Sigma})$$

对第 $j$ 个变量的一个标准差冲击的广义脉冲响应为：

$$\text{GIRF}(h, \delta_j, \mathcal{F}_{t-1}) = \frac{\mathbf{e}_j^\top \boldsymbol{\Sigma} \mathbf{e}_j}{\sqrt{\sigma_{jj}}} \cdot \mathbf{\Phi}^h \boldsymbol{\Sigma} \mathbf{e}_j$$

其中 $\mathbf{e}_j$ 是第 $j$ 个元素为 1 的选择向量。

### 在 VAR for VaR 框架中的应用

在 WKM (2015) 的框架中，GIRF 用于分析尾部冲击的传导。考虑 VaR 的 VAR 动态：

$$\mathbf{VaR}_t = \mathbf{c} + \mathbf{\Phi} \mathbf{VaR}_{t-1} + \mathbf{\Gamma} |\mathbf{r}_{t-1}|$$

**尾部冲击的定义**：资产 $i$ 在 $t$ 期经历尾部冲击，即 $r_t^{(i)} < \text{VaR}_{\alpha,t}^{(i)}$，此时 $|r_t^{(i)}|$ 出现异常大的值。

### 尾部 GIRF 的计算

在时间 $t$ 对资产 $i$ 施加一个尾部冲击 $\delta$：

$$\text{Tail-GIRF}(h, \delta_i) = \mathbf{\Phi}^h \mathbf{\Gamma} \cdot \Delta|\mathbf{r}_t|$$

其中 $\Delta|\mathbf{r}_t|$ 是尾部冲击导致的绝对值变化向量。

## GIRF 在方法论构建中的角色

### 为什么选择 GIRF？

| 方法 | 同期相关性处理 | 排序依赖 | 经济可解释性 | 适用场景 |
|------|--------------|---------|-------------|---------|
| Cholesky 分解 | 强制递归 | 强 | 仅在经济排序明确时好 | 结构分析 |
| 广义 IRF | 积分处理 | 无 | 直观，直接对应观测冲击 | 风险传导分析 |
| 符号约束 IRF | 约束识别 | 弱 | 需先验符号约束 | 货币政策分析 |

**决策依据**：尾部风险分析中，各资产的尾部事件高度同步且传导方向复杂，GIRF 避免了主观排序导致的误导性结论。

### GIRF 提供的分析维度

1. **冲击规模效应**: 不同大小的尾部冲击如何影响传播深度
2. **传播速度**: 冲击达到峰值的时间、衰减速度（半衰期）
3. **跨资产异质性**: 哪些资产对冲击更敏感、哪些资产是主要传播者
4. **非对称性**: 正冲击 vs 负冲击、大冲击 vs 小冲击的传导差异

## 实证框架示例

### 系统风险传导分析步骤

```
步骤 1: 估计多变量 VaR/ES 模型 → 获取动态 VaR 和 ES 序列
步骤 2: 构建尾部冲击事件 → 识别各资产突破 VaR 的时期
步骤 3: 计算 GIRF → 量化单个资产尾部冲击的传导
步骤 4: 网络图分析 → 以 GIRF 为权重构建尾部风险传导网络
步骤 5: 系统重要性排序 → 识别"太大而不能倒"或"关联太强而不能倒"
```

### 关键指标

| 指标 | 定义 | 含义 |
|------|------|------|
| 传导强度 | $\max_h \text{GIRF}(h, \delta_i)$ | 尾部冲击的最大影响程度 |
| 传导速度 | $\arg\max_h \text{GIRF}(h, \delta_i)$ | 达到最大影响所需期数 |
| 传导持久性 | 半衰期 $h_{1/2}$ | 冲击衰减到一半所需期数 |
| 网络度数 | 接收/发送 GIRF 的均值 | 资产在风险传导网络中的位置 |

## 参考文献

- Pesaran, H. H., & Shin, Y. (1998). Generalized impulse response analysis in linear multivariate models. *Economics Letters*, 58(1), 17–29.
- White, H., Kim, T.-H., & Manganelli, S. (2015). VAR for VaR: Measuring tail dependence using multivariate regression quantiles. *Journal of Econometrics*, 187(1), 169–188.
- Koop, G., Pesaran, M. H., & Potter, S. M. (1996). Impulse response analysis in nonlinear multivariate models. *Journal of Econometrics*, 74(1), 119–147.
- Diebold, F. X., & Yilmaz, K. (2014). On the network topology of variance decompositions: Measuring the connectedness of financial firms. *Journal of Econometrics*, 182(1), 119–134.

## 相关条目

- Prerequisite: [多变量分位数回归与VAR for VaR](var-for-var.md)
- See also: [动态风险度量模型的理论依据](04-ES建模/dynamic-es-models.md)
- Applied in: [系统性风险网络分析](06-风险度量评估/systemic-risk.md)
