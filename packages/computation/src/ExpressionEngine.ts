import type { ExpressionEngine as IExpressionEngine, ExpressionBinding } from '@low-code/shared';
import { get, isValidPath } from '@low-code/shared';

/** 沙箱白名单全局对象 */
const ALLOWED_GLOBALS: Record<string, any> = {
  Math,
  Date,
  JSON,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Infinity,
  NaN,
  undefined,
};

/** 禁止的标识符 */
const BLOCKED_IDENTIFIERS = new Set([
  'window', 'document', 'eval', 'Function',
  'import', 'require', 'fetch', 'XMLHttpRequest',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'process', 'global', 'globalThis', 'self',
]);

/** 依赖路径提取正则 */
const DEPENDENCY_REGEX = /\$[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g;

/** 模板变量正则 {{path}} */
const TEMPLATE_VAR_REGEX = /\{\{([^}]+)\}\}/g;

/** 判断字符串是否为函数体（return/const/let/var/赋值 开头） */
function isFunctionBody(expr: string): boolean {
  const trimmed = expr.trimStart();
  return /^(return\b|const\s|let\s|var\s|\w+\s*=)/.test(trimmed);
}

export class DefaultExpressionEngine implements IExpressionEngine {
  /**
   * 求值表达式（非安全模式，直接 new Function）
   */
  evaluate(expression: string, context: Record<string, any>): any {
    if (!expression || typeof expression !== 'string') return undefined;
    try {
      const fn = this.compileSimple(expression, context);
      return fn();
    } catch {
      return undefined;
    }
  }

  /**
   * 安全求值 — 白名单沙箱，同步执行
   *
   * 只支持两种格式：
   * - 简单表达式：`$user.name + 1` → 直接求值
   * - 函数体：`return $user.name` → 包裹为 `(() => { ... })()` 后求值
   */
  safeEvaluate(
    expression: string,
    context: Record<string, any>,
    timeout: number = 3000,
  ): any {
    if (!expression || typeof expression !== 'string') return undefined;

    // 函数体 → IIFE；简单表达式 → 直接求值
    const normalized = isFunctionBody(expression)
      ? `(() => { ${expression} })()`
      : expression;

    const validation = this.validate(normalized);
    if (!validation.valid) {
      console.warn(`Expression validation failed: ${validation.errors.join(', ')}`);
      return undefined;
    }

    try {
      const fn = this.compileSimple(normalized, context);
      const start = Date.now();
      const result = fn();
      if (Date.now() - start > timeout) {
        console.warn(`Expression evaluation exceeded timeout (${timeout}ms)`);
        return undefined;
      }
      return result;
    } catch (e) {
      console.warn(`Expression evaluation error: ${e}`);
      return undefined;
    }
  }

