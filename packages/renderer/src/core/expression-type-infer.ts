/**
 * 表达式类型推断工具
 *
 * 分析 JavaScript 表达式，推断返回类型。
 * 支持：
 * - 变量路径解析（$user.name → string）
 * - 运算符类型推断（+ → string/number, === → boolean）
 * - 函数调用类型推断（Number() → number）
 * - 禁止返回 Promise 的检测
 */

import { environmentRegistry } from './EnvironmentRegistry';

/** 支持的基本数据类型 */
type BaseType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined' | 'any';

/** any 类型警告信息 */
interface AnyTypeWarning {
  /** 变量路径（如 $component.input_01.value） */
  variablePath: string;
  /** 原始类型（如 ComponentState, DataSourceItem） */
  originalType: string;
  /** 建议信息 */
  suggestion?: string;
}

/** 类型推断结果 */
interface TypeInferResult {
  /** 推断的类型 */
  type: BaseType;
  /** 是否包含禁止的 Promise 返回 */
  hasPromiseReturn: boolean;
  /** Promise 返回的位置信息 */
  promiseLocations?: string[];
  /** 推断失败的原因（仅当 type === 'any' 且无 Promise 时） */
  reason?: string;
  /** any 类型警告列表（遇到类型为 any 的环境变量时产生） */
  anyWarnings?: AnyTypeWarning[];
}

