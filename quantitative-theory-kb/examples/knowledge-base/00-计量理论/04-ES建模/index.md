---
title: ES建模理论 — 子领域索引（核心领域）
type: framework
domain: econometrics
difficulty: 1
prerequisites: []
applications: [ES预测, 风险度量]
tags: [ES, 建模, 索引, 核心]
created: 2026-05-02
---

# ES建模理论（核心领域）

本子领域是知识库的核心，系统覆盖 ES 建模的方法论基础。

## 条目

- [风险度量选择：VaR与ES的方法论比较](risk-measure-comparison.md) — 为什么选择ES而非VaR
- [ES的Elicitability问题与联合建模框架](elicitability-joint-modeling.md) — ES不可直接预测的解决方案
- [动态风险度量模型的理论依据](dynamic-es-models.md) — 为什么需要动态模型
- [半参数ES建模方法及其合理性](semiparametric-es.md) — 为什么选择半参数方法
- [CAViaR模型与动态分位数检验](caviar-dq-test.md) — 如何直接建模VaR并诊断模型
- [GARCH+EVT两步法ES估计](garch-evt-es.md) — 极值理论与GARCH结合的替代路径
- [GAS框架与参数驱动模型的方法论比较](gas-vs-state-space.md) — 为什么选择GAS驱动动态结构

## 方法论逻辑链

```
风险度量选择 (VaR vs ES) → Elicitability问题 → 联合建模 → 动态结构 → 半参数方法
                                                                  ├→ CAViaR (直接分位数建模)
                                                                  ├→ GARCH+EVT (波动率滤波+极值尾部)
                                                                  └→ GAS框架 (得分驱动的观测模型)
```

每条对应一个 "为什么" 的方法论决策。
