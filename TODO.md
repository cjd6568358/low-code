# TODO — 待完成功能清单

> 最后更新：2026-10-09，P0 全部完成；本轮完成类型系统修复 + 数据操作节点数据源接线 + 表单草稿暂存闭环

> **📋 实时进度台账见 [PROGRESS.md](PROGRESS.md)** —— 本文件是稳定路线图，PROGRESS.md 是逐项打勾的执行台账。

---

## ⚠️ 开发策略

**当前处于项目早期开发周期，不考虑数据和代码的兼容性问题。**

- 遇到不兼容的数据结构变更，直接更新掉旧数据，不需要编写迁移脚本
- 代码实现只保留最新版本逻辑，不写兼容旧格式的分支代码
- 不要有历史负担，保持代码简洁，降低心智负担

---

## ✅ 2026-10-09 本轮完成

### 1. 类型系统与构建链修复（P0）

- 修复 60+ TypeScript 编译错误，`yarn build` 覆盖全部 9 个 workspace 并通过
- 补齐各包 `typescript`/`vitest`/`tsx` 依赖；`packages/data` 补 `tsconfig.json`；`packages/automation` 补 `build` 脚本
- 统一各包 tsconfig 策略（关闭 `composite`、`paths` 指向源码、移除 `references`）
- 新增根 `typecheck` 脚本；清理全部 `any`（`environment/permission/adapter/registry/form/table` 类型 + 数据层 + 渲染器核心）

### 2. 流程数据操作节点数据源接线（P0）

- `WorkflowEngineConfig.dataSourceResolver` + `ExecutionContext.getDatabase`（引擎层不感知存储）
- 服务层 `TenantWorkflowDataSource` / `TenantDataSourceResolver`（基于租户 SQLite 动态表）
- 数据层新增 `updateRecordsWhere` / `softDeleteRecordsWhere`（空条件抛错，防误操作全表）
- `WorkflowService.transfer/addSign` 改为委托引擎（移除直连 DB 的重复实现）

### 3. 自动化执行控制落地（P0）

- 修复「限流 + 生效时间」字段错配导致的配置完全失效
- 接入 `Throttler` / `EffectiveTimeChecker`，`AutomationLogService` 实现 `LogStore`
- `ExecutionResult.status` 新增 `'skipped'`

### 4. 表单数据暂存闭环（P1）

- 表单 Schema 新增 `draftEnabled` / `draftDebounceMs` / `draftRestoreOnInit`
- 草稿落盘 + 卸载兜底 flush + 定时器清理；**草稿不覆盖业务数据/快照数据**
- 联动产出（选项/状态/属性）从 `values` 移出到 `linkageOutput`，表单字段集合不再被伪键污染
- 新增 9 个草稿生命周期单测

### 5. 审批人指派契约修正（P0）

- 节点配置面板改用 `AssigneeSelector`（原来用 `UserSelector` 产出裸 ID，与引擎 `AssigneeStrategy` 契约不符，导致审批任务无法创建）
- `UserTask` Schema 补 `candidateUsers` / `candidateGroups`

---

## P0 — 高优先级（核心功能补全）

### ~~15. 自动化中心（设计器 + 执行引擎）~~ ✅ 已完成

**需求**：实现定时任务调度和自动化规则执行

**已实现**：
- ✅ **公共表达式引擎**（`packages/shared/src/engine/expression.ts`）
- ✅ **跨平台 Cron 调度器**（`server/src/services/CronScheduler.ts`）
- ✅ **自动化引擎**（`server/src/services/AutomationEngine.ts`）
- ✅ **执行控制** — 生效时间（`EffectiveTimeChecker`）+ 限流（`Throttler`）已在执行前生效
- ✅ **API 路由** — `POST /api/automations/trigger`、`/:id/execute`、`/:id/stats`

---

## P1 — 中优先级（功能增强）

### 4. 表单引擎高级功能

**已完成**：Form 容器、Form.Item 自动包装、校验规则编辑器、表单预求值、表单联动引擎、表单注册表、
**数据暂存（localStorage 自动保存草稿，含恢复与安全约束）**

