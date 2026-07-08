/**
 * 审批人指派选择器类型定义
 *
 * 支持按用户/角色/部门/岗位四种维度指派审批人。
 * 设计时存储策略描述，运行时由引擎动态解析为具体用户。
 */

/** 指派策略类型 */
export type AssigneeStrategyType = 'user' | 'role' | 'department' | 'position';

/** 审批人指派策略 */
export type AssigneeStrategy =
  | { type: 'user'; userIds: string[] }
  | { type: 'role'; roleIds: string[] }
  | { type: 'department'; deptIds: string[] }
  | { type: 'position'; positionIds: string[] };

/** 用户信息 */
export interface AssigneeUserInfo {
  userId: string;
  name: string;
  avatar?: string;
}

/** 角色信息 */
export interface AssigneeRoleInfo {
  roleId: string;
  name: string;
  description?: string;
}

/** 部门信息 */
export interface AssigneeDeptInfo {
  deptId: string;
  name: string;
  parentId?: string;
  children?: AssigneeDeptInfo[];
  userCount?: number;
}

/** 岗位信息 */
export interface AssigneePositionInfo {
  positionId: string;
  name: string;
  category?: string;
}

/** 指派选择器属性 */
export interface AssigneeSelectorProps {
  /** 当前值（指派策略） */
  value?: AssigneeStrategy;
  /** 值变更回调 */
  onChange?: (value: AssigneeStrategy | undefined) => void;
  /** 占位文本 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 租户ID */
  tenantId: string;
}
