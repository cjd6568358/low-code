# 租户管理后台

租户管理后台是 SaaS 模式下的租户级管理控制台，包含**应用中心**、**协作中心**、**配置中心**三大模块。租户管理员通过此后台管理租户内的应用、人员、权限和配置。

---

## 架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                       租户管理后台                                    │
├───────────────┬───────────────────┬──────────────────────────────────┤
│   应用中心     │    协作中心        │          配置中心                 │
│               │                   │                                  │
│  ├ 应用列表    │  ├ 工作流配置      │  ├ 组织架构（架/岗/人）           │
│  ├ 应用详情    │  ├ 审批流程        │  │  ├ 部门管理                   │
│  ├ 应用资源    │  ├ 协作任务        │  │  ├ 岗位管理                   │
│  ├ 应用设置    │  └ 通知配置        │  │  └ 人员管理                   │
│  └ 应用管理员  │                   │  ├ 租户级字典                    │
│               │                   │  ├ OpenKey（API 访问权限）        │
│               │                   │  └ 应用管理员配置                 │
└───────────────┴───────────────────┴──────────────────────────────────┘
        │               │                       │
        ▼               ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    平台核心引擎层                                      │
│  渲染引擎  流程引擎  自动化引擎  数据引擎  运算引擎  权限引擎            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 应用中心

应用中心是租户管理员管理租户内所有应用的统一入口。

### 应用列表

| 功能 | 说明 |
|------|------|
| 应用列表 | 展示租户内所有应用，支持按状态/分类/创建时间筛选 |
| 应用搜索 | 按名称/描述关键字搜索 |
| 创建应用 | 空白应用 / 从模板创建 / 从应用市场安装 |
| 应用状态 | 草稿 → 已发布 → 已归档，支持启用/停用 |
| 批量操作 | 批量启用、批量停用、批量删除 |

### 应用详情

```typescript
interface AppDetail {
  appId: string;                    // 应用唯一标识
  name: string;                     // 应用名称
  description?: string;             // 应用描述
  icon?: string;                    // 应用图标
  category?: string;                // 应用分类
  status: 'draft' | 'published' | 'archived';
  version: string;                  // 当前版本
  componentLibrary: 'antd' | 'element-plus' | 'custom';  // 组件库
  createdAt: string;
  updatedAt: string;
  createdBy: string;                // 创建者
  adminIds: string[];               // 应用管理员列表

  // 资源统计
  stats: {
    pageCount: number;              // 页面数
    entityCount: number;            // 实体数
    tableCount: number;             // 数据表数
    workflowCount: number;          // 流程数
    automationCount: number;        // 自动化规则数
  };
}
```

### 应用资源管理

每个应用包含以下资源，应用管理员可在应用中心查看和管理：

| 资源类型 | 说明 | 管理操作 |
|---------|------|---------|
| 页面 | 可视化搭建的页面 | 查看、编辑、删除、复制、发布 |
| 实体 | 业务对象定义 | 查看、编辑、删除 |
| 数据表 | 数据存储 | 查看、导入、导出、清空 |
| 流程 | 业务流程定义 | 查看、编辑、启用/停用、删除 |
| 自动化 | ECA 规则 | 查看、编辑、启用/停用、删除 |
| 权限 | 应用级权限配置 | 查看、编辑 |

### 应用设置

```typescript
interface AppSettings {
  // 基础设置
  name: string;
  description?: string;
  icon?: string;
  category?: string;

  // 组件库锁定
  componentLibrary: 'antd' | 'element-plus' | 'custom';
  componentLibraryVersion?: string;

  // 访问控制
  visibility: 'private' | 'internal' | 'public';
  allowedRoles?: string[];          // 允许访问的角色

  // 数据设置
  dataRetentionDays?: number;       // 数据保留天数
  maxRecords?: number;              // 最大记录数

  // API 设置
  openApiEnabled: boolean;          // 是否开放 API
  openKeyId?: string;               // 关联的 OpenKey
}
```

---

## 协作中心

协作中心配置租户内的工作流协作能力。

### 工作流配置

| 功能 | 说明 |
|------|------|
| 流程模板管理 | 创建/编辑/删除流程模板，供应用内流程引用 |
| 审批人规则 | 配置审批人选择策略（指定人员/岗位/部门主管/发起人自选） |
| 审批方式 | 或签（一人通过）、会签（全员通过）、依次审批 |
| 超时策略 | 配置审批超时自动通过/自动拒绝/升级处理 |
| 回退策略 | 配置审批回退节点（回到上一步/回到发起人/指定节点） |

### 审批流程

```typescript
interface ApprovalFlowConfig {
  flowId: string;
  name: string;
  description?: string;
  applicableApps: string[];         // 适用的应用 ID 列表

  // 审批节点配置
  nodes: ApprovalNodeConfig[];

  // 超时配置
  timeout?: {
    duration: number;               // 超时时长（分钟）
    action: 'auto_approve' | 'auto_reject' | 'escalate';
    escalateTo?: string;            // 升级处理人
  };

  // 回退配置
  rollback?: {
    target: 'previous' | 'initiator' | 'specific';
    specificNodeId?: string;
  };
}

interface ApprovalNodeConfig {
  nodeId: string;
  name: string;
  type: 'approval' | 'cc' | 'condition';
  approvers: ApproverSelector;
  formConfig?: NodeFormConfig;      // 节点表单权限
}

interface ApproverSelector {
  mode: 'specific' | 'role' | 'department_manager' | 'initiator_choice';
  userIds?: string[];
  roleId?: string;
  departmentId?: string;
}
```

