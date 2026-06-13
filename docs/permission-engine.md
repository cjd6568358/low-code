# 权限引擎 (Permission Engine)

采用 RBAC (Role-Based Access Control) 模型，支持角色叠加继承，实现细粒度前端 UI 层权限控制。

> **注意**：权限引擎仅控制前端 UI 层（菜单/按钮可见性），不做服务端鉴权。

## RBAC 模型

```
用户 (User) ──▶ 角色 (Role) ──▶ 权限 (Permission) ──▶ 资源 (Resource)
                    ▲
                    │
              岗位 (Position) ──▶ 默认角色映射
              部门 (Department) ──▶ 部门默认角色（自动叠加）
```

### 角色层级

| 层级 | 角色 | 说明 |
|------|------|------|
| 平台级 | 超级管理员 | 平台全局管理，管理所有租户 |
| 租户级 | 租户管理员 | 管理租户内的组织架构、字典、OpenKey、应用管理员 |
| 应用级 | 应用管理员 (admin) | 管理指定应用的页面/实体/数据表/流程/运算/权限 |
| 应用级 | 应用查看者 (viewer) | 只读访问指定应用 |
| 业务级 | 部门默认角色 (department_default) | 内置只读角色，所有用户自动拥有 |
| 业务级 | 自定义角色 | 租户管理员自定义的业务角色，支持叠加继承 |

### 内置角色

```typescript
const BUILTIN_ROLES = [
  { roleId: 'super_admin',         name: '超级管理员', level: 'platform' },
  { roleId: 'tenant_admin',        name: '租户管理员', level: 'tenant' },
  { roleId: 'app_admin',           name: '应用管理员', level: 'app' },
  { roleId: 'department_default',  name: '部门默认角色', level: 'business' },
];
```

内置角色不可删除，`isBuiltin: true`。

### 部门默认角色

`department_default` 是系统自动为所有用户叠加的只读角色：

```typescript
const DEPARTMENT_DEFAULT_PERMISSIONS = [
  { permissionId: 'dept_default_menu_read',   resourceType: 'menu',   resourceId: '*', actions: ['read'] },
  { permissionId: 'dept_default_button_read', resourceType: 'button', resourceId: '*', actions: ['read'] },
];
```

**用户最终权限** = `department_default` ⊕ 显式分配的角色 ⊕ 岗位映射的角色

## 角色叠加机制

新创建的自定义角色可以通过 `baseRoleIds` 指定继承的基础角色，实现权限叠加。

```
继承链示例：

department_default (内置: 只读)
  └── 业务员 (自定义: baseRoleIds=['department_default'] + 按钮"新建订单"权限)
        └── 高级业务员 (自定义: baseRoleIds=['业务员'] + 按钮"审批订单"权限)
```

### 合并规则

1. **递归展开** `baseRoleIds`，得到从根到叶的角色链
2. **逐层合并** permissions，从根角色开始
3. **子角色覆盖**：同一 `(resourceType, resourceId)` 的权限，子角色覆盖父角色
4. **多角色合并**：同一用户的多个角色，同 `(resourceType, resourceId)` 的 actions 合并去重

```typescript
interface Role {
  roleId: string;
  name: string;
  description?: string;
  level: 'platform' | 'tenant' | 'app' | 'business';
  /** 继承的基础角色 ID 列表 — 叠加机制 */
  baseRoleIds: string[];
  /** 本角色直接拥有的权限（不含继承部分） */
  permissions: Permission[];
  isBuiltin: boolean;
  tenantId?: string;
  appId?: string;
}
```

## 权限维度

| 维度 | 说明 | 示例 |
|------|------|------|
| 菜单权限 | 控制页面/菜单的可见性 | 能否访问「用户管理」页面 |
| 按钮权限 | 控制操作按钮的可用性 | 能否点击「删除」按钮 |
| 数据权限 | 控制数据的行级可见性 | 仅能看到本部门数据 |
| 字段权限 | 控制字段的读写可见性 | 能否查看「手机号」字段 |
| API 权限 | 控制接口的访问权限 | 能否调用「导出数据」接口 |

## 前端权限引擎

### PermissionEngine

前端权限引擎位于 `packages/shared/src/core/PermissionEngine.ts`，提供以下能力：

```typescript
class PermissionEngine {
  constructor(roleRegistry: RoleRegistry);

  /** 解析角色的有效权限（递归展开继承链） */
  resolveEffectivePermissions(roleId: string): EffectivePermission[];

  /** 解析用户的所有有效权限（自动包含 department_default） */
  resolveUserPermissions(roleIds: string[]): EffectivePermission[];

  /** 判断是否拥有指定操作权限 */
  hasPermission(permissions, resourceType, resourceId, action): boolean;

  /** 根据菜单权限过滤可见菜单 */
  filterMenuByPermission(menus, userRoleIds, userId, departmentId?): FilterableMenu[];

  /** 根据按钮权限过滤可见按钮 */
  filterButtonsByPermission(buttons, userRoleIds, userId, departmentId?): FilterableButton[];

  /** 构建权限上下文（注入 $context.permissions） */
  buildPermissionContext(permissions): PermissionContext;
}
```

### PermissionContext

注入到 `$context.permissions` 的权限上下文对象，在表达式中使用：

