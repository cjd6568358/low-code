/**
 * 运算引擎测试
 *
 * 测试表达式求值、内置函数、安全沙箱等功能。
 */

import { describe, it, expect } from 'vitest';

// ─── 内联实现（避免从路由文件导出） ──────────────────────────

/** 沙箱执行表达式 */
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
      /\bdelete\b/,
      /\bnew\s+(?!Date)/, // 禁止 new（除 new Date()）
      /[^=!<>]\s*=[^=]/, // 赋值操作（排除 ==、===、!=、!==、<=、>=）
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

// ─── 测试用例 ──────────────────────────────────────────

describe('运算引擎', () => {
  describe('基础算术运算', () => {
    it('加法', () => {
      const result = evaluateExpression('1 + 2', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(3);
    });

    it('减法', () => {
      const result = evaluateExpression('10 - 3', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(7);
    });

    it('乘法', () => {
      const result = evaluateExpression('4 * 5', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(20);
    });

    it('除法', () => {
      const result = evaluateExpression('10 / 2', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('取模', () => {
      const result = evaluateExpression('10 % 3', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(1);
    });

    it('复合运算', () => {
      const result = evaluateExpression('(10 + 5) * 2 - 3', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(27);
    });
  });

  describe('变量引用', () => {
    it('单个变量', () => {
      const result = evaluateExpression('amount', { amount: 100 }, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(100);
    });

    it('变量参与运算', () => {
      const result = evaluateExpression('price * quantity', { price: 10, quantity: 5 }, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(50);
    });

    it('字符串变量', () => {
      const result = evaluateExpression('name', { name: '张三' }, 'string');
      expect(result.success).toBe(true);
      expect(result.result).toBe('张三');
    });

    it('布尔变量', () => {
      const result = evaluateExpression('isActive', { isActive: true }, 'boolean');
      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
    });
  });

  describe('数学函数', () => {
    it('ROUND - 四舍五入', () => {
      const result = evaluateExpression('ROUND(3.14159, 2)', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(3.14);
    });

    it('CEIL - 向上取整', () => {
      const result = evaluateExpression('CEIL(3.2)', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(4);
    });

    it('FLOOR - 向下取整', () => {
      const result = evaluateExpression('FLOOR(3.8)', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(3);
    });

    it('ABS - 绝对值', () => {
      const result = evaluateExpression('ABS(-5)', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('MAX - 最大值', () => {
      const result = evaluateExpression('MAX(1, 5, 3)', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('MIN - 最小值', () => {
      const result = evaluateExpression('MIN(1, 5, 3)', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(1);
    });
  });

  describe('字符串函数', () => {
    it('UPPER - 转大写', () => {
      const result = evaluateExpression('UPPER("hello")', {}, 'string');
      expect(result.success).toBe(true);
      expect(result.result).toBe('HELLO');
    });

    it('LOWER - 转小写', () => {
      const result = evaluateExpression('LOWER("HELLO")', {}, 'string');
      expect(result.success).toBe(true);
      expect(result.result).toBe('hello');
    });

    it('TRIM - 去除空格', () => {
      const result = evaluateExpression('TRIM("  hello  ")', {}, 'string');
      expect(result.success).toBe(true);
      expect(result.result).toBe('hello');
    });

    it('CONCAT - 拼接字符串', () => {
      const result = evaluateExpression('CONCAT("Hello", " ", "World")', {}, 'string');
      expect(result.success).toBe(true);
      expect(result.result).toBe('Hello World');
    });

    it('REPLACE - 替换字符串', () => {
      const result = evaluateExpression('REPLACE("hello world", "world", "ts")', {}, 'string');
      expect(result.success).toBe(true);
      expect(result.result).toBe('hello ts');
    });

    it('SUBSTRING - 截取字符串', () => {
      const result = evaluateExpression('SUBSTRING("hello", 1, 3)', {}, 'string');
      expect(result.success).toBe(true);
      expect(result.result).toBe('el');
    });
  });

  describe('类型函数', () => {
    it('isEmpty - 空字符串', () => {
      const result = evaluateExpression('isEmpty("")', {}, 'boolean');
      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
    });

    it('isEmpty - null', () => {
      const result = evaluateExpression('isEmpty(null)', {}, 'boolean');
      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
    });

    it('isEmpty - 空数组', () => {
      const result = evaluateExpression('isEmpty([])', {}, 'boolean');
      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
    });

    it('isNotEmpty - 非空值', () => {
      const result = evaluateExpression('isNotEmpty("hello")', {}, 'boolean');
      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
    });

    it('toString - 数字转字符串', () => {
      const result = evaluateExpression('toString(123)', {}, 'string');
      expect(result.success).toBe(true);
      expect(result.result).toBe('123');
    });

    it('toNumber - 字符串转数字', () => {
      const result = evaluateExpression('toNumber("123")', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(123);
    });
  });

  describe('聚合函数', () => {
    it('SUM - 求和', () => {
      const result = evaluateExpression('SUM([1, 2, 3, 4, 5])', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });

    it('AVG - 平均值', () => {
      const result = evaluateExpression('AVG([10, 20, 30])', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(20);
    });

    it('COUNT - 计数', () => {
      const result = evaluateExpression('COUNT([1, 2, 3])', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(3);
    });

    it('MAX - 数组最大值', () => {
      const result = evaluateExpression('MAX([1, 5, 3])', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(5);
    });

    it('MIN - 数组最小值', () => {
      const result = evaluateExpression('MIN([1, 5, 3])', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(1);
    });

    it('COUNT_DISTINCT - 去重计数', () => {
      const result = evaluateExpression('COUNT_DISTINCT([1, 2, 2, 3, 3, 3])', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(3);
    });
  });

  describe('日期函数', () => {
    it('DAYS_BETWEEN - 计算天数差', () => {
      const result = evaluateExpression(
        'DAYS_BETWEEN("2024-01-01", "2024-01-10")',
        {},
        'number'
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe(9);
    });

    it('ADD_DAYS - 添加天数', () => {
      const result = evaluateExpression(
        'FORMAT_DATE(ADD_DAYS("2024-01-01", 5), "YYYY-MM-DD")',
        {},
        'string'
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe('2024-01-06');
    });

    it('FORMAT_DATE - 格式化日期', () => {
      const result = evaluateExpression(
        'FORMAT_DATE("2024-01-15 10:30:45", "YYYY/MM/DD")',
        {},
        'string'
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe('2024/01/15');
    });
  });

  describe('条件表达式', () => {
    it('三元表达式', () => {
      const result = evaluateExpression('score >= 60 ? "及格" : "不及格"', { score: 80 }, 'string');
      expect(result.success).toBe(true);
      expect(result.result).toBe('及格');
    });

    it('嵌套条件', () => {
      const result = evaluateExpression(
        'score >= 90 ? "优秀" : score >= 60 ? "及格" : "不及格"',
        { score: 45 },
        'string'
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe('不及格');
    });
  });

  describe('业务场景', () => {
    it('计算订单总金额', () => {
      const result = evaluateExpression(
        'ROUND(price * quantity * (1 - discount), 2)',
        { price: 99.9, quantity: 3, discount: 0.1 },
        'number'
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe(269.73);
    });

    it('生成订单号', () => {
      const result = evaluateExpression(
        'CONCAT("ORD-", UPPER(SUBSTRING("abcdefghijklmnopqrstuvwxyz", 0, 8)))',
        {},
        'string'
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe('ORD-ABCDEFGH');
    });

    it('计算年龄', () => {
      const result = evaluateExpression(
        'DAYS_BETWEEN(birthday, TODAY()) / 365',
        { birthday: '1990-06-15' },
        'number'
      );
      expect(result.success).toBe(true);
      expect(typeof result.result).toBe('number');
      expect(result.result).toBeGreaterThan(30);
    });

    it('判断是否成年', () => {
      const result = evaluateExpression(
        'age >= 18',
        { age: 20 },
        'boolean'
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
    });

    it('数据验证 - 必填检查', () => {
      const result = evaluateExpression(
        'isNotEmpty(name) && isNotEmpty(phone)',
        { name: '张三', phone: '' },
        'boolean'
      );
      expect(result.success).toBe(true);
      expect(result.result).toBe(false);
    });
  });

  describe('安全沙箱', () => {
    it('禁止访问 window', () => {
      const result = evaluateExpression('window.location', {}, 'string');
      expect(result.success).toBe(false);
      expect(result.error).toContain('不允许的操作');
    });

    it('禁止访问 process', () => {
      const result = evaluateExpression('process.env', {}, 'string');
      expect(result.success).toBe(false);
      expect(result.error).toContain('不允许的操作');
    });

    it('禁止访问 require', () => {
      const result = evaluateExpression('require("fs")', {}, 'string');
      expect(result.success).toBe(false);
      expect(result.error).toContain('不允许的操作');
    });

    it('禁止访问 eval', () => {
      const result = evaluateExpression('eval("1+1")', {}, 'number');
      expect(result.success).toBe(false);
      expect(result.error).toContain('不允许的操作');
    });

    it('禁止访问 constructor', () => {
      const result = evaluateExpression('"".constructor', {}, 'string');
      expect(result.success).toBe(false);
      expect(result.error).toContain('不允许的操作');
    });

    it('禁止访问 __proto__', () => {
      const result = evaluateExpression('obj.__proto__', { obj: {} }, 'string');
      expect(result.success).toBe(false);
      expect(result.error).toContain('不允许的操作');
    });

    it('禁止 new（除 Date 外）', () => {
      const result = evaluateExpression('new Array()', {}, 'string');
      expect(result.success).toBe(false);
      expect(result.error).toContain('不允许的操作');
    });

    it('允许 new Date()', () => {
      const result = evaluateExpression('new Date().getFullYear()', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(new Date().getFullYear());
    });

    it('禁止无效变量名', () => {
      const result = evaluateExpression('value', { 'invalid-name': 1 }, 'number');
      expect(result.success).toBe(false);
      expect(result.error).toContain('无效的变量名');
    });
  });

  describe('错误处理', () => {
    it('语法错误', () => {
      const result = evaluateExpression('1 + + + 2', {}, 'number');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('数字输出类型 - NaN 结果', () => {
      const result = evaluateExpression('toNumber("abc")', {}, 'number');
      expect(result.success).toBe(false);
      expect(result.error).toContain('不是有效数字');
    });

    it('除以零', () => {
      const result = evaluateExpression('1 / 0', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(Infinity);
    });
  });

  describe('输出类型转换', () => {
    it('转为字符串', () => {
      const result = evaluateExpression('123', {}, 'string');
      expect(result.success).toBe(true);
      expect(result.result).toBe('123');
    });

    it('转为数字', () => {
      const result = evaluateExpression('"456"', {}, 'number');
      expect(result.success).toBe(true);
      expect(result.result).toBe(456);
    });

    it('转为布尔', () => {
      const result = evaluateExpression('1', {}, 'boolean');
      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
    });

    it('空字符串转布尔', () => {
      const result = evaluateExpression('""', {}, 'boolean');
      expect(result.success).toBe(true);
      expect(result.result).toBe(false);
    });
  });
});
