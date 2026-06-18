# TODO — 技术难点与工作计划

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
| `schemaVersion` | `number` | 文件结构版本号。引擎代码变更导致 Schema 结构变化时递增，用于自动迁移旧格式文件 |
| `version` | `number` | 业务版本号。每次保存递增，用于乐观锁 — 保存时对比版本号，不一致则提示冲突 |
| `references` | `object` | **仅资源级**（app.json 无此字段）。资源引用声明，按资源类型分组，由编译器自动生成 |

**`schemaVersion` vs `version` 的区别**：
- `schemaVersion` — 文件**结构**的版本（如 `label: "姓名"` → `label: { zh: "姓名" }`），只在引擎升级时变更，需要迁移脚本
- `version` — 文件**内容**的版本，每次用户保存时递增，用于并发冲突检测

---

## P0 — 阻塞核心链路

### 1. 设计器与 tenants/ 打通

**问题**：当前设计器是空壳，没有真正读写 `tenants/{id}/apps/{id}/pages/*.json`。

**需要实现**：
- 设计器加载时从 tenants/ 目录读取 Schema
- 设计器保存时写回 tenants/ 目录（含 `version` 乐观锁）
- 资源列表页从 tenants/ 目录扫描所有资源

**状态**：✅ 已完成 — PageDesign 通过 API 加载/保存，AppDesignPage 扫描资源列表

---

### 2. API 服务层完善

**问题**：当前 server/ 只有 auth 和 health 两个路由，缺少业务 API。

**需要实现**：
- 租户 CRUD API
- 应用 CRUD API
- 资源（页面/表/流程等）CRUD API
- 用户管理 API
- 角色权限 API

**状态**：✅ 大部分完成 — 应用 CRUD + 7 种资源 CRUD + 认证 API 已实现，用户/角色/权限 API 待补全

---

### 3. Schema 版本迁移工具

**问题**：当 `PageSchema`、`ComponentNode` 等核心类型的结构发生变更时（如字段重命名、类型变更、新增必填字段），已有的 JSON Schema 文件需要同步迁移。随着租户和应用数量增长，旧格式文件会越积越多。

**为何会出现 Schema 版本**：
- 产品迭代需要扩展字段（如组件支持多语言：`label: "姓名"` → `label: { zh: "姓名", en: "Name" }`）
- 重构命名规范（如 `props` → `attributes`）
- 删除废弃字段、合并重复字段
- 引擎能力升级需要新的配置字段

**解决方案**：
- 每个 JSON 文件通过 `schemaVersion` 字段标识当前结构版本
- 实现 Schema 迁移工具：检测版本 → 按序执行迁移脚本 → 写回文件（同时更新 `schemaVersion`）
- 迁移脚本与引擎代码版本绑定，启动时自动扫描 tenants/ 目录检测待迁移文件

**状态**：未开始

---

## P1 — 核心功能补全

### 4. 数据表编辑器

**问题**：`/designer/table/:id` 当前为占位页，字段定义、类型配置、索引管理待实现。

**需要实现**：
- 字段定义（名称、类型、必填、默认值）
- 类型配置（string/number/boolean/date/json/enum，format 扩展）
- 索引管理（唯一索引、普通索引）
- 保存为 `tenants/{id}/apps/{id}/tables/{tableId}.json`

**状态**：未开始

---

### 5. 跨资源引用管理

**问题**：页面引用数据表字段，流程引用数据表数据，自动化监听数据表变更，运算依赖数据表字段。改了数据表字段名，需要同步更新所有引用它的资源。

**解决方案**：在每个资源 JSON（page.json/table.json 等，不含 app.json）中添加 `references` 字段，按资源类型分组声明依赖关系。

```json
{
  "pageId": "xxx",
  "components": [...],
  "references": {
    "tables": ["xxx"]
  }
}
```

**实现方式**：
- `references` 由 `build-tools` 编译器从组件树/流程节点/自动化规则中自动提取生成，不在设计器里手动编辑
- 修改资源时扫描所有 `references` 引用该资源的文件，列出影响范围
- 支持批量更新引用（重命名字段时同步更新所有引用方）
- 文件量小时用 grep 扫描，文件量大时引入 SQLite FTS 索引

