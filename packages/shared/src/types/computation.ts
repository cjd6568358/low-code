/**
 * 运算规则类型定义
 *
 * 运算中心的核心数据结构，支持：
 * - 4 种运算类型：字段计算、公式规则、聚合计算、数据转换
 * - 规则级元数据（标题、描述）
 * - PropValue 格式的表达式存储
 * - 输入字段定义和输出配置
 */

import type { ExpressionBinding } from './schema';

/** 运算类型 */
type ComputationType = 'field' | 'formula' | 'aggregation' | 'transform';

/** 运算状态 */
type ComputationStatus = 'draft' | 'active' | 'disabled';

/** 输入字段类型 */
type ComputationFieldType = 'string' | 'number' | 'boolean' | 'date' | 'json';

/** 运算输入字段定义 */
interface ComputationInput {
  /** 字段标识（用于表达式中引用） */
  key: string;
  /** 显示名称 */
  label: string;
  /** 字段类型 */
  fieldType: ComputationFieldType;
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: unknown;
  /** 字段描述 */
  description?: string;
}

/** 运算输出配置 */
interface ComputationOutput {
  /** 输出字段名 */
  name: string;
  /** 输出类型 */
  type: ComputationFieldType;
  /** 格式化（如 currency、percentage、date 等） */
  format?: string;
  /** 小数精度（数字类型） */
  precision?: number;
  /** 描述 */
  description?: string;
}

/** 运算规则 Schema — 存储格式 */
interface ComputationSchema {
  /** Schema 版本号 */
  schemaVersion: number;
  /** 业务版本号（乐观锁） */
  version: number;
  /** 运算规则 ID */
  computationId: string;
  /** 所属应用 ID */
  appId: string;
  /** 规则标题 */
  name: string;
  /** 规则描述 */
  description?: string;
  /** 运算类型 */
  type: ComputationType;
  /** 状态 */
  status: ComputationStatus;
  /** 输入字段列表 */
  inputs: ComputationInput[];
  /** 表达式（PropValue 格式） */
  expression: ExpressionBinding;
  /** 输出配置 */
  output: ComputationOutput;
  /** 关联数据表 ID */
  tableId?: string;
  /** 资源引用声明 */
  references?: {
    tables?: string[];
  };
  /** 创建者 */
  createdBy?: string;
  /** 创建时间 */
  createdAt?: string;
  /** 更新者 */
  updatedBy?: string;
  /** 更新时间 */
  updatedAt?: string;
}

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

/** 运算预览请求 */
interface ComputationPreviewRequest {
  /** 表达式 */
  expression: string;
  /** 测试上下文 */
  context: Record<string, unknown>;
  /** 输出类型 */
  outputType: string;
}

/** 运算执行请求 */
interface ComputationExecuteRequest {
  /** 输入参数 */
  params: Record<string, unknown>;
}

export type {
  ComputationType,
  ComputationStatus,
  ComputationFieldType,
  ComputationInput,
  ComputationOutput,
  ComputationSchema,
  ComputationResult,
  ComputationPreviewRequest,
  ComputationExecuteRequest,
};
