# 第三方组织架构集成 (Organization Integration)

对接企业微信、钉钉、飞书、标准 HR 系统、LDAP/AD 等外部系统，自动同步组织架构、岗位、员工信息到平台。

## 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         第三方组织架构集成                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    同步调度引擎 (Sync Scheduler)                │  │
│  │                                                               │  │
│  │   ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │  │
│  │   │ 定时拉取      │  │ Webhook 接收  │  │ 手动触发             │  │  │
│  │   │ (Cron)       │  │ (Event Push) │  │ (Admin UI)          │  │  │
│  │   └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘  │  │
│  │          └────────────────┼──────────────────────┘             │  │
│  └───────────────────────────┼───────────────────────────────────┘  │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    适配器层 (Adapter Layer)                     │  │
│  │                                                               │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌───────┐ │  │
│  │  │ 企业微信   │ │  钉钉     │ │  飞书     │ │ HR API │ │ LDAP  │ │  │
│  │  │ Adapter  │ │ Adapter  │ │ Adapter  │ │Adapter │ │Adapter│ │  │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └───┬───┘ │  │
│  └───────┼────────────┼────────────┼────────────┼──────────┼─────┘  │
│          └────────────┼────────────┼────────────┼──────────┘        │
│                       ▼            ▼            ▼                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                 数据映射与冲突处理                               │  │
│  │  字段映射  ──▶  数据转换  ──▶  冲突检测  ──▶  写入平台           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              ▼                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    平台组织架构数据                              │  │
│  │            部门 (Department) / 岗位 (Position) / 员工 (Employee) │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## 通用适配器接口

所有第三方系统通过实现 `OrgAdapter` 接口接入平台。平台内置常见实现，用户可自行扩展。

### 适配器接口定义

```typescript
/**
 * 组织架构适配器接口
 * 所有第三方集成必须实现此接口
 */
interface OrgAdapter {
  /** 适配器唯一标识 */
  readonly id: string;
  /** 适配器名称 */
  readonly name: string;
  /** 适配器类型 */
  readonly type: 'wecom' | 'dingtalk' | 'feishu' | 'hr-api' | 'ldap' | 'custom';

  /** 初始化连接配置，校验配置有效性 */
  init(config: AdapterConfig): Promise<void>;

  /** 测试连接是否可用 */
  testConnection(): Promise<ConnectionTestResult>;

  /** 同步部门树（全量） */
  syncDepartments(): Promise<SyncResult<DepartmentData>>;

  /** 同步岗位列表 */
  syncPositions(): Promise<SyncResult<PositionData>>;

  /** 同步员工列表（支持增量） */
  syncEmployees(options?: SyncOptions): Promise<SyncResult<EmployeeData>>;

  /** 获取增量变更（上次同步后的变更） */
  getChanges(since: Date): Promise<OrgChanges>;

  /** 注册 Webhook 回调（如果源系统支持） */
  registerWebhook?(callbackUrl: string): Promise<WebhookRegistration>;

  /** 注销 Webhook 回调 */
  unregisterWebhook?(registrationId: string): Promise<void>;
}
```

### 同步数据结构

```typescript
/** 部门数据 */
interface DepartmentData {
  externalId: string;       // 第三方系统部门 ID
  name: string;             // 部门名称
  parentId: string | null;  // 上级部门 ID（null 为根部门）
  sort: number;             // 排序号
  leaderId?: string;        // 负责人员工 ID
  status: 'active' | 'inactive';
  extra?: Record<string, any>;  // 扩展字段
}

/** 岗位数据 */
interface PositionData {
  externalId: string;       // 第三方系统岗位 ID
  name: string;             // 岗位名称
  departmentId: string;     // 所属部门 ID
  level?: string;           // 职级
  status: 'active' | 'inactive';
  extra?: Record<string, any>;
}

/** 员工数据 */
interface EmployeeData {
  externalId: string;       // 第三方系统员工 ID
  name: string;             // 姓名
  departmentIds: string[];  // 所属部门（支持多部门）
  positionId?: string;      // 岗位 ID
  mobile?: string;          // 手机号
  email?: string;           // 邮箱
  employeeNo?: string;      // 工号
  status: 'active' | 'inactive' | 'dimission';  // 在职/禁用/离职
  managerId?: string;       // 直属上级 ID
  avatar?: string;          // 头像 URL
  entryDate?: string;       // 入职日期
  extra?: Record<string, any>;
}
```

