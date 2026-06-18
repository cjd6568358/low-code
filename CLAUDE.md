# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## 会话启动指令（必须执行）

**每次新会话开始时，立即执行以下操作：**
1. 读取 `memory/` 目录下所有 `.md` 文件（使用 Glob + Read）
2. 将这些记忆加载到当前会话上下文中
3. 响应应该秉持公正客观的角度分析问题，而不是刻意讨好奉承
4. 后续响应必须遵守这些规范

这是强制性指令，不需要用户提醒。

---

## 项目概述

低代码平台 - 基于 TypeScript 的 monorepo 架构

### 核心设计理念

- **全 Schema 驱动**：设计器写 Schema，运行时读 Schema，设计时与运行时通过 JSON Schema 解耦
- **七种资源统一**：页面/卡片/表单/数据表/流程/自动化/运算，全部 JSON 文件存储
- **物理级租户隔离**：每租户独立目录（Schema + SQLite），文件系统级隔离
- **TS 类型即实体**：不需要单独实体层，TS 类型自动编译为 JSON Schema 供各引擎消费
- **纯引擎架构**：packages/ 不依赖框架，可独立测试，server 组装引擎，frontend 调用 API
- **文件即数据源**：`tenants/{tenantId}/apps/` 是唯一数据源，API 直接读写 JSON 文件，不依赖数据库

## 开发规范（每次会话必须遵守）

完整文档：[memory/development-conventions.md](memory/development-conventions.md)

### TypeScript
- **禁止 `enum`**，用 union literal type（`type Status = 'active' | 'disabled'`）
- **禁止 `any`**，必须给出具体类型
- 接口用 `interface`，联合/交叉用 `type`
- 类型导入用 `import type`
- 所有接口/类型必须有 JSDoc 中文注释

### 命名规范
- 接口/类型/类：PascalCase（`PageSchema`, `PermissionEngine`）
- 函数/方法：camelCase（`resolvePermissions`）
- 常量：UPPER_SNAKE_CASE（`BUILTIN_ROLES`）
- 文件名：kebab-case（`path.ts`）或 PascalCase（`Renderer.tsx`）
- 工厂/构建函数：`createXxx`
- 判断函数：`isXxx` / `hasXxx` / `canXxx`
- 异步函数：返回 Promise 以 `Async` 结尾
- 接口：无 `I` 前缀
- 类型文件：`*.type.ts` 或 `*.types.ts`

### 引擎/服务命名后缀
- `*Engine` — 引擎（ConditionRuleEngine）
- `*Registry` — 注册表（RoleRegistry）
- `*Manager` — 管理器（DatabaseManager）
- `*Adapter` — 适配器（WebAdapter）
- `*Compiler` — 编译器（EventCompiler）

### ID 约定
- **JSON 内部**：裸 8 位 hex（如 `appId: "80e88653"`、`pageId: "abc12345"`）
- **文件系统**：带前缀（如 `app_80e88653/`、`page_abc12345.json`）
- **API 接口**：裸 ID（如 `GET /api/apps/80e88653`）
- 代码通过动态拼接 `{type}_{id}` 访问文件系统，服务端兼容裸 ID 和带前缀 ID
- **禁止**在 API 响应或前端代码中使用带前缀的资源 ID

### 设计器 DnD 开发规范
- **禁止用 `disabled` 禁用组件交互** — disabled 会吞掉鼠标事件，用 `pointer-events: none` 包裹
- **wrapper 必须同时阻止 `onMouseDown` 和 `onClick` 冒泡** — 前者选中，后者防止画布取消选中
- **拖拽源 ID 用 `useRef` 保存** — 避免 `handleDragOver` 闭包过期导致拖拽失效
- **同父移动时 reducer 需修正索引** — 先删后插导致索引偏移，源在目标前时 `adjustedIndex = newIndex - 1`
- **根级别重排需单独处理** — 没有 children 数组，直接操作 components 数组 splice
- 完整踩坑记录见 [docs/render-engine.md](docs/render-engine.md)

### 包结构
- 每个包必须有 `src/index.ts` barrel exports
- 跨包引用用 `@low-code/{pkg}`，不直接引用子路径
- 类型引用用 `import type`

### React
- 函数组件 + Hooks，不用 class 组件
- 内联样式（当前阶段），公共样式提取为 const

### 数据层（SQLite）
- 主键：TEXT（业务 ID）或 INTEGER AUTOINCREMENT
- 时间：TEXT 存 ISO8601
- JSON：TEXT 存储，应用层 parse
- 枚举：`TEXT CHECK(x IN ('a', 'b'))`
- 所有表必须有 `created_at`

### 禁止事项
- 禁止 `any`、`enum`、空 catch、`console.log` 做持久日志
- 禁止硬编码密钥/密码
- 禁止直接引用包内子路径（应通过 barrel export）

### 会话规范
- **每次会话响应结尾必须包含 "-------是的，我还清醒---------"**
- 每次解决完 bug 后需要将问题归档

### 文档同步检查表（每次改动必须执行）