**状态**：未开始

---

### 6. 其他资源编辑器

**问题**：页面设计器已有基础框架，其余 6 种资源编辑器均为占位页。

**当前进度**：
- [x] 页面设计器 — 三栏拖拽基础框架
- [ ] 数据表编辑器 — 见 #4
- [ ] 表单编辑器 — 基于数据表自动生成表单
- [ ] 流程编辑器 — 可视化节点编排
- [ ] 卡片编辑器 — 组件组合保存为卡片
- [ ] 自动化编辑器 — ECA 规则配置
- [ ] 运算编辑器 — 表达式/公式编辑

**建议**：先做透页面 + 数据表，再扩展其他。

**状态**：未开始

---

### 7. 平台管理员后台

**问题**：`/platform/*` 路由显示"即将上线"占位页。

**需要实现**：
- 租户列表（名称、套餐、状态、用户数、应用数）
- 租户资源使用统计
- 全局字典管理

**状态**：未开始

---

## P2 — 前端 Mock 数据替换为真实 API

### 8. 工作台 Mock 数据替换

**位置**：`frontend/src/pages/WorkspacePage.tsx`

**需要替换**：
- MOCK_TODOS → 从 API 加载待办流程
- MOCK_NOTIFICATIONS → 从 API 加载通知
- MOCK_APPS → 从 API 加载常用应用

**状态**：未开始（依赖 #2 API 服务层）

---

### 9. 应用中心 Mock 数据替换

**位置**：`frontend/src/pages/AppCenterPage.tsx`

**需要替换**：
- MOCK_APPS → 从 API 加载应用列表
- 新建/编辑/删除/发布 → 调用 API

**状态**：未开始（依赖 #2 API 服务层）

---

### 10. 配置中心 Mock 数据替换

**位置**：`frontend/src/pages/ConfigCenterPage.tsx`

**需要替换**：
- MOCK_USERS → 从 API 加载用户列表
- MOCK_ROLES → 从 API 加载角色列表
- MOCK_PERMISSION_MATRIX → 从 API 加载权限配置

**状态**：未开始（依赖 #2 API 服务层）

---

### 11. 流程中心 Mock 数据替换

**位置**：`frontend/src/pages/WorkflowCenterPage.tsx`

**需要替换**：
- MOCK_WORKFLOWS → 从 API 加载流程列表
- 审批操作 → 调用 API

**状态**：未开始（依赖 #2 API 服务层）

---

### 12. 页面 Schema 加载

**位置**：`frontend/src/pages/AppDesignPage.tsx`

**需要实现**：
- `loadSchemaByAppId()` → 从 API 加载 Schema
- 保存时写回 tenants/ 目录（含 `version` 乐观锁）

**状态**：✅ 已完成 — PageDesign 通过 GET/PUT /api/apps/:appId/pages/:pageId 实现

---

## P3 — 性能优化（后期）

### 13. 文件 I/O 缓存层

**问题**：复杂页面 JSON 文件几十 KB，每次加载都要读文件 + parse JSON。高并发场景下文件 I/O 会成为瓶颈。

**解决方案**：
- 内存缓存层（LRU 策略）
- 文件变更监听（fs.watch），变更时自动失效缓存
- 预热常用应用的 Schema

**状态**：未开始

---

### 14. 跨租户查询性能

**问题**：平台管理员需要查看所有租户的资源使用情况。100 个租户 = 100 个 SQLite 文件，跨租户聚合查询需要遍历所有文件。

**解决方案**：复用现有 `TenantDatabasePool` 连接池。

```
_system.db 获取 tenant_id 列表
  → pool.get(tenantId) 逐个获取连接（已打开复用，未打开新建）
  → 逐个查询统计（用户数、应用数）
  → 汇总返回
```

