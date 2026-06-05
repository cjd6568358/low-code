# 安全审计日志 (Audit Log)

记录平台中所有关键操作，满足企业安全合规要求，支持平台管理员和应用管理员分级查看。

## 审计分级模型

```
┌─────────────────────────────────────────────────────────────────┐
│                        审计日志分级                               │
├─────────────────────────────┬───────────────────────────────────┤
│      平台级审计 (Platform)    │       应用级审计 (Application)      │
│                             │                                   │
│  范围：平台管理操作            │  范围：应用内业务操作                 │
│  级别：全量记录，不可关闭       │  级别：可按应用配置                   │
│                             │                                   │
│  · 登录 / 登出               │  · 数据 CRUD                      │
│  · 租户管理                   │  · 流程审批                         │
│  · 权限 / 角色变更            │  · 数据导入 / 导出                   │
│  · 系统配置变更               │  · 页面发布                         │
│  · 数据导出                   │  · 应用配置变更                      │
│  · 安全事件（登录失败等）       │                                   │
├─────────────────────────────┴───────────────────────────────────┤
│  应用级审计配置选项：                                              │
│  · 关闭 — 不记录应用内操作                                        │
│  · 仅关键 — 仅记录删除、导出、权限相关操作                            │
│  · 全量 — 记录所有 CRUD 操作                                      │
└─────────────────────────────────────────────────────────────────┘
```

## 审计日志数据模型

### 核心字段

每条审计日志遵循 **5W1H** 模型：

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 日志唯一 ID | `log_20240115_abc123` |
| `who` | 操作人 | `user_zhangsan` |
| `who_name` | 操作人姓名 | `张三` |
| `when` | 操作时间 (ISO 8601) | `2024-01-15T10:30:00Z` |
| `what` | 操作类型 | `data.create` |
| `where` | 操作资源 | `app_crm / entity_customer / record_001` |
| `how` | 操作详情 (JSON) | `{"field": "status", "old": "pending", "new": "approved"}` |
| `result` | 操作结果 | `success` / `failure` |
| `ip` | 客户端 IP | `192.168.1.100` |
| `user_agent` | 浏览器 UA | `Mozilla/5.0 ...` |
| `request_id` | 请求追踪 ID | `req_xxxxxxxx` |
| `tenant_id` | 租户 ID | `tenant_001` |
| `app_id` | 应用 ID（应用级操作时） | `app_crm` |
| `duration` | 操作耗时 (ms) | `120` |

### 日志表结构

```sql
CREATE TABLE audit_logs (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id      VARCHAR(64)   NOT NULL,
  app_id         VARCHAR(64)   NULL COMMENT '应用级操作时有值',
  actor_id       VARCHAR(64)   NOT NULL COMMENT '操作人ID',
  actor_name     VARCHAR(128)  NOT NULL COMMENT '操作人姓名',
  actor_ip       VARCHAR(64)   NULL,
  actor_ua       VARCHAR(512)  NULL,
  action         VARCHAR(64)   NOT NULL COMMENT '操作类型 code',
  resource_type  VARCHAR(64)   NOT NULL COMMENT '资源类型',
  resource_id    VARCHAR(128)  NULL COMMENT '资源实例ID',
  resource_name  VARCHAR(256)  NULL COMMENT '资源名称（冗余便于展示）',
  detail         JSON          NULL COMMENT '操作详情（变更前后值等）',
  result         ENUM('success','failure') NOT NULL DEFAULT 'success',
  error_msg      VARCHAR(1024) NULL COMMENT '失败原因',
  request_id     VARCHAR(64)   NULL COMMENT '链路追踪ID',
  duration_ms    INT UNSIGNED  NULL COMMENT '操作耗时',
  created_at     DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX idx_tenant_time (tenant_id, created_at),
  INDEX idx_app_time (app_id, created_at),
  INDEX idx_actor (actor_id, created_at),
  INDEX idx_action (action, created_at),
  INDEX idx_resource (resource_type, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='安全审计日志表'
  PARTITION BY RANGE (TO_DAYS(created_at)) (
    PARTITION p202401 VALUES LESS THAN (TO_DAYS('2024-02-01')),
    PARTITION p202402 VALUES LESS THAN (TO_DAYS('2024-03-01')),
    -- 按月自动创建分区
    PARTITION p_future VALUES LESS THAN MAXVALUE
  );
```

## 审计事件分类

### 平台级事件（全量记录，不可关闭）

| 事件分类 | 事件 code | 说明 |
|---------|----------|------|
| **认证事件** | `auth.login` | 用户登录成功 |
| | `auth.login_failed` | 用户登录失败 |
| | `auth.logout` | 用户登出 |
| | `auth.password_change` | 密码修改 |
| | `auth.mfa_enable` / `auth.mfa_disable` | 多因素认证开关 |
| **授权事件** | `permission.role_create` | 创建角色 |
| | `permission.role_update` | 修改角色权限 |
| | `permission.role_delete` | 删除角色 |
| | `permission.assign` | 分配角色给用户 |
| | `permission.revoke` | 撤销用户角色 |
| **租户事件** | `tenant.create` | 创建租户 |
| | `tenant.update` | 修改租户配置 |
| | `tenant.suspend` | 冻结租户 |
| | `tenant.activate` | 激活租户 |
| | `tenant.quota_change` | 修改租户配额 |
| **系统事件** | `system.config_change` | 系统配置变更 |
| | `system.dict_change` | 字典数据变更 |
| | `system.data_export` | 数据导出 |
| | `system.backup` / `system.restore` | 备份与恢复 |

### 应用级事件（可配置记录级别）