**未实现**：

| 功能 | 说明 | 工作量 |
|------|------|--------|
| 子表单（明细表） | 动态行增删、子表单汇总 | 大 |
| 特殊控件 | 签名、地理位置、扫码、附件、评分、级联选择 | 大 |
| 跨字段校验（设计器 UI） | 引擎已实现 `validateLevel3`，但**设计器无配置入口**，需补可视化规则编辑 | 中 |
| 异步校验（设计器 UI） | 引擎已实现 `validateLevel4`（`validationApi` + `apiRequest`），但设计器无配置入口与 loading 反馈 | 中 |
| 服务端草稿 | `storage: server` 跨设备草稿（需新增草稿接口与表） | 中 |

**校验引擎现状**（`packages/renderer/src/core/ValidationEngine.ts`）：
四级校验**引擎侧已完成** —— Level 1 字段级 / Level 2 表单级 / Level 3 跨字段 / Level 4 服务端，
`validate(fields, values, { crossFieldRules, validationApi, apiRequest })` 已支持全部参数。
缺口在**设计器配置 UI**，不在引擎。

---

### 5. 租户管理后台

**现状**：`ConfigCenterPage.tsx` 已对接真实 API（用户/角色/权限），但深度不足。

**已对接 API 但需完善**：

| 模块 | 现状 | 待完善 | 工作量 |
|------|------|--------|--------|
| 用户管理 | CRUD 已对接 `/api/tenants/:tenantId/users` | 部门下拉硬编码需改为动态加载；编辑弹窗逻辑未实现 | 中 |
| 角色管理 | CRUD 已对接 `/api/roles` | 已基本完整 | 小 |
| 授权管理 | 权限矩阵已对接 `/api/permissions/matrix` | 已基本完整 | 小 |
| 租户设置 | 基本信息走 API | 安全设置（密码长度/锁定次数/会话超时）为硬编码演示数据，后端无存储 | 中 |

**未实现**：

| 模块 | 说明 | 工作量 |
|------|------|--------|
| 组织架构 | 部门/岗位树形管理、拖拽调整层级（后端 `tenants.ts` 已有基础树接口，前端无页面） | 大 |
| 字典管理 | 租户级字典 CRUD，前后端均无代码 | 中 |
| OpenKey 管理 | API 访问权限配置，前后端均无代码（表结构已就绪） | 小 |
| 应用管理员 | 应用级管理员分配 UI（后端 roles 表已支持 app 级角色，无分配界面） | 小 |

---

## P2 — 低优先级（后期扩展）

### 8. 多端适配器 ✅

**已完成**：`BaseAdapter` / `H5Adapter` / `ReactNativeAdapter` / `WechatMiniAppAdapter` / `WebAdapter`
（`packages/renderer/src/core/adapters/`）；参数序列化统一到 `http-utils.ts`

---

### 9. 版本管理

**问题**：仅有 `version` 字段（乐观锁），无版本快照、回滚、对比功能。

**需要实现**：
- 应用版本快照（保存时自动创建）
- 版本回滚（恢复到指定版本）
- 版本对比（Diff 视图）

**工作量**：大

---

### 10. 数据运维

**问题**：无数据导出、迁移、备份恢复功能。

**需要实现**：
- 数据导出（CSV/Excel/SQL）
- 数据备份与恢复
- 跨环境数据迁移

**工作量**：大

---

### 11. 应用市场

**问题**：无应用模板导入导出功能。

**需要实现**：
- 应用导出为模板（静态 JSON Schema）
- 应用市场浏览/搜索
- 从市场导入创建应用

**工作量**：大

---

### 12. 审计日志

**现状**：DB 表结构 + `AuditLogService` + `middlewares/audit.ts` + `/api/audit-logs` 路由已就绪。

**待完善**：
- 日志查询/筛选/导出的前端页面
- 日志保留策略（`AuditLogService` 已有 `cleanup`）
- 按月分区归档

**工作量**：中

---

### 13. 通知系统

