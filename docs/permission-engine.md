# 权限引擎 (Permission Engine)

采用 RBAC (Role-Based Access Control) 模型，实现细粒度数据鉴权。

## RBAC 模型

```
用户 (User) ──▶ 角色 (Role) ──▶ 权限 (Permission) ──▶ 资源 (Resource)
                    ▲
                    │
              岗位 (Position) ──▶ 默认角色映射
```

### 角色层级

| 层级 | 角色 | 说明 |
|------|------|------|
| 平台级 | 超级管理员 | 平台全局管理，管理所有租户 |
| 租户级 | 租户管理员 | 管理租户内的组织架构、字典、OpenKey、应用管理员 |
| 应用级 | 应用管理员 (admin) | 管理指定应用的页面/实体/数据表/流程/运算/权限 |
| 应用级 | 应用开发者 (developer) | 开发指定应用，不可配置权限 |
| 应用级 | 应用查看者 (viewer) | 只读访问指定应用 |
| 业务级 | 自定义角色 | 租户管理员自定义的业务角色 |

### 内置角色

```typescript
interface BuiltinRole {
  roleId: string;
  name: string;
  level: 'platform' | 'tenant' | 'app' | 'business';
  permissions: Permission[];
  isBuiltin: boolean;               // 内置角色不可删除
}

// 内置角色列表
const BUILTIN_ROLES = [
  { roleId: 'super_admin', name: '超级管理员', level: 'platform' },
  { roleId: 'tenant_admin', name: '租户管理员', level: 'tenant' },
  { roleId: 'app_admin', name: '应用管理员', level: 'app' },
  { roleId: 'app_developer', name: '应用开发者', level: 'app' },
  { roleId: 'app_viewer', name: '应用查看者', level: 'app' },
];
```

## 权限维度

| 维度 | 说明 | 示例 |
|------|------|------|
| 菜单权限 | 控制页面/菜单的可见性 | 能否访问「用户管理」页面 |
| 按钮权限 | 控制操作按钮的可用性 | 能否点击「删除」按钮 |
| 数据权限 | 控制数据的行级可见性 | 仅能看到本部门数据 |
| 字段权限 | 控制字段的读写可见性 | 能否查看「手机号」字段 |
| API 权限 | 控制接口的访问权限 | 能否调用「导出数据」接口 |

## 数据鉴权流程

```
请求 ──▶ 身份认证 ──▶ 角色解析 ──▶ 权限匹配 ──▶ 数据过滤 ──▶ 返回结果
  │                    │
  │                    ▼
  │              解析用户角色列表
  │              ├─ 平台级角色
  │              ├─ 租户级角色
  │              ├─ 应用级角色（应用管理员/开发者/查看者）
  │              └─ 自定义业务角色
  │
  ▼
JWT Token / Session
├─ userId
├─ tenantId
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
    field: string;                  // 过滤字段
    operator: string;               // 条件运算符
    value: any;                     // 过滤值
    /** 引用变量：$currentUser.id, $currentUser.departmentId 等 */
    valueFrom?: string;
  };
}
```

## 应用管理员权限

应用管理员是租户内某个应用的管理者，其权限由 `app_admin_roles` 字典定义：

| 资源类型 | admin | developer | viewer |
|---------|-------|-----------|--------|
| 页面 | 创建/编辑/删除/发布 | 创建/编辑/删除 | 只读 |
| 实体 | 创建/编辑/删除 | 创建/编辑/删除 | 只读 |
| 数据表 | 创建/编辑/删除/导入/导出 | 创建/编辑/删除/导入/导出 | 只读 |
| 流程 | 创建/编辑/删除/启用/停用 | 创建/编辑/删除/启用/停用 | 只读 |
| 运算 | 创建/编辑/删除 | 创建/编辑/删除 | 只读 |
| 权限 | 查看/编辑 | 不可访问 | 不可访问 |

应用管理员的权限检查流程：

```
请求 ──▶ 身份认证
  │
  ▼
检查用户是否为当前应用的应用管理员
  ├─ 是 → 获取应用管理员角色（admin/developer/viewer）
  │        → 检查角色对目标资源类型的操作权限
  │        → 允许/拒绝
  │
  └─ 否 → 检查用户的其他角色（租户级/业务级）
           → 匹配权限
           → 允许/拒绝
```

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

interface Role {
  roleId: string;
  name: string;
  description?: string;
  level: 'platform' | 'tenant' | 'app' | 'business';
  permissions: Permission[];
  isBuiltin: boolean;
  tenantId?: string;                // 租户级角色归属
  appId?: string;                   // 应用级角色归属
  createdAt: string;
  updatedAt: string;
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
