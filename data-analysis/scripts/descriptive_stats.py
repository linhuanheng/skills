#!/usr/bin/env python3
"""
描述性统计、缺失值分析、异常值检测、自相关分析和平稳性检验脚本

功能：
1. 识别数据类型（横截面、时间序列、面板数据）
2. 读取 CSV 或 Excel 数据文件
3. 计算描述性统计量
4. 分析缺失值情况（整体缺失、模式分析、影响评估）
5. 检测异常值（使用 IQR 方法）
6. 分析时间序列/面板数据的自相关性
7. 检验时间序列/面板数据的平稳性（ADF 检验、KPSS 检验）
8. 生成 Markdown 格式的完整数据分析报告

使用方法：
python descriptive_stats.py --input data.csv --output report.md
"""

import pandas as pd
import numpy as np
import argparse
import sys
from pathlib import Path
from datetime import datetime
from scipy import stats as scipy_stats
from statsmodels.tsa.stattools import adfuller, kpss


def read_data(file_path):
    """
    读取数据文件，支持 CSV 和 Excel 格式
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"文件不存在：{file_path}")

    if file_path.suffix.lower() == '.csv':
        df = pd.read_csv(file_path)
    elif file_path.suffix.lower() in ['.xlsx', '.xls']:
        df = pd.read_excel(file_path)
    else:
        raise ValueError(f"不支持的文件格式：{file_path.suffix}。请使用 CSV 或 Excel 文件。")

    return df


def calculate_descriptive_stats(df):
    """
    计算描述性统计量
    """
    stats = {}

    # 基本统计量
    stats['basic'] = df.describe().T

    # 添加额外的统计量
    for col in df.select_dtypes(include=[np.number]).columns:
        col_stats = {
            'mean': df[col].mean(),
            'median': df[col].median(),
            'std': df[col].std(),
            'min': df[col].min(),
            'max': df[col].max(),
            'q1': df[col].quantile(0.25),
            'q3': df[col].quantile(0.75),
            'iqr': df[col].quantile(0.75) - df[col].quantile(0.25),
            'skewness': df[col].skew(),
            'kurtosis': df[col].kurtosis(),
            'missing': df[col].isna().sum(),
            'missing_percentage': (df[col].isna().sum() / len(df)) * 100
        }
        stats[col] = col_stats

    return stats


def analyze_missing_values(df):
    """
    分析缺失值情况

    参数:
    df: pandas DataFrame

    返回:
    dict: 包含缺失值分析结果
    """
    missing_analysis = {}

    # 整体缺失情况
    missing_analysis['total_missing'] = df.isna().sum().sum()
    missing_analysis['total_cells'] = df.size
    missing_analysis['missing_percentage'] = (missing_analysis['total_missing'] / missing_analysis['total_cells']) * 100

    # 每列缺失情况
    missing_analysis['columns'] = {}
    for col in df.columns:
        missing_count = df[col].isna().sum()
        missing_analysis['columns'][col] = {
            'missing_count': missing_count,
            'missing_percentage': (missing_count / len(df)) * 100,
            'non_missing_count': len(df) - missing_count,
            'non_missing_percentage': ((len(df) - missing_count) / len(df)) * 100
        }

    # 缺失值模式分析
    missing_analysis['patterns'] = {}

    # 完全缺失的列
    complete_missing_cols = [col for col in df.columns if df[col].isna().all()]
    missing_analysis['patterns']['complete_missing_cols'] = {
        'count': len(complete_missing_cols),
        'columns': complete_missing_cols
    }

    # 部分缺失的列
    partial_missing_cols = [col for col in df.columns if df[col].isna().any() and not df[col].isna().all()]
    missing_analysis['patterns']['partial_missing_cols'] = {
        'count': len(partial_missing_cols),
        'columns': partial_missing_cols
    }

    # 完全无缺失的列
    no_missing_cols = [col for col in df.columns if not df[col].isna().any()]
    missing_analysis['patterns']['no_missing_cols'] = {
        'count': len(no_missing_cols),
        'columns': no_missing_cols
    }

    # 缺失值行分析
    missing_analysis['rows'] = {}
    missing_per_row = df.isna().sum(axis=1)

    # 按缺失值数量统计行数
    for missing_count in range(df.shape[1] + 1):
        row_count = (missing_per_row == missing_count).sum()
        if row_count > 0:
            missing_analysis['rows'][missing_count] = {
                'row_count': row_count,
                'row_percentage': (row_count / len(df)) * 100
            }

    # 缺失值相关性分析（哪些列倾向于一起缺失）
    missing_analysis['correlation'] = {}
    missing_matrix = df.isna()

    if len(partial_missing_cols) > 1:
        for i, col1 in enumerate(partial_missing_cols):
            for col2 in partial_missing_cols[i+1:]:
                # 计算两个列同时缺失的比例
                both_missing = (missing_matrix[col1] & missing_matrix[col2]).sum()
                if both_missing > 0:
                    total_missing_col1 = missing_matrix[col1].sum()
                    correlation = both_missing / total_missing_col1 if total_missing_col1 > 0 else 0
                    key = f"{col1} & {col2}"
                    missing_analysis['correlation'][key] = {
                        'both_missing_count': both_missing,
                        'correlation_percentage': correlation * 100,
                        'total_missing_col1': total_missing_col1
                    }

    return missing_analysis


def identify_data_type(df):
    """
    识别数据类型：横截面数据、时间序列数据或面板数据

    参数:
    df: pandas DataFrame

    返回:
    dict: 数据类型识别结果
    """
    data_type_info = {}

    # 检查可能的时间列
    time_columns = []
    date_patterns = ['date', 'time', 'year', 'month', 'day', 'period', '日期', '时间', '年', '月']

    for col in df.columns:
        col_lower = col.lower()
        # 检查列名是否包含时间相关关键词
        is_time_by_name = any(pattern in col_lower for pattern in date_patterns)

        # 检查列是否是日期时间类型
        is_datetime_dtype = pd.api.types.is_datetime64_any_dtype(df[col])

        # 检查列是否可以解析为日期
        if df[col].dtype == 'object' or df[col].dtype == 'string':
            try:
                parsed = pd.to_datetime(df[col], errors='coerce')
                is_parseable_as_date = parsed.notna().sum() > len(df) * 0.5
            except:
                is_parseable_as_date = False
        else:
            is_parseable_as_date = False

        # 检查是否是年份列（4 位数字）
        is_year = False
        if df[col].dtype in ['int64', 'float64']:
            unique_vals = df[col].dropna().unique()
            if len(unique_vals) > 0:
                is_year = all((val >= 1900 and val <= 2100) for val in unique_vals if not pd.isna(val))

        if is_time_by_name or is_datetime_dtype or is_parseable_as_date or is_year:
            time_columns.append({
                'column': col,
                'reason': {
                    'by_name': is_time_by_name,
                    'is_datetime_dtype': is_datetime_dtype,
                    'is_parseable_as_date': is_parseable_as_date,
                    'is_year': is_year
                }
            })

    data_type_info['time_columns'] = time_columns

    # 检查可能的个体/截面标识列
    id_columns = []
    id_patterns = ['id', 'code', 'name', 'entity', 'individual', 'firm', 'country', '地区', '公司', '个体', '编号', '代码']

    for col in df.columns:
        col_lower = col.lower()
        is_id_by_name = any(pattern in col_lower for pattern in id_patterns)

        # ID 列通常是字符串类型且有很多唯一值
        is_string_type = df[col].dtype == 'object' or df[col].dtype == 'string'
        unique_ratio = df[col].nunique() / len(df) if len(df) > 0 else 0
        is_many_unique = unique_ratio > 0.1 and unique_ratio < 1.0

        if is_id_by_name or (is_string_type and is_many_unique):
            id_columns.append({
                'column': col,
                'unique_count': df[col].nunique(),
                'unique_ratio': unique_ratio,
                'is_string_type': is_string_type
            })

    data_type_info['id_columns'] = id_columns

    # 判断数据类型
    has_time = len(time_columns) > 0
    has_id = len(id_columns) > 0

    # 检查数据是否是平衡面板（如果同时有时间列和个体列）
    if has_time and has_id:
        # 尝试确定面板结构
        time_col = time_columns[0]['column']
        id_col = id_columns[0]['column']

        # 计算每个个体的时间点数
        id_time_counts = df.groupby(id_col)[time_col].nunique()
        # 计算每个时间点的个体数
        time_id_counts = df.groupby(time_col)[id_col].nunique()

        is_balanced = (id_time_counts.nunique() == 1) and (time_id_counts.nunique() == 1)

        data_type_info['panel_info'] = {
            'is_balanced': is_balanced,
            'num_individuals': df[id_col].nunique(),
            'num_time_periods': df[time_col].nunique(),
            'obs_per_individual': id_time_counts.describe().to_dict() if len(id_time_counts) > 0 else {},
            'obs_per_period': time_id_counts.describe().to_dict() if len(time_id_counts) > 0 else {}
        }

    # 确定数据类型
    if has_time and has_id:
        data_type_info['data_type'] = 'panel'
        data_type_info['confidence'] = 'high'
        data_type_info['description'] = '面板数据（同时包含时间维度和个体维度）'
    elif has_time:
        data_type_info['data_type'] = 'time_series'
        data_type_info['confidence'] = 'medium' if len(time_columns) == 1 else 'high'
        data_type_info['description'] = '时间序列数据（包含时间维度）'
    elif has_id:
        # 只有个体标识，可能是横截面数据
        data_type_info['data_type'] = 'cross_section'
        data_type_info['confidence'] = 'medium'
        data_type_info['description'] = '横截面数据（包含个体标识）'
    else:
        # 没有明显的时间或个体标识，默认横截面数据
        data_type_info['data_type'] = 'cross_section'
        data_type_info['confidence'] = 'low'
        data_type_info['description'] = '横截面数据（未检测到时间或个体标识）'

    return data_type_info


def analyze_autocorrelation(df, data_type_info):
    """
    分析时间序列数据或面板数据的自相关性

    参数:
    df: pandas DataFrame
    data_type_info: 数据类型识别结果

    返回:
    dict: 自相关分析结果
    """
    autocorr_result = {
        'is_time_dependent': False,
        'time_column': None,
        'numerical_columns': [],
        'autocorr_tests': {},
        'ljung_box_tests': {},
        'conclusions': {}
    }

    if data_type_info['data_type'] not in ['time_series', 'panel']:
        autocorr_result['is_time_dependent'] = False
        autocorr_result['conclusion'] = '非时间序列数据，不需要进行自相关分析'
        return autocorr_result

    autocorr_result['is_time_dependent'] = True

    # 获取时间列
    time_col = data_type_info['time_columns'][0]['column']
    autocorr_result['time_column'] = time_col

    # 按时间排序
    df_sorted = df.sort_values(time_col).reset_index(drop=True)

    # 获取数值列
    numerical_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    numerical_cols = [col for col in numerical_cols if col != time_col]
    autocorr_result['numerical_columns'] = numerical_cols

    # 对每个数值列进行自相关分析
    for col in numerical_cols:
        series = df_sorted[col].dropna()

        if len(series) < 10:
            autocorr_result['autocorr_tests'][col] = {
                'status': 'insufficient_data',
                'message': '数据点不足（需要至少 10 个观测值）'
            }
            continue

        # 计算自相关系数（滞后 1-5 阶）
        max_lag = min(5, len(series) - 1)
        autocorr_vals = {}
        for lag in range(1, max_lag + 1):
            if len(series) > lag:
                autocorr = series.autocorr(lag=lag)
                autocorr_vals[f'lag_{lag}'] = autocorr if not np.isnan(autocorr) else np.nan

        autocorr_result['autocorr_tests'][col] = {
            'autocorr_coefficients': autocorr_vals,
            'status': 'computed'
        }

        # Ljung-Box 检验（检验是否存在自相关）
        try:
            if len(series) > 20:
                # 使用多个滞后阶数进行检验
                for lag in [5, 10]:
                    if lag < len(series) - 1:
                        lb_stat, lb_pvalue = scipy_stats.boxpiercetest(series, nlags=lag)
                        autocorr_result['ljung_box_tests'][f'{col}_lag{lag}'] = {
                            'statistic': float(lb_stat),
                            'p_value': float(lb_pvalue),
                            'lag': lag,
                            'significant': lb_pvalue < 0.05
                        }
        except Exception as e:
            autocorr_result['ljung_box_tests'][col] = {
                'status': 'error',
                'message': str(e)
            }

    # 得出结论
    significant_autocorr = []
    for col in numerical_cols:
        for key, test_result in autocorr_result['ljung_box_tests'].items():
            if col in key and isinstance(test_result, dict) and test_result.get('significant'):
                significant_autocorr.append(col)
                break

    if significant_autocorr:
        autocorr_result['conclusion'] = f"检测到显著的自相关性：{', '.join(significant_autocorr)}。建议在建模时考虑自相关结构（如 AR 项、固定效应等）。"
    else:
        autocorr_result['conclusion'] = '未检测到显著的自相关性，数据可以视为无自相关。'

    return autocorr_result


def test_stationarity(df, data_type_info):
    """
    检验时间序列或面板数据的平稳性

    参数:
    df: pandas DataFrame
    data_type_info: 数据类型识别结果

    返回:
    dict: 平稳性检验结果
    """
    stationarity_result = {
        'is_time_dependent': False,
        'time_column': None,
        'numerical_columns': [],
        'adf_tests': {},
        'kpss_tests': {},
        'conclusions': {}
    }

    if data_type_info['data_type'] not in ['time_series', 'panel']:
        stationarity_result['is_time_dependent'] = False
        stationarity_result['conclusion'] = '非时间序列数据，不需要进行平稳性检验'
        return stationarity_result

    stationarity_result['is_time_dependent'] = True

    # 获取时间列
    time_col = data_type_info['time_columns'][0]['column']
    stationarity_result['time_column'] = time_col

    # 按时间排序
    df_sorted = df.sort_values(time_col).reset_index(drop=True)

    # 获取数值列
    numerical_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    numerical_cols = [col for col in numerical_cols if col != time_col]
    stationarity_result['numerical_columns'] = numerical_cols

    # 对每个数值列进行平稳性检验
    for col in numerical_cols:
        series = df_sorted[col].dropna()

        if len(series) < 10:
            stationarity_result['adf_tests'][col] = {
                'status': 'insufficient_data',
                'message': '数据点不足（需要至少 10 个观测值）'
            }
            stationarity_result['kpss_tests'][col] = {
                'status': 'insufficient_data',
                'message': '数据点不足（需要至少 10 个观测值）'
            }
            continue

        # ADF 检验（原假设：存在单位根，即非平稳）
        try:
            adf_result = adfuller(series, regression='c', autolag='AIC', maxlag=None)
            adf_stat = adf_result[0]
            adf_pvalue = adf_result[1]
            adf_crit = adf_result[4]
            adf_lags = adf_result[3]
            stationarity_result['adf_tests'][col] = {
                'statistic': float(adf_stat),
                'p_value': float(adf_pvalue),
                'critical_values': {k: float(v) for k, v in adf_crit.items()},
                'used_df_lags': int(adf_lags) if adf_lags else 'auto',
                'is_stationary': adf_pvalue < 0.05,
                'significance': '*** 平稳 ***' if adf_pvalue < 0.01 else ('** 可能平稳 **' if adf_pvalue < 0.05 else '不平稳')
            }
        except Exception as e:
            stationarity_result['adf_tests'][col] = {
                'status': 'error',
                'message': str(e)
            }

        # KPSS 检验（原假设：序列平稳）
        try:
            kpss_result = kpss(series, regression='c', nlags='auto')
            kpss_stat = kpss_result[0]
            kpss_pvalue = kpss_result[1]
            kpss_crit = kpss_result[3]  # 新版本 statsmodels 返回 (stat, pvalue, lag, crit)
            stationarity_result['kpss_tests'][col] = {
                'statistic': float(kpss_stat),
                'p_value': float(kpss_pvalue),
                'critical_values': {k: float(v) for k, v in kpss_crit.items()},
                'is_stationary': kpss_pvalue > 0.05,
                'significance': '*** 平稳 ***' if kpss_pvalue > 0.10 else ('** 可能平稳 **' if kpss_pvalue > 0.05 else '不平稳')
            }
        except Exception as e:
            stationarity_result['kpss_tests'][col] = {
                'status': 'error',
                'message': str(e)
            }

    # 综合结论
    stationary_cols = []
    non_stationary_cols = []

    for col in numerical_cols:
        adf_res = stationarity_result['adf_tests'].get(col, {})
        kpss_res = stationarity_result['kpss_tests'].get(col, {})

        if isinstance(adf_res, dict) and 'is_stationary' in adf_res and isinstance(kpss_res, dict) and 'is_stationary' in kpss_res:
            if adf_res['is_stationary'] and kpss_res['is_stationary']:
                stationary_cols.append(col)
            elif not adf_res['is_stationary'] and not kpss_res['is_stationary']:
                non_stationary_cols.append(col)
            else:
                # 检验结果不一致
                stationary_cols.append(f"{col} (结果不一致)")

    if non_stationary_cols:
        stationarity_result['conclusion'] = (
            f"以下变量为非平稳序列：{', '.join(non_stationary_cols)}。建议进行差分处理或使用协整分析。"
        )
        if stationary_cols:
            stationarity_result['conclusion'] += f" 以下变量为平稳序列：{', '.join(stationary_cols)}。"
    else:
        stationarity_result['conclusion'] = (
            f"所有变量均为平稳序列（或结果不一致）。可以直接进行回归分析。"
            if not stationary_cols else
            f"所有变量均为平稳序列：{', '.join(stationary_cols)}。可以直接进行回归分析。"
        )

    return stationarity_result


def detect_outliers(df, method='iqr'):
    """
    检测异常值

    参数:
    df: pandas DataFrame
    method: 检测方法，支持 'iqr'（四分位距法）

    返回:
    dict: 每个数值列的异常值信息
    """
    outliers = {}

    if method == 'iqr':
        for col in df.select_dtypes(include=[np.number]).columns:
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1

            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR

            outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
            outlier_indices = df[outlier_mask].index.tolist()
            outlier_values = df[col][outlier_mask].tolist()

            outliers[col] = {
                'lower_bound': lower_bound,
                'upper_bound': upper_bound,
                'count': len(outlier_indices),
                'percentage': (len(outlier_indices) / len(df)) * 100,
                'indices': outlier_indices,
                'values': outlier_values
            }
    else:
        raise ValueError(f"不支持的异常值检测方法：{method}")

    return outliers


def generate_markdown_report(df, stats, missing_analysis, outliers, data_type_info, autocorr_analysis, stationarity_analysis, input_file, output_file):
    """
    生成 Markdown 格式的报告
    """
    report = []

    # 报告标题
    report.append(f"# 数据分析报告")
    report.append(f"生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append(f"数据文件：`{input_file}`")
    report.append("")

    # 数据概览
    report.append("## 1. 数据概览")
    report.append(f"- 行数：{len(df)}")
    report.append(f"- 列数：{len(df.columns)}")
    report.append(f"- 数据类型分布:")

    dtype_counts = df.dtypes.value_counts()
    for dtype, count in dtype_counts.items():
        report.append(f"  - {dtype}: {count}列")

    report.append("")
    report.append("### 列信息")
    report.append("| 列名 | 数据类型 | 缺失值数量 | 缺失值比例 |")
    report.append("|------|----------|------------|------------|")

    for col in df.columns:
        missing = df[col].isna().sum()
        missing_pct = (missing / len(df)) * 100
        report.append(f"| {col} | {df[col].dtype} | {missing} | {missing_pct:.2f}% |")

    report.append("")

    # 缺失值分析
    report.append("## 2. 缺失值分析")

    # 整体缺失情况
    total_cells = missing_analysis['total_cells']
    total_missing = missing_analysis['total_missing']
    missing_pct = missing_analysis['missing_percentage']

    report.append("### 2.1 整体缺失情况")
    report.append(f"- 总单元格数：{total_cells}")
    report.append(f"- 缺失单元格数：{total_missing}")
    report.append(f"- 缺失比例：{missing_pct:.2f}%")
    report.append("")

    # 缺失值分类统计
    report.append("### 2.2 缺失值分类统计")

    patterns = missing_analysis['patterns']
    report.append(f"- 完全无缺失的列数：{patterns['no_missing_cols']['count']}")
    if patterns['no_missing_cols']['count'] > 0:
        report.append(f"  - 列名：{', '.join(patterns['no_missing_cols']['columns'])}")

    report.append(f"- 部分缺失的列数：{patterns['partial_missing_cols']['count']}")
    if patterns['partial_missing_cols']['count'] > 0:
        report.append(f"  - 列名：{', '.join(patterns['partial_missing_cols']['columns'])}")

    report.append(f"- 完全缺失的列数：{patterns['complete_missing_cols']['count']}")
    if patterns['complete_missing_cols']['count'] > 0:
        report.append(f"  - 列名：{', '.join(patterns['complete_missing_cols']['columns'])}")
    report.append("")

    # 行缺失分布
    report.append("### 2.3 行缺失分布")
    report.append("按每行缺失值数量统计:")
    report.append("| 每行缺失值数量 | 行数 | 行数比例 |")
    report.append("|---------------|------|----------|")

    rows_info = missing_analysis['rows']
    for missing_count in sorted(rows_info.keys()):
        row_info = rows_info[missing_count]
        report.append(f"| {missing_count} | {row_info['row_count']} | {row_info['row_percentage']:.2f}% |")
    report.append("")

    # 缺失值相关性分析
    if missing_analysis['correlation']:
        report.append("### 2.4 缺失值相关性分析")
        report.append("以下列倾向于同时缺失:")
        report.append("| 列组合 | 同时缺失次数 | 相关性比例 | 列 1 总缺失数 |")
        report.append("|--------|-------------|------------|-------------|")

        for pair, corr_info in missing_analysis['correlation'].items():
            report.append(f"| {pair} | {corr_info['both_missing_count']} | {corr_info['correlation_percentage']:.2f}% | {corr_info['total_missing_col1']} |")
        report.append("")

    # 详细列缺失信息
    report.append("### 2.5 详细列缺失信息")
    report.append("| 列名 | 缺失值数量 | 缺失比例 | 非缺失值数量 | 非缺失比例 |")
    report.append("|------|------------|----------|--------------|------------|")

    for col, col_info in missing_analysis['columns'].items():
        report.append(f"| {col} | {col_info['missing_count']} | {col_info['missing_percentage']:.2f}% | "
                     f"{col_info['non_missing_count']} | {col_info['non_missing_percentage']:.2f}% |")

    report.append("")

    # 数据类型识别
    report.append("## 3. 数据类型识别")

    data_type = data_type_info.get('data_type', 'unknown')
    confidence = data_type_info.get('confidence', 'unknown')
    description = data_type_info.get('description', '')

    report.append(f"**数据类型**: {data_type}（置信度：{confidence}）")
    report.append(f"**说明**: {description}")
    report.append("")

    # 时间列信息
    if data_type_info.get('time_columns'):
        report.append("### 检测到的时间列:")
        for tc in data_type_info['time_columns']:
            report.append(f"- **{tc['column']}**: "
                         f"列名匹配={tc['reason'].get('by_name', False)}, "
                         f"日期类型={tc['reason'].get('is_datetime_dtype', False)}, "
                         f"可解析为日期={tc['reason'].get('is_parseable_as_date', False)}, "
                         f"年份列={tc['reason'].get('is_year', False)}")
        report.append("")

    # 个体标识列信息
    if data_type_info.get('id_columns'):
        report.append("### 检测到的个体/截面标识列:")
        for ic in data_type_info['id_columns']:
            report.append(f"- **{ic['column']}**: 唯一值数量={ic['unique_count']}, "
                         f"唯一值比例={ic['unique_ratio']:.2%}, "
                         f"字符串类型={ic['is_string_type']}")
        report.append("")

    # 面板数据信息
    if data_type_info.get('panel_info'):
        panel_info = data_type_info['panel_info']
        report.append("### 面板数据结构:")
        report.append(f"- **是否平衡面板**: {panel_info['is_balanced']}")
        report.append(f"- **个体数量**: {panel_info['num_individuals']}")
        report.append(f"- **时间期数**: {panel_info['num_time_periods']}")
        report.append(f"- **总观测数**: {len(df)}")
        if panel_info.get('obs_per_individual'):
            desc = panel_info['obs_per_individual']
            report.append(f"- **每个个体的观测数**: 均值={desc.get('mean', 'N/A'):.2f}, "
                         f"标准差={desc.get('std', 'N/A'):.2f}, "
                         f"最小={desc.get('min', 'N/A')}, 最大={desc.get('max', 'N/A')}")
        if panel_info.get('obs_per_period'):
            desc = panel_info['obs_per_period']
            report.append(f"- **每个时期的个体数**: 均值={desc.get('mean', 'N/A'):.2f}, "
                         f"标准差={desc.get('std', 'N/A'):.2f}, "
                         f"最小={desc.get('min', 'N/A')}, 最大={desc.get('max', 'N/A')}")
        report.append("")

    # 自相关分析（针对时间序列或面板数据）
    report.append("## 4. 自相关分析")

    if autocorr_analysis.get('is_time_dependent'):
        report.append(f"**时间列**: {autocorr_analysis.get('time_column', 'N/A')}")
        report.append(f"**分析的数值列**: {', '.join(autocorr_analysis.get('numerical_columns', []))}")
        report.append("")

        # 自相关系数
        report.append("### 自相关系数")
        report.append("| 变量 | 滞后 1 阶 | 滞后 2 阶 | 滞后 3 阶 | 滞后 4 阶 | 滞后 5 阶 |")
        report.append("|------|--------|--------|--------|--------|--------|")

        for col in autocorr_analysis.get('numerical_columns', []):
            if col in autocorr_analysis.get('autocorr_tests', {}):
                test_info = autocorr_analysis['autocorr_tests'][col]
                if test_info.get('status') == 'computed':
                    coeffs = test_info.get('autocorr_coefficients', {})
                    row = [col]
                    for lag in range(1, 6):
                        key = f'lag_{lag}'
                        val = coeffs.get(key, np.nan)
                        if isinstance(val, float) and np.isnan(val):
                            row.append('N/A')
                        else:
                            row.append(f'{val:.4f}' if val is not None else 'N/A')
                    report.append(f"| {' | '.join(row)} |")
                else:
                    report.append(f"| {col} | {test_info.get('message', 'N/A')} |")

        report.append("")

        # Ljung-Box 检验
        if autocorr_analysis.get('ljung_box_tests'):
            report.append("### Ljung-Box 自相关检验")
            report.append("| 变量 | 滞后阶数 | 统计量 | P 值 | 显著（α=0.05）|")
            report.append("|------|---------|--------|------|--------------|")

            for key, test_result in autocorr_analysis['ljung_box_tests'].items():
                if isinstance(test_result, dict) and 'statistic' in test_result:
                    significant = "*** 显著 ***" if test_result.get('significant') else "不显著"
                    report.append(f"| {key.replace('_lag', ' 滞后')} | {test_result.get('lag')} | "
                                 f"{test_result.get('statistic', 'N/A'):.4f} | "
                                 f"{test_result.get('p_value', 'N/A'):.4f} | {significant} |")

            report.append("")

        # 结论
        report.append("### 结论")
        report.append(autocorr_analysis.get('conclusion', '无法得出结论'))
        report.append("")

        report.append("**注释**:")
        report.append("- 自相关系数接近 1 或 -1 表示强自相关，接近 0 表示无自相关")
        report.append("- Ljung-Box 检验原假设为'不存在自相关'，P 值<0.05 时拒绝原假设")
        report.append("- 存在自相关时，建议在模型中加入 AR 项、固定效应或使用 HAC 标准误")
    else:
        report.append(autocorr_analysis.get('conclusion', '非时间序列数据，不需要进行自相关分析。'))
    report.append("")

    # 平稳性检验（针对时间序列或面板数据）
    report.append("## 5. 平稳性检验")

    if stationarity_analysis.get('is_time_dependent'):
        report.append(f"**时间列**: {stationarity_analysis.get('time_column', 'N/A')}")
        report.append(f"**分析的数值列**: {', '.join(stationarity_analysis.get('numerical_columns', []))}")
        report.append("")

        report.append("### 5.1 ADF 检验（原假设：存在单位根，即非平稳）")
        report.append("| 变量 | 统计量 | P 值 | 结论 | 使用滞后阶数 |")
        report.append("|------|--------|------|------|--------------|")

        for col in stationarity_analysis.get('numerical_columns', []):
            if col in stationarity_analysis.get('adf_tests', {}):
                test_info = stationarity_analysis['adf_tests'][col]
                if isinstance(test_info, dict) and 'statistic' in test_info:
                    report.append(f"| {col} | {test_info['statistic']:.4f} | {test_info['p_value']:.4f} | {test_info['significance']} | {test_info.get('used_df_lags', 'N/A')} |")
                else:
                    report.append(f"| {col} | - | - | {test_info.get('message', 'N/A')} | - |")

        report.append("")

        report.append("### 5.2 KPSS 检验（原假设：序列平稳）")
        report.append("| 变量 | 统计量 | P 值 | 结论 |")
        report.append("|------|--------|------|------|")

        for col in stationarity_analysis.get('numerical_columns', []):
            if col in stationarity_analysis.get('kpss_tests', {}):
                test_info = stationarity_analysis['kpss_tests'][col]
                if isinstance(test_info, dict) and 'statistic' in test_info:
                    report.append(f"| {col} | {test_info['statistic']:.4f} | {test_info['p_value']:.4f} | {test_info['significance']} |")
                else:
                    report.append(f"| {col} | - | - | {test_info.get('message', 'N/A')} |")

        report.append("")

        report.append("### 5.3 综合结论")
        report.append(stationarity_analysis.get('conclusion', '无法得出结论'))
        report.append("")

        report.append("**注释**:")
        report.append("- **ADF 检验**：原假设为'存在单位根（非平稳）'，P 值<0.05 时拒绝原假设，认为序列平稳")
        report.append("- **KPSS 检验**：原假设为'序列平稳'，P 值>0.05 时不能拒绝原假设，认为序列平稳")
        report.append("- **综合判断**：当 ADF 和 KPSS 检验结论一致时，可信度较高；如结论不一致，需要结合其他方法判断")
        report.append("- **非平稳数据处理**：建议进行差分处理、对数差分或使用协整分析")
        report.append("")
    else:
        report.append(stationarity_analysis.get('conclusion', '非时间序列数据，不需要进行平稳性检验。'))
    report.append("")

    # 异常值分析
    report.append("## 6. 异常值分析")
    report.append("使用 IQR（四分位距）方法检测异常值：超出 Q1-1.5×IQR 或 Q3+1.5×IQR 的值被视为异常值。")
    report.append("")

    has_outliers = False
    for col, outlier_info in outliers.items():
        if outlier_info['count'] > 0:
            has_outliers = True
            report.append(f"### {col}列的异常值")
            report.append(f"- 异常值数量：{outlier_info['count']} ({outlier_info['percentage']:.2f}%)")
            report.append(f"- 正常值范围：[{outlier_info['lower_bound']:.2f}, {outlier_info['upper_bound']:.2f}]")
            report.append("- 异常值索引和值:")

            for idx, val in zip(outlier_info['indices'], outlier_info['values']):
                report.append(f"  - 行{idx}: {val:.2f}")

            report.append("")

    if not has_outliers:
        report.append("未检测到异常值。")
        report.append("")

    # 建议部分
    report.append("## 7. 分析建议")

    report.append("### 6.1 缺失值处理建议")

    total_missing = missing_analysis['total_missing']
    missing_pct = missing_analysis['missing_percentage']

    if total_missing > 0:
        report.append(f"数据共有{total_missing}个缺失值（{missing_pct:.2f}%）。根据缺失情况，建议采取以下措施：")
        report.append("")

        # 根据缺失值比例提供建议
        if missing_pct < 5:
            report.append("**轻度缺失（<5%）**:")
            report.append("1. **简单删除**: 直接删除包含缺失值的行或列，对分析结果影响较小")
            report.append("2. **简单填充**: 使用均值、中位数、众数或特定值填充")
        elif missing_pct < 20:
            report.append("**中度缺失（5%-20%）**:")
            report.append("1. **统计方法填充**: 使用回归、KNN、多重插补等统计方法")
            report.append("2. **模型处理**: 使用能够处理缺失值的模型（如 XGBoost、LightGBM）")
            report.append("3. **标记缺失**: 创建缺失值指示变量，保留缺失信息")
        else:
            report.append("**严重缺失（≥20%）**:")
            report.append("1. **数据来源检查**: 检查数据收集过程是否存在系统性问题")
            report.append("2. **变量重要性评估**: 考虑删除缺失严重的变量")
            report.append("3. **专业插补**: 需要领域知识指导的复杂插补方法")

        report.append("")
        report.append("**具体列处理建议**:")
        for col, col_info in missing_analysis['columns'].items():
            col_missing_pct = col_info['missing_percentage']
            if col_missing_pct > 0:
                if col_missing_pct < 5:
                    severity = "轻度"
                    suggestion = "简单填充或删除"
                elif col_missing_pct < 20:
                    severity = "中度"
                    suggestion = "统计方法填充或创建缺失指示变量"
                else:
                    severity = "严重"
                    suggestion = "考虑删除该列或使用专业插补"

                report.append(f"- **{col}列**: {col_info['missing_count']}个缺失值（{col_missing_pct:.2f}%）→ {severity} 缺失，建议{suggestion}")

        report.append("")
        report.append("**缺失模式处理建议**:")
        patterns = missing_analysis['patterns']
        if patterns['complete_missing_cols']['count'] > 0:
            report.append(f"- **完全缺失的列**: {patterns['complete_missing_cols']['columns']} → 建议直接删除这些列")

        if missing_analysis['correlation']:
            report.append("- **相关缺失的列**: 以下列倾向于同时缺失，可能需要一起处理:")
            for pair, corr_info in missing_analysis['correlation'].items():
                if corr_info['correlation_percentage'] > 50:
                    report.append(f"  - {pair}: {corr_info['both_missing_count']}次同时缺失（{corr_info['correlation_percentage']:.2f}%相关性）")
    else:
        report.append("数据没有缺失值，数据质量良好。")

    report.append("")
    report.append("### 6.2 异常值处理建议")
    if has_outliers:
        report.append("检测到异常值，建议采取以下措施：")
        report.append("1. **检查数据来源**: 确认异常值是否为录入错误或测量错误")
        report.append("2. **业务理解**: 根据业务知识判断异常值是否合理")
        report.append("3. **处理方法选择**:")
        report.append("   - 如果异常值不合理：删除或修正")
        report.append("   - 如果异常值合理：保留，但可能需要特殊处理")
        report.append("   - 如果需要保留异常值但减少影响：使用稳健统计方法")
    else:
        report.append("未检测到异常值，数据质量良好。")

    report.append("")
    report.append("### 6.3 进一步分析建议")

    # 根据数据类型提供建议
    if data_type_info['data_type'] == 'time_series':
        report.append("**针对时间序列数据**:")
        report.append("1. **趋势分析**: 分解时间序列的趋势、季节性和残差成分")
        report.append("2. **平稳性检验**: 进行 ADF 检验、KPSS 检验检查序列平稳性")
        report.append("3. **模型选择**: 考虑 ARIMA、SARIMA、VAR 等时间序列模型")
        report.append("4. **预测评估**: 使用滚动预测、交叉验证评估预测性能")
    elif data_type_info['data_type'] == 'panel':
        report.append("**针对面板数据**:")
        report.append("1. **个体效应检验**: Hausman 检验选择固定效应或随机效应模型")
        report.append("2. **时间效应检验**: 检验是否需要控制时间固定效应")
        report.append("3. **异方差和自相关**: 使用聚类稳健标准误")
        report.append("4. **动态面板**: 考虑系统 GMM 估计方法")
    else:
        report.append("**针对横截面数据**:")
        report.append("1. **可视化分析**: 使用直方图、箱线图、散点图等探索数据分布和关系")
        report.append("2. **相关性分析**: 分析变量之间的相关性")
        report.append("3. **分布检验**: 检验数据是否符合正态分布等假设")
        report.append("4. **分组分析**: 如果有分类变量，可进行分组统计分析")

    report.append("")
    report.append("---")
    report.append("*本报告由数据分析脚本自动生成*")

    # 写入文件
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))

    print(f"报告已生成：{output_file}")
    return report


def main():
    parser = argparse.ArgumentParser(description='描述性统计、缺失值分析、异常值检测和自相关分析工具')
    parser.add_argument('--input', '-i', required=True, help='输入数据文件路径（CSV 或 Excel）')
    parser.add_argument('--output', '-o', default='data_analysis_report.md',
                       help='输出 Markdown 报告文件路径（默认：data_analysis_report.md）')
    parser.add_argument('--method', '-m', default='iqr', choices=['iqr'],
                       help='异常值检测方法（默认：iqr）')

    args = parser.parse_args()

    try:
        print(f"读取数据文件：{args.input}")
        df = read_data(args.input)
        print(f"数据形状：{df.shape}")

        print("识别数据类型...")
        data_type_info = identify_data_type(df)
        print(f"数据类型：{data_type_info['data_type']}（置信度：{data_type_info['confidence']}）")

        # 如果是时间序列或面板数据，按时间列排序数据
        if data_type_info['data_type'] in ['time_series', 'panel'] and data_type_info['time_columns']:
            time_col = data_type_info['time_columns'][0]['column']
            print(f"按时间列 '{time_col}' 对数据进行升序排序...")
            df = df.sort_values(time_col).reset_index(drop=True)

        print("计算描述性统计量...")
        stats = calculate_descriptive_stats(df)

        print("分析缺失值情况...")
        missing_analysis = analyze_missing_values(df)

        print("检测异常值（IQR 方法）...")
        outliers = detect_outliers(df, method=args.method)

        print("分析自相关性...")
        autocorr_analysis = analyze_autocorrelation(df, data_type_info)

        print("检验平稳性...")
        stationarity_analysis = test_stationarity(df, data_type_info)

        print(f"生成报告：{args.output}")
        generate_markdown_report(df, stats, missing_analysis, outliers, data_type_info, autocorr_analysis, stationarity_analysis, args.input, args.output)

        print("分析完成！")

    except Exception as e:
        print(f"错误：{e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()