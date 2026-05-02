---
title: 评分函数与模型选择
type: concept
domain: econometrics
difficulty: 3
prerequisites: [ES的Elicitability问题与联合建模框架]
applications: [模型比较, 风险度量回测, 参数估计]
tags: [评分函数, 模型选择, elicitability, 损失函数]
created: 2026-05-02
---

# 评分函数与模型选择

## 核心问题

> **用什么标准来比较不同 ES 模型的预测能力？评分函数在 ES 建模中扮演什么角色？为什么评分函数的选择本身就是一个方法论问题？**

## 评分函数在 ES 建模中的三重角色

在 ES 建模中，评分函数充当了三种角色：

| 角色 | 功能 | 对应的评分函数要求 |
|------|------|------------------|
| **估计目标** | M-estimation 的参数估计标准 | 需严格一致（严格正确的评分函数） |
| **评估标准** | 比较不同模型的预测性能 | 需对排序关系一致（一致的评序） |
| **回测工具** | 验证模型是否合理 | 需识别模型误设 |

## 正确的评分函数 vs 任意损失函数

### 关键区别

一个损失函数 $L((v, e), y)$ 可能不是（VaR, ES）的**正确评分函数**（即不满足严格一致性）。使用非严格一致的评分函数会导致：

- **模型排序不一致**: 一个劣质模型可能在某个特定评分下胜出
- **估计不一致**: 极小化该评分函数不收敛到真实的参数值

### Fissler-Ziegel 评分函数族

Fissler & Ziegel (2016) 给出了 (VaR, ES) 的**所有**严格一致的评分函数参数化形式：

$$S((v, e), y; G_1, G_2) = \left( \mathbf{1}\{y \leq v\} - \alpha \right) \left( G_1(v) - G_1(y) \right) + \frac{1}{\alpha} \mathbf{1}\{y \leq v\}(y - v) G_2(e) - \mathcal{G}_2(e)$$

其中 $G_1$ 是递增函数，$G_2$ 是严格递增且凸的函数，$\mathcal{G}_2 = G_2'$。

### 常用特例

**特例 1**: $G_1(x) = 0$, $G_2(x) = -\frac{1}{x}$（零均值的零梯度损失，zero-homogeneous）

$$S_0((v, e), y) = -\frac{1}{\alpha e} \mathbf{1}\{y \leq v\}(y - v) + \frac{v}{e} + \ln(-e) - 1$$

这一形式具有**均质性**（对尺度变化不变），在实证中常被使用。

**特例 2**: $G_1(x) = x$, $G_2(x) = \exp(x)$

$$S_1((v, e), y) = \frac{\mathbf{1}\{y \leq v\} - \alpha}{\alpha} y - \frac{\mathbf{1}\{y \leq v\}}{\alpha} v + \exp(e)(e - \frac{\mathbf{1}\{y \leq v\}}{\alpha}(y - v) - e + 1)$$

## 评分函数选择的方法论问题

### 评分函数等价性

评分函数 $S_1$ 和 $S_2$ 是等价的，若存在常数 $a > 0$ 和 $b$，使得 $S_1 = a \cdot S_2 + b$。

**问题**: 对于联合 (VaR, ES)，不存在不同选择参数 $(G_1, G_2)$ 对应的评分函数的等价性关系。

### 选择影响

评分函数的选择会影响：

1. **模型排序**: 不同评分函数可能给出不同的模型排名
2. **估计效率**: 不同评分函数对应的 M-estimator 可能的渐进方差不同
3. **异常值敏感性**: 某些评分函数对极端值更敏感

### 方法论建议

为减少评分函数选择的主观性对结论的影响：

1. **主要分析**: 使用零均质评分函数 $S_0$（对尺度变化稳健）
2. **稳健性分析**: 补充使用 $S_1$ 验证主要结论是否稳健
3. **报告准则**: 同时报告多个评分函数下的模型排名
4. **不一致时**: 若不同评分函数产生矛盾的模型排序，说明模型差异主要在尾部形状而非预测精度

## 评分函数与模型选择决策树

```
选择模型比较标准
    |
    ├── 监管合规 → 使用Basel III指定的回测方法
    |
    ├── 学术研究 → 联合FZ评分函数 + DM检验
    │                  ├── 主要: S0 (零均质)
    │                  └── 稳健: S1
    │
    ├── 内部风控 → 经济价值评估
    │                  验证模型是否节约资本金
    │
    └── 模型开发 → 信息准则 (AIC/BIC) + 评分函数
```

## 参考文献

- Fissler, T., & Ziegel, J. F. (2016). Higher order elicitability and Osband‘s principle. *The Annals of Statistics*, 44(4), 1680–1707.
- Patton, A. J. (2020). Comparing possibly misspecified forecasts. *Journal of Business & Economic Statistics*, 38(4), 796–809.
- Nolde, N., & Ziegel, J. F. (2017). Elicitability and backtesting: Perspectives for banking regulation. *The Annals of Applied Statistics*, 11(4), 1833–1874.

## 相关条目

- Prerequisite: [ES的Elicitability问题与联合建模框架](04-ES建模/elicitability-joint-modeling.md)
- Applied in: [风险度量回测与模型比较](backtesting.md)
- See also: [半参数ES建模方法及其合理性](04-ES建模/semiparametric-es.md)
