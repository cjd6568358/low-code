---
name: development-conventions
description: 项目开发规范 — TypeScript/React/包结构/Schema/引擎/数据层/文档/测试/Git/会话 等 11 项规范
metadata:
  node_type: memory
  type: project
  originSessionId: c7afac04-b415-41b9-af8b-7c339d84c99b
---

# 开发规范（每次会话必须遵守）

## 1. TypeScript 规范

### 1.1 类型定义

- **禁止使用 `enum`**，统一使用 union literal type
  ```typescript
  // ❌
  enum Status { Active = 'active', Disabled = 'disabled' }

  // ✅
  type Status = 'active' | 'disabled';
  ```

- **禁止使用 `any`**，必须给出具体类型
- **接口优先于 type**，对象结构用 `interface`，联合/交叉类型用 `type`
  ```typescript
  // ✅
  interface UserInfo { id: string; name: string; }
  type ResourceType = 'menu' | 'button' | 'data';
  ```

- **使用 `import type`** 导入仅用于类型标注的引用
  ```typescript
  import type { PageSchema } from '@low-code/shared';
  ```

- **所有接口和类型必须有 JSDoc 中文注释**
  ```typescript
  /** 用户信息 */
  export interface UserInfo {
    /** 用户 ID */
    id: string;
    /** 用户名 */
    name: string;
  }
  ```

### 1.2 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 接口/类型 | PascalCase | `PageSchema`, `RenderContext` |
| 类 | PascalCase | `PermissionEngine`, `LinkageEngine` |
| 函数/方法 | camelCase | `resolveEffectivePermissions` |
| 常量 | UPPER_SNAKE_CASE | `BUILTIN_ROLES`, `DEFAULT_CONFIG` |
| 文件名 | kebab-case / PascalCase | `path.ts`, `PermissionEngine.ts` |
| 工具函数文件 | kebab-case | `path.ts`, `event-compiler.ts` |
| 类/组件文件 | PascalCase | `Renderer.tsx`, `PermissionEngine.ts` |
| 接口/类型文件 | kebab-case | `schema.ts`, `permission.ts` |

### 1.3 导入顺序

```typescript
// 1. 外部依赖
import React from 'react';
import Database from 'better-sqlite3';

// 2. 跨包引用
import type { PageSchema, RenderContext } from '@low-code/shared';

// 3. 同包内引用
import { ComponentRegistryImpl } from './ComponentRegistry';
```

---

## 2. React 组件规范

### 2.1 组件定义

- 使用 **函数组件** + Hooks，不使用 class 组件
- 组件 Props 定义为独立的 `interface`，与组件同文件导出
- 组件内部使用 **useCallback / useMemo** 稳定引用

```typescript
/** 设计器属性 */
export interface DesignerProps {
  /** 初始页面 Schema */
  schema?: PageSchema;
  /** 组件库标识 */
  library?: string;
}

export function Designer(props: DesignerProps) {
  const { schema, library = 'antd' } = props;
  // ...
}
```

### 2.2 状态管理

- 简单局部状态：`useState`
- 复杂状态逻辑：`useReducer` + action union type
- 跨组件共享：React Context

### 2.3 样式

- 使用 **内联 style 对象**（当前阶段）
- 提取公共样式为 `const xxxStyle: React.CSSProperties = {}`
- 不引入 CSS-in-JS 或 CSS Modules

### 2.4 平台内建组件

- 优先使用 Ant Design
- 组件尺寸为默认

---

## 3. 包结构规范

### 3.1 目录结构

```
packages/{name}/
  ├── package.json
  ├── src/
  │   ├── index.ts          ← barrel exports（必须）
  │   ├── types.ts          ← 类型定义（独立文件）
  │   ├── core/             ← 核心引擎/逻辑
  │   ├── components/       ← React 组件
  │   ├── schemas/          ← JSON Schema 定义
  │   ├── mock/             ← Mock 数据
  │   └── utils/            ← 工具函数
  └── __test__/             ← 测试文件（镜像 src 结构）
```

### 3.2 Barrel Exports

每个包的 `index.ts` 必须统一导出所有公开 API：

```typescript
// packages/shared/src/index.ts
export * from './types';
export * from './utils';
export * from './core/PermissionEngine';
export * from './core/RoleRegistry';
```

### 3.3 跨包引用