- 池子 `poolMaxSize: 50` 已能覆盖大部分场景，LRU 自动淘汰
- 串行查询 100 个租户约 100ms（SQLite 本地文件查询极快）
- 如需优化：分页查询或异步并发（10 个一组）
- 不需要在系统库维护统计摘要，避免定时同步的复杂性

**状态**：未开始

---

## P4 — 引擎层补全

### 15. ActionRegistry 占位实现

**位置**：`packages/renderer/src/core/ActionRegistry.ts`

**需要补全**：
- showModal 占位实现（第 173 行）
- closeModal 占位实现（第 180 行）

**状态**：未开始

---

## 已完成

- [x] 项目基础架构搭建（monorepo、packages、frontend、server）
- [x] 数据引擎（SQLite koffi FFI）
- [x] 渲染引擎基础框架
- [x] 运算引擎基础框架
- [x] 权限引擎基础框架
- [x] 自动渲染引擎基础框架
- [x] 页面设计器基础框架（三栏拖拽）
- [x] 门户应用（登录、工作台、应用中心、流程中心、配置中心）
- [x] 认证系统（Koa API + scrypt 密码哈希）
- [x] 种子数据脚本（山水集团演示数据）
- [x] 租户目录结构（tenants/{id}/apps/{id}/ + data/）
- [x] 全局字典 JSON 文件
- [x] UUID 资源标识（前缀 + 8位hex + 唯一性校验）
- [x] 资源 JSON 标准字段定义（schemaVersion、version、references）
- [x] 应用 API 改为文件系统即数据源（tenants/{id}/apps/ 直接读写，不依赖 SQLite）
- [x] 租户数据改为文件系统即数据源（tenants/{id}/tenant.json，移除 _system.db 的 tenants 表）
- [x] 页面路由改为 pageId 做路由标识（/:tenantId/app/:appId/page/:pageId）
- [x] 移除 PageSchema 中的 route/title 字段，name 为唯一业务标识
- [x] 移除 app.json 中的 references 字段，仅资源级保留
- [x] 设计器页面设置面板（编辑 name/layout，布局类型不可修改）
- [x] 画布布局配置实时响应（gap/direction/columns）
- [x] 组件库架构重构 — ComponentLibrary 接口 + registerLibrary/resolveComponent
- [x] antd 组件库真实接入 — BaseProps 继承 + 65 个全量组件实现（从 antd d.ts 读取真实 props）
- [x] 设计器画布改用 resolveComponent() 渲染（删除硬编码 DESIGN_COMPONENTS）
- [x] PUT API 过滤废弃字段（title/route），防止旧数据残留
- [x] AppDesignPage 多 Tab 标题修复 + 垂直滚动修复
- [x] 删除 builtin-library.ts，仅保留 antd 作为唯一组件库
- [x] antd JSON Schema 自动生成（scripts/generate-antd-schemas.ts + typescript-json-schema）
- [x] PageRuntime 运行时渲染器（前端页面可实际渲染）
- [x] antd-manifest.ts 组件清单（73 个 antd 导出全量枚举，含筛选注释）

---

## 设计文档 vs 实际实现 — 差异清单

> 2026-06-17 全量扫描，对比 `docs/` 设计文档与 `packages/`、`server/`、`frontend/` 实际代码。

### 一、未实现（文档已描述，代码完全缺失）