## 内置适配器实现

### 企业微信 (WeCom)

| 配置项 | 说明 |
|-------|------|
| `corpId` | 企业 ID |
| `corpSecret` | 应用 Secret |
| `agentId` | 应用 AgentId |
| `token` / `encodingAesKey` | Webhook 回调验证 |

- **API 来源**：企业微信通讯录管理 API
- **同步范围**：部门 / 成员 / 标签（角色）
- **Webhook 支持**：✅ 成员变更事件回调

### 钉钉 (DingTalk)

| 配置项 | 说明 |
|-------|------|
| `appKey` | 应用 AppKey |
| `appSecret` | 应用 AppSecret |
| `corpId` | 企业 corpId |

- **API 来源**：钉钉通讯录管理 API
- **同步范围**：部门 / 员工 / 角色
- **Webhook 支持**：✅ 事件订阅

### 飞书 (Feishu / Lark)

| 配置项 | 说明 |
|-------|------|
| `appId` | 应用 App ID |
| `appSecret` | 应用 App Secret |

- **API 来源**：飞书开放平台通讯录 API
- **同步范围**：部门 / 用户 / 用户组
- **Webhook 支持**：✅ 事件订阅

### 标准 HR 系统 API

| 配置项 | 说明 |
|-------|------|
| `apiBaseUrl` | HR 系统 API 地址 |
| `authType` | 认证方式（`basic` / `bearer` / `oauth2`） |
| `authConfig` | 认证参数（用户名密码 / Token / ClientId+Secret） |
| `fieldMapping` | 自定义字段映射 |

- **API 来源**：符合 RESTful 规范的 HR 系统（SAP SuccessFactors、Workday、北森等）
- **同步范围**：组织 / 岗位 / 员工（需配置字段映射）
- **Webhook 支持**：⚠️ 取决于 HR 系统能力

### LDAP / Active Directory

| 配置项 | 说明 |
|-------|------|
| `serverUrl` | LDAP 服务器地址（`ldap://` 或 `ldaps://`） |
| `bindDN` | 绑定 DN |
| `bindPassword` | 绑定密码 |
| `baseDN` | 搜索基准 DN |
| `userFilter` | 用户对象过滤条件 |
| `groupFilter` | 组（部门）过滤条件 |
| `fieldMapping` | LDAP 属性 → 平台字段映射 |

- **协议**：LDAP v3
- **同步范围**：组织单位 (OU) / 组 (Group) / 用户 (User)
- **Webhook 支持**：❌ 不支持，仅定时拉取

## 同步策略

### 定时拉取（默认）

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ Cron 触发 │──▶│ 调用适配器  │──▶│ 数据映射   │──▶│ 写入平台   │
│          │    │ 拉取数据   │    │ 冲突检测   │    │ 记录日志   │
└─────────┘    └───────────┘    └───────────┘    └───────────┘
                                       │
                                       ▼
                              ┌───────────────┐
                              │ 冲突告警通知    │
                              └───────────────┘
