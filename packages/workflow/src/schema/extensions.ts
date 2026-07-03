/**
 * BPMN 2.0 扩展类型定义
 * 用于审批流场景的自定义扩展
 */

import type { BaseElement } from './base';

/** 审批配置扩展 */
export interface ApprovalConfig extends BaseElement {
  /** 审批模式 */
  mode: ApprovalMode;
  /** 审批人表达式 */
  assigneeExpression?: string;
  /** 候选用户表达式 */
  candidateUsersExpression?: string;
  /** 候选组表达式 */
  candidateGroupsExpression?: string;
  /** 驳回动作 */
  rejectAction: RejectAction;
  /** 驳回目标节点 */
  rejectTarget?: string;
  /** 超时配置 */
  timeout?: TimeoutConfig;
  /** 加签配置 */
  addSign?: AddSignConfig;
  /** 转办配置 */
  transfer?: TransferConfig;
}

/** 审批模式 */
export type ApprovalMode = 'single' | 'countersign' | 'orSign';

/** 驳回动作 */
export type RejectAction =
  | 'rejectToStart'      // 驳回到发起人
  | 'rejectToPrevious'   // 驳回到上一节点
  | 'rejectToNode'       // 驳回到指定节点
  | 'rejectToEnd';       // 直接结束流程

/** 超时配置 */
export interface TimeoutConfig extends BaseElement {
  /** 超时时长（ISO 8601 Duration） */
  duration: string;
  /** 超时动作 */
  action: 'autoApprove' | 'autoReject' | 'notify' | 'transfer';
  /** 超时通知人 */
  notifyUsers?: string[];
  /** 超时转办人 */
  transferTo?: string;
}

/** 加签配置 */
export interface AddSignConfig extends BaseElement {
  /** 是否允许加签 */
  enabled: boolean;
  /** 加签类型 */
  type: 'before' | 'after' | 'parallel';
  /** 加签人选择方式 */
  assigneeSelection: 'manual' | 'expression';
}

/** 转办配置 */
export interface TransferConfig extends BaseElement {
  /** 是否允许转办 */
  enabled: boolean;
  /** 转办人选择方式 */
  assigneeSelection: 'manual' | 'expression';
}

/** 节点表单配置 */
export interface NodeFormConfig extends BaseElement {
  /** 继承来源表单 */
  inheritFrom?: string;
  /** 字段覆盖 */
  overrides: FieldOverride[];
  /** 子表单覆盖 */
  subFormOverrides?: SubFormOverride[];
}

/** 字段覆盖 */
export interface FieldOverride {
  /** 字段名 */
  field: string;
  /** 权限 */
  permission: FieldPermission;
  /** 自定义标签 */
  label?: string;
  /** 校验规则 */
  validation?: FieldValidation;
  /** 占位符 */
  placeholder?: string;
}

/** 字段权限 */
export type FieldPermission = 'readonly' | 'editable' | 'hidden';

/** 字段校验 */
export interface FieldValidation {
  /** 是否必填 */
  required?: boolean;
  /** 最小长度 */
  minLength?: number;
  /** 最大长度 */
  maxLength?: number;
  /** 正则表达式 */
  pattern?: string;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 自定义校验函数 */
  customValidator?: string;
}

/** 子表单覆盖 */
export interface SubFormOverride {
  /** 字段名 */
  field: string;
  /** 权限 */
  permission: FieldPermission;
  /** 列覆盖 */
  columnOverrides?: ColumnOverride[];
}

/** 列覆盖 */
export interface ColumnOverride {
  /** 列名 */
  column: string;
  /** 权限 */
  permission: FieldPermission;
  /** 自定义标签 */
  label?: string;
}

/** 快照配置 */
export interface SnapshotConfig extends BaseElement {
  /** 是否捕获快照 */
  enabled: boolean;
  /** 快照字段 */
  fields?: string[];
  /** 是否包含计算字段 */
  includeComputedFields?: boolean;
  /** 快照类型 */
  snapshotType?: 'full' | 'diff' | 'custom';
}

/** 流程触发配置 */
export interface TriggerConfig extends BaseElement {
  /** 触发类型 */
  type: 'button' | 'webhook' | 'timer' | 'event';
  /** 按钮配置 */
  buttonConfig?: ButtonTriggerConfig;
  /** 定时器配置 */
  timerConfig?: TimerTriggerConfig;
  /** Webhook 配置 */
  webhookConfig?: WebhookTriggerConfig;
}

/** 按钮触发配置 */
export interface ButtonTriggerConfig extends BaseElement {
  /** 按钮标签 */
  label: string;
  /** 按钮类型 */
  buttonType: 'primary' | 'default' | 'danger';
  /** 确认提示 */
  confirmMessage?: string;
  /** 输入数据映射 */
  inputData?: Record<string, string>;
}

/** 定时器触发配置 */
export interface TimerTriggerConfig extends BaseElement {
  /** Cron 表达式 */
  cron?: string;
  /** 一次性执行时间 */
  executeAt?: string;
  /** 时区 */
  timezone?: string;
}

/** Webhook 触发配置 */
export interface WebhookTriggerConfig extends BaseElement {
  /** Webhook URL */
  url: string;
  /** 请求方法 */
  method: 'GET' | 'POST';
  /** 请求头 */
  headers?: Record<string, string>;
  /** 认证配置 */
  auth?: WebhookAuthConfig;
}

/** Webhook 认证配置 */
export interface WebhookAuthConfig extends BaseElement {
  /** 认证类型 */
  type: 'none' | 'basic' | 'bearer' | 'apiKey';
  /** 用户名（Basic） */
  username?: string;
  /** 密码（Basic） */
  password?: string;
  /** Token（Bearer） */
  token?: string;
  /** API Key 名称 */
  apiKeyName?: string;
  /** API Key 值 */
  apiKeyValue?: string;
}

/** 通知配置 */
export interface NotifyConfig extends BaseElement {
  /** 通知方式 */
  channels: NotifyChannel[];
  /** 通知模板 */
  template?: string;
  /** 通知变量 */
  variables?: Record<string, string>;
}

/** 通知渠道 */
export type NotifyChannel = 'email' | 'sms' | 'wechat' | 'dingtalk' | 'webhook';

/** 审批人选择配置 */
export interface AssigneeSelectionConfig extends BaseElement {
  /** 选择方式 */
  mode: 'manual' | 'expression' | 'role' | 'department' | 'initiator';
  /** 表达式 */
  expression?: string;
  /** 角色 ID */
  roleId?: string;
  /** 部门 ID */
  departmentId?: string;
  /** 是否发起人 */
  includeInitiator?: boolean;
  /** 排除用户 */
  excludeUsers?: string[];
}