**在完成任何涉及以下内容的改动后，必须对照此表检查并更新对应文档，然后在响应中列出更新了哪些文档。**

| 改动类型 | 必须同步的文档 |
|---------|--------------|
| 目录结构变更 | README.md（项目结构）、CLAUDE.md（架构说明） |
| API 接口变更 | README.md（常用命令/架构） |
| 数据库 Schema 变更 | docs/data-layer.md |
| 引擎能力变更 | 对应的 docs/xxx-engine.md |
| 租户/应用模型变更 | docs/application.md、docs/tenant-admin.md |
| 权限/角色变更 | docs/permission-engine.md、docs/tenant-admin.md |
| 设计器变更 | docs/render-engine.md |
| 新增/删除资源类型 | README.md、docs/application.md、docs/render-engine.md |
| 种子数据变更 | docs/tenant-delivery/山水集团-租户交付文档.md |
| 全局字典变更 | docs/system-dictionaries.md |
| 技术难点/设计决策 | TODO.md |
| 启动命令变更 | README.md、CLAUDE.md |

**执行流程**：
1. 改代码前：列出本次改动涉及哪些文档
2. 改代码中：同步更新文档
3. 改代码后：在响应末尾列出"已同步文档：xxx、xxx"
4. 如果某文档不需要更新，在清单中注明"无需变更"

## 常用命令

```bash
# 安装依赖
yarn install

# 启动前端（端口 5173，含登录页/工作台/应用中心/设计器）
yarn frontend

# 启动后端 API（端口 3001，Koa + SQLite）
yarn server

# 同时启动前端 + 后端
yarn start:all

# 生成演示数据（山水集团）
npx tsx packages/data/scripts/seed-shansui.ts

# 构建所有包
yarn build

# 运行测试
yarn test
```

## 架构说明

```
frontend/        ← 前端门户（Vite + React，端口 5173）
  src/auth/        认证（AuthContext、ProtectedRoute、mockAuth）
  src/components/  通用组件（PermissionGuard、PageRuntime）
  src/designers/   资源设计器（PageDesign、CardDesign、FormDesign、TableDesign、...）
  src/layouts/     布局（MainLayout）
  src/pages/       页面（LoginPage、WorkspacePage、AppCenterPage、WorkflowCenterPage、ConfigCenterPage、AppDesignPage）
  src/styles/      全局样式
server/          ← 后端 API（Koa，端口 3001）
  src/config/      配置（端口、DB 单例）
  src/middlewares/  中间件（错误、CORS、日志）
  src/routes/      路由（auth、health）
  src/services/    业务服务层（预留）
packages/        ← 引擎层（纯逻辑，无框架依赖）
tenants/         ← 租户数据（Schema + SQLite，每租户独立目录）
data/            ← 系统级数据（_system.db）
docs/            ← 项目文档
TODO.md          ← 技术难点与工作计划
```

### 分层职责

| 层 | 目录 | 职责 |
|----|------|------|
| 应用层 | `frontend/` | React UI，调用 API，路由，认证 |
| 服务层 | `server/` | Koa API，组装引擎，中间件，路由 |
| 引擎层 | `packages/*` | 纯逻辑：渲染/运算/数据/权限/自动渲染 |
| 租户数据 | `tenants/{id}/` | 每租户的 apps/（Schema）+ data/（SQLite） |
| 系统数据 | `data/` | _system.db（平台管理员、套餐配置） |

### 路由规范

所有租户页面路由必须带 `/:tenantId` 前缀：

- `/login` — 平台管理员登录
- `/:tenantId/login` — 租户登录（个性化品牌）
- `/:tenantId/workspace` — 工作台
- `/:tenantId/apps` — 应用中心
- `/:tenantId/app/:appId` — 应用运行时视图（含侧边栏页面菜单）
- `/:tenantId/app/:appId/page/:pageId` — 应用内页面运行时渲染（PageRuntime 组件驱动）
- `/:tenantId/workflows` — 流程中心
- `/:tenantId/config` — 配置中心（仅管理员）
- `/:tenantId/designer/:resourceType/:id` — 设计器

### 登录认证流程

1. 前端 POST `/api/auth/login` { email, password, tenantId? }
2. 若指定 tenantId，只在该租户库中查找用户；否则查找系统用户
3. scrypt 验证密码，查询角色/部门/岗位
4. 返回用户信息（含角色），前端存 sessionStorage
5. 前端根据角色渲染菜单和权限（PermissionGuard）

---

## koffi + SQLite 配置指南

项目使用 koffi FFI 直接调用 sqlite3.dll，无需编译原生模块（better-sqlite3）。

### 关键 API 用法

