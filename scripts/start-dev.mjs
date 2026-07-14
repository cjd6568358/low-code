#!/usr/bin/env node

/**
 * 开发环境启动脚本
 * 自动检测并杀掉占用端口的进程，然后启动服务
 */

import { execSync, spawn } from 'child_process';
import { platform } from 'process';

const PORTS = [3001, 5173];
const PORT_NAMES = ['Server (API)', 'Frontend (Vite)'];

/**
 * 获取占用指定端口的进程 PID 列表
 * @param {number} port
 * @returns {number[]}
 */
function getPortPids(port) {
  try {
    let output = '';
    if (platform === 'win32') {
      // Windows: 使用 netstat + findstr
      output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    } else {
      // Unix/macOS: 使用 lsof
      output = execSync(`lsof -ti :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    }

    if (!output.trim()) return [];

    if (platform === 'win32') {
      // 解析 netstat 输出，提取 PID（最后一列）
      const pids = new Set();
      const lines = output.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const localAddr = parts[1] || '';
          const state = parts[3] || '';
          const pid = parts[parts.length - 1];
          // 只匹配 LISTENING 状态的 TCP 连接
          if (localAddr.includes(`:${port}`) && state === 'LISTENING' && pid && pid !== '0') {
            pids.add(parseInt(pid, 10));
          }
        }
      }
      return [...pids].filter(p => !isNaN(p));
    } else {
      // lsof 直接返回 PID
      return output.split('\n').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p));
    }
  } catch {
    return [];
  }
}

/**
 * 杀掉指定 PID 的进程
 * @param {number} pid
 */
function killProcess(pid) {
  try {
    if (platform === 'win32') {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 清理端口占用
 * @param {number} port
 * @param {string} name
 */
function cleanupPort(port, name) {
  const pids = getPortPids(port);
  if (pids.length === 0) return;

  console.log(`\x1b[33m⚠ ${name} 端口 ${port} 被占用，正在清理...\x1b[0m`);
  for (const pid of pids) {
    if (killProcess(pid)) {
      console.log(`  \x1b[32m✓ 已终止进程 PID: ${pid}\x1b[0m`);
    } else {
      console.log(`  \x1b[31m✗ 无法终止进程 PID: ${pid}\x1b[0m`);
    }
  }
}

// 清理所有端口
console.log('\x1b[36m🔍 检查端口占用情况...\x1b[0m');
PORTS.forEach((port, i) => cleanupPort(port, PORT_NAMES[i]));

// 启动服务
console.log('\x1b[36m\n🚀 正在启动开发服务...\x1b[0m\n');

const child = spawn('npx', ['concurrently', '--names', 'server,frontend', '--prefix-colors', 'blue,green', 'yarn server', 'yarn dev'], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