```typescript
// 判断菜单权限
$context.permissions.has('menu', 'userManagement', 'read')

// 判断按钮权限
$context.permissions.has('button', 'deleteBtn', 'delete')

// 判断是否拥有任一权限
$context.permissions.hasAny('button', 'exportBtn', ['read', 'delete'])

// 可见菜单 ID 列表
$context.permissions.menus.includes('orderList')

// 可用按钮 ID 列表
$context.permissions.buttons.includes('exportBtn')
```

### RoleRegistry

角色注册表位于 `packages/shared/src/core/RoleRegistry.ts`：

```typescript
interface RoleRegistry {
  getRole(roleId: string): Role | undefined;
  getAllRoles(): Role[];
  getRolesByLevel(level: Role['level']): Role[];
  resolveRoleChain(roleId: string): Role[];
  registerRole(role: Role): void;
  unregisterRole(roleId: string): boolean;
}
```

内置实现 `MemoryRoleRegistry` 预置所有内置角色和部门默认角色的权限。

## 数据鉴权流程

```
请求 ──▶ 身份认证 ──▶ 角色解析 ──▶ 权限合并 ──▶ UI 过滤
  │                    │
  │                    ▼
  │              解析用户角色列表
  │              ├─ 自动叠加 department_default
  │              ├─ 平台级角色
  │              ├─ 租户级角色
  │              ├─ 应用级角色（应用管理员/查看者）
  │              └─ 自定义业务角色（含继承链展开）
  │
  ▼
JWT Token / Session
├─ userId
├─ tenantId
├─ departmentId
└─ currentAppId
```

## 数据权限范围

数据权限控制用户能看到哪些数据行，基于组织架构数据（配置中心的部门/岗位/人员）。

| 范围 | 说明 | 依赖数据 |
|------|------|---------|
| all | 全部数据 | 无限制 |
| department | 本部门数据 | 用户所属部门 ID |
| department-and-child | 本部门及下级部门数据 | 部门树形结构 |
| self | 仅本人数据 | 用户 ID |
| custom | 自定义规则 | 自定义过滤条件 |

### 数据权限配置

```typescript
interface DataScopeConfig {
  scopeType: 'all' | 'department' | 'department-and-child' | 'self' | 'custom';
  /** 自定义规则（scopeType=custom 时使用） */
  customFilter?: {
    field: string;
    operator: string;
    value: any;
    /** 引用变量：$currentUser.id, $currentUser.departmentId 等 */
    valueFrom?: string;
  };
}
```

## 菜单/按钮权限配置

### 菜单权限（PageSchema 级别）

```typescript
interface MenuPermissionConfig {
  menuId: string;
  /** 允许访问的角色 ID 列表（空 = 所有人可见） */
  allowedRoles?: string[];
  /** 允许访问的部门 ID 列表 */
  allowedDepartments?: string[];
  /** 允许访问的人员 ID 列表 */
  allowedUsers?: string[];
}
```

### 按钮权限（ComponentNode 级别）

```typescript
interface ButtonPermissionConfig {
  buttonId: string;
  /** 允许操作的角色 ID 列表（空 = 所有人可见） */
  allowedRoles?: string[];
  /** 允许操作的部门 ID 列表 */
  allowedDepartments?: string[];
  /** 允许操作的人员 ID 列表 */
  allowedUsers?: string[];
}
```

### 过滤规则

1. 有 permission 配置的菜单/按钮：检查用户角色/部门/人员是否在允许列表中
2. 无 permission 配置的菜单/按钮：默认可见
3. 三个列表都为空：所有人可见

## 应用管理员权限

每个应用分配一个管理员，负责该应用所有资源的配置管理：

| 资源类型 | 管理员权限 |
|---------|-----------|
| 页面 | 创建/编辑/删除/发布 |
| 卡片 | 创建/编辑/删除 |
| 表单 | 创建/编辑/删除 |
| 数据表 | 创建/编辑/删除/导入/导出 |
| 流程 | 创建/编辑/删除/启用/停用 |
| 自动化 | 创建/编辑/删除/启用/停用 |
| 运算 | 创建/编辑/删除 |

## 权限模型定义

```typescript
interface Permission {
  permissionId: string;
  resourceType: 'menu' | 'button' | 'data' | 'field' | 'api';
  resourceId: string;               // 资源标识（页面ID/按钮ID/表名/字段名/接口路径）
  actions: string[];                // 允许的操作（read/write/delete/publish）
  scope?: DataScopeConfig;          // 数据权限范围（resourceType=data 时）
  conditions?: Record<string, any>; // 附加条件
}
```

## 与其他模块的关系

| 模块 | 交互方式 |
|------|---------|
| 配置中心 — 组织架构 | 数据权限依赖部门/岗位数据 |
| 配置中心 — 应用管理员 | 应用管理员角色决定应用级权限 |
| 配置中心 — OpenKey | API 权限校验依赖 OpenKey 配置 |
| 流程引擎 | 审批人选择依赖组织架构 |
| 数据引擎 | 数据过滤条件由权限引擎生成 |
| 审计日志 | 记录权限变更操作 |
| 渲染引擎 | 条件规则通过 `$context.permissions` 引用权限 |
| 设计器 | 变量选择器暴露权限变量供设计时使用 |
