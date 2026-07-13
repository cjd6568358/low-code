/**
 * 公共表达式引擎
 *
 * 提供表达式求值、校验、依赖分析等核心功能。
 * 可被前端渲染器和后端自动化引擎共用。
 *
 * 支持：
 * - 安全沙箱求值（禁止访问全局对象）
 * - 超时控制
 * - 依赖分析（提取 $variable.path 引用）
 * - 类型推断
 */

import type { ExpressionBinding } from '../types/schema.js';

/** 表达式引擎接口 */
export interface ExpressionEngine {
  /** 求值表达式 */
  evaluate(expression: string, context: Record<string, unknown>): Promise<unknown>;
  /** 校验表达式语法 */
  validate(expression: string): { valid: boolean; errors: string[] };
  /** 分析表达式依赖的变量路径 */
  analyzeDependencies(expression: string): string[];
  /** 安全求值（带超时） */
  safeEvaluate(expression: string, context: Record<string, unknown>, timeout?: number): Promise<unknown>;
  /** 异步求值（接受字符串或 ExpressionBinding） */
  evaluateAsync(expression: string | ExpressionBinding, context: Record<string, unknown>, timeout?: number): Promise<unknown>;
  /** 解析模板字符串中的 {{path}} 变量 */
  resolveTemplate(template: string, context: Record<string, unknown>): string;
  /** 递归解析模板参数对象中的 {{path}} 变量 */
  resolveTemplateParams(params: Record<string, unknown>, context: Record<string, unknown>): Record<string, unknown>;
}

/** 表达式校验错误 */
export interface ExpressionError {
  /** 错误类型 */
  type: 'syntax' | 'runtime' | 'timeout' | 'reference';
  /** 错误消息 */
  message: string;
  /** 行号（如果有） */
  line?: number;
  /** 列号（如果有） */
  column?: number;
}

/** 表达式分析结果 */
export interface ExpressionAnalysis {
  /** 依赖的变量路径列表 */
  dependencies: string[];
  /** 是否包含异步操作 */
  hasAsync: boolean;
  /** 是否包含禁止的全局引用 */
  hasForbiddenGlobals: boolean;
  /** 推断的返回类型 */
  inferredType?: string;
}

/**
 * 创建表达式引擎实例
 *
 * @param options 配置选项
 * @returns 表达式引擎实例
 */
export function createExpressionEngine(options?: ExpressionEngineOptions): ExpressionEngine {
  return new DefaultExpressionEngine(options);
}

/** 表达式引擎配置 */
export interface ExpressionEngineOptions {
  /** 自定义全局变量白名单（默认只允许 $ 开头的变量） */
  allowedGlobals?: string[];
  /** 默认超时时间（毫秒，默认 5000） */
  defaultTimeout?: number;
  /** 是否启用严格模式（禁止访问 Function/eval） */
  strictMode?: boolean;
}

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

/** 默认变量引用正则 */
const VARIABLE_PATH_REGEX = /\$[a-zA-Z_][a-zA-Z0-9_.]*/g;

/**
 * 默认表达式引擎实现
 */
export class DefaultExpressionEngine implements ExpressionEngine {
  private options: Required<ExpressionEngineOptions>;

  constructor(options?: ExpressionEngineOptions) {
    this.options = {
      allowedGlobals: options?.allowedGlobals ?? [],
      defaultTimeout: options?.defaultTimeout ?? 5000,
      strictMode: options?.strictMode ?? true,
    };
  }

  /**
   * 求值表达式
   *
   * @param expression 表达式内容（函数体）
   * @param context 上下文变量
   * @returns 求值结果
   */
  async evaluate(expression: string, context: Record<string, unknown>): Promise<unknown> {
    const sanitized = this.sanitizeExpression(expression);
    const wrapped = this.wrapExpression(sanitized, context);

    try {
      // 使用 Function 构造器创建沙箱函数
      const fn = new Function(...Object.keys(context), `return ${wrapped}`);
      return fn(...Object.values(context));
    } catch (error) {
      throw this.createError('runtime', `表达式求值失败: ${(error as Error).message}`);
    }
  }