/** 返回 Promise 的已知方法 */
const PROMISE_RETURNING_PATTERNS = [
  // $fetch 方法
  /\$fetch\.(get|post|put|delete|patch)\s*\(/,
  // $table 查询执行
  /\$table\.[^.]+\.(execute|first|count|sum|avg)\s*\(/,
  // $computation 求值
  /\$computation\.evaluate\s*\(/,
  // 通用 async 函数调用
  /await\s+/,
  // new Promise
  /new\s+Promise\s*\(/,
];

/**
 * 推断表达式的返回类型
 *
 * @param expression 表达式内容
 * @returns 类型推断结果
 */
export function inferExpressionType(expression: string): TypeInferResult {
  if (!expression || typeof expression !== 'string') {
    return { type: 'undefined', hasPromiseReturn: false, anyWarnings: [] };
  }

  // 移除注释
  const cleaned = removeComments(expression);

  // 检测 Promise 返回
  const promiseCheck = checkPromiseReturn(cleaned);
  if (promiseCheck.hasPromiseReturn) {
    return promiseCheck;
  }

  // 提取 return 语句
  const returnExpr = extractReturnExpression(cleaned);
  if (!returnExpr) {
    // 没有 return 语句，返回 undefined
    return { type: 'undefined', hasPromiseReturn: false, anyWarnings: [] };
  }

  // 推断 return 后表达式的类型
  const warnings: AnyTypeWarning[] = [];
  const inferredType = inferExpression(returnExpr.trim(), warnings);

  return { type: inferredType, hasPromiseReturn: false, anyWarnings: warnings };
}

/**
 * 移除单行和多行注释
 */
function removeComments(code: string): string {
  // 移除单行注释
  let result = code.replace(/\/\/.*$/gm, '');
  // 移除多行注释
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result;
}

/**
 * 检测表达式中是否有 Promise 返回
 */
function checkPromiseReturn(expression: string): TypeInferResult {
  const locations: string[] = [];

  for (const pattern of PROMISE_RETURNING_PATTERNS) {
    const match = expression.match(pattern);
    if (match) {
      locations.push(match[0]);
    }
  }

  if (locations.length > 0) {
    return {
      type: 'any',
      hasPromiseReturn: true,
      promiseLocations: locations,
    };
  }

  return { type: 'any', hasPromiseReturn: false };
}

/**
 * 提取 return 语句后的表达式
 *
 * 支持：
 * - return xxx;
 * - return (xxx);
 * - return { a: 1 }（对象字面量）
 * - return xxx（无分号，后跟换行）
 * - 多行代码取最后一个 return
 */
function extractReturnExpression(code: string): string | null {
  // 先用正则找到 return 的起始位置，然后用括号平衡提取完整表达式
  const returnStartRegex = /return\s+/g;
  let lastReturn: string | null = null;
  let match: RegExpExecArray | null;

  while ((match = returnStartRegex.exec(code)) !== null) {
    const startIdx = match.index + match[0].length;
    const expr = extractBalancedExpression(code, startIdx);
    if (expr) lastReturn = expr;
  }

  // 如果没有 return，检查是否是单表达式（隐式返回）
  if (lastReturn === null) {
    const trimmed = code.trim();
    // 单行表达式（没有分号、没有花括号）
    if (trimmed && !trimmed.includes(';')) {
      return trimmed;
    }
  }

  return lastReturn;
}

/**
 * 从指定位置开始，按括号平衡提取完整表达式
 */
function extractBalancedExpression(code: string, startIdx: number): string | null {
  let depth = 0;
  let i = startIdx;

  while (i < code.length) {
    const ch = code[i];

    // 跳过字符串字面量
    if (ch === '"' || ch === "'" || ch === '`') {
      i++;
      while (i < code.length && code[i] !== ch) {
        if (code[i] === '\\') i++; // 跳过转义
        i++;
      }
      i++;
      continue;
    }

    if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) break; // 遇到不匹配的右括号，表达式结束
      depth--;
    } else if (ch === ';' && depth === 0) {
      break; // 分号结束
    } else if ((ch === '\n' || ch === '\r') && depth === 0) {
      // 换行：检查下一行是否是续行（以 . 或 , 或运算符开头）
      const rest = code.substring(i + 1).trimStart();
      if (rest.startsWith('.') || rest.startsWith(',') || rest.startsWith('||') || rest.startsWith('&&') || rest.startsWith('?') || rest.startsWith(':')) {
        // 续行，继续
      } else {
        break; // 换行结束
      }
    }

    i++;
  }

  const result = code.substring(startIdx, i).trim();
  return result || null;
}

/**
 * 推断表达式的类型（简单静态分析）
 */
function inferExpression(expr: string, warnings: AnyTypeWarning[] = []): BaseType {
  // 移除外层括号
  expr = unwrapParens(expr).trim();

  if (!expr) return 'undefined';

  // 1. 字面量
  if (isStringLiteral(expr)) return 'string';
  if (isNumberLiteral(expr)) return 'number';
  if (expr === 'true' || expr === 'false') return 'boolean';
  if (expr === 'null') return 'null';
  if (expr === 'undefined') return 'undefined';
  if (isArrayLiteral(expr)) return 'array';
  if (isObjectLiteral(expr)) return 'object';

  // 2. 类型转换函数
  if (/^Number\s*\(/.test(expr)) return 'number';
  if (/^String\s*\(/.test(expr)) return 'string';
  if (/^Boolean\s*\(/.test(expr)) return 'boolean';
  if (/^JSON\.parse\s*\(/.test(expr)) return 'object';
  if (/^\[.*\]$/.test(expr)) return 'array';

  // 3. 变量路径解析（仅纯变量路径，如 $user.name，排除含运算符的表达式）
  if (/^\$[a-zA-Z_][a-zA-Z0-9_.]*$/.test(expr)) {
    return inferVariablePathType(expr, warnings);
  }

  // 4. 运算符推断
  const operatorType = inferByOperator(expr);
  if (operatorType) return operatorType;

  // 5. 三元表达式
  if (expr.includes('?') && expr.includes(':')) {
    return inferTernaryType(expr, warnings);
  }

  // 无法推断
  return 'any';
}

/**
 * 解析变量路径的类型
 */
function inferVariablePathType(path: string, warnings: AnyTypeWarning[] = []): BaseType {
  // 移除可能的尾部调用（如 $user.name.trim()）
  const cleanPath = path.replace(/\.[a-zA-Z_]\w*\(\).*$/, '');

  // 从 EnvironmentRegistry 解析
  const parts = cleanPath.split('.');
  if (parts.length < 2) return 'any';

  const varName = parts[0];
  const def = environmentRegistry.getDefinition(varName);
  if (!def) return 'any';

  // 遍历属性树
  let currentProperties = def.properties;
  let currentType: BaseType = 'any';
  let currentOriginalType = 'any';

  for (let i = 1; i < parts.length; i++) {
    const propName = parts[i];
    const prop = currentProperties.find(p => p.name === propName);

    if (!prop) return 'any';

    currentType = mapVariableTypeToBaseType(prop.type);
    currentOriginalType = prop.type;
    currentProperties = prop.properties || [];
  }

  // 如果推断结果是 any，添加警告
  if (currentType === 'any') {
    const suggestion = getAnyTypeSuggestion(varName, currentOriginalType);
    warnings.push({
      variablePath: cleanPath,
      originalType: currentOriginalType,
      suggestion,
    });
  }

  return currentType;
}

/**
 * 获取 any 类型的建议信息
 */
function getAnyTypeSuggestion(varName: string, originalType: string): string | undefined {
  const lowerType = originalType.toLowerCase();

  if (lowerType === 'componentstate') {
    return '建议使用具体属性路径，如 .value、.visible、.disabled';
  }
  if (lowerType === 'datasourceitem') {
    return '建议使用 .data 属性获取数据源返回值';
  }
  if (lowerType === 'any') {
    return '该变量类型未定义，无法进行类型校验';
  }
  return undefined;
}

/**
 * 将变量定义中的类型映射到 BaseType
 */
function mapVariableTypeToBaseType(type: string): BaseType {
  const lowerType = type.toLowerCase();

  if (lowerType === 'string') return 'string';
  if (lowerType === 'number' || lowerType === 'integer') return 'number';
  if (lowerType === 'boolean') return 'boolean';
  if (lowerType === 'array' || lowerType.endsWith('[]')) return 'array';
  if (lowerType === 'object' || lowerType === 'record' || lowerType.startsWith('record<')) return 'object';
  if (lowerType === 'any' || lowerType === 'componentstate' || lowerType === 'datasourceitem') return 'any';
  if (lowerType === 'function') return 'any'; // 函数调用结果无法推断

  return 'any';
}

/**
 * 根据运算符推断类型
 */
function inferByOperator(expr: string): BaseType | null {
  // 比较运算符 → boolean
  if (/[=!]==?|<>|<=?|>=?|in\s|instanceof\s/.test(expr)) {
    return 'boolean';
  }

  // 逻辑运算符 → boolean
  if (/&&|\|\|/.test(expr)) {
    return 'boolean';
  }

  // 一元逻辑运算符 → boolean
  if (/^\s*!/.test(expr)) {
    return 'boolean';
  }

  // 算术运算符 → number 或 string（取决于操作数）
  if (/[+\-*/%]/.test(expr)) {
    // 如果包含字符串拼接（+ 且有字符串操作数）
    if (expr.includes('+') && hasStringOperand(expr)) {
      return 'string';
    }
    // 纯算术
    if (/^[\s\d$.[\]()+\-*/%]+$/.test(expr)) {
      return 'number';
    }
    // 不确定，可能是 string 或 number
    return 'any';
  }

  return null;
}

/**
 * 检测表达式中是否有字符串操作数
 */
function hasStringOperand(expr: string): boolean {
  // 包含字符串字面量
  if (/["'`]/.test(expr)) return true;

  // 包含已知返回 string 的变量路径
  const varMatches = expr.match(/\$[a-zA-Z_][a-zA-Z0-9_.]*/g);
  if (varMatches) {
    for (const varPath of varMatches) {
      if (inferVariablePathType(varPath) === 'string') {
        return true;
      }
    }
  }

  return false;
}

/**
 * 推断三元表达式的类型
 */
function inferTernaryType(expr: string, warnings: AnyTypeWarning[] = []): BaseType {
  // 简单处理：找到 ? 和 : 的位置
  const questionIdx = expr.indexOf('?');
  const colonIdx = findMatchingColon(expr, questionIdx);

  if (colonIdx === -1) return 'any';

  const trueBranch = expr.substring(questionIdx + 1, colonIdx).trim();
  const falseBranch = expr.substring(colonIdx + 1).trim();

  const trueType = inferExpression(trueBranch, warnings);
  const falseType = inferExpression(falseBranch, warnings);

  // 如果两个分支类型相同，返回该类型
  if (trueType === falseType) return trueType;

  // 如果其中一个是 any，返回另一个
  if (trueType === 'any') return falseType;
  if (falseType === 'any') return trueType;

  // 类型不同，返回 any
  return 'any';
}

/**
 * 找到匹配的冒号位置
 */
function findMatchingColon(expr: string, questionIdx: number): number {
  let depth = 0;
  for (let i = questionIdx + 1; i < expr.length; i++) {
    if (expr[i] === '(' || expr[i] === '[' || expr[i] === '{') {
      depth++;
    } else if (expr[i] === ')' || expr[i] === ']' || expr[i] === '}') {
      depth--;
    } else if (expr[i] === '?' && depth === 0) {
      depth++; // 嵌套三元
    } else if (expr[i] === ':' && depth === 0) {
      return i;
    } else if (expr[i] === ':' && depth > 0) {
      depth--;
    }
  }
  return -1;
}

/**
 * 移除外层括号
 */
function unwrapParens(expr: string): string {
  let result = expr;
  while (result.startsWith('(') && result.endsWith(')')) {
    let depth = 0;
    let balanced = true;
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i] === '(') depth++;
      if (result[i] === ')') depth--;
      if (depth === 0) {
        balanced = false;
        break;
      }
    }
    if (balanced) {
      result = result.slice(1, -1);
    } else {
      break;
    }
  }
  return result;
}

/** 判断是否为字符串字面量 */
function isStringLiteral(expr: string): boolean {
  return /^["'`].*["'`]$/.test(expr);
}

/** 判断是否为数字字面量 */
function isNumberLiteral(expr: string): boolean {
  return /^\d+(\.\d+)?$/.test(expr);
}

/** 判断是否为数组字面量 */
function isArrayLiteral(expr: string): boolean {
  return /^\[.*\]$/.test(expr);
}

/** 判断是否为对象字面量 */
function isObjectLiteral(expr: string): boolean {
  return /^\{.*\}$/.test(expr);
}

/**
 * 判断两个类型是否兼容
 *
 * @param expected 期望类型（属性的 type）
 * @param actual 实际类型（推断出的类型）
 * @returns 是否兼容
 */
export function isTypeCompatible(expected: string, actual: string): boolean {
  // any 兼容所有
  if (actual === 'any' || expected === 'any') return true;

  // 类型相同
  if (expected === actual) return true;

  // null/undefined 不兼容具体类型（空函数体不应静默通过）
  if (actual === 'null' || actual === 'undefined') return false;

  // number 和 string 可互转
  if ((expected === 'number' && actual === 'string') ||
      (expected === 'string' && actual === 'number')) {
    return true;
  }

  // integer 是 number 的子类型
  if (expected === 'integer' && actual === 'number') return true;
  if (expected === 'number' && actual === 'integer') return true;

  // object 和 array 的关系（JSON Schema 中 array 是独立类型）
  if (expected === 'object' && actual === 'array') return true;

  return false;
}

/**
 * 获取类型不匹配的提示信息
 */
export function getTypeMismatchMessage(expected: string, actual: string): string {
  const typeNames: Record<string, string> = {
    string: '字符串',
    number: '数字',
    boolean: '布尔值',
    object: '对象',
    array: '数组',
    null: 'null',
    undefined: 'undefined',
    any: '任意类型',
  };

  const expectedName = typeNames[expected] || expected;
  const actualName = typeNames[actual] || actual;

  return `属性期望类型为「${expectedName}」，但表达式返回类型为「${actualName}」`;
}

/**
 * 输出 any 类型警告到控制台
 *
 * 当变量引用或表达式中包含类型为 any 的环境变量时，
 * 在控制台输出警告信息，帮助开发者发现潜在的类型问题。
 *
 * @param warnings any 类型警告列表
 * @param context 上下文信息（如属性名）
 */
export function logAnyTypeWarnings(warnings: AnyTypeWarning[], context?: string): void {
  if (!warnings || warnings.length === 0) return;

  const prefix = context ? `[${context}] ` : '';
  console.group(`⚠️ ${prefix}检测到 any 类型变量`);

  for (const warning of warnings) {
    const baseMessage = `变量 ${warning.variablePath} 的类型为 "${warning.originalType}"，无法进行精确的类型校验`;
    if (warning.suggestion) {
      console.warn(`${baseMessage}\n  💡 ${warning.suggestion}`);
    } else {
      console.warn(baseMessage);
    }
  }

  console.groupEnd();
}

/**
 * 解析变量引用的类型（用于变量引用模式）
 *
 * @param variablePath 变量路径（如 $user.name）
 * @returns 推断结果，包含类型和警告
 */
export function resolveVariableType(variablePath: string): { type: BaseType; warnings: AnyTypeWarning[] } {
  const warnings: AnyTypeWarning[] = [];
  const type = inferVariablePathType(variablePath, warnings);
  return { type, warnings };
}

export type { BaseType, TypeInferResult, AnyTypeWarning };
