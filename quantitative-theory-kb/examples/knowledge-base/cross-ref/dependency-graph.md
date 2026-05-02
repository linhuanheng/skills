---
title: 知识依赖关系图
type: framework
domain: 综合
difficulty: 1
prerequisites: []
applications: []
tags: [交叉引用, 依赖图]
created: 2026-05-02
---

# 知识依赖关系图

## 依赖路径

```
时间序列基础概念
    ├── → 动态风险度量模型的理论依据
    ├── → 多变量GARCH模型方法论
    └── → 多变量分位数回归与VAR for VaR

风险度量选择 (VaR vs ES)
    └── → ES的Elicitability问题与联合建模框架
            └── → 动态风险度量模型的理论依据
                    └── → 半参数ES建模方法及其合理性
                            └── → 风险度量回测与模型比较
                                    └── → 评分函数与模型选择

多变量分位数回归与VAR for VaR
    ├── → 广义脉冲响应在尾部风险分析中的应用
    └── → 半参数ES建模方法及其合理性
```

## 先修关系总表

| 条目 | 前置知识 | 后继应用 |
|------|---------|---------|
| 时间序列基础概念 | 无 | 动态模型、波动率建模、多变量 |
| 风险度量选择 | 无 | Elicitability |
| Elicitability | 风险度量选择 | 动态模型、评分函数 |
| 动态模型 | Elicitability、时间序列 | 半参数方法、VAR for VaR |
| 半参数方法 | 动态模型、Elicitability | 回测 |
| VAR for VaR | 动态模型 | 脉冲响应 |
| 脉冲响应 | VAR for VaR | — |
| 回测 | 半参数方法、评分函数 | — |
| 评分函数 | Elicitability | 回测 |
| 多变量GARCH | 时间序列 | 多变量建模 |
