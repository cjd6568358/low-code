/**
 * 权限引擎类型定义
 *
 * 采用 RBAC 模型，支持角色叠加继承。
 * 仅用于前端 UI 层权限控制（菜单/按钮可见性），不做服务端鉴权。
 */

// ─── 资源与操作 ────────────────────────────────────────

/** 资源类型 */
export type ResourceType = 'menu' | 'button' | 'data' | 'field' | 'api';

/** 操作类型 */
export type ActionType = 'read' | 'create' | 'update' | 'delete' | 'publish';

// ─── 数据权限范围 ──────────────────────────────────────

/** 数据权限范围类型 */
export type DataScopeType = 'all' | 'department' | 'department-and-child' | 'self' | 'custom';

/** 数据范围配置 */
export interface DataScopeConfig {
  scopeType: DataScopeType;
  /** 自定义规则（scopeType='custom' 时使用） */
  customFilter?: {
    field: string;
    operator: string;
    value: any;
    /** 引用变量：$currentUser.id, $currentUser.departmentId 等 */
    valueFrom?: string;
  };
}

// ─── 权限规则 ──────────────────────────────────────────

/** 单条权限规则 */
export interface Permission {
  permissionId: string;
  resourceType: ResourceType;
  /** 资源标识（页面ID / 按钮ID / 表名 / 字段名 / 接口路径） */
  resourceId: string;
  /** 允许的操作列表 */
  actions: ActionType[];
  /** 数据权限范围（仅 resourceType='data' 时生效） */
  scope?: DataScopeConfig;
  /** 附加条件 */
  conditions?: Record<string, any>;
}

// ─── 角色 ──────────────────────────────────────────────

/** 角色层级 */
export type RoleLevel = 'platform' | 'tenant' | 'app' | 'business';

/** 内置角色 ID */
export type BuiltinRoleId =
  | 'super_admin'
  | 'tenant_admin'
  | 'app_admin'
  | 'department_default';

/** 角色定义 */
export interface Role {
  roleId: string;
  name: string;
  description?: string;
  level: RoleLevel;
  /**
   * 继承的基础角色 ID 列表 — 角色叠加机制
   *
   * 子角色自动继承父角色的所有权限，
   * 子角色中同 (resourceType, resourceId) 的权限覆盖父角色。
   */
  baseRoleIds: string[];
  /** 本角色直接拥有的权限（不含继承部分） */
  permissions: Permission[];
  /** 是否内置角色（内置角色不可删除） */
  isBuiltin: boolean;
  /** 所属租户（租户级/业务级角色必填） */
  tenantId?: string;
  /** 所属应用（应用级角色必填） */
  appId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── 角色-用户关联 ─────────────────────────────────────

/** 用户角色分配记录 */
export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  /** 分配来源 */
  source: 'manual' | 'department' | 'position';
  /** 来源关联ID（部门ID / 岗位ID） */
  sourceId?: string;
  tenantId: string;
  appId?: string;
  assignedAt: string;
  assignedBy: string;
}

// ─── 菜单/按钮权限配置（Schema 层） ────────────────────

/** 菜单权限配置（嵌入 PageSchema） */
export interface MenuPermissionConfig {
  /** 菜单/页面 ID */
  menuId: string;
  /** 允许访问的角色 ID 列表（空 = 所有人可见） */
  allowedRoles?: string[];
  /** 允许访问的部门 ID 列表 */
  allowedDepartments?: string[];
  /** 允许访问的人员 ID 列表 */
  allowedUsers?: string[];
}

/** 按钮权限配置（嵌入 ComponentNode） */
export interface ButtonPermissionConfig {
  /** 按钮资源标识 */
  buttonId: string;
  /** 允许操作的角色 ID 列表（空 = 所有人可见） */
  allowedRoles?: string[];
  /** 允许操作的部门 ID 列表 */
  allowedDepartments?: string[];
  /** 允许操作的人员 ID 列表 */
  allowedUsers?: string[];
}

// ─── 内置角色定义常量 ──────────────────────────────────

/** 内置角色列表 */
export const BUILTIN_ROLES: ReadonlyArray<Pick<Role, 'roleId' | 'name' | 'level' | 'isBuiltin' | 'baseRoleIds'>> = [
  {
    roleId: 'super_admin',
    name: '超级管理员',
    level: 'platform',
    isBuiltin: true,
    baseRoleIds: [],
  },
  {
    roleId: 'tenant_admin',
    name: '租户管理员',
    level: 'tenant',
    isBuiltin: true,
    baseRoleIds: [],
  },
  {
    roleId: 'app_admin',
    name: '应用管理员',
    level: 'app',
    isBuiltin: true,
    baseRoleIds: [],
  },
  {
    roleId: 'department_default',
    name: '部门默认角色',
    level: 'business',
    isBuiltin: true,
    baseRoleIds: [],
  },
] as const;
    isBuiltin: true,
    baseRoleIds: [],
  },
  {
    roleId: 'department_default',
    name: '部门默认角色',
    level: 'business',
    isBuiltin: true,
    baseRoleIds: [],
  },
] as const;

/** 部门默认角色的权限：所有菜单和按钮的只读权限 */
export const DEPARTMENT_DEFAULT_PERMISSIONS: Permission[] = [
  {
    permissionId: 'dept_default_menu_read',
    resourceType: 'menu',
    resourceId: '*',
    actions: ['read'],
  },
  {
    permissionId: 'dept_default_button_read',
    resourceType: 'button',
    resourceId: '*',
    actions: ['read'],
  },
];

// ─── 权限上下文接口（用于 RenderContext，避免循环依赖） ──

/**
 * 权限上下文接口（轻量版，供 RenderContext 引用）
 *
 * 完整实现见 PermissionEngine.buildPermissionContext()
 */
export interface PermissionContextLike {
  /** 可见菜单 ID 列表 */
  readonly menus: string[];
  /** 可用按钮 ID 列表 */
  readonly buttons: string[];
  /** 判断是否拥有指定权限 */
  has(resourceType: ResourceType, resourceId: string, action: ActionType): boolean;
  /** 判断是否拥有任一指定权限 */
  hasAny(resourceType: ResourceType, resourceId: string, actions: ActionType[]): boolean;
  /** 获取指定资源类型的所有有权限的资源 ID */
  getResourceIds(resourceType: ResourceType): string[];
}