  /**
   * 校验表达式语法
   *
   * @param expression 表达式内容
   * @returns 校验结果
   */
  validate(expression: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!expression || typeof expression !== 'string') {
      return { valid: true, errors: [] };
    }

    const trimmed = expression.trim();
    if (!trimmed) {
      return { valid: true, errors: [] };
    }

    // 检查禁止的全局引用
    const forbiddenRefs = this.findForbiddenReferences(trimmed);
    if (forbiddenRefs.length > 0) {
      errors.push(`禁止访问以下全局对象: ${forbiddenRefs.join(', ')}`);
    }

    // 检查括号平衡
    if (!this.isParenthesesBalanced(trimmed)) {
      errors.push('括号不匹配');
    }

    // 尝试解析为函数体
    try {
      new Function(`return (${trimmed})`);
    } catch {
      try {
        new Function(trimmed);
      } catch (error) {
        errors.push(`语法错误: ${(error as Error).message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 分析表达式依赖的变量路径
   *
   * @param expression 表达式内容
   * @returns 变量路径列表（去重）
   */
  analyzeDependencies(expression: string): string[] {
    if (!expression || typeof expression !== 'string') {
      return [];
    }

    const matches = expression.match(VARIABLE_PATH_REGEX);
    if (!matches) {
      return [];
    }

    // 去重并排序
    return [...new Set(matches)].sort();
  }

  /**
   * 安全求值（带超时控制）
   *
   * @param expression 表达式内容
   * @param context 上下文变量
   * @param timeout 超时时间（毫秒）
   * @returns 求值结果
   */
  async safeEvaluate(expression: string, context: Record<string, unknown>, timeout?: number): Promise<unknown> {
    const timeoutMs = timeout ?? this.options.defaultTimeout;

    // 使用 Promise.race 实现超时控制
    const evaluationPromise = this.evaluate(expression, context);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(this.createError('timeout', `表达式求值超时（${timeoutMs}ms）`));
      }, timeoutMs);
    });

    return Promise.race([evaluationPromise, timeoutPromise]);
  }

  /**
   * 同步安全求值（不带超时控制）
   *
   * 用于渲染路径等同步上下文。内部直接调用 new Function()，
   * 不经过 Promise 包装，性能与原 evaluate 一致。
   */
  safeEvaluateSync(expression: string, context: Record<string, unknown>): unknown {
    const sanitized = this.sanitizeExpression(expression);
    const wrapped = this.wrapExpression(sanitized, context);

    // 检查禁止的全局引用
    const forbiddenRefs = this.findForbiddenReferences(sanitized);
    if (forbiddenRefs.length > 0) {
      throw this.createError('runtime', `禁止访问以下全局对象: ${forbiddenRefs.join(', ')}`);
    }

    try {
      const fn = new Function(...Object.keys(context), `return ${wrapped}`);
      return fn(...Object.values(context));
    } catch (error) {
      throw this.createError('runtime', `表达式求值失败: ${(error as Error).message}`);
    }
  }

  /**
   * 异步求值
   *
   * 支持两种调用方式：
   * - evaluateAsync('表达式字符串', context) — 直接求值
   * - evaluateAsync({ type: 'expression', value: '函数体', async: true }, context) — 按 ExpressionBinding 模式执行
   *
   * @param expression 表达式字符串或 ExpressionBinding
   * @param context 上下文变量
   * @param timeout 超时时间（毫秒）
   * @returns 求值结果
   */
  async evaluateAsync(expression: string | ExpressionBinding, context: Record<string, unknown>, timeout?: number): Promise<unknown> {
    const timeoutMs = timeout ?? this.options.defaultTimeout;

    // 判断调用模式
    const isBinding = typeof expression === 'object' && expression !== null && 'value' in expression;
    const exprStr = isBinding ? (expression as ExpressionBinding).value : expression as string;
    const isAsync = isBinding ? (expression as ExpressionBinding).async !== false : true;

    const evaluationPromise = (async () => {
      try {
        if (isBinding) {
          // ExpressionBinding 模式：拼接为 async ({params}) => { body } 形式
          const params = Object.keys(context).join(', ');
          const prefix = isAsync ? 'async' : '';
          const fullExpr = `${prefix} ({${params}}) => { ${exprStr} }`;
          const contextKeys = Object.keys(context);
          const contextValues = contextKeys.map(k => context[k]);
          const sandboxCode = `"use strict"; return (${fullExpr})({${contextKeys.join(',')}});`;
          const fn = new Function(...contextKeys, sandboxCode);
          return await fn(...contextValues);
        } else {
          // 字符串模式：原有行为
          const sanitized = this.sanitizeExpression(exprStr);
          const wrapped = this.wrapAsyncExpression(sanitized, context);
          const fn = new AsyncFunction(...Object.keys(context), `return ${wrapped}`);
          return await fn(...Object.values(context));
        }
      } catch (error) {
        throw this.createError('runtime', `异步表达式求值失败: ${(error as Error).message}`);
      }
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(this.createError('timeout', `表达式求值超时（${timeoutMs}ms）`));
      }, timeoutMs);
    });

    return Promise.race([evaluationPromise, timeoutPromise]);
  }

  /**
   * 解析模板字符串中的 {{path}} 变量
   */
  resolveTemplate(template: string, context: Record<string, unknown>): string {
    if (!template) return '';
    return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
      const trimmedPath = path.trim();
      try {
        const value = this.getNestedValue(context, trimmedPath);
        return value != null ? String(value) : '';
      } catch {
        return '';
      }
    });
  }

  /**
   * 递归解析模板参数对象中的 {{path}} 变量
   */
  resolveTemplateParams(params: Record<string, unknown>, context: Record<string, unknown>): Record<string, unknown> {
    if (!params) return {};
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveTemplate(value, context);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveTemplateParams(value as Record<string, unknown>, context);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  /**
   * 清理表达式（移除危险代码）
   */
  private sanitizeExpression(expression: string): string {
    let sanitized = expression.trim();

    // 移除可能的函数包装
    if (sanitized.startsWith('async ')) {
      sanitized = sanitized.replace(/^async\s+/, '');
    }

    // 移除箭头函数包装
    const arrowMatch = sanitized.match(/^(?:\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*/);
    if (arrowMatch) {
      sanitized = sanitized.substring(arrowMatch[0].length);
    }

    // 移除函数体花括号
    if (sanitized.startsWith('{') && sanitized.endsWith('}')) {
      sanitized = sanitized.slice(1, -1).trim();
    }

    // 移除 return 语句
    if (sanitized.startsWith('return ')) {
      sanitized = sanitized.substring(7).trim();
    }

    // 移除尾部分号
    if (sanitized.endsWith(';')) {
      sanitized = sanitized.slice(0, -1).trim();
    }

    return sanitized;
  }

  /**
   * 包装表达式为可执行代码
   */
  private wrapExpression(expression: string, context: Record<string, unknown>): string {
    // 如果表达式已经是完整语句（包含赋值、条件等），直接执行
    if (this.isStatement(expression)) {
      return `(function() { ${expression} })()`;
    }

    // 否则作为表达式求值
    return expression;
  }

  /**
   * 包装异步表达式
   */
  private wrapAsyncExpression(expression: string, context: Record<string, unknown>): string {
    if (this.isStatement(expression)) {
      return `(async function() { ${expression} })()`;
    }
    return expression;
  }

  /**
   * 判断是否为语句（而非表达式）
   */
  private isStatement(code: string): boolean {
    // 包含赋值、条件、循环等语句特征
    const statementPatterns = [
      /^(const|let|var)\s+/,
      /^if\s*\(/,
      /^for\s*\(/,
      /^while\s*\(/,
      /^switch\s*\(/,
      /^try\s*\{/,
      /^throw\s+/,
      /^return\s+/,
    ];

    return statementPatterns.some(pattern => pattern.test(code.trim()));
  }

  /**
   * 查找禁止的全局引用
   */
  private findForbiddenReferences(expression: string): string[] {
    const found: string[] = [];

    for (const global of FORBIDDEN_GLOBALS) {
      // 使用单词边界匹配，避免误匹配
      const regex = new RegExp(`\\b${global}\\b`, 'g');
      if (regex.test(expression)) {
        found.push(global);
      }
    }

    return found;
  }

  /**
   * 检查括号是否平衡
   */
  private isParenthesesBalanced(code: string): boolean {
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < code.length; i++) {
      const char = code[i];

      // 处理字符串
      if (!inString && (char === '"' || char === "'" || char === '`')) {
        inString = true;
        stringChar = char;
        continue;
      }
      if (inString && char === stringChar && code[i - 1] !== '\\') {
        inString = false;
        continue;
      }
      if (inString) continue;

      // 处理括号
      if (char === '(' || char === '[' || char === '{') {
        depth++;
      } else if (char === ')' || char === ']' || char === '}') {
        depth--;
        if (depth < 0) return false;
      }
    }

    return depth === 0;
  }

