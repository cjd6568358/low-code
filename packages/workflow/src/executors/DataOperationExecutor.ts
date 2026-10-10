/**
 * 数据操作执行器基类
 *
 * 提供数据表 CRUD 操作的通用逻辑，
 * CreateRecordExecutor / UpdateRecordExecutor / QueryRecordExecutor / DeleteRecordExecutor 继承此类。
 *
 * 支持两种配置格式：
 * 1. 设计器格式：fields 为 FieldMappingItem[]，filter 为 ConditionItem[]
 * 2. 编程式格式：fields/filter 为 Record<string, unknown>
 */

import { NodeExecutorBase } from './NodeExecutorBase';
import type {
  ExecutionContext,
  ExecutionResult,
  FieldValues,
  FilterCondition,
} from '../types/execution';
import type { FlowNode } from '../schema';

/** 字段映射项（设计器格式） */
export interface FieldMappingItem {
  /** 表字段名 */
  field: string;
  /** 绑定值（变量路径或常量） */
  value: string;
}

/** 条件操作符 */
export type ConditionOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in';

/** 条件项（设计器格式） */
export interface ConditionItem {
  /** 表字段名 */
  field: string;
  /** 操作符 */
  operator: ConditionOperator;
  /** 绑定值（变量路径或常量） */
  value: string;
  /** 绑定类型 */
  valueType: 'variable' | 'constant';
}

/** 分页配置 */
export interface DataOperationPagination {
  /** 返回条数上限 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/** 数据操作配置 */
export interface DataOperationConfig {
  /** 数据表名称 */
  collection: string;
  /** 数据源名称（默认 default） */
  dataSource?: string;
  /** 字段值（设计器格式或编程格式） */
  fields?: FieldMappingItem[] | FieldValues;
  /** 筛选条件（设计器格式或编程格式） */
  filter?: ConditionItem[] | FilterCondition;
  /** 排序 */
  sort?: Record<string, 'asc' | 'desc'>;
  /** 分页 */
  pagination?: DataOperationPagination;
}

/** 数据操作结果 */
export interface DataOperationResult {
  /** 操作是否成功 */
  success: boolean;
  /** 影响的记录数 */
  affectedCount?: number;
  /** 查询返回的记录 */
  records?: FieldValues[];
  /** 单条记录（创建/更新/查询单条） */
  record?: FieldValues;
  /** 错误信息 */
  error?: string;
}

/**
 * 判断值是否为普通键值对象（排除数组与 null）
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 判断是否为设计器字段映射数组
 *
 * @param value 待判断的值
 * @returns 是否为 FieldMappingItem[]
 */
export function isFieldMappingList(value: unknown): value is FieldMappingItem[] {
  return (
    Array.isArray(value) &&
    value.every(item => isPlainObject(item) && typeof item.field === 'string')
  );
}

/**
 * 判断是否为设计器条件项数组
 *
 * @param value 待判断的值
 * @returns 是否为 ConditionItem[]
 */
export function isConditionItemList(value: unknown): value is ConditionItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        isPlainObject(item) &&
        typeof item.field === 'string' &&
        typeof item.operator === 'string',
    )
  );
}

/**
 * 数据操作执行器基类
 */
export abstract class DataOperationExecutor extends NodeExecutorBase {
  /**
   * 从节点读取数据操作配置
   *
   * 设计器将配置保存在节点顶层字段（BPMN 扩展属性），
   * 因此这里按扩展属性读取而非标准的 BPMN 结构。
   */
  protected getDataOperationConfig(node: FlowNode): DataOperationConfig {
    const extended = node as FlowNode & Partial<DataOperationConfig>;
    return {
      collection: extended.collection ?? '',
      dataSource: extended.dataSource,
      fields: extended.fields,
      filter: extended.filter,
      sort: extended.sort,
      pagination: extended.pagination,
    };
  }

  /**
   * 将 FieldMappingItem[] 转换为 Record<string, resolvedValue>
   *
   * 设计器输出格式：[{field: 'name', value: '$workflow.node_01.result'}, ...]
   * 转换为：{name: resolvedValue, ...}
   */
  protected convertFieldMappings(
    items: FieldMappingItem[],
    context: ExecutionContext,
  ): FieldValues {
    const result: FieldValues = {};

    for (const item of items) {
      if (!item.field) continue;
      result[item.field] = this.resolveVariableValue(item.value, context);
    }

    return result;
  }