### 协作任务

| 功能 | 说明 |
|------|------|
| 任务分配 | 将任务分配给指定人员或岗位 |
| 任务状态 | 待处理 → 进行中 → 已完成 → 已关闭 |
| 任务关联 | 关联到具体的应用、页面、数据记录 |
| 任务通知 | 状态变更时自动通知相关人员 |

### 通知配置

| 功能 | 说明 |
|------|------|
| 通知模板 | 配置各类通知的消息模板 |
| 通知渠道 | 站内消息、邮件、企业微信/钉钉/飞书推送 |
| 通知规则 | 配置哪些事件触发通知、通知哪些人 |
| 免打扰 | 配置免打扰时段 |

---

## 配置中心

配置中心是租户级核心配置的统一管理入口，管理组织架构、字典、API 访问权限和应用管理员。

### 组织架构管理

#### 部门管理（架）

```typescript
interface Department {
  id: string;
  name: string;                     // 部门名称
  parentId?: string;                // 上级部门（支持多级树形结构）
  code?: string;                    // 部门编码
  managerId?: string;               // 部门负责人
  sort: number;                     // 排序
  status: 'active' | 'inactive';
  source: 'native' | 'synced';     // 来源：平台创建 / 第三方同步
  externalId?: string;              // 第三方系统 ID（同步时关联）
  createdAt: string;
  updatedAt: string;
}
```

部门管理功能：
- 树形结构展示，支持拖拽调整层级
- 新增/编辑/删除/启用/停用部门
- 指定部门负责人
- 与第三方组织架构同步状态展示
- 手动同步 / 自动同步配置

#### 岗位管理（岗）

```typescript
interface Position {
  id: string;
  name: string;                     // 岗位名称
  code?: string;                    // 岗位编码
  category?: string;                // 岗位分类（管理/技术/业务/支持）
  level?: number;                   // 岗位等级（1-10）
  departmentId?: string;            // 所属部门
  description?: string;             // 岗位描述
  status: 'active' | 'inactive';
  source: 'native' | 'synced';
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}
```

岗位管理功能：
- 岗位列表，支持按部门/分类/等级筛选
- 新增/编辑/删除/启用/停用岗位
- 岗位与部门关联
- 岗位与角色关联（岗位→角色→权限）

#### 人员管理（人）

```typescript
interface TenantUser {
  id: string;
  name: string;                     // 姓名
  avatar?: string;                  // 头像
  email?: string;                   // 邮箱
  phone?: string;                   // 手机号
  departmentId?: string;            // 所属部门
  positionId?: string;              // 岗位
  roles: string[];                  // 角色列表
  status: 'active' | 'disabled' | 'locked' | 'pending';
  source: 'native' | 'synced' | 'invited';
  externalId?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

人员管理功能：
- 人员列表，支持按部门/岗位/状态/角色筛选
- 邀请用户（邮件/手机号邀请）
- 编辑用户信息、分配部门/岗位/角色
- 启用/停用/锁定用户
- 批量导入用户（CSV/Excel）
- 与第三方组织架构同步状态展示

### 租户级字典管理

租户管理员可创建和管理租户级字典，供租户内所有应用引用。

```typescript
interface TenantDictionary {
  id: string;
  code: string;                     // 字典编码（唯一）
  name: string;                     // 字典名称
  description?: string;
  items: DictItem[];                // 字典项
  scope: 'tenant' | 'app';         // 作用域：租户级 / 应用级
  appId?: string;                   // 应用级字典关联的应用
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface DictItem {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
  children?: DictItem[];            // 支持树形字典
  disabled?: boolean;
  sort: number;
  extra?: Record<string, any>;
}
```

字典管理功能：
- 字典 CRUD（创建/编辑/删除/启停用）
- 字典项 CRUD（支持树形结构、拖拽排序）
- 字典导入/导出（JSON 格式）
- 字典引用查看（哪些应用/页面/流程引用了此字典）
- 租户级字典与系统字典的关系：系统字典为平台内置只读，租户级字典为租户自定义可编辑

### OpenKey（API 访问权限）

OpenKey 是租户对外暴露数据访问能力的 API 密钥，用于第三方系统调用租户数据。

```typescript
interface OpenKey {
  id: string;
  name: string;                     // 密钥名称
  description?: string;
  key: string;                      // API Key（自动生成，仅创建时展示完整）
  keyPrefix: string;                // Key 前缀（用于展示，如 "sk-abc...xyz"）

  // 访问范围
  permissions: OpenKeyPermission[]; // 允许访问的资源/操作
  allowedApps: string[];            // 允许访问的应用（空=全部）
  allowedIps?: string[];            // IP 白名单

