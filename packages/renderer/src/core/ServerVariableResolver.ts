import type { ServerVariableQuery, RenderContext } from '@low-code/shared';
import type { DefaultExpressionEngine } from '@low-code/computation';

/** 解析结果 */
export interface ServerVariableParseResult {
  /** 是否成功解析 */
  success: boolean;
  /** 解析后的查询对象 */
  query?: ServerVariableQuery;
  /** 原始表达式 */
  expression: string;
  /** 错误信息 */
  error?: string;
}

/** UI 配置模式 */
export interface ServerVariableUIConfig {
  /** 表名 */
  table: string;
  /** 选择的字段 */
  select: string[];
  /** 过滤条件 */
  filters: Array<{
    field: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in';
    value: any;
    valueSource: 'literal' | 'variable' | 'expression';
  }>;
  /** 排序配置 */
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  /** 限制数量 */
  limit?: number;
  /** 聚合配置 */
  aggregate?: {
    type: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field?: string;
  };
}

/**
 * 服务端变量解析器
 * 支持将 $table.xxx.filter().select() 语法解析为结构化查询
 * 支持 UI 配置与 JSON Schema 表达式的双向转换
 */
export class ServerVariableResolver {
  private expressionEngine: DefaultExpressionEngine;

  constructor(expressionEngine: DefaultExpressionEngine) {
    this.expressionEngine = expressionEngine;
  }

  /**
   * 解析服务端变量表达式
   * @param expression 表达式字符串
   * @param context 运行时上下文（用于解析变量引用）
   * @returns 解析结果
   */
  parse(expression: string, context?: RenderContext): ServerVariableParseResult {
    try {
      // 验证是否是服务端变量表达式
      if (!this.isServerVariable(expression)) {
        return {
          success: false,
          expression,
          error: 'Not a server variable expression',
        };
      }

      // 解析表名
      const table = this.extractTableName(expression);
      if (!table) {
        return {
          success: false,
          expression,
          error: 'Cannot extract table name',
        };
      }

      // 构建查询对象
      const query: ServerVariableQuery = {
        table,
        select: [],
        where: {},
      };

      // 解析 filter 条件
      const filters = this.extractFilters(expression, context);
      if (filters.length > 0) {
        query.where = this.buildWhereClause(filters);
      }

      // 解析 select 字段
      const selectFields = this.extractSelectFields(expression);
      if (selectFields.length > 0) {
        query.select = selectFields;
      }

      // 解析排序
      const orderBy = this.extractOrderBy(expression);
      if (orderBy) {
        query.orderBy = orderBy;
      }

      // 解析 limit
      const limit = this.extractLimit(expression);
      if (limit !== undefined) {
        query.limit = limit;
      }

      // 解析聚合函数
      const aggregate = this.extractAggregate(expression);
      if (aggregate) {
        query.aggregate = aggregate;
      }

      return {
        success: true,
        query,
        expression,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        expression,
        error: errorMessage,
      };
    }
  }

  /**
   * 判断是否是服务端变量表达式
   */
  isServerVariable(expression: string): boolean {
    return typeof expression === 'string' && expression.startsWith('$table.');
  }

  /**
   * 从表达式中提取表名
   */
  private extractTableName(expression: string): string | null {
    const match = expression.match(/^\$table\.(\w+)/);
    return match ? match[1] : null;
  }

  /**
   * 提取过滤条件
   */
  private extractFilters(
    expression: string,
    context?: RenderContext,
  ): Array<{
    field: string;
    operator: string;
    value: any;
  }> {
    const filters: Array<{
      field: string;
      operator: string;
      value: any;
    }> = [];

    // 匹配 .filter(record=>record.xxx==yyy) 模式
    const filterMatches = expression.matchAll(
      /\.filter\(\s*(?:record|item|r)\s*=>\s*(?:record|item|r)\.(\w+)\s*(==|!=|>|<|>=|<=|like|in)\s*([^)]+)\)/g,
    );

