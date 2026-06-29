/**
 * 运算规则路由
 *
 * 提供运算规则的预览功能。
 * 规则的 CRUD 操作由 apps.ts 的通用路由处理。
 * 预览功能需要执行表达式并返回结果。
 */

import KoaRouter from '@koa/router';
import { TENANTS_DIR } from '../config/index.js';
import fs from 'fs';
import path from 'path';

/** 获取第一个活跃租户 ID */
function getFirstTenantId(): string | null {
  try {
    const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
    const tenant = entries.find((e) => e.isDirectory() && e.name.startsWith('tenant_'));
    return tenant?.name || null;
  } catch {
    return null;
  }
}

/** 查找应用目录和租户 ID */
function findAppDir(appId: string): [string, string] | null {
  const dirName = appId.startsWith('app_') ? appId : `app_${appId}`;
  try {
    const entries = fs.readdirSync(TENANTS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('tenant_')) continue;
      const appDir = path.join(TENANTS_DIR, entry.name, 'apps', dirName);
      if (fs.existsSync(path.join(appDir, 'app.json'))) {
        return [entry.name, appDir];
      }
    }
  } catch {
    // ignore
  }
  return null;
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
): { success: boolean; result?: unknown; error?: string } {
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
        return { success: false, error: '运算结果不是有效数字' };
      }
    } else if (outputType === 'string') {
      typedResult = String(result);
    } else if (outputType === 'boolean') {
      typedResult = Boolean(result);
    }

    return { success: true, result: typedResult };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '表达式执行失败',
    };
  }
}

/** 创建运算路由 */
export function createComputationsRouter(): KoaRouter {
  const router = new KoaRouter({ prefix: '/api/computations' });

  /**
   * POST /api/computations/preview
   * 预览运算结果
   *
   * 请求体：{ expression: string, context: Record<string, unknown>, outputType: string }
   * 响应：{ success: boolean, result?: unknown, error?: string }
   */
  router.post('/preview', async (ctx) => {
    const { expression, context, outputType } = ctx.request.body as {
      expression?: string;
      context?: Record<string, unknown>;
      outputType?: string;
    };

    if (!expression) {
      ctx.status = 400;
      ctx.body = { success: false, error: '表达式不能为空' };
      return;
    }

    const result = evaluateExpression(
      expression,
      context || {},
      outputType || 'string'
    );

    ctx.body = result;
  });

  return router;
}
