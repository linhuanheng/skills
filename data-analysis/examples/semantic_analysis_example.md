# 语义异常值分析示例

## 场景说明

用户运行基础分析脚本后，AI 主动询问：

> **AI**: 数据分析报告已生成。请问您是否有一份关于变量的说明文档？例如变量定义、合理取值范围等。如果有，请提供文档路径（支持 JSON、CSV、Excel、Word、PDF 等格式），我可以根据变量说明分析数据中是否存在不符合现实情况的异常值。

## 用户提供变量说明

**用户**：有的，这是我的变量说明文件：`variables.xlsx`

| variable | description | min_expected | max_expected | notes |
|----------|-------------|--------------|--------------|-------|
| age | 受访者年龄 | 0 | 120 | 年龄应在 0-120 岁之间 |
| income | 年收入（元） | 0 | 1000000 | 收入不应为负 |
| height | 身高（cm） | 50 | 250 | 合理身高范围 |

## AI 编写临时脚本分析

AI 读取变量说明后，编写并执行临时 Python 脚本：

```python
import pandas as pd

# 读取数据
df = pd.read_csv('examples/sample_data.csv')

# 定义语义规则
semantic_rules = {
    'age': {'min': 0, 'max': 120, 'description': '受访者年龄'},
    'income': {'min': 0, 'max': 1000000, 'description': '年收入（元）'},
    'height': {'min': 50, 'max': 250, 'description': '身高（cm）'}
}

# 存储异常结果
outlier_summary = []
outlier_details = []

# 检查是否有 ID 列
id_column = 'id' if 'id' in df.columns else None

for col, rules in semantic_rules.items():
    if col not in df.columns:
        continue
    
    series = df[col]
    
    # 检测低于最小值
    below_min = series[series < rules['min']]
    if len(below_min) > 0:
        for idx, val in below_min.items():
            detail = {
                'variable': col,
                'row': idx,
                'id': df.iloc[idx][id_column] if id_column else 'N/A',
                'value': val,
                'rule': f"< {rules['min']}",
                'type': 'below_minimum',
                'description': rules['description']
            }
            outlier_details.append(detail)
    
    # 检测高于最大值
    above_max = series[series > rules['max']]
    if len(above_max) > 0:
        for idx, val in above_max.items():
            detail = {
                'variable': col,
                'row': idx,
                'id': df.iloc[idx][id_column] if id_column else 'N/A',
                'value': val,
                'rule': f"> {rules['max']}",
                'type': 'above_maximum',
                'description': rules['description']
            }
            outlier_details.append(detail)

# 生成概况
summary = {}
for d in outlier_details:
    var = d['variable']
    if var not in summary:
        summary[var] = {'total': 0, 'below_min': 0, 'above_max': 0}
    summary[var]['total'] += 1
    if d['type'] == 'below_min':
        summary[var]['below_min'] += 1
    else:
        summary[var]['above_max'] += 1

print("异常情况概况：")
for var, counts in summary.items():
    print(f"  {var}: 共{counts['total']}个异常 (低于最小值:{counts['below_min']}, 高于最大值:{counts['above_max']})")

print("\n详细异常数据：")
for d in outlier_details:
    print(f"  行{d['row']}, ID={d['id']}, {d['variable']}={d['value']} ({d['type']})")
```

## 分析结果

**AI 输出**：

根据变量说明分析，发现以下异常数据：

### 异常情况概况

| 变量 | 说明 | 异常总数 | 低于最小值 | 高于最大值 | 严重程度 |
|------|------|----------|------------|------------|----------|
| age | 受访者年龄 | 1 | 0 | 1 | 严重 |
| income | 年收入 | 1 | 0 | 1 | 中度 |
| height | 身高 | 0 | 0 | 0 | - |

### 详细异常数据列表

| 行号 | 数据 ID | 变量 | 实际值 | 预期范围 | 异常类型 |
|------|--------|------|--------|----------|----------|
| 20 | N/A | age | 100 | 0-120 | 高于最大值 |
| 21 | N/A | age | 15 | 0-120 | 正常 |
| 20 | N/A | income | 200000 | 0-1000000 | 正常 |
| 21 | N/A | income | 10000 | 0-1000000 | 正常 |

**注**：上面示例数据没有语义异常，但脚本会如实报告。

### 处理建议

1. **age 列**：检查行 20 的数据，年龄 100 岁虽然在统计学上可能是异常值，但在某些情况下（如百岁老人研究）可能是合理的。建议核实数据来源。

2. **数据质量检查**：建议对异常值所在行进行全面检查，确认其他变量是否也存在异常。

---

## 补充至报告

AI 将上述分析结果追加到基础分析报告中：

```markdown
## 7. 语义异常值分析（基于变量说明）

### 7.1 变量说明摘要
| 变量 | 说明 | 单位 | 预期最小值 | 预期最大值 |
|------|------|------|------------|------------|
| age | 受访者年龄 | 岁 | 0 | 120 |
| income | 年收入 | 元 | 0 | 1000000 |
| height | 身高 | cm | 50 | 250 |

### 7.2 异常情况概况
| 变量 | 异常总数 | 低于最小值 | 高于最大值 | 严重程度 |
|------|----------|------------|------------|----------|
| age | 1 | 0 | 1 | 严重 |
| income | 0 | 0 | 0 | - |
| height | 0 | 0 | 0 | - |

### 7.3 详细异常数据列表
| 行号 | 数据 ID | 变量 | 实际值 | 预期范围 | 异常类型 |
|------|--------|------|--------|----------|----------|
| 20 | - | age | 100 | 0-120 | 高于最大值 |

### 7.4 处理建议
1. 检查行 20 的 age 数据，确认是否为录入错误
2. 如数据真实，建议在分析中单独处理或标注
```

## 补充分析脚本（如需深入分析）

如果用户需要进一步分析某类异常，AI 可以编写更深入的脚本：

```python
# 分析异常值的分布模式
# 检查是否存在系统性错误
# 与其他变量交叉分析
```