    for (const match of filterMatches) {
      const field = match[1];
      const operator = match[2];
      const valueExpr = match[3].trim();

      // 解析值
      let value: any;
      if (valueExpr.startsWith('$') && context) {
        // 变量引用，从上下文中解析
        value = this.resolveVariable(valueExpr, context);
      } else if (valueExpr.startsWith("'") || valueExpr.startsWith('"')) {
        // 字符串字面量
        value = valueExpr.slice(1, -1);
      } else if (valueExpr === 'true' || valueExpr === 'false') {
        // 布尔值
        value = valueExpr === 'true';
      } else if (!isNaN(Number(valueExpr))) {
        // 数字
        value = Number(valueExpr);
      } else {
        // 其他情况，作为表达式处理
        value = valueExpr;
      }

      filters.push({ field, operator, value });
    }

    // 匹配 .where({field: value}) 模式
    const whereMatch = expression.match(/\.where\(\s*\{([^}]+)\}\s*\)/);
    if (whereMatch) {
      const whereContent = whereMatch[1];
      // 简单解析 key: value 对
      const pairs = whereContent.split(',');
      for (const pair of pairs) {
        const [key, valueExpr] = pair.split(':').map(s => s.trim());
        if (key && valueExpr) {
          let value: any;
          if (valueExpr.startsWith('$') && context) {
            value = this.resolveVariable(valueExpr, context);
          } else {
            value = valueExpr.replace(/['"]/g, '');
          }
          filters.push({ field: key, operator: '==', value });
        }
      }
    }

    return filters;
  }

  /**
   * 构建 WHERE 子句
   */
  private buildWhereClause(
    filters: Array<{ field: string; operator: string; value: any }>,
  ): Record<string, any> {
    const where: Record<string, any> = {};

    for (const filter of filters) {
      switch (filter.operator) {
        case '==':
          where[filter.field] = filter.value;
          break;
        case '!=':
          where[filter.field] = { $ne: filter.value };
          break;
        case '>':
          where[filter.field] = { $gt: filter.value };
          break;
        case '<':
          where[filter.field] = { $lt: filter.value };
          break;
        case '>=':
          where[filter.field] = { $gte: filter.value };
          break;
        case '<=':
          where[filter.field] = { $lte: filter.value };
          break;
        case 'like':
          where[filter.field] = { $like: filter.value };
          break;
        case 'in':
          where[filter.field] = { $in: Array.isArray(filter.value) ? filter.value : [filter.value] };
          break;
      }
    }

    return where;
  }

  /**
   * 提取选择的字段
   */
  private extractSelectFields(expression: string): string[] {
    const fields: string[] = [];

    // 匹配 .select('field1', 'field2') 或 .select("field1", "field2") 模式
    const selectMatch = expression.match(/\.select\(\s*([^)]+)\)/);
    if (selectMatch) {
      const content = selectMatch[1];
      // 解析字段列表
      const fieldMatches = content.matchAll(/['"](\w+)['"]/g);
      for (const match of fieldMatches) {
        fields.push(match[1]);
      }
    }

    // 匹配末尾的字段选择（如 .name）
    const fieldMatch = expression.match(/\.(\w+)$/);
    if (fieldMatch && !['filter', 'select', 'sort', 'limit', 'first', 'count', 'sum', 'avg'].includes(fieldMatch[1])) {
      fields.push(fieldMatch[1]);
    }

    return [...new Set(fields)];
  }

  /**
   * 提取排序配置
   */
  private extractOrderBy(expression: string): Record<string, 'asc' | 'desc'> | undefined {
    // 匹配 .sort('field', 'asc') 或 .sort('field', 'desc') 模式
    const sortMatch = expression.match(/\.sort\(\s*['"](\w+)['"]\s*,\s*['"](\w+)['"]\s*\)/);
    if (sortMatch) {
      const field = sortMatch[1];
      const direction = sortMatch[2] as 'asc' | 'desc';
      return { [field]: direction };
    }

    // 匹配 .orderBy({field: 'asc'}) 模式
    const orderByMatch = expression.match(/\.orderBy\(\s*\{([^}]+)\}\s*\)/);
    if (orderByMatch) {
      const content = orderByMatch[1];
      const orderBy: Record<string, 'asc' | 'desc'> = {};
      const pairs = content.split(',');
      for (const pair of pairs) {
        const [key, value] = pair.split(':').map(s => s.trim().replace(/['"]/g, ''));
        if (key && (value === 'asc' || value === 'desc')) {
          orderBy[key] = value;
        }
      }
      return Object.keys(orderBy).length > 0 ? orderBy : undefined;
    }

    return undefined;
  }

  /**
   * 提取 limit 配置
   */
  private extractLimit(expression: string): number | undefined {
    // 匹配 .limit(n) 模式
    const limitMatch = expression.match(/\.limit\(\s*(\d+)\s*\)/);
    if (limitMatch) {
      return parseInt(limitMatch[1], 10);
    }

    // 匹配 .first() 模式
    if (expression.includes('.first()')) {
      return 1;
    }

    return undefined;
  }

  /**
   * 提取聚合函数
   */
  private extractAggregate(
    expression: string,
  ): { type: 'count' | 'sum' | 'avg' | 'min' | 'max'; field?: string } | undefined {
    // 匹配 .count() 模式
    if (expression.includes('.count()')) {
      return { type: 'count' };
    }

    // 匹配 .sum('field') 模式
    const sumMatch = expression.match(/\.sum\(\s*['"](\w+)['"]\s*\)/);
    if (sumMatch) {
      return { type: 'sum', field: sumMatch[1] };
    }

    // 匹配 .avg('field') 模式
    const avgMatch = expression.match(/\.avg\(\s*['"](\w+)['"]\s*\)/);
    if (avgMatch) {
      return { type: 'avg', field: avgMatch[1] };
    }

    // 匹配 .min('field') 模式
    const minMatch = expression.match(/\.min\(\s*['"](\w+)['"]\s*\)/);
    if (minMatch) {
      return { type: 'min', field: minMatch[1] };
    }

    // 匹配 .max('field') 模式
    const maxMatch = expression.match(/\.max\(\s*['"](\w+)['"]\s*\)/);
    if (maxMatch) {
      return { type: 'max', field: maxMatch[1] };
    }

    return undefined;
  }

  /**
   * 解析变量引用
   */
  private resolveVariable(variable: string, context: RenderContext): any {
    // 移除 $ 前缀
    const path = variable.slice(1);
    const parts = path.split('.');

    let value: any = context;
    for (const part of parts) {
      value = value?.[part];
    }

    return value;
  }

  /**
   * 将 UI 配置转换为表达式
   * @param uiConfig UI 配置对象
   * @returns 表达式字符串
   */
  uiConfigToExpression(uiConfig: ServerVariableUIConfig): string {
    let expression = `$table.${uiConfig.table}`;

    // 添加 filter 条件
    if (uiConfig.filters && uiConfig.filters.length > 0) {
      for (const filter of uiConfig.filters) {
        let valueExpr: string;
        switch (filter.valueSource) {
          case 'variable':
            valueExpr = filter.value;
            break;
          case 'expression':
            valueExpr = filter.value;
            break;
          case 'literal':
          default:
            if (typeof filter.value === 'string') {
              valueExpr = `'${filter.value}'`;
            } else {
              valueExpr = String(filter.value);
            }
        }
        expression += `.filter(record=>record.${filter.field}${filter.operator}${valueExpr})`;
      }
    }

    // 添加 select 字段
    if (uiConfig.select && uiConfig.select.length > 0) {
      if (uiConfig.select.length === 1) {
        // 单个字段使用简短语法
        expression += `.${uiConfig.select[0]}`;
      } else {
        // 多个字段使用 select 方法
        const fields = uiConfig.select.map(f => `'${f}'`).join(', ');
        expression += `.select(${fields})`;
      }
    }

    // 添加排序
    if (uiConfig.sort) {
      expression += `.sort('${uiConfig.sort.field}', '${uiConfig.sort.direction}')`;
    }

    // 添加 limit
    if (uiConfig.limit !== undefined) {
      if (uiConfig.limit === 1) {
        expression += '.first()';
      } else {
        expression += `.limit(${uiConfig.limit})`;
      }
    }

    // 添加聚合函数
    if (uiConfig.aggregate) {
      switch (uiConfig.aggregate.type) {
        case 'count':
          expression += '.count()';
          break;
        case 'sum':
          expression += `.sum('${uiConfig.aggregate.field}')`;
          break;
        case 'avg':
          expression += `.avg('${uiConfig.aggregate.field}')`;
          break;
        case 'min':
          expression += `.min('${uiConfig.aggregate.field}')`;
          break;
        case 'max':
          expression += `.max('${uiConfig.aggregate.field}')`;
          break;
      }
    }

    return expression;
  }

  /**
   * 将表达式转换为 UI 配置
   * @param expression 表达式字符串
   * @param context 运行时上下文（用于变量解析）
   * @returns UI 配置对象
   */
  expressionToUIConfig(expression: string, context?: RenderContext): ServerVariableUIConfig | null {
    const parseResult = this.parse(expression, context);
    if (!parseResult.success || !parseResult.query) {
      return null;
    }

    const query = parseResult.query;
    const uiConfig: ServerVariableUIConfig = {
      table: query.table,
      select: query.select || [],
      filters: [],
    };

    // 转换 where 条件为 filters
    if (query.where) {
      for (const [field, condition] of Object.entries(query.where)) {
        if (condition === null || condition === undefined) {
          continue;
        }

        if (typeof condition === 'object') {
          // 复杂条件
          for (const [op, value] of Object.entries(condition)) {
            let operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'in';
            switch (op) {
              case '$ne': operator = '!='; break;
              case '$gt': operator = '>'; break;
              case '$lt': operator = '<'; break;
              case '$gte': operator = '>='; break;
              case '$lte': operator = '<='; break;
              case '$like': operator = 'like'; break;
              case '$in': operator = 'in'; break;
              default: continue;
            }
            uiConfig.filters.push({
              field,
              operator,
              value,
              valueSource: 'literal',
            });
          }
        } else {
          // 简单等值条件
          uiConfig.filters.push({
            field,
            operator: '==',
            value: condition,
            valueSource: 'literal',
          });
        }
      }
    }

    // 转换 orderBy
    if (query.orderBy) {
      const [field, direction] = Object.entries(query.orderBy)[0];
      uiConfig.sort = { field, direction };
    }

    // 转换 limit
    if (query.limit !== undefined) {
      uiConfig.limit = query.limit;
    }

    // 转换 aggregate
    if (query.aggregate) {
      uiConfig.aggregate = query.aggregate;
    }

    return uiConfig;
  }

  /**
   * 验证表达式语法
   * @param expression 表达式字符串
   * @returns 是否有效
   */
  validateExpression(expression: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!this.isServerVariable(expression)) {
      errors.push('Expression must start with $table.');
      return { valid: false, errors };
    }

    // 检查括号匹配
    const openParens = (expression.match(/\(/g) || []).length;
    const closeParens = (expression.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push('Mismatched parentheses');
    }

    // 检查引号匹配
    const singleQuotes = (expression.match(/'/g) || []).length;
    const doubleQuotes = (expression.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      errors.push('Mismatched single quotes');
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push('Mismatched double quotes');
    }

    // 尝试解析
    const parseResult = this.parse(expression);
    if (!parseResult.success) {
      errors.push(parseResult.error || 'Parse failed');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
