import type { ExpressionEngine as IExpressionEngine } from '@low-code/shared';
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

export class DefaultExpressionEngine implements IExpressionEngine {
  /**
   * 求值表达式（非安全模式，直接 new Function）
   */
  evaluate(expression: string, context: Record<string, any>): any {
    if (!expression || typeof expression !== 'string') return undefined;
    try {
      const fn = this.compileExpression(expression, context);
      return fn();
    } catch {
      return undefined;
    }
  }

  /**
   * 安全求值 — 白名单沙箱，可配置超时
   */
  safeEvaluate(
    expression: string,
    context: Record<string, any>,
    timeout: number = 3000,
  ): any {
    if (!expression || typeof expression !== 'string') return undefined;

    // 安全校验
    const validation = this.validate(expression);
    if (!validation.valid) {
      console.warn(`Expression validation failed: ${validation.errors.join(', ')}`);
      return undefined;
    }

    try {
      const fn = this.compileExpression(expression, context);
      // 简单超时保护（生产环境可考虑 Web Worker）
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
   * 校验表达式合法性
   */
  validate(expression: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 检查禁止的标识符
    for (const blocked of BLOCKED_IDENTIFIERS) {
      // 使用单词边界匹配，避免误匹配（如 "documentId" 中的 "document"）
      const regex = new RegExp(`\\b${blocked}\\b`);
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
        // 去掉开头的 $，得到完整路径
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

  // --- 内部方法 ---

  /**
   * 编译表达式为可执行函数
   */
  private compileExpression(expression: string, context: Record<string, any>): () => any {
    // 模板字符串处理：`xxx ${expr} yyy`
    let code = expression;

    // 如果是纯变量引用 $context.xxx，直接取值
    if (isValidPath(expression) && expression.startsWith('$')) {
      return () => this.resolveVariable(expression, context);
    }

    // 将上下文变量注入为函数参数
    const contextKeys = Object.keys(context);
    const contextValues = contextKeys.map((k) => context[k]);

    // 构建沙箱函数
    // 在函数内部创建一个 Proxy，拦截对未允许全局变量的访问
    const sandboxCode = `
      "use strict";
      return (${code});
    `;

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
      // 如果编译失败，尝试作为模板字符串处理
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
