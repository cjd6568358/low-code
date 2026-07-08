/**
 * 数据操作执行器基类
 *
 * 提供数据表 CRUD 操作的通用逻辑，
 * CreateRecordExecutor / UpdateRecordExecutor / QueryRecordExecutor / DeleteRecordExecutor 继承此类。
 *
 * 支持两种配置格式：
 * 1. 设计器格式：fields 为 FieldMappingItem[]，filter 为 ConditionItem[]
 * 2. 编程式格式：fields/filter 为 Record<string, any>
 */

import { NodeExecutorBase } from './NodeExecutorBase';
import type { ExecutionContext, ExecutionResult } from '../types/execution';
import type { FlowNode } from '../schema';

/** 字段映射项（设计器格式） */
interface FieldMappingItem {
  /** 表字段名 */
  field: string;
  /** 绑定值（变量路径或常量） */
  value: string;
}

/** 条件项（设计器格式） */
interface ConditionItem {
  /** 表字段名 */
  field: string;
  /** 操作符 */
  operator: '=' | '!=' | '>' | '>=' | '<' | '<=' | 'like' | 'in';
  /** 绑定值（变量路径或常量） */
  value: string;
  /** 绑定类型 */
  valueType: 'variable' | 'constant';
}

/** 数据操作配置 */
export interface DataOperationConfig {
  /** 数据表名称 */
  collection: string;
  /** 数据源名称（默认 default） */
  dataSource?: string;
  /** 字段值（设计器格式或编程格式） */
  fields?: FieldMappingItem[] | Record<string, any>;
  /** 筛选条件（设计器格式或编程格式） */
  filter?: ConditionItem[] | Record<string, any>;
  /** 排序 */
  sort?: Record<string, 'asc' | 'desc'>;
  /** 分页 */
  pagination?: {
    limit?: number;
    offset?: number;
  };
}

/** 数据操作结果 */
export interface DataOperationResult {
  /** 操作是否成功 */
  success: boolean;
  /** 影响的记录数 */
  affectedCount?: number;
  /** 查询返回的记录 */
  records?: Record<string, any>[];
  /** 单条记录（创建/更新/查询单条） */
  record?: Record<string, any>;
  /** 错误信息 */
  error?: string;
}

/**
 * 数据操作执行器基类
 */
export abstract class DataOperationExecutor extends NodeExecutorBase {
  /**
   * 从节点读取数据操作配置
   * 设计器将配置保存在节点顶层字段
   */
  protected getDataOperationConfig(node: FlowNode): DataOperationConfig {
    const anyNode = node as any;
    return {
      collection: anyNode.collection || '',
      dataSource: anyNode.dataSource,
      fields: anyNode.fields,
      filter: anyNode.filter,
      sort: anyNode.sort,
      pagination: anyNode.pagination,
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
    context: ExecutionContext
  ): Record<string, any> {
    const result: Record<string, any> = {};

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
   * 转换为数据库查询条件格式
   */
  protected convertConditions(
    items: ConditionItem[],
    context: ExecutionContext
  ): Record<string, any> {
    const conditions: Record<string, any> = {};

    for (const item of items) {
      if (!item.field) continue;

      const resolvedValue = item.valueType === 'variable'
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
   * 支持 $workflow.nodeKey.field 格式
   */
  protected resolveVariableValue(value: string, context: ExecutionContext): any {
    if (!value) return value;

    // 处理变量引用格式：$workflow.nodeKey.field 或 $jobsMapByNodeKey.nodeKey.field
    const varPattern = /^\$(?:workflow|jobsMapByNodeKey)\.([^.]+)\.(.+)$/;
    const match = value.match(varPattern);
    if (match) {
      const [, nodeKey, fieldPath] = match;
      // 从流程变量中获取上游节点结果
      const nodeResult = context.variables?.[nodeKey] || context.variables?.[`${nodeKey}`];
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
      return value.replace(/\$\{([^}]+)\}/g, (match, varPath) => {
        const val = this.getNestedValue(context.variables, varPath.trim());
        return val !== undefined ? String(val) : match;
      });
    }

    return value;
  }

  /**
   * 解析配置中的变量引用（兼容旧格式）
   */
  protected resolveVariables(value: any, context: ExecutionContext): any {
    if (typeof value === 'string') {
      return this.resolveVariableValue(value, context);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.resolveVariables(item, context));
    }

    if (value && typeof value === 'object') {
      const resolved: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveVariables(val, context);
      }
      return resolved;
    }

    return value;
  }

  /**
   * 获取嵌套对象的值
   */
  protected getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 解析筛选条件
   * 支持 ConditionItem[] 和 Record<string, any> 两种格式
   */
  protected resolveFilter(filter: any, context: ExecutionContext): any {
    if (!filter) return {};

    // 数组格式（设计器输出）
    if (Array.isArray(filter)) {
      return this.convertConditions(filter as ConditionItem[], context);
    }

    // 处理逻辑操作符
    if (filter.$and) {
      return {
        $and: filter.$and.map((f: any) => this.resolveFilter(f, context)),
      };
    }
    if (filter.$or) {
      return {
        $or: filter.$or.map((f: any) => this.resolveFilter(f, context)),
      };
    }

    // 处理普通键值对
    const resolved: Record<string, any> = {};
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
   * 支持 FieldMappingItem[] 和 Record<string, any> 两种格式
   */
  protected resolveFields(fields: any, context: ExecutionContext): Record<string, any> {
    if (!fields) return {};

    // 数组格式（设计器输出）
    if (Array.isArray(fields)) {
      return this.convertFieldMappings(fields as FieldMappingItem[], context);
    }

    // Record 格式
    return this.resolveVariables(fields, context);
  }

  /**
   * 执行数据操作（子类实现）
   */
  abstract execute(context: ExecutionContext): Promise<ExecutionResult>;
}

export default DataOperationExecutor;