```typescript
import koffi from 'koffi';

// 1. 定义不透明类型
const sqlite3 = koffi.opaque('sqlite3');
const sqlite3_stmt = koffi.opaque('sqlite3_stmt');

// 2. 定义指针类型
const sqlite3_ptr = koffi.pointer(sqlite3);           // sqlite3*
const sqlite3_ptr_ptr = koffi.pointer(sqlite3_ptr);    // sqlite3**
const sqlite3_stmt_ptr = koffi.pointer(sqlite3_stmt);  // sqlite3_stmt*
const sqlite3_stmt_ptr_ptr = koffi.pointer(sqlite3_stmt_ptr); // sqlite3_stmt**

// 3. 函数签名 - 输出参数使用 koffi.out()
const sqlite3_open = lib.func('sqlite3_open', 'int', ['str', koffi.out(sqlite3_ptr_ptr)]);
const sqlite3_prepare_v2 = lib.func('sqlite3_prepare_v2', 'int', [
  sqlite3_ptr, 'str', 'int', koffi.out(sqlite3_stmt_ptr_ptr), 'void *'
]);

// 4. 调用 - 输出参数用数组接收
const outDb = [null];
sqlite3_open('test.db', outDb);
const db = outDb[0]; // sqlite3* 指针
```

### 常见错误及解决

| 错误 | 原因 | 解决 |
|------|------|------|
| `Unknown or invalid type name 'pointer'` | koffi 不支持 `'pointer'` | 使用 `koffi.opaque()` + `koffi.pointer()` |
| `Type sqlite3_ptr cannot be used as a parameter` | opaque 类型不能直接用作参数 | 用 `koffi.pointer()` 创建指针类型 |
| `Cannot pass ambiguous value to void *` | 输出参数类型不明确 | 使用 `koffi.out()` 标记输出参数 |
| `Invalid argument` | `koffi.as(null, 'void *')` 用法错误 | 用 `[null]` + `koffi.out()` 组合 |

### DLL 下载

- 地址: https://www.sqlite.org/download.html
- 选择: Precompiled Binaries for Windows → sqlite-dll-win-x64-*.zip
- 放置: `packages/data/lib/sqlite3.dll`

**Why:** better-sqlite3 需要 Python + Visual Studio Build Tools 编译原生模块，koffi 直接调用 DLL 避免了这个复杂性。

**How to apply:** 所有需要使用 SQLite 的地方都通过 `@low-code/data` 包访问，不要直接使用 better-sqlite3。

---

## 流程引擎数据快照设计

### 设计决策（2026-06-04）

- **触发方式**：采用按钮点击配置触发流程（非数据表 CREATE 触发），支持多按钮触发不同流程
- **快照粒度**：每个节点**流出时**捕获一次快照（流出快照），非进出都捕获
- **数据归属**：流程期间数据**只在快照表**，业务表不参与；审批结束后终态数据回写业务表
- **快照类型**：INITIAL（启动）| NODE_COMPLETE（节点流出）| NODE_REJECT（驳回流出）| FINAL（终态）| TERMINATED（终止）
- **变更追踪**：`changedFields` 字段记录相对上一快照的增量变更，支持子表单行级变更追踪
- **存储设计**：独立 `workflow_snapshots` 表，数据只读不可变
- **节点表单**：每个审批节点可独立配置表单视图（readonly/editable/hidden），数据从快照表加载

### 实现流程

- 流程启动：业务表写草稿占位（status=pending），初始快照写入快照表
- 节点处理：从快照表加载最新流出快照渲染表单，节点流出时写入新快照（业务表不动）
- 审批结束：终态快照数据回写业务表，status 更新为终态
- 参见 [workflow-engine.md](docs/workflow-engine.md) 快照机制章节

---

## 表单运行时架构

已创建 [docs/form-runtime-architecture.md](docs/form-runtime-architecture.md)，作为 `docs/form-engine.md` 的运行时实现层补充。表单引擎现为自动渲染引擎的子模块。

### 核心机制

1. **初始值注入 (FormDataContext)** — 统一数据模型，支持 5 种来源（默认值/URL参数/草稿/业务数据/快照），按优先级合并，初始化时静默执行联动
2. **联动执行引擎 (LinkageEngine)** — 触发索引 + DAG 拓扑排序 + 批量更新，支持值联动/选项联动/显隐联动/属性联动的运行时执行，含循环依赖检测
3. **组件事件桥接 (EventBridge + ActionSystem)** — 组件保持纯净只触发原生事件，桥接层将设计器配置的事件 Schema 编译为可执行函数，定义了 17 种标准动作类型（setValue/submit/apiCall/customScript 等）
4. **弹框栈机制 (ModalStack)** — `showModal` 返回 Promise 阻塞 action chain，`closeModal` 携带 result resolve 该 Promise，通过栈结构支持多层弹框嵌套（A→B→C 逐级返回），级联关闭防止幽灵弹框

### 关键实现文件

- `packages/renderer/src/core/ModalStack.ts` — 弹框栈管理器
- `packages/shared/src/types/actions.ts` — ActionContext 类型（showModal 返回 Promise，closeModal 接受 result）
- `packages/renderer/src/core/ActionRegistry.ts` — showModal/closeModal 执行器
- `packages/renderer/src/core/Renderer.tsx` — 注入 ModalStack 到 ActionContext