| # | 功能 | 文档来源 | 备注 |
|---|------|---------|------|
| U1 | 应用复制/市场导入创建 | application.md-核心能力 | 仅支持空白创建 |
| U2 | 组件库版本锁定 (componentLibraries) | application.md-组件库版本锁定 | 无实现 |
| U3 | references 自动生成 (build-tools) | application.md-标准字段 | schema 结构已有，编译器未实现 |
| U4 | 跨应用资源引用解析 (expose+references 联动) | application.md-跨应用资源暴露 | 类型定义已有，运行时逻辑未实现 |
| U5 | 变更检测前端接入 | application.md-变更检测 | API 存在，前端未接入 |
| U6 | 数据表管理（可视化创建/字段类型/校验/索引） | application.md-核心能力 | 无实现 |
| U7 | 数据运维（导出/迁移/备份恢复） | application.md-核心能力 | 无实现 |
| U8 | 版本管理（快照/回滚/对比） | application.md-核心能力 | 无实现 |
| U9 | 应用导出（静态 JSON Schema） | application.md-核心能力 | 无实现 |
| U10 | 备份与恢复 (backupTenant) | data-layer.md-备份与恢复 | 仅有 deleteTenant |
| U11 | 字段权限（字段读写可见性） | permission-engine.md-权限维度 | 无实现 |
| U12 | API 权限（接口访问权限） | permission-engine.md-权限维度 | 无实现 |
| U13 | 跨表单联动 | form-engine.md-联动类型 | LinkageEngine 仅支持当前表单 |
| U14 | 跨字段校验（日期区间/金额一致性） | form-engine.md-校验 Level 3 | 接口定义存在，无实现 |
| U15 | 服务端校验 (Level 4) | form-engine.md-校验 Level 4 | 接口定义存在，无实现 |
| U16 | 子表单（明细表） | form-engine.md-子表单 | 无实现 |
| U17 | 特殊控件（签名/地理位置/扫码/关联记录） | form-engine.md-特殊控件 | 无实现 |
| U18 | 服务端草稿 | form-engine.md-数据暂存 | localStorage 草稿已有，服务端无 |
| U19 | 完整表单提交流程 (校验→提交→服务端校验→落库→触发流程) | form-engine.md-提交流程 | 无完整流程 |
| U20 | 按钮触发流程 (triggerWorkflow) | form-engine.md-按钮触发流程 | ActionRegistry 有注册，未对接流程引擎 |
| U21 | 流程引擎全部功能 | workflow-engine.md | DB 表结构已有，无运行时引擎 |
| U22 | 自动化引擎全部功能 | automation-engine.md | DB 表结构已有，无运行时引擎 |
| U23 | 格式化字段类型注册表 (14 种) | data-engine.md | 无实现 |
| U24 | 审计日志全部功能 | audit-log.md | DB 表结构已有，无运行时代码 |
| U25 | 消息中心全部功能 | message-center.md | DB 表结构已有，无运行时代码 |
| U26 | 组织架构集成（企业微信/钉钉/飞书/LDAP） | org-integration.md | 无实现 |
| U27 | 应用市场全部功能 | app-marketplace.md | 无实现 |
| U28 | 开发者扩展（插件/Webhook/SDK） | developer-extension.md | 无实现 |
| U29 | 租户冻结/注销管理 | deployment.md-租户管理 | 仅有 create/delete |
| U30 | 配额管理（按套餐限制） | deployment.md-配额管理 | 无实现 |
| U31 | 计量计费 | deployment.md-计量计费 | 无实现 |
| U32 | 协作中心（流程配置/审批/协作任务） | tenant-admin.md-协作中心 | 无实现 |
| U33 | 自定义脚本沙箱 (safeEvalAsync) | form-runtime-architecture.md | ActionRegistry 有 executeScript，无沙箱 |
| U34 | API 调用白名单 (防 SSRF) | form-runtime-architecture.md | 无实现 |
| U35 | 计算字段标记 (buildComputedFieldMap) | form-runtime-architecture.md | 无实现 |

### 二、部分实现（有框架但不完整）