  // 限流配置
  rateLimit: {
    requestsPerMinute: number;      // 每分钟请求上限
    requestsPerDay: number;         // 每日请求上限
  };

  // 状态
  status: 'active' | 'disabled' | 'expired';
  expiresAt?: string;               // 过期时间
  lastUsedAt?: string;
  createdAt: string;
  createdBy: string;
}

interface OpenKeyPermission {
  resource: string;                 // 资源类型，如 "entity", "table", "workflow"
  resourceId?: string;              // 具体资源 ID（空=该类型全部）
  actions: ('read' | 'write' | 'delete')[];  // 允许的操作
}
```

OpenKey 管理功能：
- 创建 OpenKey（选择访问范围、限流配置、过期时间）
- 查看 OpenKey 列表（不展示完整 Key，仅展示前缀）
- 启用/停用/删除 OpenKey
- 重新生成 Key（旧 Key 立即失效）
- 查看 OpenKey 使用统计（调用次数、最后调用时间）
- IP 白名单配置
- 调用日志查看（关联审计日志）

### 应用管理员配置

应用管理员是租户内某个应用的管理者，拥有该应用的完整配置权限。

```typescript
interface AppAdmin {
  id: string;
  userId: string;                   // 用户 ID
  appId: string;                    // 应用 ID
  role: 'admin' | 'viewer';         // 应用内角色
  permissions: AppAdminPermission[];
  assignedAt: string;
  assignedBy: string;
}

interface AppAdminPermission {
  resource: 'page' | 'entity' | 'table' | 'workflow' | 'automation' | 'permission';
  actions: ('create' | 'read' | 'update' | 'delete' | 'publish')[];  // 允许的操作
}
```

应用管理员角色说明：

| 角色 | 页面 | 实体 | 数据表 | 流程 | 运算 | 权限 |
|------|------|------|--------|------|------|------|
| admin（管理员） | CRUD + 发布 | CRUD | CRUD | CRUD | CRUD | 可配置 |
| viewer（查看者） | 只读 | 只读 | 只读 | 只读 | 只读 | 只读 |

应用管理员配置功能：
- 为应用分配管理员（从租户用户列表中选择）
- 配置管理员角色（admin / viewer）
- 自定义权限（细粒度控制每个资源类型的操作权限）
- 移除管理员
- 管理员操作日志（关联审计日志）

---

## 与其他模块的关系

```
配置中心
  ├─ 组织架构 → 权限引擎（数据范围：本部门/本部门及下级/仅本人）
  ├─ 组织架构 → 流程引擎（审批人选择：按岗位/按部门主管）
  ├─ 租户级字典 → 渲染引擎（组件属性面板枚举选项）
  ├─ 租户级字典 → 表单引擎（下拉选择/单选/多选数据源）
  ├─ OpenKey → 数据引擎（外部系统数据读写）
  ├─ OpenKey → API 网关（认证鉴权、限流）
  ├─ 应用管理员 → 应用中心（管理应用资源）
  └─ 应用管理员 → 审计日志（记录管理操作）

应用中心
  ├─ 应用资源 → 渲染引擎（页面搭建）
  ├─ 应用资源 → 流程引擎（流程编排）
  ├─ 应用资源 → 数据引擎（数据表管理）
  └─ 应用资源 → 运算引擎（公式配置）

协作中心
  ├─ 工作流配置 → 流程引擎（审批流程）
  ├─ 审批流程 → 消息中心（通知推送）
  └─ 协作任务 → 审计日志（操作记录）
```

---

## 数据字典

### 应用管理员角色字典 (app_admin_roles)

| code | name | 说明 |
|------|------|------|
| admin | 管理员 | 应用完整配置权限 |
| viewer | 查看者 | 只读权限 |

### OpenKey 状态字典 (openkey_statuses)

| code | name | 说明 |
|------|------|------|
| active | 启用 | 正常使用 |
| disabled | 停用 | 手动停用 |
| expired | 已过期 | 超过有效期 |

### OpenKey 资源类型字典 (openkey_resource_types)

| code | name | 说明 |
|------|------|------|
| entity | 实体 | 实体数据读写 |
| table | 数据表 | 数据表数据读写 |
| workflow | 流程 | 流程触发/查询 |
| api | API | 自定义 API 调用 |

### 协作任务状态字典 (collaboration_task_statuses)

| code | name | 说明 |
|------|------|------|
| pending | 待处理 | 已创建未开始 |
| in_progress | 进行中 | 处理中 |
| completed | 已完成 | 处理完成 |
| closed | 已关闭 | 手动关闭 |

### 部门来源字典 (department_sources)

| code | name | 说明 |
|------|------|------|
| native | 平台创建 | 管理员手动创建 |
| synced | 第三方同步 | 从企业微信/钉钉/飞书等同步 |

### 岗位分类字典 (position_categories)

| code | name | 说明 |
|------|------|------|
| management | 管理类 | 管理岗位 |
| technical | 技术类 | 技术岗位 |
| business | 业务类 | 业务岗位 |
| support | 支持类 | 支持岗位 |
