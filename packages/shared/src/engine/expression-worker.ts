/**
 * 表达式沙箱 Worker（workerpool 兼容）
 *
 * 在独立线程/进程中执行用户表达式。
 * 主线程通过 pool.terminate({ force: true }) 硬杀超时任务。
 *
 * workerpool 约定：此文件导出的函数会自动注册为 worker 方法。
 * - Node.js：worker_threads + tsx 直接加载 .ts
 * - 浏览器：主线程传入自包含函数，workerpool 序列化为 blob URL
 */

import workerpool from 'workerpool';

/** 禁止访问的全局对象 */
const FORBIDDEN_GLOBALS = [
  'globalThis',
  'global',
  'window',
  'self',
  'top',
  'parent',
  'frames',
  'document',
  'location',
  'navigator',
  'history',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Worker',
  'importScripts',
  'require',
  'module',
  'exports',
  'process',
  '__dirname',
  '__filename',
];

const FORBIDDEN_REGEXES = FORBIDDEN_GLOBALS.map(
  global => ({ name: global, regex: new RegExp(`\\b${global}\\b`, 'g') })
);

/** 语句模式正则 */
const STATEMENT_PATTERNS = [
  /^(const|let|var)\s+/,
  /^if\s*\(/,
  /^for\s*\(/,
  /^while\s*\(/,
  /^switch\s*\(/,
  /^try\s*\{/,
  /^throw\s+/,
  /^return\s+/,
];

function sanitizeExpression(expression: string): string {
  let sanitized = expression.trim();
  if (sanitized.startsWith('async ')) sanitized = sanitized.replace(/^async\s+/, '');
  const arrowMatch = sanitized.match(/^(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*/);
  if (arrowMatch) sanitized = sanitized.substring(arrowMatch[0].length);
  if (sanitized.startsWith('{') && sanitized.endsWith('}')) sanitized = sanitized.slice(1, -1).trim();
  if (sanitized.startsWith('return ')) sanitized = sanitized.substring(7).trim();
  if (sanitized.endsWith(';')) sanitized = sanitized.slice(0, -1).trim();
  return sanitized;
}

function isStatement(code: string): boolean {
  return STATEMENT_PATTERNS.some(pattern => pattern.test(code.trim()));
}

function findForbiddenReferences(expression: string): string[] {
  return FORBIDDEN_REGEXES
    .filter(({ regex }) => regex.test(expression))
    .map(({ name }) => name);
}

/**
 * 执行表达式
 *
 * @param expression 表达式内容
 * @param contextKeys 上下文变量名列表
 * @param contextValues 上下文变量值列表
 * @returns 求值结果
 */
function evaluate(expression: string, contextKeys: string[], contextValues: unknown[]): unknown {
  // 1. 禁止全局引用检查
  const forbiddenRefs = findForbiddenReferences(expression);
  if (forbiddenRefs.length > 0) {
    throw new Error(`禁止访问以下全局对象: ${forbiddenRefs.join(', ')}`);
  }

  // 2. 清理并包装
  const sanitized = sanitizeExpression(expression);
  const wrapped = isStatement(sanitized)
    ? `(function() { ${sanitized} })()`
    : sanitized;

  // 3. 编译并执行
  const fn = new Function(...contextKeys, `"use strict"; return (${wrapped})`);
  return fn(...contextValues);
}

// workerpool 注册：将 evaluate 方法暴露给主线程
workerpool.worker({ evaluate });