**现状**：站内消息已实现（`messages` 表 + `/api/messages` 路由 + `EmailNotifyService`）；
自动化「发送通知」动作已写入 `messages` 表。

**待完善**：
- 邮件/企业微信/钉钉/飞书渠道的实际投递（`EmailNotifyService` 需安装 `nodemailer` 才可用，否则降级为控制台输出）
- 消息模板管理与变量插值
- 订阅偏好与免打扰时段

**工作量**：大

---

### 14. 国际化（i18n）

**问题**：无多语言支持。

**需要实现**：
- 表单标签/校验信息/占位提示多语言
- UI 界面多语言切换

**工作量**：大

---

### 16. 审批人表达式指派

**问题**：`AssigneeStrategy` 只支持静态 ID 列表，不支持
`{ type: 'expression', expression: '$initiator.managerId' }` 这类动态解析，
也不支持「发起人自选」（文档中提到的审批人规则之一）。

**需要实现**：
- `AssigneeStrategy` 增加 `expression` 分支
- `UserTaskExecutor.resolveAssignees` 支持表达式求值
- 设计器支持配置表达式指派 / 发起人自选

**工作量**：中

---

## 已完成的核心功能（参考）

<details>
<summary>点击展开已完成功能列表</summary>

### 渲染引擎
- 组件注册表、运行时渲染器、数据绑定引擎、表达式引擎（workerpool 沙箱硬超时）
- 依赖图管理器、统一依赖图、环境变量注册表
- 事件编译器、动作注册表（21 种标准动作）
- 条件规则引擎、联动引擎（产出与表单值分离）、弹窗栈管理
- 组件方法注册表、绑定缓存、表单预求值器
- 表单注册表、查询代理、组件刷新管理器
- 表单数据暂存（草稿落盘/恢复/清理，含"不覆盖业务数据"约束）

### 统一设计器
- 设计器主框架、状态管理、设计画布、组件面板
- 属性配置面板、事件动作链编排器、样式编辑器
- 校验规则编辑器、条件构建器、数据源面板

### 组件库
- antd 组件库（65 个全量组件）
- withPlatform HOC、DesignOverlay、FormContext
- MonacoEditor、ExpressionEditor、VariableTreeSelector、AssigneeSelector

### 流程引擎
- BPMN Schema、流程引擎核心（WorkflowEngine）、状态机、6 种节点执行器
- 数据操作执行器 + 业务数据源解析（服务层注入）
- 流程设计器、8 种节点组件、节点配置抽屉
- 审批表单运行时、任务列表、流程图
- 节点级快照、审批人指派策略、转办/加签/竞签

### 自动化引擎
- ECA 模型（TriggerMatcher / ConditionEvaluator / Throttler / EffectiveTimeChecker）
- 自动化设计器 + 执行日志查看器
- 执行控制（生效时间 + 限流）已在服务层生效

### 服务端 API
- 应用管理、认证、流程定义/实例/任务、自动化、数据查询、租户、字典、审计日志、消息

### 构建工具
- Schema 编译器、antd 类型提取器、组件 Schema 扫描器、CLI

</details>

---

## 资源 JSON 标准字段

所有资源 JSON 文件（page.json/table.json 等）必须包含以下标准字段：

```json
{
  "schemaVersion": 1,
  "version": 3,
  "references": {
    "tables": ["xxx"]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `schemaVersion` | `number` | 文件结构版本号。引擎代码变更导致 Schema 结构变化时递增 |
| `version` | `number` | 业务版本号。每次保存递增，用于乐观锁 |
| `references` | `object` | 仅资源级。资源引用声明，按资源类型分组 |

---

## 验证命令

```bash
yarn typecheck   # server + frontend + data 类型检查（快速）
yarn build       # 全部 9 个 workspace 构建（含测试文件类型检查）
yarn test        # 全部 workspace 测试
```

> **重要**：`vitest` 用 esbuild 转译，**不做类型检查**。只跑测试无法发现类型错误，
> 提交前必须至少跑一次 `yarn build` 或 `yarn typecheck`。

