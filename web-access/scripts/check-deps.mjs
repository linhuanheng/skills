#!/usr/bin/env node
// 环境检查 + 确保 CDP Proxy 就绪（跨平台，替代 check-deps.sh）
// 支持端口冲突自动检测并切换到闲置端口

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROXY_SCRIPT = path.join(ROOT, 'scripts', 'cdp-proxy.mjs');
const DEFAULT_PROXY_PORT = 3457;

// --- 端口可用性检查 ---

/**
 * 检查端口是否可占用（未被使用）
 * @param {number} port - 端口号
 * @param {string} host - 主机地址
 * @returns {Promise<boolean>} - 端口是否可用
 */
function checkPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false); // 端口已被占用
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

/**
 * 检查端口是否有服务响应（健康检查）
 * @param {number} port - 端口号
 * @param {number} timeoutMs - 超时时间
 * @returns {Promise<boolean>} - 端口是否有服务响应
 */
function checkPortResponding(port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, '127.0.0.1');
    const timer = setTimeout(() => { socket.destroy(); resolve(false); }, timeoutMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => { clearTimeout(timer); resolve(false); });
  });
}

/**
 * 查找可用的闲置端口
 * @param {number} startPort - 起始端口
 * @param {number} maxAttempts - 最大尝试次数
 * @returns {Promise<number>} - 可用端口号
 */
async function findAvailablePort(startPort, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const isAvailable = await checkPortAvailable(port);
    if (isAvailable) {
      return port;
    }
  }
  // 如果连续 10 个端口都被占用，尝试更大的范围
  for (let port = 8000; port <= 8100; port++) {
    const isAvailable = await checkPortAvailable(port);
    if (isAvailable) {
      return port;
    }
  }
  // 极端情况：真的找不到可用端口
  throw new Error('无法找到可用的闲置端口，请手动检查端口占用情况');
}

/**
 * 检测端口冲突并获取可用端口
 * @param {number} preferredPort - 首选端口
 * @returns {Promise<{port: number, conflict: boolean, originalPort: number}>}
 */
async function detectPortConflict(preferredPort) {
  const isAvailable = await checkPortAvailable(preferredPort);

  if (isAvailable) {
    return { port: preferredPort, conflict: false, originalPort: preferredPort };
  }

  // 端口被占用，查找可用端口
  const availablePort = await findAvailablePort(preferredPort + 1);
  return {
    port: availablePort,
    conflict: true,
    originalPort: preferredPort
  };
}

// --- Node.js 版本检查 ---

function checkNode() {
  const major = Number(process.versions.node.split('.')[0]);
  const version = `v${process.versions.node}`;
  if (major >= 22) {
    console.log(`node: ok (${version})`);
  } else {
    console.log(`node: warn (${version}, 建议升级到 22+)`);
  }
}

// --- Chrome 调试端口检测（DevToolsActivePort 多路径 + 常见端口回退） ---

function activePortFiles() {
  const home = os.homedir();
  const localAppData = process.env.LOCALAPPDATA || '';
  switch (os.platform()) {
    case 'darwin':
      return [
        path.join(home, 'Library/Application Support/Google/Chrome/DevToolsActivePort'),
        path.join(home, 'Library/Application Support/Google/Chrome Canary/DevToolsActivePort'),
        path.join(home, 'Library/Application Support/Chromium/DevToolsActivePort'),
      ];
    case 'linux':
      return [
        path.join(home, '.config/google-chrome/DevToolsActivePort'),
        path.join(home, '.config/chromium/DevToolsActivePort'),
      ];
    case 'win32':
      return [
        path.join(localAppData, 'Google/Chrome/User Data/DevToolsActivePort'),
        path.join(localAppData, 'Chromium/User Data/DevToolsActivePort'),
      ];
    default:
      return [];
  }
}

async function detectChromePort() {
  // 优先从 DevToolsActivePort 文件读取
  for (const filePath of activePortFiles()) {
    try {
      const lines = fs.readFileSync(filePath, 'utf8').trim().split(/\r?\n/).filter(Boolean);
      const port = parseInt(lines[0], 10);
      if (port > 0 && port < 65536 && await checkPortResponding(port)) {
        return port;
      }
    } catch (_) {}
  }
  // 回退：探测常见端口
  for (const port of [9222, 9229, 9333]) {
    if (await checkPortResponding(port)) {
      return port;
    }
  }
  return null;
}