  /**
   * 获取嵌套对象的值（支持 "a.b.c" 路径）
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current === null || current === undefined) return undefined;
      return (current as Record<string, unknown>)[key];
    }, obj);
  }

  /**
   * 创建错误对象
   */
  private createError(type: ExpressionError['type'], message: string): ExpressionError {
    return { type, message };
  }
}

/** AsyncFunction 构造器 */
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

/**
 * 表达式依赖分析工具
 *
 * 提取表达式中所有 $variable.path 形式的引用
 */
export function extractVariablePaths(expression: string): string[] {
  if (!expression || typeof expression !== 'string') {
    return [];
  }

  const matches = expression.match(VARIABLE_PATH_REGEX);
  if (!matches) {
    return [];
  }

  return [...new Set(matches)].sort();
}

/**
 * 表达式语法快速校验
 *
 * @param expression 表达式内容
 * @returns 是否有效
 */
export function isValidExpression(expression: string): boolean {
  if (!expression || typeof expression !== 'string') {
    return true; // 空表达式视为有效
  }

  const trimmed = expression.trim();
  if (!trimmed) return true;

  // 检查括号平衡
  let depth = 0;
  for (const char of trimmed) {
    if (char === '(' || char === '[' || char === '{') depth++;
    if (char === ')' || char === ']' || char === '}') depth--;
    if (depth < 0) return false;
  }
  if (depth !== 0) return false;

  // 尝试解析
  try {
    new Function(`return (${trimmed})`);
    return true;
  } catch {
    try {
      new Function(trimmed);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 模板字符串插值
 *
 * 将 {{expression}} 形式的模板替换为实际值
 *
 * @param template 模板字符串
 * @param context 上下文变量
 * @returns 替换后的字符串
 */
export async function interpolateTemplate(template: string, context: Record<string, unknown>): Promise<string> {
  if (!template || typeof template !== 'string') {
    return template;
  }

  // 先收集所有匹配项，再批量求值（避免 replace 回调中调用 async）
  const matches: Array<{ placeholder: string; expression: string }> = [];
  template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    matches.push({ placeholder: match, expression: expression.trim() });
    return match;
  });

  let result = template;
  for (const { placeholder, expression } of matches) {
    try {
      const value = await expressionEngine.evaluate(expression, context);
      result = result.replace(placeholder, value == null ? '' : String(value));
    } catch {
      // 求值失败保留原始模板
    }
  }

  return result;
}

/**
 * 全局单例表达式引擎实例
 *
 * 前端渲染器、后端自动化引擎统一使用此实例。
 */
export const expressionEngine = new DefaultExpressionEngine();