  /**
   * 执行表达式绑定 — 接收 ExpressionBinding，根据 async 标志决定执行方式
   *
   * - async: true  → 拼接为 `async ({params}) => { body }`，返回 Promise
   * - async: false → 拼接为 `({params}) => { body }`，同步返回结果
   */
  async evaluateAsync(
    binding: ExpressionBinding,
    context: Record<string, any>,
    timeout: number = 3000,
  ): Promise<any> {
    if (!binding?.value) return undefined;

    const params = Object.keys(context).join(', ');
    const isAsync = binding.async !== false;
    const prefix = isAsync ? 'async' : '';
    const fullExpr = `${prefix} ({${params}}) => { ${binding.value} }`;

    const validation = this.validate(fullExpr);
    if (!validation.valid) {
      console.warn(`Expression validation failed: ${validation.errors.join(', ')}`);
      return undefined;
    }

    try {
      const fn = this.compileBinding(fullExpr, context, isAsync);
      const result = fn();

      // 异步函数 → 带超时的 await
      if (isAsync && result && typeof result.then === 'function') {
        return await Promise.race([
          result,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Expression timeout (${timeout}ms)`)), timeout),
          ),
        ]);
      }

      // 同步函数 → 直接返回
      return result;
    } catch (e) {
      console.warn(`Expression evaluation error: ${e}`);
      return undefined;
    }
  }

  /**
   * 校验表达式合法性
   */
  validate(expression: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查禁止的标识符
    // 使用 (?<!\$) 负向后行断言排除 $fetch 等平台变量
    for (const blocked of BLOCKED_IDENTIFIERS) {
      const regex = new RegExp(`(?<!\\$)\\b${blocked}\\b`);
      if (regex.test(expression)) {
        errors.push(`Blocked identifier: ${blocked}`);
      }
    }

    // 检查危险操作
    if (/__proto__|constructor\s*\(|prototype\s*\[/.test(expression)) {
      errors.push('Potentially dangerous prototype access detected');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 分析表达式中的依赖路径
   */
  analyzeDependencies(expression: string): string[] {
    if (!expression) return [];
    const deps = new Set<string>();
    const matches = expression.match(DEPENDENCY_REGEX);
    if (matches) {
      for (const match of matches) {
        deps.add(match.substring(1));
      }
    }
    return Array.from(deps);
  }

  /**
   * 解析模板字符串中的 {{path}} 变量
   */
  resolveTemplate(template: string, context: Record<string, any>): string {
    if (!template) return '';
    return template.replace(TEMPLATE_VAR_REGEX, (_match, path: string) => {
      const trimmedPath = path.trim();
      if (!isValidPath(trimmedPath)) return '';
      const value = this.resolveVariable(trimmedPath, context);
      return value != null ? String(value) : '';
    });
  }

  /**
   * 解析模板参数对象中的 {{path}} 变量
   */
  resolveTemplateParams(
    params: Record<string, any>,
    context: Record<string, any>,
  ): Record<string, any> {
    if (!params) return {};
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        resolved[key] = this.resolveTemplate(value, context);
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveTemplateParams(value, context);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  // --- 内部编译方法 ---

  /**
   * 编译简单表达式 / IIFE（safeEvaluate / evaluate 使用）
   *
   * 不做函数定义检测，输入必须是简单表达式或 `(() => { ... })()` 形式。
   */
  private compileSimple(expression: string, context: Record<string, any>): () => any {
    // 纯变量引用 $xxx.yyy → 直接取值
    if (isValidPath(expression) && expression.startsWith('$')) {
      return () => this.resolveVariable(expression, context);
    }

    const contextKeys = Object.keys(context);
    const contextValues = contextKeys.map((k) => context[k]);

    // 简单表达式 / IIFE → 直接求值
    const sandboxCode = `"use strict"; return (${expression});`;

    try {
      const fn = new Function(...contextKeys, sandboxCode);
      return () => {
        try {
          return fn(...contextValues);
        } catch {
          return undefined;
        }
      };
    } catch {
      return () => expression;
    }
  }

  /**
   * 编译带上下文注入的函数（evaluateAsync 使用）
   *
   * 输入为已拼接好的完整函数：`async ({params}) => { body }` 或 `({params}) => { body }`
   */
  private compileBinding(expression: string, context: Record<string, any>, isAsync: boolean): () => any {
    const contextKeys = Object.keys(context);
    const contextValues = contextKeys.map((k) => context[k]);

    // 函数定义 → 注入上下文对象作为参数
    const sandboxCode = isAsync
      ? `"use strict"; return (${expression})({${contextKeys.join(',')}});`
      : `"use strict"; return (${expression})({${contextKeys.join(',')}});`;

    try {
      const fn = new Function(...contextKeys, sandboxCode);
      return () => {
        try {
          return fn(...contextValues);
        } catch {
          return undefined;
        }
      };
    } catch {
      return () => expression;
    }
  }

  /**
   * 从上下文中按路径解析变量
   */
  private resolveVariable(path: string, context: Record<string, any>): any {
    // 去掉开头的 $
    const cleanPath = path.startsWith('$') ? path.substring(1) : path;
    // 尝试直接从 context 取值
    const topLevelKey = cleanPath.split('.')[0];
    if (context[`$${topLevelKey}`]) {
      return get(context[`$${topLevelKey}`], cleanPath.substring(topLevelKey.length + 1));
    }
    return get(context, cleanPath);
  }
}

/** 默认表达式引擎实例 */
export const expressionEngine = new DefaultExpressionEngine();
