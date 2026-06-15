# TODO — 技术难点与工作计划

## 资源 JSON 标准字段

所有资源 JSON 文件必须包含以下标准字段：

```json
{
  "schemaVersion": 1,
  "version": 3,
  "references": {
    "tables": [{ "id": "xxx" }]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `schemaVersion` | `number` | 文件结构版本号。引擎代码变更导致 Schema 结构变化时递增，用于自动迁移旧格式文件 |
| `version` | `number` | 业务版本号。每次保存递增，用于乐观锁 — 保存时对比版本号，不一致则提示冲突 |
| `references` | `object` | 资源引用声明，按资源类型分组。由编译器自动生成，标注本资源依赖的其他资源，便于影响分析和批量更新 |

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

**状态**：未开始

---

### 2. API 服务层完善

**问题**：当前 server/ 只有 auth 和 health 两个路由，缺少业务 API。

**需要实现**：
- 租户 CRUD API
- 应用 CRUD API
- 资源（页面/表/流程等）CRUD API
- 用户管理 API
- 角色权限 API

**状态**：未开始

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

**解决方案**：在每个资源 JSON 中添加 `references` 字段，按资源类型分组声明依赖关系。

```json
{
  "pageId": "xxx",
  "components": [...],
  "references": {
    "tables": [{ "id": "xxx" }]
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

**位置**：`frontend/src/pages/DesignerPage.tsx`

**需要实现**：
- `loadSchemaByAppId()` → 从 API 加载 Schema
- 保存时写回 tenants/ 目录（含 `version` 乐观锁）

**状态**：未开始（依赖 #1 和 #2）

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