```

| 配置项 | 默认值 | 说明 |
|-------|-------|------|
| 同步周期 | 每天 02:00 | 支持 Cron 表达式自定义 |
| 同步模式 | 增量同步 | 首次自动全量，后续增量 |
| 重试策略 | 3 次，间隔 60s | 同步失败自动重试 |
| 超时时间 | 300s | 单次同步最大时长 |
| 并发控制 | 串行执行 | 同一连接同一时间仅允许一个同步任务 |

### Webhook 实时推送

```
┌──────────────┐  POST /api/org/webhook/{adapterId}  ┌──────────────┐
│ 第三方系统     │ ─────────────────────────────────▶ │ 平台 Webhook  │
│ (事件源)      │                                    │ 接收端点      │
└──────────────┘                                    └──────┬───────┘
                                                           │
                                                    ┌──────▼───────┐
                                                    │ 签名校验      │
                                                    │ 事件去重      │
                                                    │ 异步处理      │
                                                    └──────┬───────┘
                                                           │
                                                    ┌──────▼───────┐
                                                    │ 调用适配器    │
                                                    │ 获取最新数据  │
                                                    │ 写入平台      │
                                                    └──────────────┘
```

**Webhook 安全机制**：
- 签名校验（每个连接配置独立的签名密钥）
- 请求来源 IP 白名单（可选）
- 事件去重（基于事件 ID 幂等处理）
- 失败重试（第三方系统通常有重试机制，平台端幂等保障）

**支持的事件类型**：

| 事件 | 说明 |
|------|------|
| `dept.create` / `dept.update` / `dept.delete` | 部门变更 |
| `user.create` / `user.update` / `user.delete` | 员工变更 |
| `user.dimission` | 员工离职 |

### 手动触发

管理员可在管理界面手动触发即时同步：
- **全量同步**：重新拉取所有数据，覆盖本地（慎用）
- **增量同步**：仅拉取上次同步后的变更
- **指定范围同步**：仅同步某个部门及其下属

## 数据映射与冲突处理

### 字段映射配置

每个适配器支持自定义字段映射，将第三方系统字段映射到平台标准字段：

```jsonc
{
  "adapterId": "wecom_001",
  "fieldMapping": {
    "department": {
      "externalId": "id",           // 第三方字段名 → 平台字段名
      "name": "name",
      "parentId": "parentid",
      "sort": "order",
      "leaderId": "department_leader_userid"
    },
    "employee": {
      "externalId": "userid",
      "name": "name",
      "mobile": "mobile",
      "email": "email",
      "departmentIds": "department",
      "positionId": "position",
      "status": {
        "field": "status",
        "valueMap": { "1": "active", "2": "inactive", "4": "dimission" }
      }
    }
  }
}
```

### 冲突处理策略

同步数据以**第三方系统为主**（单向同步），冲突场景及处理：

| 冲突场景 | 处理策略 |
|---------|---------|
| 平台不存在，第三方新增 | 自动创建 |
| 平台已存在，第三方有更新 | 自动更新（覆盖） |
| 平台已存在，第三方已删除 | 标记为 `inactive`（不物理删除） |
| 第三方数据校验失败 | 跳过并记录错误日志，不影响其他记录同步 |
| 部门层级循环引用 | 检测并拒绝，记录告警 |

### 防循环引用检测

```typescript
// 同步部门时检测循环引用
function detectCycle(departments: DepartmentData[]): string[] {
  const errors: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(id: string, path: string[]) {
    if (inStack.has(id)) {
      errors.push(`循环引用: ${[...path, id].join(' → ')}`);
      return;
    }
    if (visited.has(id)) return;
    visited.add(id);
    inStack.add(id);

    const children = departments.filter(d => d.parentId === id);
    for (const child of children) {
      dfs(child.externalId, [...path, id]);
    }
    inStack.delete(id);
  }

  const roots = departments.filter(d => !d.parentId);
  for (const root of roots) {
    dfs(root.externalId, []);
  }
  return errors;
}
```

## 同步管理界面

### 连接配置页

```
┌─────────────────────────────────────────────────────────────────┐
│  组织架构集成管理                              [+ 新建连接]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🏢 企业微信 - 主公司                 [已启用] [测试] [编辑] │    │
│  │  Corp ID: ww***678                                       │    │
│  │  上次同步: 2024-01-15 02:00:00  ✅ 成功 (耗时 12s)        │    │
│  │  同步范围: 全部  │  部门: 15  │  岗位: 42  │  员工: 386    │    │
│  │  同步模式: 定时(每天02:00) + Webhook                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📋 SAP HR 系统                      [已启用] [测试] [编辑] │    │
│  │  API: https://hr.company.com/api/v1                      │    │
│  │  上次同步: 2024-01-15 03:00:00  ⚠️ 部分失败 (3条错误)     │    │
│  │  同步范围: 全部  │  部门: 28  │  岗位: 65  │  员工: 520    │    │
│  │  同步模式: 定时(每天03:00)                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  🔐 LDAP - Active Directory          [已禁用] [测试] [编辑] │    │
│  │  Server: ldap://dc.company.com:389                       │    │
│  │  上次同步: 2024-01-10 02:00:00  ✅ 成功 (耗时 45s)        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 同步日志