- 使用 `@low-code/{pkg}` 路径别名
- **只引用 `index.ts` 导出的内容**，不直接引用包内子路径
- 类型引用使用 `import type`

```typescript
import type { PageSchema, RenderContext } from '@low-code/shared';
import { expressionEngine } from '@low-code/computation';
```

---

## 4. Schema 规范

### 4.1 JSON Schema 扩展字段

组件属性 Schema 使用 JSON Schema 7 + 平台扩展字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `x-group` | string | 字段分组（基础属性/高级属性/样式） |
| `x-priority` | number | 排序权重（数字越小越靠前） |
| `x-component` | string | 自定义控件类型 |
| `x-dictionary` | string | 字典引用 code |
| `x-placeholder` | string | 占位提示 |
| `x-visible` | string | 可见性条件表达式 |
| `default` | any | 属性默认值（通过 `@default` JSDoc 注解生成） |

### 4.3 JSDoc 注解映射规则

`schema.ts` 中的 JSDoc 注解会被 `SchemaCompiler` 编译为 JSON Schema 字段：

| JSDoc 注解 | JSON Schema 字段 | 说明 |
|------------|-----------------|------|
| `@group xxx` | `x-group: "xxx"` | 字段分组 |
| `@priority N` | `x-priority: N` | 排序权重 |
| `@default xxx` | `default: xxx` | 属性默认值 |
| `@component xxx` | `x-component: "xxx"` | 自定义控件 |
| `@visible expr` | `x-visible: "expr"` | 条件显隐 |
| `@disabled expr` | `x-disabled: "expr"` | 条件禁用 |
| `@hidden` | `x-hidden: true` | 强制隐藏 |
| `@dictionary xxx` | `x-dictionary: "xxx"` | 字典引用 |
| `@deprecated xxx` | `description` 中标注 | 废弃提示 |

### 4.4 JSON Schema 生成规则（强制）

- 组件 JSON Schema 文件（*.json）由 `lc-schema scan` 命令自动生成
- **禁止手动修改 JSON Schema 文件**，所有改动必须在 `schema.ts` 中进行
- 需要新增属性/修改类型/添加默认值时，只改 `schema.ts`，然后运行 `lc-schema scan` 重新生成
- 编译命令：`npx lc-schema scan`（默认扫描 `packages/renderer/src/libraries/antd`）

### 4.2 组件属性 Schema 示例

```typescript
export const InputPropsSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    placeholder: {
      type: 'string',
      title: '占位提示',
      'x-group': '基础属性',
      'x-priority': 1,
      'x-placeholder': '请输入',
    },
  },
};
```

---

## 5. 引擎/服务规范

### 5.1 类设计

- 单一职责，一个类解决一个问题
- 构造函数注入依赖（不硬编码）
- 提供清晰的公共 API，内部方法用 `private`

```typescript
export class ConditionRuleEngine {
  constructor(private expressionEngine: DefaultExpressionEngine) {}

  /** 评估某个组件的所有规则 */
  evaluateComponent(
    componentId: string,
    componentVisible: boolean | string | undefined,
    context: RenderContext,
  ): RuleEvaluationResult { /* ... */ }

  /** 内部方法 */
  private checkPermission(/* ... */): boolean { /* ... */ }
}
```

### 5.2 命名约定

| 类型 | 后缀/模式 | 示例 |
|------|----------|------|
| 引擎 | `*Engine` | `ConditionRuleEngine`, `LinkageEngine` |
| 注册表 | `*Registry` | `ComponentRegistry`, `RoleRegistry` |
| 管理器 | `*Manager` | `DatabaseManager`, `DataSourceManager` |
| 服务 | `*Service` | `DictionaryService` |
| 适配器 | `*Adapter` | `WebAdapter`, `PlatformAdapter` |
| 编译器 | `*Compiler` | `EventCompiler`, `TsToSchemaCompiler` |

### 5.3 错误处理

- 不吞错误，至少 `console.warn`
- 对外 API 返回 `Result` 类型或抛出明确异常
- 表达式引擎必须有沙箱保护和超时机制

---

## 6. 数据层规范

### 6.1 SQLite 表设计

- 主键：`TEXT` 类型（业务 ID）或 `INTEGER PRIMARY KEY AUTOINCREMENT`
- 时间字段：`TEXT` 存储 ISO8601 格式
- JSON 字段：`TEXT` 类型存储，应用层 parse
- 布尔字段：`INTEGER`（0/1）
- 枚举字段：`TEXT CHECK(x IN ('a', 'b'))`
- 所有表必须有 `created_at` 字段