  /**
   * 将 ConditionItem[] 转换为数据库查询条件
   *
   * 设计器输出格式：[{field: 'id', operator: '=', value: '$workflow.sourceId', valueType: 'variable'}, ...]
   * 转换为数据库查询条件格式（操作符包装为 `$ne`/`$gt`/`$in` 等）
   */
  protected convertConditions(
    items: ConditionItem[],
    context: ExecutionContext,
  ): FilterCondition {
    const conditions: FilterCondition = {};

    for (const item of items) {
      if (!item.field) continue;

      const resolvedValue =
        item.valueType === 'variable'
          ? this.resolveVariableValue(item.value, context)
          : item.value;

      switch (item.operator) {
        case '=':
          conditions[item.field] = resolvedValue;
          break;
        case '!=':
          conditions[item.field] = { $ne: resolvedValue };
          break;
        case '>':
          conditions[item.field] = { $gt: resolvedValue };
          break;
        case '>=':
          conditions[item.field] = { $gte: resolvedValue };
          break;
        case '<':
          conditions[item.field] = { $lt: resolvedValue };
          break;
        case '<=':
          conditions[item.field] = { $lte: resolvedValue };
          break;
        case 'like':
          conditions[item.field] = { $like: resolvedValue };
          break;
        case 'in':
          conditions[item.field] = {
            $in: Array.isArray(resolvedValue) ? resolvedValue : [resolvedValue],
          };
          break;
      }
    }

    return conditions;
  }

  /**
   * 解析变量引用值
   *
   * 支持 `$workflow.nodeKey.field`、`$jobsMapByNodeKey.nodeKey.field`、
   * `${path}` 以及普通字符串中的 `${path}` 插值。
   */
  protected resolveVariableValue(value: string, context: ExecutionContext): unknown {
    if (!value) return value;

    // 处理变量引用格式：$workflow.nodeKey.field 或 $jobsMapByNodeKey.nodeKey.field
    const varPattern = /^\$(?:workflow|jobsMapByNodeKey)\.([^.]+)\.(.+)$/;
    const match = value.match(varPattern);
    if (match) {
      const [, nodeKey, fieldPath] = match;
      // 从流程变量中获取上游节点结果
      const nodeResult = context.variables?.[nodeKey];
      if (nodeResult) {
        return this.getNestedValue(nodeResult, fieldPath);
      }
      return undefined;
    }

    // 处理 ${variable} 格式
    const templateMatch = value.match(/^\$\{([^}]+)\}$/);
    if (templateMatch) {
      const varPath = templateMatch[1].trim();
      return this.getNestedValue(context.variables, varPath);
    }

    // 处理普通字符串中的 ${variable} 替换
    if (value.includes('${')) {
      return value.replace(/\$\{([^}]+)\}/g, (whole, varPath: string) => {
        const val = this.getNestedValue(context.variables, varPath.trim());
        return val !== undefined ? String(val) : whole;
      });
    }

    return value;
  }

  /**
   * 递归解析配置中的变量引用（兼容旧格式）
   */
  protected resolveVariables(value: unknown, context: ExecutionContext): unknown {
    if (typeof value === 'string') {
      return this.resolveVariableValue(value, context);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.resolveVariables(item, context));
    }

    if (isPlainObject(value)) {
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveVariables(val, context);
      }
      return resolved;
    }

    return value;
  }

  /**
   * 获取嵌套对象的值
   *
   * @param source 源对象
   * @param path 点分路径，如 `a.b.c`
   * @returns 路径对应的值，任一层缺失时返回 undefined
   */
  protected getNestedValue(source: unknown, path: string): unknown {
    let current: unknown = source;
    for (const key of path.split('.')) {
      if (!isPlainObject(current)) return undefined;
      current = current[key];
    }
    return current;
  }

  /**
   * 解析筛选条件
   *
   * 支持 ConditionItem[] 和 Record<string, unknown> 两种格式，
   * 并递归展开 `$and` / `$or` 逻辑组合。
   */
  protected resolveFilter(filter: unknown, context: ExecutionContext): FilterCondition {
    if (!filter) return {};

    // 数组格式（设计器输出）
    if (isConditionItemList(filter)) {
      return this.convertConditions(filter, context);
    }

    if (!isPlainObject(filter)) return {};

    // 处理逻辑操作符
    const logicalAnd = filter.$and;
    if (Array.isArray(logicalAnd)) {
      return {
        $and: logicalAnd.map(item => this.resolveFilter(item, context)),
      };
    }
    const logicalOr = filter.$or;
    if (Array.isArray(logicalOr)) {
      return {
        $or: logicalOr.map(item => this.resolveFilter(item, context)),
      };
    }

    // 处理普通键值对
    const resolved: FilterCondition = {};
    for (const [key, value] of Object.entries(filter)) {
      if (key.startsWith('$')) {
        // 操作符直接传递
        resolved[key] = value;
      } else {
        resolved[key] = this.resolveVariables(value, context);
      }
    }
    return resolved;
  }

  /**
   * 解析字段值
   *
   * 支持 FieldMappingItem[] 和 Record<string, unknown> 两种格式。
   */
  protected resolveFields(fields: unknown, context: ExecutionContext): FieldValues {
    if (!fields) return {};

    // 数组格式（设计器输出）
    if (isFieldMappingList(fields)) {
      return this.convertFieldMappings(fields, context);
    }

    // Record 格式
    const resolved = this.resolveVariables(fields, context);
    return isPlainObject(resolved) ? resolved : {};
  }

  /**
   * 执行数据操作（子类实现）
   */
  abstract execute(context: ExecutionContext): Promise<ExecutionResult>;
}

export default DataOperationExecutor;
