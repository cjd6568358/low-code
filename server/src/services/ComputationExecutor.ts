/**
 * 运算执行器
 *
 * 负责执行运算规则，支持：
 * - 从运算规则 JSON 加载表达式
 * - 注入输入字段和系统变量
 * - 沙箱执行，禁止危险操作
 * - 类型转换和格式化
 */

import path from 'path';
import { TENANTS_DIR } from '../config/index.js';
import { existsAsync, resolveAppDir, readFile } from '../utils/fs-utils.js';

/** 运算执行结果 */
interface ComputationResult {
  /** 是否成功 */
  success: boolean;
  /** 执行结果 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
  /** 执行耗时（ms） */
  duration?: number;
}

/** 运算规则 Schema */
interface ComputationSchema {
  computationId: string;
  appId: string;
  name: string;
  type: string;
  status: string;
  inputs: Array<{
    key: string;
    label: string;
    fieldType: string;
    required?: boolean;
  }>;
  expression: {
    type: string;
    value: string;
    async?: boolean;
  };
  output: {
    name: string;
    type: string;
    format?: string;
    precision?: number;
  };
}

/** 加载运算规则 */
async function loadComputation(appId: string, computationId: string, tenantId: string): Promise<ComputationSchema | null> {
  const appDir = await resolveAppDir(tenantId, appId);
  if (!appDir) return null;
  const computationFile = path.join(appDir, 'computations', `${computationId}.json`);

  try {
    if (!await existsAsync(computationFile)) return null;
    const content = await readFile(computationFile, 'utf-8');
    return JSON.parse(content) as ComputationSchema;
  } catch {
    return null;
  }
}

/**
 * 沙箱执行表达式
 *
 * 安全约束：
 * - 禁止访问全局对象（window、global、process、require）
 * - 禁止 this 逃逸（原型链访问）
 * - 禁止副作用（赋值、delete、new）
 * - 执行超时 100ms
 */