```
┌─────────────────────────────────────────────────────────────────┐
│  同步日志                          连接: [企业微信 ▼]  [全部 ▼]   │
├─────────────────────────────────────────────────────────────────┤
│  时间              类型     结果      部门   岗位   员工   错误     │
│  ─────────────────────────────────────────────────────────────  │
│  01-15 14:30:00   Webhook  ✅ 成功   0     0     1     0       │
│  01-15 02:00:00   定时     ✅ 成功   2     0     5     0       │
│  01-14 15:20:00   Webhook  ✅ 成功   1     0     0     0       │
│  01-14 02:00:00   定时     ⚠️ 部分   0     0     3     2       │
│  01-14 02:00:00   手动     ✅ 成功   15    42    386   0       │
├─────────────────────────────────────────────────────────────────┤
│  ▶ 展开详情                                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 01-14 02:00:00 同步错误详情：                              │    │
│  │ ⚠️ 员工 [externalId=emp_0089] 手机号格式无效，已跳过        │    │
│  │ ⚠️ 员工 [externalId=emp_0102] 所属部门不存在，已跳过        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## 自定义适配器扩展

用户可基于 `OrgAdapter` 接口开发自定义适配器：

```typescript
// 自定义适配器示例：对接内部 HR 系统
class MyHrAdapter implements OrgAdapter {
  readonly id = 'my-hr-system';
  readonly name = '内部 HR 系统';
  readonly type = 'custom';

  private client: HttpClient;

  async init(config: AdapterConfig) {
    this.client = new HttpClient({
      baseURL: config.apiBaseUrl,
      auth: { type: 'bearer', token: config.token },
    });
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.client.get('/health');
      return { success: true, message: '连接正常' };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  async syncDepartments(): Promise<SyncResult<DepartmentData>> {
    const raw = await this.client.get('/departments');
    const mapped = raw.data.map(d => ({
      externalId: d.dept_code,
      name: d.dept_name,
      parentId: d.parent_code || null,
      sort: d.sort_order,
      status: d.is_active ? 'active' : 'inactive',
    }));
    return { items: mapped, total: mapped.length, errors: [] };
  }

  // ... 其他方法实现
}
```

### 适配器注册

```typescript
// 注册自定义适配器
OrgAdapterRegistry.register(MyHrAdapter);
```

注册后，管理员在连接配置页即可选择「自定义 - 内部 HR 系统」类型进行配置。

## 与现有模块的关系

| 模块 | 关系 |
|------|------|
| **权限引擎** | 同步的组织架构自动用于数据权限过滤（`dataScope: department`），员工所属部门即数据可见范围 |
| **多租户** | 每个租户独立配置自己的组织架构连接，同步数据自动注入 `tenant_id` |
| **用户管理** | 同步的员工可自动关联/创建平台账号，离职员工自动标记为 `inactive` 并禁用登录 |
| **流程引擎** | 审批节点可引用同步的组织架构（如"部门负责人审批"自动解析为对应人员） |
| **审计日志** | 组织架构同步操作（连接配置变更、手动触发同步、同步结果）自动记录审计日志 |