| 事件分类 | 事件 code | 说明 | 默认级别 |
|---------|----------|------|---------|
| **数据事件** | `data.create` | 新增数据 | 关键 |
| | `data.update` | 修改数据 | 全量 |
| | `data.delete` | 删除数据 | 关键 |
| | `data.batch_delete` | 批量删除 | 关键 |
| | `data.import` | 数据导入 | 关键 |
| | `data.export` | 数据导出 | 关键 |
| **流程事件** | `workflow.submit` | 提交审批 | 关键 |
| | `workflow.approve` | 审批通过 | 关键 |
| | `workflow.reject` | 审批拒绝 | 关键 |
| | `workflow.cancel` | 撤销流程 | 关键 |
| **应用事件** | `app.publish` | 发布应用 | 关键 |
| | `app.rollback` | 回滚版本 | 关键 |
| | `app.config_change` | 应用配置变更 | 关键 |
| | `app.page_save` | 保存页面设计 | 全量 |

> **记录级别说明**：`关键` = 仅关键模式和全量模式都记录；`全量` = 仅全量模式记录。

## 日志采集机制

### 拦截器架构

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   API 请求    │────▶│  业务处理层    │────▶│  响应返回      │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────┐
│                  审计日志中间件                          │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ 请求上下文采集 │  │  响应结果采集   │  │ 日志异步写入  │  │
│  │ (who/what/   │  │  (result/     │  │ (消息队列/   │  │
│  │  where/ip)   │  │   duration)   │  │  批量写入)   │  │
│  └─────────────┘  └──────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 采集策略

- **中间件拦截**：NestJS Guard / Interceptor 统一拦截，自动采集请求上下文
- **注解标记**：通过 `@AuditLog({ action: 'data.create', resourceType: 'customer' })` 装饰器标记需要审计的接口
- **异步写入**：审计日志通过消息队列异步写入，避免影响业务性能
- **批量刷入**：日志攒批写入（默认每 5 秒或满 100 条），降低数据库压力

```typescript
// 审计日志装饰器示例
@Post('customers')
@AuditLog({
  action: 'data.create',
  resourceType: 'customer',
  resourceId: (req) => req.body.id,
  resourceName: (req) => req.body.name,
  detail: (req, res) => ({ newData: req.body }),
})
async createCustomer(@Body() dto: CreateCustomerDto) {
  return this.customerService.create(dto);
}
```

## 日志保留与清理

| 配置项 | 默认值 | 说明 |
|-------|-------|------|
| 平台级日志保留 | 365 天 | 认证、授权、系统事件 |
| 应用级日志保留 | 180 天 | 数据操作、流程事件 |
| 失败日志保留 | 365 天 | 登录失败等安全事件额外保留 |
| 分区清理策略 | 按月自动清理 | 超过保留期的分区自动 DROP |
| 冷热分离 | 可选 | 90 天内热数据在线查询，90 天前归档至对象存储 |

## 管理员查看界面

### 平台管理员视图

```
┌─────────────────────────────────────────────────────────────────┐
│  安全审计日志                                    [导出] [设置]     │
├─────────────────────────────────────────────────────────────────┤
│  筛选条件：                                                      │
│  ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ 时间范围 ▼│ │ 操作类型    ▼ │ │ 操作人    ▼│ │ 租户       ▼ │  │
│  └──────────┘ └──────────────┘ └────────────┘ └──────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────┐               │
│  │ 资源类型    ▼ │ │ 操作结果    ▼ │ │ 关键词搜索   │               │
│  └──────────────┘ └──────────────┘ └────────────┘               │
├─────────────────────────────────────────────────────────────────┤
│  时间         操作人     操作           资源           结果   租户   │
│  ─────────────────────────────────────────────────────────────  │
│  10:30:00    张三      删除数据       客户表/张三公司   成功   租户A  │
│  10:28:15    李四      登录失败       -              失败   租户B  │
│  10:25:00    王五      修改角色权限    管理员角色       成功   平台   │
│  10:20:00    赵六      导出数据       订单表 (200条)   成功   租户A  │
│  ...                                                             │
├─────────────────────────────────────────────────────────────────┤
│  ◀ 1 2 3 ... 50 ▶                共 12,580 条   每页 50 条       │
└─────────────────────────────────────────────────────────────────┘
```

### 应用管理员视图

- 仅查看所属应用内的审计日志
- 不显示租户列（已限定当前租户）
- 其余筛选条件和操作一致

### 日志详情弹窗

点击单条日志可查看详情：

```jsonc
{
  "id": "log_20240115_abc123",
  "actor": { "id": "user_zhangsan", "name": "张三", "ip": "192.168.1.100" },
  "action": "data.update",
  "resource": { "type": "customer", "id": "cust_001", "name": "ABC 公司" },
  "detail": {
    "changes": [
      { "field": "level", "oldValue": "normal", "newValue": "vip" },
      { "field": "phone", "oldValue": "138****1234", "newValue": "139****5678" }
    ]
  },
  "result": "success",
  "timestamp": "2024-01-15T10:30:00Z",
  "duration": 120,
  "requestId": "req_xxxxxxxx"
}
```

## 与现有模块的关系

| 模块 | 关系 |
|------|------|
| **权限引擎** | 审计日志查看权限独立控制（`audit.view_platform` / `audit.view_app`），不依赖数据权限 |
| **多租户** | 审计数据自动注入 `tenant_id`，查询自动追加租户过滤，平台管理员可跨租户查看 |
| **流程引擎** | 审批节点自动生成审计记录（提交/通过/拒绝/撤销） |
| **应用管理** | 应用发布/回滚/配置变更自动记录，应用管理员可查看应用内操作日志 |
| **数据引擎** | 数据 CRUD 操作按配置级别自动记录，变更详情包含字段级 old/new 值 |