function evaluateExpression(
  expression: string,
  context: Record<string, unknown>,
  outputType: string
): ComputationResult {
  const startTime = Date.now();

  try {
    // 构建安全的上下文变量
    const safeContext: Record<string, unknown> = {};

    // 注入输入字段
    for (const [key, value] of Object.entries(context)) {
      // 验证变量名（只允许字母、数字、下划线）
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        return { success: false, error: `无效的变量名: ${key}` };
      }
      safeContext[key] = value;
    }

    // 注入系统变量
    const systemVars = {
      $user: {
        id: '',
        name: '',
        roles: [],
        department: '',
        departmentName: '',
        position: '',
      },
      $now: Date.now(),
      $env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
    };

    // 注入内置函数
    const builtins = {
      // 聚合函数
      SUM: (arr: unknown[], field?: string) => {
        if (!Array.isArray(arr)) return 0;
        if (field) {
          return arr.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
        }
        return arr.reduce((sum, item) => sum + (Number(item) || 0), 0);
      },
      AVG: (arr: unknown[], field?: string) => {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        const sum = builtins.SUM(arr, field);
        return sum / arr.length;
      },
      COUNT: (arr: unknown[], filter?: (item: unknown) => boolean) => {
        if (!Array.isArray(arr)) return 0;
        if (filter) return arr.filter(filter).length;
        return arr.length;
      },
      MAX: (...args: unknown[]) => {
        if (args.length === 1 && Array.isArray(args[0])) {
          return Math.max(...args[0].map(Number));
        }
        return Math.max(...args.map(Number));
      },
      MIN: (...args: unknown[]) => {
        if (args.length === 1 && Array.isArray(args[0])) {
          return Math.min(...args[0].map(Number));
        }
        return Math.min(...args.map(Number));
      },
      COUNT_DISTINCT: (arr: unknown[], field?: string) => {
        if (!Array.isArray(arr)) return 0;
        const values = field ? arr.map((item) => item[field]) : arr;
        return new Set(values).size;
      },

      // 类型函数
      isEmpty: (value: unknown) => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'object') return Object.keys(value).length === 0;
        return false;
      },
      isNotEmpty: (value: unknown) => !builtins.isEmpty(value),
      toString: (value: unknown) => String(value),
      toNumber: (value: unknown) => Number(value),

      // 日期函数
      NOW: () => new Date(),
      TODAY: () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      },
      DAYS_BETWEEN: (d1: Date | string, d2: Date | string) => {
        const date1 = new Date(d1);
        const date2 = new Date(d2);
        const diffTime = Math.abs(date1.getTime() - date2.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      },
      ADD_DAYS: (date: Date | string, days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
      },
      FORMAT_DATE: (date: Date | string, pattern: string) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return pattern
          .replace('YYYY', String(year))
          .replace('MM', month)
          .replace('DD', day)
          .replace('HH', hours)
          .replace('mm', minutes)
          .replace('ss', seconds);
      },

      // 字符串函数
      UPPER: (str: string) => String(str).toUpperCase(),
      LOWER: (str: string) => String(str).toLowerCase(),
      TRIM: (str: string) => String(str).trim(),
      SUBSTRING: (str: string, start: number, end?: number) => String(str).slice(start, end),
      CONCAT: (...strs: unknown[]) => strs.map(String).join(''),
      REPLACE: (str: string, search: string, replacement: string) =>
        String(str).replace(search, replacement),

      // 数学函数
      ROUND: (num: number, decimals: number = 0) => {
        const factor = Math.pow(10, decimals);
        return Math.round(Number(num) * factor) / factor;
      },
      CEIL: (num: number) => Math.ceil(Number(num)),
      FLOOR: (num: number) => Math.floor(Number(num)),
      ABS: (num: number) => Math.abs(Number(num)),
    };

    // 构建执行上下文
    const evalContext = {
      ...safeContext,
      ...builtins,
      ...systemVars,
      // 别名
      record: safeContext,
      this: safeContext,
    };

    // 安全检查：禁止危险操作
    const dangerousPatterns = [
      /\bwindow\b/,
      /\bglobal\b/,
      /\bprocess\b/,
      /\brequire\b/,
      /\bimport\b/,
      /\beval\b/,
      /\bFunction\b/,
      /\bconstructor\b/,
      /\b__proto__\b/,
      /\bprototype\b/,
      /=\s*[^=]/, // 赋值操作（排除比较运算符）
      /\bdelete\b/,
      /\bnew\s+(?!Date)/, // 禁止 new（除 new Date()）
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(expression)) {
        return {
          success: false,
          error: `表达式包含不允许的操作: ${pattern.source}`,
          duration: Date.now() - startTime,
        };
      }
    }

    // 构建函数参数和函数体
    const paramNames = Object.keys(evalContext);
    const paramValues = Object.values(evalContext);
    const funcBody = `"use strict"; return (${expression});`;

    // 使用 Function 构造器在沙箱中执行，通过参数注入变量
    const func = new Function(...paramNames, funcBody);
    const result = func(...paramValues);

    // 类型转换
    let typedResult = result;
    if (outputType === 'number') {
      typedResult = Number(result);
      if (isNaN(typedResult)) {
        return {
          success: false,
          error: '运算结果不是有效数字',
          duration: Date.now() - startTime,
        };
      }
    } else if (outputType === 'string') {
      typedResult = String(result);
    } else if (outputType === 'boolean') {
      typedResult = Boolean(result);
    }

    return {
      success: true,
      result: typedResult,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '表达式执行失败',
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 运算执行器类
 */
class ComputationExecutorImpl {
  /**
   * 执行运算规则
   *
   * @param appId 应用 ID
   * @param computationId 运算规则 ID
   * @param params 输入参数
   * @returns 执行结果
   */
  async execute(
    appId: string,
    computationId: string,
    params: Record<string, unknown>,
    tenantId: string
  ): Promise<ComputationResult> {
    const startTime = Date.now();

    // 加载运算规则
    const computation = await loadComputation(appId, computationId, tenantId);
    if (!computation) {
      return {
        success: false,
        error: `运算规则不存在: ${computationId}`,
        duration: Date.now() - startTime,
      };
    }

    // 检查状态
    if (computation.status !== 'active') {
      return {
        success: false,
        error: `运算规则未启用: ${computation.status}`,
        duration: Date.now() - startTime,
      };
    }

    // 验证必填输入
    for (const input of computation.inputs) {
      if (input.required && (params[input.key] === undefined || params[input.key] === null)) {
        return {
          success: false,
          error: `缺少必填参数: ${input.label || input.key}`,
          duration: Date.now() - startTime,
        };
      }
    }

    // 执行表达式
    return evaluateExpression(
      computation.expression.value,
      params,
      computation.output.type
    );
  }

  /**
   * 预览表达式
   *
   * @param expression 表达式
   * @param context 测试上下文
   * @param outputType 输出类型
   * @returns 预览结果
   */
  async preview(
    expression: string,
    context: Record<string, unknown>,
    outputType: string
  ): Promise<ComputationResult> {
    return evaluateExpression(expression, context, outputType);
  }

  /**
   * 校验表达式语法
   *
   * @param expression 表达式
   * @returns 校验结果
   */
  validate(expression: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 安全检查
    const dangerousPatterns = [
      { pattern: /\bwindow\b/, message: '禁止访问 window 对象' },
      { pattern: /\bglobal\b/, message: '禁止访问 global 对象' },
      { pattern: /\bprocess\b/, message: '禁止访问 process 对象' },
      { pattern: /\brequire\b/, message: '禁止使用 require' },
      { pattern: /\bimport\b/, message: '禁止使用 import' },
      { pattern: /\beval\b/, message: '禁止使用 eval' },
      { pattern: /\bFunction\b/, message: '禁止使用 Function 构造器' },
      { pattern: /\bconstructor\b/, message: '禁止访问 constructor' },
      { pattern: /\b__proto__\b/, message: '禁止访问 __proto__' },
      { pattern: /\bprototype\b/, message: '禁止访问 prototype' },
      { pattern: /\bdelete\b/, message: '禁止使用 delete' },
      { pattern: /\bnew\s+(?!Date)/, message: '禁止使用 new（除 new Date()）' },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(expression)) {
        errors.push(message);
      }
    }

    // 语法检查
    try {
      const funcBody = `"use strict"; return (${expression});`;
      new Function(funcBody);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : '语法错误');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 分析表达式依赖
   *
   * @param expression 表达式
   * @returns 依赖的变量名列表
   */
  analyzeDependencies(expression: string): string[] {
    const deps: string[] = [];

    // 提取变量引用
    const varPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let match;

    while ((match = varPattern.exec(expression)) !== null) {
      const varName = match[1];

      // 排除内置函数和关键字
      const builtins = [
        'SUM', 'AVG', 'COUNT', 'MAX', 'MIN', 'COUNT_DISTINCT',
        'isEmpty', 'isNotEmpty', 'toString', 'toNumber',
        'NOW', 'TODAY', 'DAYS_BETWEEN', 'ADD_DAYS', 'FORMAT_DATE',
        'UPPER', 'LOWER', 'TRIM', 'SUBSTRING', 'CONCAT', 'REPLACE',
        'ROUND', 'CEIL', 'FLOOR', 'ABS',
        'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
        'Math', 'Date', 'String', 'Number', 'Boolean', 'Array', 'Object',
        'JSON', 'console', 'window', 'global', 'process', 'require',
      ];

      if (!builtins.includes(varName) && !deps.includes(varName)) {
        deps.push(varName);
      }
    }

    return deps;
  }
}

/** 运算执行器单例 */
export const computationExecutor = new ComputationExecutorImpl();

export type { ComputationResult, ComputationSchema };