| # | 功能 | 文档来源 | 已实现 | 缺失 |
|---|------|---------|--------|------|
| P1 | 6 种资源设计器 | render-engine.md-统一设计器 | pages 有 PageDesign | card/form/table/workflow/automation/computation 为占位 |
| P2 | 属性面板-样式 Tab | render-engine.md-属性面板 | 基础 CSS 类名/内联样式 | 完整样式配置 UI |
| P3 | 属性面板-规则 Tab | render-engine.md-属性面板 | ConditionBuilder 文件存在 | 完整显隐规则配置 UI 流程 |
| P4 | 设计区 DnD 视觉反馈 | render-engine.md-设计区 DnD | 基础拖放+放置指示线 | 跨布局拖拽、阴影效果 |
| P5 | 组件复制粘贴/克隆 | render-engine.md-组件操作 | reducer 有 ADD/REMOVE/MOVE | 复制粘贴/克隆未在 reducer 实现 |
| P6 | 主题可视化配置 UI | render-engine.md-主题配置 | ThemeConfig 类型+applyTheme CSS 变量 | 设计器中的主题配置 UI |
| P7 | 自定义卡片完整流程 | render-engine.md-卡片规范 | 类型定义+CardRenderer+SlotEditor | 创建/编辑/保存 UI 流程不完整 |
| P8 | 多端适配器 | render-engine.md-多端适配器 | PlatformAdapter 类型+WebAdapter | mobile/miniapp 适配器 |
| P9 | 数据权限（行级过滤） | permission-engine.md-数据权限 | DataScopeConfig 类型定义 | 运行时数据过滤逻辑 |
| P10 | 菜单/按钮权限前端集成 | permission-engine.md-权限维度 | PermissionEngine 方法存在 | 前端路由守卫/UI 组件未完整集成 |
| P11 | 表达式引擎-变量作用域 | computation-engine.md | evaluate/safeEvaluate 已实现 | this/record/event 等作用域变量部分支持 |
| P12 | 联动-选项联动（数据引擎查询） | form-engine.md-联动类型 | 基础选项联动 | 数据引擎查询+模板变量替换 |
| P13 | 联动-显隐联动（x-reactions） | form-engine.md-联动类型 | 条件表达式求值 | x-reactions 完整集成 |
| P14 | 异步校验 UI 反馈 | form-engine.md-校验 Level 2 | ValidatorRegistry 支持异步 | loading 状态等 UI 反馈 |
| P15 | 标准动作类型 | form-runtime-architecture.md | 17 种已实现 | 缺 8 种（condition/executeScript/refreshComponent/showLoading/hideLoading/copyToClipboard 等） |
| P16 | onChange 完整串联 | form-runtime-architecture.md | 更新值+联动触发 | 校验+用户自定义事件串联 |
| P17 | AutoFormRenderer 布局模式 | auto-rendering-engine.md | groups 布局 | tabs/steps/sections 三种模式 |
| P18 | 判别联合渲染 (oneOf/anyOf) | auto-rendering-engine.md | x-discriminator 解析 | 动态切换子表单 UI |
| P19 | 配置中心-岗位管理 | tenant-admin.md | DB positions 表存在 | 前端无 Tab |
| P20 | 配置中心-人员管理 | tenant-admin.md | 前端有 Mock | 新增用户仅 message.success |
| P21 | 配置中心-字典管理 | tenant-admin.md | DB dictionaries 表存在 | 前端无管理界面 |
| P22 | 配置中心-OpenKey 管理 | tenant-admin.md | DB open_keys 表存在 | 前端无管理界面 |
| P23 | 配置中心-应用管理员分配 | tenant-admin.md | DB app_admins 表存在 | 前端无管理界面 |
| P24 | 应用中心-批量操作 | tenant-admin.md | 无 | 批量启用/停用/删除 |
| P25 | 应用中心-筛选 | tenant-admin.md | 搜索已实现 | 状态/分类/创建时间筛选 |
| P26 | 工作台真实数据 | tenant-admin.md-工作台 | 全部 Mock | 未接入 API |
| P27 | 套餐配置数据 | deployment.md-套餐设计 | plans 表已创建 | 配置数据和限制逻辑 |

### 三、已实现但文档未覆盖

