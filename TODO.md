# TODO — 待完成功能清单

> 最后更新：2026-06-29，P0 任务全部完成

---

## ⚠️ 开发策略

**当前处于项目早期开发周期，不考虑数据和代码的兼容性问题。**

- 遇到不兼容的数据结构变更，直接更新掉旧数据，不需要编写迁移脚本
- 代码实现只保留最新版本逻辑，不写兼容旧格式的分支代码
- 不要有历史负担，保持代码简洁，降低心智负担

---

## P0 — 高优先级（核心功能补全）

### ~~1. 自动化设计器接入路由~~ ✅ 已完成

- `AppDesignPage.tsx` 中新增 `automations` 分支，接入 `AutomationDesign` 组件
- `designers/index.ts` 导出 `AutomationDesign`
- 移除 `AutomationDesign` 中的整页跳转逻辑

---

### ~~2. 数据表编辑器完善~~ ✅ 已完成

- 字段类型扩展：新增 `enum` 类型，支持 string/number/date/enum 的约束配置（maxLength/pattern/format/min/max/precision/枚举值）
- 索引管理：新增 `TableIndex` 类型，设计器中支持创建/删除索引（唯一索引/普通索引），`schema-builder.ts` 自动生成 `CREATE INDEX` SQL
- 外键引用配置：已有（此前完成）
- 字段校验规则：新增 `ValidationRule` 类型，设计器中支持按字段配置校验规则（required/pattern/min/max/minLength/maxLength/custom）

---

### ~~3. 前端 Mock 数据替换为真实 API~~ ✅ 已完成

| 页面 | 状态 | 说明 |
|------|------|------|
| `WorkspacePage.tsx` | ✅ 已对接 | 待办/通知/应用从 API 加载 |
| `AppCenterPage.tsx` | ✅ 已对接 | 发布按钮调用 `POST /api/apps/:appId/publish` |
| `ConfigCenterPage.tsx` | ✅ 已对接 | 用户/角色/权限/租户设置全部从 API 加载 |

新增服务端 API：`/api/users`、`/api/roles`、`/api/permissions`、`/api/messages`

---

## P1 — 中优先级（功能增强）

### 4. 表单引擎高级功能

**已完成**：Form 容器、Form.Item 自动包装、校验规则编辑器、表单预求值、表单联动引擎、表单注册表

**未实现**：

| 功能 | 说明 | 工作量 |
|------|------|--------|
| 子表单（明细表） | 动态行增删、子表单汇总 | 大 |
| 特殊控件 | 签名、地理位置、扫码、附件、评分、级联选择 | 大 |
| 跨字段校验 | 日期区间、金额一致性等 | 中 |
| 异步校验 | API 校验 + loading 状态反馈 | 中 |
| 数据暂存 | localStorage 自动保存草稿 | 小 |

---

### 5. 租户管理后台

**问题**：`ConfigCenterPage.tsx` 使用 Mock 数据，无后端 API 调用。

**需要实现**：

| 模块 | 说明 | 工作量 |
|------|------|--------|
| 用户管理 | CRUD API + 前端对接 | 中 |
| 角色管理 | CRUD API + 前端对接 | 中 |
| 组织架构 | 部门/岗位树形管理、拖拽调整层级 | 大 |
| 字典管理 | 租户级字典 CRUD | 中 |
| OpenKey 管理 | API 访问权限配置 | 小 |
| 应用管理员 | 应用级管理员分配 | 小 |

---

### ~~6. 卡片设计器~~ ✅ 已完成

- `CardDesign` 组件：卡片属性/方法/事件的可视化配置界面
- 卡片预览功能
- `AppDesignPage` 中接入 `cards` 分支
- `designers/index.ts` 导出 `CardDesign`

---

### ~~7. 运算设计器~~ ✅ 已完成

**问题**：`AppDesignPage.tsx` 中 `computations` 显示"即将上线"占位，无设计器组件。

**已实现**：
- ✅ 表达式/公式编辑器（复用 ExpressionEditor）
- ✅ 运算规则配置（输入字段、运算逻辑、输出字段）
- ✅ 运算结果预览
- ✅ 支持 4 种运算类型：字段计算、公式规则、聚合计算、数据转换
- ✅ 输入字段支持从数据表自动选择
- ✅ 输出配置支持多种格式化（货币、百分比、日期等）

---

## P2 — 低优先级（后期扩展）

### 8. 多端适配器 ✅

**问题**：仅有 `WebAdapter.ts`，无 Mobile 和小程序适配器。

**已完成**：
- `BaseAdapter` — 基类，抽取组件注册/解析公共逻辑
- `H5Adapter` — H5 移动端 Web 适配（hash/history 路由、viewport 适配、localStorage 降级）
- `ReactNativeAdapter` — React Native 适配（注入 Navigation/AsyncStorage）
- `WechatMiniAppAdapter` — 微信小程序适配（wx.* API 封装）
- `WebAdapter` — 重构为继承 BaseAdapter

**实现文件**：`packages/renderer/src/core/adapters/`

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

**问题**：DB 表结构已有，无运行时代码。

**需要实现**：
- 操作日志记录（自动采集）
- 日志查询/筛选/导出
- 日志保留策略

**工作量**：中

---

### 13. 通知系统

**问题**：无通知功能。

**需要实现**：
- 站内消息
- 邮件通知
- 企业微信/钉钉/飞书推送

**工作量**：大

---

### 14. 国际化（i18n）

**问题**：无多语言支持。

**需要实现**：
- 表单标签/校验信息/占位提示多语言
- UI 界面多语言切换

**工作量**：大

---

## 已完成的核心功能（参考）

<details>
<summary>点击展开已完成功能列表</summary>

### 渲染引擎
- 组件注册表、运行时渲染器、数据绑定引擎、表达式引擎
- 依赖图管理器、统一依赖图、环境变量注册表
- 事件编译器、动作注册表（21 种标准动作）
- 条件规则引擎、联动引擎、弹窗栈管理
- 组件方法注册表、绑定缓存、表单预求值器
- 表单注册表、查询代理、组件刷新管理器

### 统一设计器
- 设计器主框架、状态管理、设计画布、组件面板
- 属性配置面板、事件动作链编排器、样式编辑器
- 校验规则编辑器、条件构建器、数据源面板

### 组件库
- antd 组件库（65 个全量组件）
- withPlatform HOC、DesignOverlay、FormContext
- MonacoEditor、ExpressionEditor、VariableTreeSelector

### 流程引擎
- BPMN Schema、流程引擎核心、6 种节点执行器
- 流程设计器、8 种节点组件、节点配置抽屉
- 审批表单运行时、任务列表、流程图

### 服务端 API
- 应用管理、认证、流程定义/实例/任务、自动化、数据查询、租户

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