### 6.2 SQL 风格

```sql
CREATE TABLE IF NOT EXISTS users (
  user_id    TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
```

### 6.3 迁移

- 每次 schema 变更新增一条 `MigrationEntry`
- 版本号递增，不可跳号
- 迁移函数在一个事务中执行

---

## 7. 文档规范

### 7.1 代码文档

- 每个接口/类型必须有 JSDoc 中文注释
- 每个类必须有类级别注释说明职责
- 公共方法必须有 `@param` / `@returns` 注释（非显而易见时）

### 7.2 设计文档

- 每个引擎/模块对应一份 `docs/{module}.md`
- 包含：架构图、接口定义、数据结构、与其他模块关系
- 使用中文撰写

---

## 8. 类型变更规范

### 8.1 类型变更检查清单

**当修改类型定义（type/interface/enum）时，必须执行以下检查流程**：

```
1. 修改类型定义文件
   │
   ├─ 2. 搜索所有引用
   │     grep -r "类型名" packages/
   │     grep -r "旧值" packages/
   │
   ├─ 3. 列出需要同步修改的文件清单
   │
   ├─ 4. 逐一修改并验证
   │
   ├─ 5. 运行完整类型检查
   │     cd packages/xxx && npx tsc --noEmit
   │
   └─ 6. 更新相关文档
```

### 8.2 常见遗漏场景

| 场景 | 检查点 |
|------|--------|
| 类型值变更 | 搜索所有使用旧值的位置（如 `'var'` → `'variable'`） |
| 接口字段变更 | 搜索所有实现和使用该接口的位置 |
| 枚举值变更 | 搜索所有 switch/case 和条件判断 |
| 导出类型变更 | 检查所有导入该类型的文件 |

### 8.3 级联修改清单模板

```markdown
## 类型变更：[类型名]

### 变更内容
- 旧值：xxx
- 新值：yyy

### 需要同步修改的文件
- [ ] shared/types/schema.ts — 类型定义
- [ ] renderer/core/DataBindingResolver.ts — 类型判断
- [ ] renderer/hooks/useExpressionValue.ts — 类型判断
- [ ] renderer/designer/panels/VariablePicker.tsx — 保存逻辑
- [ ] renderer/designer/panels/DataSourcePanel.tsx — 保存逻辑
- [ ] docs/render-engine.md — 文档
- [ ] docs/auto-rendering-engine.md — 文档

### 验证
- [ ] 运行 `npx tsc --noEmit` 无错误
- [ ] 运行 `yarn build` 成功
```

---

## 9. 测试规范

### 8.1 测试框架

- 使用 **Vitest**
- 测试文件放在 `__test__/` 目录，镜像 src 结构
- 命名：`{FileName}.test.ts`

### 8.2 测试覆盖

- 核心引擎必须有单元测试
- 工具函数必须有单元测试
- React 组件优先测试核心逻辑，UI 测试可选

---

## 9. Git 规范

### 9.1 提交信息

```
<type>: <description>

type:
  feat     新功能
  fix      修复
  docs     文档
  refactor 重构
  test     测试
  chore    构建/工具
```

### 9.2 分支

- `main` — 稳定分支
- `feat/*` — 功能分支
- `fix/*` — 修复分支

---

## 10. 禁止事项

| 禁止 | 原因 |
|------|------|
| 使用 `any` 类型 | 破坏类型安全 |
| 使用 `enum` | 与平台 union type 规范不一致 |
| 直接引用包内子路径 | 破坏包封装，应通过 barrel export |
| 吞掉错误（空 catch） | 隐藏问题 |
| 在组件中写内联函数（大列表场景） | 导致不必要的重渲染 |
| 使用 `console.log` 做持久化日志 | 应使用审计日志系统 |
| 在前端代码中硬编码密钥/密码 | 安全风险 |

---

## 11. 会话规范

### 11.1 验证并同步

- 每次开发完代码后必须验证和文档的差异，并列出
- 每次会话中提到的关于模块和功能的修改点必须同步到文档

### 11.2 关键词输出
- 每次会话响应结尾必须包含"-------是的，我还清醒---------"，以确保当前会话还保留规范记忆

### 11.3 问题归档
- 每次解决完bug后需要将本次问题进行归档，便于后期排查