| # | 功能 | 代码位置 | 说明 |
|---|------|---------|------|
| D1 | Designer useReducer 状态管理 (15 种动作+撤销重做) | designer/DesignerState.ts | 文档未描述设计器内部状态架构 |
| D2 | DependencyTracker 组件-变量双向索引 | core/DependencyTracker.ts | 文档未单独描述 |
| D3 | UnifiedDependencyGraph 统一依赖图 | core/UnifiedDependencyGraph.ts | 文档仅简要提及 |
| D4 | ComponentRefreshManager 组件刷新管理器 | core/ComponentRefreshManager.ts | 文档未描述 |
| D5 | ServerVariableResolver ($table.xxx.filter()) | core/ServerVariableResolver.ts | 文档仅简要提及 |
| D6 | WebAdapter 完整 API (resolveComponent/applyTheme/navigate/storage/api/upload) | core/WebAdapter.ts | 文档仅简要提及 |
| D7 | 18 个内建组件完整清单 | components/builtin.tsx | 文档未列出 |
| D8 | 18 个组件 propsSchema (JSONSchema7+x-group/x-priority) | schemas/component-schemas.ts | 文档未描述 |
| D9 | 5 个设计器面板组件 (ConditionBuilder/EventActionChainEditor/SaveCardDialog/VariablePicker/SlotEditor) | designer/panels/ | 文档仅简要提及 |
| D10 | AuthContext+ProtectedRoute 前端认证体系 | auth/ | CLAUDE.md 描述了登录流程，未描述组件架构 |
| D11 | PermissionGuard 组件 | components/PermissionGuard.tsx | 文档未描述 |
| D12 | AppDesignPage 资源管理框架 (7 种类型菜单+多 Tab+右键菜单) | pages/AppDesignPage.tsx | 文档未描述 |
| D13 | AppDetailPage 运行时壳 (Sider+Content+嵌套路由) | pages/AppDetailPage.tsx | 文档未描述 |
| D14 | server 中间件体系 (error/cors/logger) | server/src/middlewares/ | 文档未描述 |
| D15 | server 配置模块 (PORT/TENANTS_DIR/DatabaseManager) | server/src/config/ | 文档未描述 |
| D16 | 路径工具函数 (get/set/isValidPath) | shared/src/utils/path.ts | 文档未描述 |
| D17 | 条件运算符模块 (evaluateCondition/getSupportedOperators) | computation/src/operators.ts | 文档未描述 |
| D18 | build-tools CLI 入口 | build-tools/src/cli.ts | 文档未描述 |
| D19 | ComponentSchemaScanner 组件 Schema 扫描器 | build-tools/src/ComponentSchemaScanner.ts | 文档未描述 |
| D20 | 系统库 v2 迁移 (删除 tenants 表改用文件系统) | data/src/schema/system.ts | 文档未描述 |
| D21 | tenant.json 租户元信息文件 | server/src/routes/tenants.ts | 文档未描述 |
| D22 | PageSettingsPanel 页面设置面板 (name/layout) | designer/panels/PropertyPanel.tsx | 文档未描述（新增功能） |
| D23 | ComponentLibrary 接口 + registerLibrary/resolveComponent | core/ComponentRegistry.ts | 已同步至 render-engine.md |
| D24 | antd 组件库定义 (BaseProps + 65 组件 allOf Schema) | libraries/antd-library.ts | 已同步至 render-engine.md |
| D25 | antd-manifest.ts 组件清单 (73 个导出全量枚举) | libraries/antd-manifest.ts | 已同步至 render-engine.md |
| D26 | LIBRARY_REGISTRY 内置库注册表 | designer/Designer.tsx | 已同步至 render-engine.md |
| D27 | PageRuntime 运行时渲染器 | frontend/src/components/PageRuntime.tsx | 已同步至 render-engine.md |
| D28 | antd JSON Schema 自动生成脚本 | scripts/generate-antd-schemas.ts | 已同步至 render-engine.md |

### 四、字典数据缺失

以下字典在 `docs/system-dictionaries.md` 中定义但无实际数据：

| 字典组 | 缺失字典 |
|--------|---------|
| 流程引擎 | workflow_node_types, workflow_statuses, workflow_instance_statuses |
| 自动化引擎 | automation_trigger_types, automation_action_types, condition_operators |
| 审计日志 | audit_event_categories, audit_action_types, audit_log_levels |
| 组织架构 | org_adapter_types, sync_statuses, employee_external_statuses |
| 消息中心 | message_channels, message_statuses, message_categories |
| 应用市场 | template_statuses, template_categories, template_pricing_types |
| 开发者扩展 | plugin_types, plugin_statuses, webhook_event_types |
