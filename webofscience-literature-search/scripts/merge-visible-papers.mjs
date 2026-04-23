#!/usr/bin/env node
/**
 * merge-visible-papers.mjs - 累积分段提取的论文并去重
 *
 * 用法：node scripts/merge-visible-papers.mjs <accumulatedFile> <newPapersJSON>
 *   accumulatedFile: 已累积的JSON文件路径（首次不存在则创建）
 *   newPapersJSON: 本次提取的papers数组JSON字符串
 *
 * 输出：去重合并后的JSON数组写到stdout
 * 去重键：title前60字符
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [accumulatedFile, newPapersJSON] = process.argv.slice(2);

if (!accumulatedFile || !newPapersJSON) {
  console.error('Usage: merge-visible-papers.mjs <accumulatedFile> <newPapersJSON>');
  process.exit(1);
}

// 读取已累积的记录
let existing = [];
if (existsSync(accumulatedFile)) {
  try {
    existing = JSON.parse(readFileSync(accumulatedFile, 'utf8'));
    if (!Array.isArray(existing)) existing = [];
  } catch { existing = []; }
}

// 解析新增记录
let newPapers = [];
try {
  newPapers = JSON.parse(newPapersJSON);
  if (!Array.isArray(newPapers)) newPapers = [];
} catch { newPapers = []; }

// 去重合并
const seen = new Set(existing.map(p => (p.title || '').substring(0, 60)));
let addedCount = 0;

for (const paper of newPapers) {
  const key = (paper.title || '').substring(0, 60);
  if (key && !seen.has(key)) {
    seen.add(key);
    existing.push(paper);
    addedCount++;
  }
}

// 保存
writeFileSync(accumulatedFile, JSON.stringify(existing), 'utf8');

// 输出统计
console.log(JSON.stringify({ total: existing.length, added: addedCount, skipped: newPapers.length - addedCount }));
