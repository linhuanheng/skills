---
title: 风险度量选择：VaR与ES的方法论比较
type: concept
domain: econometrics
difficulty: 2
prerequisites: []
applications: [风险度量选择, ES建模基础]
tags: [VaR, ES, 风险度量, 一致性风险度量, 方法论选择]
created: 2026-05-02
---

# 风险度量选择：VaR与ES的方法论比较

## 核心问题

> **为什么在经济金融风险度量中，预期亏损(ES)比在险价值(VaR)更受推崇？在进行方法论构建时，选择ES而非VaR的理论依据是什么？**

## 定义

### 在险价值 (Value-at-Risk, VaR)

对于给定的置信水平 $\alpha \in (0,1)$ 和损失变量 $L$（正值表示损失），VaR 定义为损失分布的 $\alpha$-分位数：

$$\text{VaR}_\alpha(L) = \inf\{ l \in \mathbb{R} : \mathbb{P}(L \leq l) \geq \alpha \} = F_L^{-1}(\alpha)$$

**直观理解**: VaR 回答的是"在 $\alpha$ 的概率下，损失不会超过某个值"。

### 预期亏损 (Expected Shortfall, ES)

ES 定义为损失超过 VaR 的条件期望：

$$\text{ES}_\alpha(L) = \mathbb{E}[L \mid L \geq \text{VaR}_\alpha(L)]$$

**直观理解**: ES 回答的是"当损失真的超过 VaR 阈值时，平均会损失多少"。

## 方法论合理性分析

### 1. 一致性风险度量公理体系

Artzner et al. (1999) 提出了一致性风险度量 (coherent risk measure) 的四个公理，这是评估风险度量方法合理性的理论基础：

| 公理 | 含义 | VaR | ES |
|------|------|-----|-----|
| **单调性** (Monotonicity) | 若 $L_1 \leq L_2$ 几乎必然，则 $\rho(L_1) \leq \rho(L_2)$ | ✓ | ✓ |
| **次可加性** (Subadditivity) | $\rho(L_1 + L_2) \leq \rho(L_1) + \rho(L_2)$ | ✗ | ✓ |
| **正齐次性** (Positive Homogeneity) | $\rho(\lambda L) = \lambda\rho(L), \lambda \geq 0$ | ✓ | ✓ |
| **平移不变性** (Translation Invariance) | $\rho(L + c) = \rho(L) + c$ | ✓ | ✓ |

**关键问题**: VaR **不满足次可加性**，这意味着用 VaR 度量风险时，分散化投资组合的风险可能被认为大于各资产风险之和，这违背了基本的金融直觉和风险管理原则。

**ES 的优势**: ES 满足所有四个公理，是一致性风险度量，在方法论上更为合理。

### 2. VaR 的缺陷

VaR 作为风险度量存在以下根本性问题：

**(a) 尾部信息忽略**: VaR 仅关注分布的单个分位点，无法反映超出 VaR 阈值后的损失严重程度。两个具有相同 VaR 的投资组合可能具有截然不同的尾部风险特征。

**(b) 非次可加性导致的不一致**: VaR 的非次可加性意味着：

$$\text{VaR}_\alpha(L_1 + L_2) > \text{VaR}_\alpha(L_1) + \text{VaR}_\alpha(L_2)$$

在极端情况下可能成立，这违反了风险管理的分散化原则。

**(c) 非凸性与优化困难**: VaR 函数不是凸函数，导致以 VaR 为目标函数的优化问题在计算上困难，可能存在多个局部最优解。

### 3. ES 的优势

**(a) 尾部信息全面**: ES 整合了整个尾部信息，对尾部分布的形状敏感，能区分"轻度尾部风险"和"极端尾部风险"。

**(b) 次可加性**: ES 的次可加性保证了：

$$\text{ES}_\alpha(L_1 + L_2) \leq \text{ES}_\alpha(L_1) + \text{ES}_\alpha(L_2)$$

这一性质确保了分散化降低风险的经济直觉，也与投资组合优化的理论框架一致。

**(c) 凸性**: ES 是凸函数（由次可加性和正齐次性推出），便于数值优化。

### 4. VaR 的唯一优势：Elicitability

VaR 相对于 ES 的一个独特优势是 **elicitability**（可被预测性）：

- VaR 是 **elicitable** 的：存在评分函数 $S(x, y)$，使得 $\text{VaR}_\alpha$ 是 $S$ 在正确预测下的期望最小化器。这意味着可以用 **M-estimation** 方法直接对 VaR 进行估计和回测。

- ES 在单变量下 **不是** elicitable 的（Gneiting, 2011），这使得 ES 的预测评估在理论上存在障碍。

**方法论含义**: ES 的不可 elicitability 并不意味着不应该使用 ES，而是意味着需要采用 **联合建模框架**，将 ES 与 VaR 一起建模。

### 5. 监管视角

Basel III 协议要求银行从 VaR 转向 ES 进行市场风险管理：

- **Basel II**: 使用 99% VaR
- **Basel III**: 使用 97.5% ES

选择 97.5% ES 而非 99% VaR 在统计上大致等价（在正态分布下），但 ES 对尾部风险的度量更为全面。

## 方法论决策总结

| 维度 | VaR | ES | 方法论含义 |
|------|-----|-----|----------|
| 理论一致性 | ✗ (非次可加) | ✓ (一致性) | ES理论基础更强 |
| 尾部信息 | ✗ (单分位点) | ✓ (整条尾部) | ES信息更完整 |
| Elicitability | ✓ | ✗ (单变量) | ES需联合VaR建模 |
| 监管认可 | Basel II | Basel III | ES成为新标准 |
| 优化可行性 | ✗ (非凸) | ✓ (凸) | ES更易优化 |

**研究启示**: 若研究目标是**风险度量的理论一致性**（如监管目的、系统风险管理），ES 是更合理的选择。但 ES 的不可 elicitability 要求在方法论构建时必须采用 **VaR-ES 联合建模框架**（如 Patton, Ziegel & Chen, 2019）。

## 参考文献

- Artzner, P., Delbaen, F., Eber, J.-M., & Heath, D. (1999). Coherent measures of risk. *Mathematical Finance*, 9(3), 203–228.
- Basel Committee on Banking Supervision. (2012). Fundamental review of the trading book.
- Gneiting, T. (2011). Making and evaluating point forecasts. *Journal of the American Statistical Association*, 106(494), 746–762.
- Patton, A. J., Ziegel, J. F., & Chen, R. (2019). Dynamic semiparametric models for expected shortfall (and Value-at-Risk). *Journal of Econometrics*, 211(2), 388–413.

## 相关条目

- Prerequisite: [时间序列基础概念](01-时间序列基础/time-series-basics.md)
- Next: [ES的Elicitability问题与联合建模框架](04-ES建模/elicitability-joint-modeling.md)
- See also: [评分函数与模型选择](06-风险度量评估/scoring-functions.md)
