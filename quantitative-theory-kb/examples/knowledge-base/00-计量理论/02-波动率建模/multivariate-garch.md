---
title: 多变量GARCH模型方法论
type: framework
domain: econometrics
difficulty: 4
prerequisites: [时间序列基础概念, 动态风险度量模型的理论依据]
applications: [多资产波动率建模, 投资组合风险, ES建模]
tags: [多变量GARCH, DCC, BEKK, 波动率]
created: 2026-05-02
---

# 多变量GARCH模型方法论

## 核心问题

> **在多资产背景下，如何选择波动率建模方法？不同多变量 GARCH 模型之间在方法论上有什么根本性差异？**

## 多变量波动率建模的挑战

将 GARCH 扩展到多变量面临的基本问题是**参数维度爆炸**。对一个 $N$ 维过程，条件协方差矩阵 $\mathbf{H}_t$ 包含 $N(N+1)/2$ 个独特元素。

## 主要方法比较

| 模型 | 动态结构 | 参数数量 | 正定性保证 | 适用性 |
|------|---------|---------|-----------|--------|
| **VEC-GARCH** | 全矩阵 | $O(N^4)$ | 不保证 | 仅 $N \leq 3$ |
| **BEKK** | 二次型 | $O(N^2)$ | 自动保证 | $N \leq 10$ |
| **DCC** | 两阶段 | $O(N^2)$ 但恒定 | 自动保证 | $N$ 可较大 |
| **因子GARCH** | 因子载荷 | $O(N \times K)$ | 视因子数 | $N$ 大时适用 |

### DCC (Dynamic Conditional Correlation)

Engle (2002) 的 DCC 模型是目前最常用的多变量 GARCH 方法：

**两阶段估计**:

阶段 1: 各资产 GARCH → 标准化残差 $\epsilon_{i,t} = r_{i,t} / \sigma_{i,t}$

阶段 2: 动态相关性

$$\mathbf{Q}_t = (1 - a - b) \bar{\mathbf{Q}} + a \boldsymbol{\epsilon}_{t-1} \boldsymbol{\epsilon}_{t-1}^\top + b \mathbf{Q}_{t-1}$$

$$\mathbf{R}_t = \text{diag}(\mathbf{Q}_t)^{-1/2} \mathbf{Q}_t \text{diag}(\mathbf{Q}_t)^{-1/2}$$

**方法论优势**:
- 参数估计分两阶段进行，计算可行
- 相关性和波动率分开建模，解释清晰
- 正定性自动满足

**方法论局限**:
- 所有资产共享相同的动态参数 $a, b$（同质性假设）
- 两阶段估计的效率损失
- 相关结构可能过于简单

### BEKK

Engle & Kroner (1995) 的 BEKK 模型：

$$\mathbf{H}_t = \mathbf{C}^\top \mathbf{C} + \mathbf{A}^\top \boldsymbol{\varepsilon}_{t-1} \boldsymbol{\varepsilon}_{t-1}^\top \mathbf{A} + \mathbf{B}^\top \mathbf{H}_{t-1} \mathbf{B}$$

**优势**: 正定性自动保证；可以捕获波动率的双向传导

**劣势**: 参数数量仍较多；解释性差；最大似然估计在高维下不稳定

## ES建模中的多变量波动率选择

针对多资产 ES 建模的方法论路径：

| 路径 | 方法 | 适用 |
|------|------|------|
| **路径 A** | 单变量 GARCH + DCC + 分位数尾部 | 资产数量中等，主要关注相关性动态 |
| **路径 B** | 多变量ES-CAViaR（自回归结构嵌入尾部关联） | 资产少，关注尾部直接传导 |
| **路径 C** | 因子GARCH + 因子尾部 | 资产多，用降维处理 |

## 参考文献

- Engle, R. F. (2002). Dynamic conditional correlation: A simple class of multivariate generalized autoregressive conditional heteroskedasticity models. *Journal of Business & Economic Statistics*, 20(3), 339–350.
- Engle, R. F., & Kroner, K. F. (1995). Multivariate simultaneous generalized ARCH. *Econometric Theory*, 11(1), 122–150.
- Bauwens, L., Laurent, S., & Rombouts, J. V. K. (2006). Multivariate GARCH models: A survey. *Journal of Applied Econometrics*, 21(1), 79–109.

## 相关条目

- Prerequisite: [时间序列基础概念](01-时间序列基础/time-series-basics.md)
- See also: [多变量分位数回归与VAR for VaR](05-多变量时间序列/var-for-var.md)
- Applied in: [半参数ES建模方法及其合理性](04-ES建模/semiparametric-es.md)