// --- CDP Proxy 启动与等待 ---

function httpGetJson(url, timeoutMs = 3000) {
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    .then(async (res) => {
      try { return JSON.parse(await res.text()); } catch { return null; }
    })
    .catch(() => null);
}

/**
 * 启动 CDP Proxy（分离模式）
 * @param {string} portStr - 端口号（可选，为空则使用默认端口）
 */
function startProxyDetached(portStr = '') {
  const logFile = path.join(os.tmpdir(), 'cdp-proxy.log');
  const logFd = fs.openSync(logFile, 'a');
  const env = { ...process.env };
  if (portStr) {
    env.CDP_PROXY_PORT = portStr;
  }
  const child = spawn(process.execPath, [PROXY_SCRIPT], {
    detached: true,
    stdio: ['ignore', logFd, logFd],
    env,
    ...(os.platform() === 'win32' ? { windowsHide: true } : {}),
  });
  child.unref();
  fs.closeSync(logFd);
}

/**
 * 确保 CDP Proxy 运行（支持端口冲突自动切换）
 * @param {number} preferredPort - 首选端口
 * @returns {Promise<{ok: boolean, port: number}>}
 */
async function ensureProxy(preferredPort = DEFAULT_PROXY_PORT) {
  // 检测端口冲突并获取可用端口
  const portInfo = await detectPortConflict(preferredPort);
  const actualPort = portInfo.port;

  // 如果检测到端口冲突，提示用户
  if (portInfo.conflict && actualPort !== preferredPort) {
    console.log(`⚠️  端口 ${preferredPort} 已被占用，自动切换到端口 ${actualPort}`);
  }

  const targetsUrl = `http://127.0.0.1:${actualPort}/targets`;

  // /targets 返回 JSON 数组即 ready
  const targets = await httpGetJson(targetsUrl);
  if (Array.isArray(targets)) {
    console.log(`proxy: ready (port ${actualPort})`);
    return { ok: true, port: actualPort };
  }

  // 未运行或未连接，启动并等待
  console.log('proxy: connecting...');
  // 设置环境变量传递端口号
  startProxyDetached(String(actualPort));

  // 等 proxy 进程就绪
  await new Promise((r) => setTimeout(r, 2000));

  for (let i = 1; i <= 15; i++) {
    const result = await httpGetJson(targetsUrl, 8000);
    if (Array.isArray(result)) {
      console.log(`proxy: ready (port ${actualPort})`);
      return { ok: true, port: actualPort };
    }
    if (i === 1) {
      console.log('⚠️  Chrome 可能有授权弹窗，请点击「允许」后等待连接...');
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('❌ 连接超时，请检查 Chrome 调试设置');
  console.log(`  日志：${path.join(os.tmpdir(), 'cdp-proxy.log')}`);
  return { ok: false, port: actualPort };
}

// --- main ---

async function main() {
  checkNode();

  const chromePort = await detectChromePort();
  if (!chromePort) {
    console.log('chrome: not connected — 请确保 Chrome 已打开，然后访问 chrome://inspect/#remote-debugging 并勾选 Allow remote debugging');
    process.exit(1);
  }
  console.log(`chrome: ok (port ${chromePort})`);

  const proxyResult = await ensureProxy(DEFAULT_PROXY_PORT);
  if (!proxyResult.ok) {
    process.exit(1);
  }

  // 输出实际使用的端口（可能因冲突而切换）
  if (proxyResult.port !== DEFAULT_PROXY_PORT) {
    console.log(`\n⚠️  CDP Proxy 运行在非标准端口 ${proxyResult.port}`);
    console.log('  请在环境变量中设置 CDP_PROXY_PORT 或更新相关配置');
  }

  // 列出已有站点经验
  const patternsDir = path.join(ROOT, 'references', 'site-patterns');
  try {
    const sites = fs.readdirSync(patternsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''));
    if (sites.length) {
      console.log(`\nsite-patterns: ${sites.join(', ')}`);
    }
  } catch {}

  // 输出端口信息供其他脚本使用
  console.log(`\nCDP_PROXY_PORT=${proxyResult.port}`);
}

await main();
