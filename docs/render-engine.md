# 渲染引擎 (Render Engine)

渲染引擎是平台的核心模块，涵盖**统一设计器**和**运行时渲染器**两大部分。

## 统一设计器

统一设计器是应用资源的统一设计入口，路由格式：`/designer/:resourceType/:id`。

支持七种资源类型：

| 资源类型 | 路由 | 说明 |
|---------|------|------|
| 应用 | `/designer/app/:id` | 应用资源概览，展示所有资源列表 |
| 页面 | `/designer/page/:id` | 三栏可视化页面设计器 |
| 卡片 | `/designer/card/:id` | 自定义卡片编辑器 |
| 表单 | `/designer/form/:id` | 数据录入表单编辑器 |
| 数据表 | `/designer/table/:id` | 数据表结构编辑器 |
| 流程 | `/designer/workflow/:id` | 流程编排编辑器 |
| 自动化 | `/designer/automation/:id` | ECA 规则编辑器 |
| 运算 | `/designer/computation/:id` | 运算规则编辑器 |

### 页面设计器

页面设计器采用**三栏布局**，提供直观高效的可视化搭建体验。设计器采用统一的 **Web 布局**，Mobile/小程序通过环境变量微调布局细节。

### 布局总览

```
┌──────────────┬─────────────────────────────────┬──────────────┐
│              │                                 │              │
│   组件面板    │          设计区 + 预览            │  属性配置面板  │
│   (左侧)     │          (中间)                  │   (右侧)     │
│              │                                 │              │
│  ┌────────┐  │  ┌───────────────────────────┐  │  ┌────────┐  │
│  │基础组件 │  │  │                           │  │  │组件属性 │  │
│  │ ├ 输入  │  │  │    拖拽放置区域             │  │  │ ├ 名称  │  │
│  │ ├ 选择  │  │  │    (Design Canvas)        │  │  │ ├ 样式  │  │
│  │ ├ 按钮  │  │  │                           │  │  │ ├ 事件  │  │
│  │ └ 表格  │  │  │    ┌─────┐  ┌─────┐      │  │  │ ├ 校验  │  │
│  ├────────┤  │  │    │组件A │  │组件B │      │  │  │ └ 显隐  │  │
│  │高级组件 │  │  │    └─────┘  └─────┘      │  │  ├────────┤  │
│  │ ├ 图表  │  │  │                           │  │  │数据绑定 │  │
│  │ ├ 日历  │  │  │         ┌─────┐           │  │  │ ├ 字段  │  │
│  │ └ 富文本│  │  │         │组件C │           │  │  │ ├ 运算  │  │
│  ├────────┤  │  │         └─────┘           │  │  │ └ 接口  │  │
│  │自定义   │  │  │                           │  │  │        │  │
│  │组件库   │  │  └───────────────────────────┘  │  │        │  │
│  └────────┘  │  ┌───────────────────────────┐  │  └────────┘  │
│              │  │      预览模式切换            │  │              │
│  🔍 搜索    │  │  🖥 Web  │  📱 Mobile       │  │              │
└──────────────┴──┴───────────────────────────┴──┴──────────────┘
```

> 设计器预览仅支持 **Web / Mobile** 两种设备切换。小程序渲染引擎通过 `PlatformAdapter` 接口支持，但设计器中不提供小程序预览。

### 左侧 — 组件面板

- **组件分类**：参照 antd 官方分类 — 通用 / 布局 / 导航 / 数据录入 / 数据展示 / 反馈
- **拖拽添加**：从面板拖拽组件到设计区，自动生成组件配置
- **组件搜索**：支持按名称/标签快速检索组件
- **组件库标识**：显示当前应用指定的组件库（只读，不可切换）

### 右侧 — 属性配置面板

- **未选中组件时**：显示**页面设置面板**（四个 Tab）
  - **基础**：页面名称 + 布局配置（类型/间距/方向/对齐等），纯字面量配置
  - **水印**：页面级水印配置（启用/文字/图片/旋转/层级），支持变量引用和表达式绑定
  - **数据源**：页面数据源表达式配置
  - **绑定概览**：展示页面中使用变量/表达式的组件属性，按组件分组显示
- **选中组件时**：显示组件属性面板（属性/高级/事件/样式四个 Tab）
  - **属性**：`x-group === '基础属性'` 的字段（白名单过滤）
  - **高级**：`x-group === '高级属性'` 的字段
  - **事件**：事件动作链编排
  - **样式**：`className` + `StyleEditor`（内联样式）

> **重要**：绑定概览仅展示页面组件中使用变量/表达式的属性，不涉及规则配置。
- **布局类型约束**：布局类型（flex/grid）在页面创建后**不可修改**，防止组件定位错乱

### 页面水印

页面水印是页面级配置（非组件），存储在 `PageSchema.watermark` 中：

```typescript
interface WatermarkConfig {
  enabled?: boolean;    // 是否启用（禁用时保留配置）
  content?: PropValue;  // 水印文字（支持常量/变量/表达式）
  image?: PropValue;    // 水印图片
  rotate?: PropValue;   // 旋转角度
  zIndex?: PropValue;   // 层级
}
```

- 设计态：画布中实时预览字面量值（变量/表达式仅运行时解析）
- 运行时：`resolveWatermarkProps` 解析变量引用和表达式后传给 antd Watermark 组件
- 禁用时设置 `enabled: false`，配置保留不丢失，重新启用后恢复
- 水印组件已从设计器组件面板移除，统一在页面设置中配置

### 组件库架构

组件库在**应用创建时指定**，后续所有页面/卡片搭建共用同一套组件库，设计器中**不可切换**。当前仅实现 **antd**（66 个全量组件），后续可扩展其他组件库。

```typescript
// 应用创建时指定组件库
<Designer library="antd" schema={pageSchema} />
```

每个组件库通过 `ComponentLibrary` 接口定义，提供三件套：

| 产物 | 说明 |
|------|------|
| `components` | type → React 组件实现映射（全部通过 withPlatform HOC 包装） |
| `schemas` | type → 组件 JSON Schema（从 schema.ts 自动生成，含 BaseProps + 注解） |

**JSON Schema 生成流程**：

```
packages/renderer/src/libraries/antd/*/schema.ts（Props 接口 + JSDoc 注解）
        │
        ▼
packages/build-tools/src/SchemaCompiler（typescript-json-schema + 后处理）
        │
        ▼
packages/renderer/src/libraries/antd/*/*.json（最终 JSON Schema，含 x-group/x-priority）
```

**编译管道**（`packages/build-tools`）：

1. `typescript-json-schema` 从 `schema.ts` 的 Props 接口生成 JSON Schema
2. 后处理：`description` → `title`，`group` → `x-group`，`priority` → `x-priority`
3. `$ref` 外部类型（React.ReactNode 等）→ 转为 `{ type: "string" }`
4. `CSSProperties` 展开 → 简化为 `{ type: "object" }`
5. 无 `x-group` 的属性 → 默认归入 `"基础属性"`

**schema.ts 规范**：
- 每个组件一个目录：`component.tsx` + `schema.ts` + `{type}.json` + `index.ts`
- Props 接口 `extends BaseProps`，继承公共属性
- JSDoc 注解定义 UI 元数据：`@group`、`@priority`、`@ignore` 等
- 枚举值用 union literal type（`'primary' | 'default' | 'dashed'`），不用 `@enum`
- React 类型已替换：`React.ReactNode` → `string`，`React.CSSProperties` → `Record<string, unknown>`
- 废弃属性用 `@ignore` 标记，不出现在 JSON Schema 中

**当前组件库**：

| 库名 | BaseProps | 组件数 | 说明 |
|------|-----------|--------|------|
| `antd` | name, visible, style | 65 | antd 6.x 全量组件（通用 2 + 布局 6 + 导航 7 + 数据录入 19 + 数据展示 20 + 反馈 8 + 补充 3），水印已移至页面设置 |

组件面板按 antd 官方分类组织：通用 / 布局 / 导航 / 数据录入 / 数据展示 / 反馈。

新增组件库只需实现 `ComponentLibrary` 接口并在 `Designer.tsx` 的 `LIBRARY_REGISTRY` 中注册。

### 主题风格配置

支持全局主题 Token 配置，切换组件库时自动映射到对应主题系统：

```typescript
// 主题配置
interface ThemeConfig {
  // 基础 Token
  primaryColor: string;        // 主色
  borderRadius: number;        // 全局圆角
  fontSize: number;            // 基础字号
  spacing: number;             // 基础间距

  // 组件库映射（当前仅支持 antd）
  componentLibrary: string;

  // 扩展 Token
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  colorBgContainer: string;
  colorTextPrimary: string;
}
```

- **Ant Design**：映射为 `ConfigProvider` 的 `theme.token`
- **Element Plus**：映射为 CSS 变量 `--el-color-primary` 等
- **自定义组件库**：通过 CSS 变量或自定义注入方式适配

### 中间 — 设计区 + 预览

- **交互拦截**：设计态不传 `disabled`/`readOnly`（会吞鼠标事件），由 DesignOverlay Portal 的 `pointer-events: auto` 拦截所有交互，仅响应拖拽和选中操作
- **拖拽开发**：基于 DND (Drag and Drop) 实现可视化页面搭建，支持面板→画布添加、画布内排序、跨布局容器自由拖拽
- **跨布局拖拽**：组件可在不同父容器之间自由拖拽移动。拖入容器组件中部区域时自动变为该容器的子组件（指示线显示蓝色高亮包围）
- **拖拽阴影效果**：拖拽组件时显示半透明阴影预览（opacity 0.3），原位置保留淡影标识来源
- **放置标准线**：拖拽过程中实时显示蓝色指示线标识放置位置，带两端圆点标记。普通组件按上/下半部分判断 before/after；容器组件按上 1/4 → before、中 1/2 → inside、下 1/4 → after 判断
- **布局系统**：支持 Flex / Grid 两种主流布局模式
- **实时预览**：设计区即所见即所得，支持切换 **Web / Mobile** 预览（小程序不提供预览，通过渲染引擎运行时支持）
- **组件操作**：选中、拖拽排序、复制粘贴（Ctrl+C/V）、克隆（Ctrl+D）、删除（Delete），选中时显示操作栏
- **条件规则配置**：支持配置显隐规则，按条件控制表单/页面组件的展示与隐藏

#### DnD 实现指南（踩坑总结）

设计区的拖拽选中是多个交互系统的耦合点，以下是经过反复调试总结的关键设计决策和踩坑记录。

##### 1. 组件交互拦截：不传 `disabled`，用 Portal overlay 拦截

**问题**：设计模式下需要禁用组件交互（onChange/onClick），最初传 `disabled: true` 给表单组件。但 `disabled` 的 `<input>` / `<select>` 会**吞掉鼠标事件**，导致 mousedown 无法冒泡，组件选不中。

**最终方案 — DesignOverlay Portal**：
- 组件不传 `disabled`/`readOnly`，保持原始渲染
- DesignOverlay 通过 Portal 渲染 `position: fixed` 的透明层，`pointer-events: auto` 拦截所有交互
- overlay 同时承载选中框、工具栏、拖拽事件、drop 指示器
- 通过 `scrollTick` 计数器在画布滚动时重新测量组件位置
</div>
```
- 组件内部元素完全不接收鼠标事件，事件直接穿透到 wrapper
- wrapper 有 `draggable` 和 `onMouseDown`，选中和拖拽都正常
- 组件视觉上不变灰（没有 disabled 样式），符合设计器"所见即所得"

##### 2. 选中后立刻取消：onClick 冒泡到画布

**问题**：wrapper 的 `onMouseDown` 选中组件后，`onClick` 事件继续冒泡到画布根 div，触发 `handleSelect(null)` 取消选中。

**修复**：wrapper 同时阻止 `onClick` 冒泡：
```jsx
<div
  onMouseDown={(e) => { e.stopPropagation(); handleSelect(node.id); }}
  onClick={(e) => e.stopPropagation()}  // 阻止冒泡到画布
>
```

##### 3. 拖拽悬停不生效：闭包过期

**问题**：`handleDragOver` 通过 `useCallback` 捕获 `dragState.sourceId`。拖拽开始后 `setDragState` 更新了 state，但 React 还没重渲染，`handleDragOver` 闭包里的 `sourceId` 还是 `null`，直接 return 跳过。

**修复**：用 `useRef` 保存拖拽源 ID，`handleDragOver` 读 ref 而非 state：
```jsx
const dragSourceRef = useRef<string | null>(null);

const handleDragStart = useCallback((e, id) => {
  dragSourceRef.current = id;  // 同步更新
  setDragState({ sourceId: id, ... });
}, []);

const handleDragEnd = useCallback((e) => {
  dragSourceRef.current = null;  // 同步清理
  setDragState({ sourceId: null, ... });
}, []);

const handleDragOver = useCallback((e, targetId) => {
  if (!dragSourceRef.current || dragSourceRef.current === targetId) return;  // 读 ref
  // ...
}, [calcDropPosition]);  // 不依赖 dragState
```

**关键原则**：拖拽相关的状态用 `ref` 保存，UI 相关的用 `state`。

##### 4. 同父移动索引偏移

**问题**：`MOVE_COMPONENT` reducer 先从旧父组件移除源，再插入到新位置。同父移动时，移除导致后续元素前移，索引偏移一位。

**修复**：记录移除前的索引，源在目标前面时修正：
```jsx
if (sameParent && oldIndex < newIndex) {
  adjustedIndex = newIndex - 1;
}
```

**handleMove 的配合**：右移需要传 `idx + 2`（而非 `idx + 1`）来补偿 reducer 的修正：
```jsx
const newIdx = direction === 'left' ? idx - 1 : idx + 2;
```

##### 5. 根级别组件重排

**问题**：reducer 只处理了 `newParentId` 存在时的 children 数组重排，根级别（`newParentId` 为空）时只设了 `parentId: undefined` 但没动数组顺序。

**修复**：根级别单独处理——先 splice 移除，再 splice 插入：
```jsx
if (!node.parentId) {
  const [removed] = components.splice(oldIdx, 1);
  if (oldIdx < newIndex) adjustedIndex = newIndex - 1;
  components.splice(adjustedIndex, 0, removed);
  return newSchema;
}
```

##### 6. 放置位置计算规范

按设计文档规范：

| 目标类型 | 鼠标位置 | 放置动作 |
|---------|---------|---------|
| 普通组件 | 上半部分 | before（前面插入） |
| 普通组件 | 下半部分 | after（后面插入） |
| 容器组件 | 上 1/4 | before |
| 容器组件 | 中 1/2 | inside（成为子组件） |
| 容器组件 | 下 1/4 | after |

##### 7. 事件模型总结

采用 **withPlatform HOC + DesignOverlay Portal** 架构：

```
DesignCanvas.renderNode()
  ├── 传 designMode={true} + _designId + _onSelect + ... 给组件
  └── 传 overlayProps 给 DesignOverlay

PlatformComponent（withPlatform HOC 包装的 antd 组件）
  ├── designMode=true 时才注入设计态 props
  ├── className += "lc-did-{id}"      ← HOC 注入唯一标记，用于 overlay 定位
  ├── draggable={true}                ← HOC 注入，设计态可拖拽
  ├── onMouseDown={onSelect}          ← HOC 注入，选中事件
  ├── onDragStart/End/Over/...        ← HOC 注入，拖拽事件
  └── style={{ opacity: 0.3 }}       ← HOC 注入，拖拽源透明度

DesignOverlay（Portal，position: fixed）
  ├── useLayoutEffect 每次渲染后同步测量（rect 浅比较避免无限循环）
  ├── 交互拦截层 + 选中框             ← pointer-events: auto，阻止组件交互
  ├── 工具栏                           ← 复制/移动/删除
  └── Drop 指示器                      ← before/after/inside
```

**关键设计决策**：

| 方案 | 问题 |
|------|------|
| `display: inline-block` wrapper | flex 容器 `align-items: stretch` 时宽度不对 |
| `display: contents` wrapper | 测量不可靠，浏览器兼容性问题 |
| `data-component-id` 属性注入 | antd 部分组件（如 Slider）不透传 `data-*` 到 DOM |
| **className 标记 + Portal** ✅ | className 通过 `...rest` 可靠传播到 DOM |

**withPlatform HOC 工作原理**：
- 注册时执行一次（`withPlatform(AntdInput)`），结果是稳定引用
- 设计态注入 `lc-did-{id}` className 标记（antd 组件通过 `...rest` 传播到 DOM）
- 通过 `DESIGN_KEYS` 过滤 `_` 前缀设计态 props，不泄露到 DOM
- 通过 `PLATFORM_KEYS` 过滤平台能力 props（`node`/`field`/`events`/`linkage`/`designMode`/`visible`）
- `visible` 为 `false` 时运行时不渲染组件；设计态跳过此检查，确保所有组件在设计器中可见
- `enhanceValueOnChange()` 自动关联 `value` ↔ `onChange` ↔ 联动规则
- 运行时注入平台能力（`field`/`events`/`linkage`）

**DesignOverlay Portal**：
- 通过 `document.querySelector('.lc-did-{id}')` 定位组件 DOM 元素
- `position: fixed` + `getBoundingClientRect()` 精确覆盖组件
- `useLayoutEffect` 无依赖数组，每次渲染后同步测量（组件移动/resize/滚动都能响应）
- rect 浅比较：值没变时返回同一引用，避免无限 re-render 循环
- `pointer-events: auto` 拦截组件交互，`onMouseDown` 处理选中
- 设计态不传 `disabled`/`readOnly`（会吞鼠标事件），完全由 overlay 拦截交互

**面板拖入支持**：
- 从组件面板拖入时 `e.dataTransfer.types` 包含 `'component-type'`
- `handleDragOver` 检测到面板拖入后跳过 `dragSourceRef` 检查，正常计算 drop 位置
- 拖入指示线（before/after/inside）正确显示

### 右侧 — 属性配置面板

属性配置面板基于 [自动渲染引擎](auto-rendering-engine.md) 实现，读取组件的 TypeScript 类型定义并自动渲染为可视化配置表单。**所有控件统一使用 Ant Design 组件**，确保样式一致性。

#### 工作流程

```
组件 schema.ts（Props 接口 + JSDoc 注解）
        │
        ▼
  SchemaCompiler（typescript-json-schema + 后处理）
        │
        ▼
  {type}.json（含 x-group / x-priority 等扩展字段）
        │
        ▼
  注册到自动渲染引擎 → antd 控件渲染属性配置表单
```

> 📄 自动渲染引擎的 Schema 扩展字段、控件映射、布局模式、判别联合等完整规范详见 [自动渲染引擎文档](auto-rendering-engine.md)

#### TS 转 JSON Schema 示例

```typescript
// schema.ts — 组件 TS 定义
interface InputProps extends BaseProps {
  /**
   * 占位提示
   * @group 基础属性
   * @priority 10
   */
  placeholder?: string;

  /**
   * 最大长度
   * @group 基础属性
   * @priority 11
   */
  maxLength?: number;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 12
   */
  allowClear?: boolean;

  /**
   * 前置标签
   * @group 高级属性
   * @priority 20
   */
  addonBefore?: string;  // 原 React.ReactNode，已转为 string
}
```

```jsonc
// 自动生成的 JSON Schema（自动渲染引擎消费）
{
  "type": "object",
  "properties": {
    "placeholder": { "type": "string", "title": "占位提示", "x-priority": 10, "x-group": "基础属性" },
    "maxLength": { "type": "number", "title": "最大长度", "x-priority": 11, "x-group": "基础属性" },
    "allowClear": { "type": "boolean", "title": "允许清除", "x-priority": 12, "x-group": "基础属性" },
    "addonBefore": { "type": "string", "title": "前置标签", "x-priority": 20, "x-group": "高级属性" }
  }
}
```

#### 渲染引擎注册的自定义控件

渲染引擎向自动渲染引擎注册以下特有控件，用于组件属性面板：

| 控件名 | 说明 |
|--------|------|
| `ComponentSelector` | 组件选择器（从组件注册表中选择） |
| `StyleEditor` | CSS 样式编辑器 |
| `EventActionChainEditor` | 事件动作链编排器 |
| `SlotSelector` | 插槽选择器 |

> `VariablePicker` 和 `ExpressionEditor` 由自动渲染引擎内建提供，无需各引擎重复注册。

### 属性定义体系

使用 TypeScript 抽象所有基础组件的属性定义为 `BaseProps`，通过继承机制派生各组件自身的 Props 类型：

```typescript
// 基础属性抽象
interface BaseProps {
  /**
   * 字段名称
   * @group 基础属性
   * @priority 0
   * @no-binding 不支持变量/表达式绑定
   */
  name?: string;
  visible?: boolean;  // 是否可见
  style?: Record<string, unknown>;  // 内联样式（React.CSSProperties 已替换）
}

// 组件级属性继承
interface InputProps extends BaseProps {
  placeholder?: string;
  maxLength?: number;
  allowClear?: boolean;
}

interface SelectProps extends BaseProps {
  options: Option[];
  multiple?: boolean;
  showSearch?: boolean;
}
```

### 字段名唯一性校验

组件的 `name` 字段用于表单绑定和变量引用，在同一页面内必须唯一。

**校验时机**：
1. **修改时校验**：属性面板修改字段名时，实时检查是否与其他组件重名
2. **保存时校验**：保存页面前，批量检查所有组件的字段名唯一性

**字段名生成规则**：
- 使用 `antdCategoryMap` 中的组件中文名作为前缀
- 格式：`{组件名}_{序号}`（如 `输入框_01`、`按钮_02`）
- 序号自动递增，避免冲突

### x-no-binding 注解

标记属性不支持变量/表达式绑定，属性面板将隐藏切换按钮，仅显示常量输入框。

**TS Schema 注解**：
```typescript
/**
 * 字段名称
 * @no-binding 不支持变量/表达式绑定
 */
name?: string;
```

**生成的 JSON Schema**：
```json
{
  "name": {
    "type": "string",
    "title": "字段名称",
    "x-no-binding": "不支持变量/表达式绑定"
  }
}
```

### 变量/表达式类型校验

属性面板支持变量绑定和表达式配置，为避免运行时类型错误，保存时会进行类型校验。

#### 校验规则

| 场景 | 行为 |
|------|------|
| 变量引用 → 类型匹配 | 直接保存 |
| 变量引用 → 类型不匹配 | 弹出二次确认对话框 |
| 表达式 → 返回 Promise | **禁止保存**，显示错误提示 |
| 表达式 → 自动推断类型匹配 | 直接保存 |
| 表达式 → 自动推断类型不匹配 | 弹出二次确认对话框 |
| 表达式 → 无法推断（any） | 可手动声明返回类型 |

#### 类型兼容性规则

- `any` 类型兼容所有类型
- `number` 和 `string` 可互转（数字字符串场景）
- `integer` 是 `number` 的子类型
- `object` 兼容 `array`
- `null`/`undefined` 兼容所有类型（可选属性场景）

#### 禁止返回 Promise

表达式中不允许返回 Promise 类型，以下调用会被检测并禁止：

- `$fetch.get()` / `$fetch.post()` 等 HTTP 请求方法
- `$table.xxx.execute()` / `$table.xxx.first()` 等查询执行方法
- `$computation.evaluate()` 运算引擎求值
- `await` 表达式
- `new Promise()` 构造

#### any 类型警告

当变量引用或表达式中包含类型为 `any` 的环境变量时，控制台会输出警告信息：

- `$component.xxx.value` — 组件值类型为 any，建议使用具体属性路径
- `$data.xxx.data` — 数据源返回类型为 any，建议使用 .data 属性

#### 表达式类型推断

系统会自动推断表达式的返回类型，支持以下场景：

| 表达式 | 推断类型 | 依据 |
|--------|----------|------|
| `$user.name` | string | 变量路径解析 |
| `return $user.name` | string | 提取 return 后表达式 |
| `$user.name + "test"` | string | 字符串拼接 |
| `$user.id === "xxx"` | boolean | 比较运算符 |
| `$platform.web && $user.id` | boolean | 逻辑运算符 |
| `Number($user.id)` | number | 类型转换函数 |

对于无法自动推断的复杂表达式，可在表达式编辑器中手动声明返回类型。

#### 实现文件

- `packages/renderer/src/core/expression-type-infer.ts` — 表达式类型推断工具
- `packages/renderer/src/designer/panels/VariablePicker.tsx` — 变量选择器（集成类型校验）
- `packages/renderer/src/designer/panels/TypeMismatchModal.tsx` — 类型不匹配确认对话框

## 自定义卡片规范

自定义卡片是由基础组件组合而成的**最小化业务组件**，支持保存为模板复用，卡片内部可递归嵌套其他卡片。卡片对外暴露可控的属性（Props）、事件（Events）、插槽（Slots）接口，对内封装内部实现，行为等同于用户自定义的原生组件。

### 设计原则

- **显式暴露**：卡片作者必须显式声明对外暴露的属性，内部属性不对外可见，保证封装性
- **表达式绑定**：暴露属性通过表达式映射到内部组件属性，支持引用 `$props`（暴露属性上下文）和运算引擎能力
- **统一注册**：卡片保存后自动注册到组件注册表，以 `card:{cardId}` 作为组件 type，与基础组件统一解析
- **递归嵌套**：卡片内部可引用其他卡片，实现多层业务抽象

### 卡片 Schema 定义

```typescript
interface CustomCardDefinition {
  // === 元信息 ===
  id: string;                          // 唯一标识，如 "card_customer_summary"
  name: string;                        // 显示名称，如 "客户摘要卡片"
  icon?: string;                       // 图标
  description?: string;                // 描述
  version: string;                     // 语义化版本 "1.0.0"
  category?: string;                   // 分类标签
  author?: string;                     // 创建者

  // === 对外接口 ===
  interface: CardInterface;

  // === 内部实现 ===
  template: ComponentNode[];           // 内部组件树（与页面 components 结构一致）

  // === 属性绑定 ===
  bindings: Record<string, PropBinding>;

  // === 事件定义 ===
  events?: CardEventDef[];

  // === 默认样式 ===
  defaultStyle?: React.CSSProperties;
}
```

### 对外接口 — CardInterface

```typescript
interface CardInterface {
  props: ExposedProp[];                // 暴露的属性列表
  methods?: MethodDefinition[];       // 暴露的方法列表
  slots?: SlotDefinition[];           // 插槽定义
  events?: EventDefinition[];         // 可触发的事件
}

/** 暴露属性 */
interface ExposedProp {
  name: string;                        // 属性名，如 "customerName"
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  title: string;                       // 中文标题，用于属性面板显示
  description?: string;                // 帮助说明
  required?: boolean;
  default?: any;                       // 默认值
  group?: string;                      // 属性面板分组
  priority?: number;                   // 属性面板排序
  properties?: ExposedProp[];          // type 为 object/array 时的子属性结构
  enum?: Array<{ label: string; value: any }>;  // 枚举值
  readable?: boolean;                  // 是否可被外部读取（默认 true）
  writable?: boolean;                  // 是否可被外部写入（默认 true）
}

/** 暴露方法 */
interface MethodDefinition {
  name: string;                        // 方法名，如 "validate", "reset", "getData"
  title: string;                       // 显示标题，用于动作配置下拉
  description?: string;                // 帮助说明
  group?: string;                      // 方法分组
  params?: MethodParam[];             // 参数列表
  returnType?: string;                 // 返回值类型描述
  /** 内部执行逻辑：动作链定义 */
  implementation: ActionChain;
}

/** 方法参数 */
interface MethodParam {
  name: string;                        // 参数名
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  title: string;                       // 参数标题（UI 配置时显示）
  required?: boolean;
  default?: any;
  description?: string;
  enum?: Array<{ label: string; value: any }>;
}

/** 插槽定义 */
interface SlotDefinition {
  name: string;                        // 插槽名，如 "header", "footer", "actions"
  title: string;                       // 显示标题
  description?: string;
  accept?: string[];                   // 允许放入的组件类型，空=不限
  maxItems?: number;                   // 最大子项数，空=不限
  defaultContent?: ComponentNode[];    // 默认内容
}

/** 事件定义 */
interface EventDefinition {
  name: string;                        // 事件名，如 "onCustomerClick"
  title: string;
  description?: string;
  payload?: Record<string, string>;    // 事件携带的数据结构描述
}
```

### 插槽组件 — SlotComponent

插槽是卡片中的**特殊组件**，用于暴露变量/方法/事件给调用方。卡片作者在设计器中将插槽组件拖入卡片模板，配置名称、标题、约束条件和暴露接口；消费方使用卡片时，可向插槽填充自定义内容，并通过 `$slot.xxx` 引用插槽暴露的变量。

#### 设计器中的插槽配置

插槽组件在左侧面板的「自定义」分类下展示。拖入卡片模板后，右侧属性面板显示插槽专属配置，分为两个 Tab：

**基础配置 Tab：**

```
┌─────────────────────────────────────────┐
│  📌 插槽                    [基础配置] [暴露接口] │
├─────────────────────────────────────────┤
│  插槽名称 *                              │
│  ┌──────────────────────────┐           │
│  │ header                   │           │
│  └──────────────────────────┘           │
│  唯一标识，用于消费方传入 slots 内容       │
│                                          │
│  显示标题 *                              │
│  ┌──────────────────────────┐           │
│  │ 扩展区域                  │           │
│  └──────────────────────────┘           │
│                                          │
│  接受的组件类型                            │
│  ┌──────────────────────────┐           │
│  │ [button] [text] ×        │           │
│  └──────────────────────────┘           │
│  ☑ button  ☑ text  ☐ table              │
│                                          │
│  最大子项数                               │
│  ┌──────────────────────────┐           │
│  │ 3                        │           │
│  └──────────────────────────┘           │
└─────────────────────────────────────────┘
```

**暴露接口 Tab：**

配置通过此插槽暴露给消费方的变量、方法和事件。消费方在插槽内容中可通过 `$slot.xxx` 引用暴露的变量。

```
┌─────────────────────────────────────────┐
│  暴露变量 (2)                [+ 添加]    │
│  ┌──────┬─────────────────────────────┐ │
│  │ name │ $context.currentRecord.name │ │
│  │ level│ $props.customerLevel        │ │
│  └──────┴─────────────────────────────┘ │
│                                          │
│  暴露方法 (1)                [+ 添加]    │
│  ┌──────┬──────┬────────────┐           │
│  │ 校验  │ 校验  │ form_01    │           │
│  └──────┴──────┴────────────┘           │
│                                          │
│  暴露事件 (1)                [+ 添加]    │
│  ┌──────────┬──────────┬──────────────┐ │
│  │ onSubmit │ 提交成功  │ btn_01.onClick│ │
│  └──────────┴──────────┴──────────────┘ │
└─────────────────────────────────────────┘
```

#### SlotDefinition 类型定义

```typescript
interface SlotDefinition {
  name: string;                        // 插槽名，如 "header", "footer", "actions"
  title: string;                       // 显示标题
  description?: string;
  accept?: string[];                   // 允许放入的组件类型，空=不限
  maxItems?: number;                   // 最大子项数，空=不限
  defaultContent?: ComponentNode[];    // 默认内容
  expose?: SlotExpose;                 // 暴露给消费方的接口
}

interface SlotExpose {
  variables?: Record<string, string>;  // 暴露变量：变量名 → 表达式
  methods?: SlotExposedMethod[];       // 暴露的方法
  events?: SlotExposedEvent[];         // 暴露的事件
}

interface SlotExposedMethod {
  name: string;
  title: string;
  description?: string;
  target: string;                      // 映射到内部组件的方法，如 "form_01.validate"
  params?: MethodParam[];
  returnType?: string;
}

interface SlotExposedEvent {
  name: string;
  title: string;
  source: string;                      // 内部触发源，如 "btn_01.onClick"
  payload?: Record<string, string>;
}
```

#### 保存为卡片时的自动收集

保存为卡片时，模板中的所有 `type="slot"` 节点自动收集为 `SlotDefinition[]`，写入 `CardInterface.slots`。插槽的暴露接口（variables/methods/events）一并收集。

#### 运行时渲染流程

```
消费方使用卡片:
  slots={{
    header: [<Button onClick={() => $slot.submit()}>提交</Button>]
  }}
        │
        ▼
渲染器遇到 template 中 type="slot" 的节点
        │
        ▼
收集插槽暴露变量 → 注入到 $slot 作用域
        │
        ▼
查找 slots[slot.props.name]
        │
        ├─ 有内容 → 替换为消费方传入的内容（$slot 可用）
        └─ 无内容 → 渲染默认占位区域（📌 标题 + 描述）
```

#### 消费方引用示例

**场景：消费方在插槽内容中引用暴露变量、调用暴露方法、监听暴露事件**

```tsx
// 使用卡片，向 header 插槽传入内容
<CardInstance
  props={{ customerName: '张三', customerLevel: 'vip' }}
  slots={{
    header: [
      // 引用暴露变量
      <Text>{$slot.header.customerName}</Text>,
      // 调用暴露方法（返回值可通过 $result 获取）
      <Button onClick={() => $slot.header.validate({ strict: true })}>校验</Button>,
    ],
  }}
/>
```

#### invokeMethod + 插槽打通

`invokeMethod` 动作支持两种路由：

| methodName 格式 | 路由目标 | 说明 |
|----------------|---------|------|
| `"validate"` | 卡片级方法 `interface.methods` | 直接在卡片作用域执行动作链 |
| `"header.validate"` | 插槽方法 `slot.expose.methods` | 路由到内部组件方法，返回 $result |

**完整调用链路：**

```
消费方 submit 按钮 onClick:
  [
    {
      "action": "invokeMethod",
      "target": "customerCard",
      "method": "header.validate",        ← slotName.methodName 路由
      "params": { "strict": true }
    },
    {
      "action": "apiCall",
      "condition": "$result.valid === true",  ← $result 拿到内部方法返回值
      "params": { "url": "/api/submit", "data": "$result.data" }
    },
    {
      "action": "message",
      "condition": "$result.valid === false",
      "params": { "type": "error", "content": "校验失败" }
    }
  ]
```

**invokeMethod 路由流程：**

```
invokeMethod("customerCard", "header.validate", { strict: true })
        │
        ▼
methodName 包含 "." → 插槽方法路由
        │
        ▼
查找 slotDefinitions["header"].expose.methods
        │
        ▼
找到 target: "form_01.validate"
        │
        ▼
调用内部组件 form_01 的 validate 方法
        │
        ▼
返回 { valid: true, errors: {} } → 写入 $result
        │
        ▼
后续动作通过 $result.valid / $result.data 引用
```

**$slot 作用域结构：**

```typescript
// $slot 由 CardRenderer.createSlotExposeContext 生成
$slot = {
  header: {
    // 暴露变量（由 expose.variables 表达式求值）
    customerName: '张三',
    customerLevel: 'vip',
    // 暴露方法（由 expose.methods.target 映射到内部组件方法）
    validate: async (params) => internalMethodInvoker('form_01', 'validate', params),
    getData: async () => internalMethodInvoker('form_01', 'getData'),
    // 暴露事件触发器（由 expose.events.source 映射到内部组件事件）
    onSubmit: (data) => internalEventEmitter('btn_01', 'onClick', data),
  },
  footer: {
    // 另一个插槽的暴露接口
  },
};
```

#### 设计器中配置 invokeMethod 调用插槽方法

在设计器的事件动作链编排器中，选择「调用组件方法」动作类型，所有配置均通过 UI 下拉选择完成，无需手写表达式：

```
┌─────────────────────────────────────────────────────┐
│  动作类型: [调用组件方法 ▼]                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  目标组件: [客户摘要卡片 (customerCard) ▼]             │
│            ↑ 自动列出页面中所有可调用的组件实例          │
│                                                      │
│  调用方法: ▼                                          │
│  ┌─────────────────────────────────────────────┐    │
│  │  卡片方法                                     │    │
│  │    校验 — 校验卡片内所有表单字段                │    │
│  │    重置 — 重置表单为初始值                     │    │
│  │    获取数据 — 获取所有表单字段的当前值           │    │
│  │  ──────────────────────────────────────────  │    │
│  │  插槽方法                                     │    │
│  │  📌 header.validate — 校验表单字段             │    │
│  │  📌 header.getData — 获取表单数据              │    │
│  │  📌 header.onSubmit — 提交成功事件             │    │
│  └─────────────────────────────────────────────┘    │
│            ↑ 自动列出：                               │
│              - interface.methods（卡片级方法）         │
│              - slot.expose.methods（插槽暴露方法）    │
│              - 分组展示，插槽方法带 📌 标识            │
│                                                      │
│  参数配置:                                            │
│    strict  ┌───────────────────────────┐             │
│            │ ☑ (布尔值)                 │             │
│            └───────────────────────────┘             │
│                                                      │
│  返回值处理:                                          │
│    返回值自动写入 $result                              │
│    后续动作通过 $result.xxx 引用                       │
│    （可在条件表达式中使用 $result.valid 等字段）        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**变量选择器中的 $slot 引用：**

在变量选择器（🔗 按钮）的变量树中，自动出现「插槽接口」节点：

```
▼ 插槽接口
  ▼ 📌 header
      customerName          ← 暴露变量
      customerLevel         ← 暴露变量
      📎 校验               ← 暴露方法（可引用）
      📎 获取数据            ← 暴露方法
  ▼ 📌 footer
      totalCount            ← 暴露变量
```

消费方在变量选择器中点击即可选中 `$slot.header.customerName`，无需手写路径。

暴露属性通过表达式映射到内部组件的属性上：

```typescript
interface PropBinding {
  target: string;                      // 绑定目标：内部组件ID.属性路径，如 "input_01.value"
  expression?: string;                 // 绑定表达式，默认直接透传
  // 表达式可引用：
  //   $props.xxx    — 暴露属性上下文
  //   运算引擎能力   — 函数、条件、字符串模板等
  twoWay?: boolean;                    // 双向绑定（仅表单控件有效）
}
```

### 事件映射 — CardEventDef

内部组件事件映射为对外事件：

```typescript
interface CardEventDef {
  source: string;                      // 触发源：内部组件ID.事件名，如 "btn_01.onClick"
  emit: string;                        // 对外发射的事件名，如 "onCustomerClick"
  transform?: string;                  // 事件数据转换表达式，如 "{ customerId: $this.selectedId }"
}
```

### 使用示例

#### 定义 — "客户摘要卡片"

```jsonc
{
  "id": "card_customer_summary",
  "name": "客户摘要卡片",
  "icon": "UserOutlined",
  "version": "1.0.0",
  "category": "CRM",

  "interface": {
    "props": [
      { "name": "customerName", "type": "string", "title": "客户名称", "required": true },
      { "name": "customerLevel", "type": "string", "title": "客户等级",
        "enum": [
          { "label": "VIP", "value": "vip" },
          { "label": "普通", "value": "normal" }
        ]
      },
      { "name": "orderCount", "type": "number", "title": "订单数", "default": 0 },
      { "name": "showActions", "type": "boolean", "title": "显示操作区", "default": true }
    ],
    "methods": [
      {
        "name": "validate",
        "title": "校验",
        "description": "校验卡片内所有表单字段",
        "group": "表单操作",
        "params": [
          { "name": "strict", "type": "boolean", "title": "严格模式", "default": false,
            "description": "开启后任一字段校验失败即中断" }
        ],
        "returnType": "{ valid: boolean, errors: Record<string, string> }",
        "implementation": [
          { "action": "validateComponents", "targets": ["card_container"] }
        ]
      },
      {
        "name": "reset",
        "title": "重置",
        "description": "重置表单为初始值",
        "group": "表单操作",
        "params": [],
        "returnType": "void",
        "implementation": [
          { "action": "resetComponents", "targets": ["card_container"] }
        ]
      },
      {
        "name": "getData",
        "title": "获取数据",
        "description": "获取卡片内所有表单字段的当前值",
        "group": "数据操作",
        "params": [],
        "returnType": "Record<string, any>",
        "implementation": [
          { "action": "collectFormData", "targets": ["card_container"] }
        ]
      }
    ],
    "slots": [
      { "name": "extra", "title": "扩展区域", "description": "卡片右上角扩展内容" },
      { "name": "footer", "title": "底部区域", "description": "卡片底部自定义内容" }
    ],
    "events": [
      { "name": "onCustomerClick", "title": "点击客户名称", "payload": { "customerId": "string" } }
    ]
  },

  "template": [
    { "id": "card_container", "type": "card", "props": { "bordered": true } },
    { "id": "title_row", "type": "flex", "parentId": "card_container", "props": { "justify": "space-between" } },
    { "id": "customer_name", "type": "text", "parentId": "title_row", "props": {} },
    { "id": "level_tag", "type": "tag", "parentId": "title_row", "props": {} },
    { "id": "stat_row", "type": "flex", "parentId": "card_container", "props": {} },
    { "id": "order_stat", "type": "statistic", "parentId": "stat_row", "props": { "title": "订单数" } },
    { "id": "slot_extra", "type": "slot", "parentId": "title_row", "props": { "name": "extra" } },
    { "id": "slot_footer", "type": "slot", "parentId": "card_container", "props": { "name": "footer" } }
  ],

  "bindings": {
    "customerName": { "target": "customer_name.text", "expression": "$props.customerName" },
    "customerLevel": { "target": "level_tag.label",
      "expression": "$props.customerLevel === 'vip' ? 'VIP客户' : '普通客户'" },
    "customerLevel_color": { "target": "level_tag.color",
      "expression": "$props.customerLevel === 'vip' ? 'gold' : 'default'" },
    "orderCount": { "target": "order_stat.value", "expression": "$props.orderCount" },
    "showActions": { "target": "stat_row.visible", "expression": "$props.showActions" }
  },

  "events": [
    { "source": "customer_name.onClick", "emit": "onCustomerClick",
      "transform": "{ customerId: $this.customerId }" }
  ]
}
```

#### 消费 — 页面中使用该卡片

```jsonc
{
  "id": "instance_001",
  "type": "card:card_customer_summary",
  "props": {
    "customerName": "$context.currentRecord.name",       // 变量绑定（UI 选择器生成）
    "customerLevel": "$context.currentRecord.level",     // 变量绑定
    "orderCount": 42,                                     // 静态值
    "showActions": true
  },
  "events": {
    "onCustomerClick": [
      { "action": "navigate", "url": "/customer/${customerId}" }
    ]
  },
  "slots": {
    "extra": [
      { "id": "edit_btn", "type": "button", "props": { "children": "编辑" } }
    ]
  }
}
```

页面中其他组件可通过**调用组件方法**动作调用该卡片的方法：

```jsonc
// 提交按钮的事件配置 — 调用卡片的 validate 方法
{
  "id": "submit_btn",
  "type": "button",
  "events": {
    "onClick": [
      {
        "action": "invokeMethod",
        "target": "instance_001",           // 卡片实例 ID
        "method": "validate",               // 调用的方法名
        "params": { "strict": true },       // 方法参数
        "then": [
          {
            "condition": "$return.valid === true",
            "action": "apiCall",
            "api": "submitOrder",
            "data": {
              "customer": "$context.currentRecord",
              "formData": { "action": "invokeMethod", "target": "instance_001", "method": "getData" }
            }
          },
          {
            "condition": "$return.valid === false",
            "action": "message",
            "type": "error",
            "content": "表单校验失败: {{$return.errors}}"
          }
        ]
      }
    ]
  }
}
```

#### 递归嵌套 — 卡片内嵌卡片

```jsonc
{
  "id": "card_order_list",
  "name": "订单列表卡片",
  "template": [
    { "id": "list_container", "type": "card", "props": { "title": "订单列表" } },
    { "id": "order_item_1", "type": "card:card_customer_summary", "parentId": "list_container",
      "props": { "customerName": "嵌套客户", "customerLevel": "normal" }
    }
  ]
}
```

### 设计器 UI 操作规范

自定义卡片的所有对外接口（属性、方法、事件、插槽）均通过设计器 UI 完成配置，无需手写 JSON 或表达式。

#### 左侧面板 — 卡片拖入

自定义卡片在设计器左侧面板的"自定义"分类下展示，拖入画布即创建实例：

```
自定义
├── 📦 客户摘要卡片 v1.0    [CRM]
├── 📦 订单列表卡片 v2.1    [销售]
└── 📦 审批流程卡片 v1.3    [流程]
```

拖入后自动生成组件实例节点，`type` 为 `card:{cardId}`，右侧面板自动切换为该卡片的属性配置界面。

#### 属性配置 — 右侧面板

卡片实例的右侧属性面板由 `interface.props` 自动生成，每个属性根据类型渲染为对应的 UI 控件：

```
┌─────────────────────────────────────────┐
│  客户摘要卡片                            │
├─────────────────────────────────────────┤
│  ▼ 基础属性                             │
│  │                                      │
│  │  客户名称 *                           │
│  │  ┌─────────────────────┬────┐        │
│  │  │ 张三                │ 🔗 │        │  ← 文本输入 + 数据绑定按钮
│  │  └─────────────────────┴────┘        │
│  │                                      │
│  │  客户等级                             │
│  │  ┌─────────────────────┬────┐        │
│  │  │ VIP                 │ 🔗 │        │  ← 枚举下拉 + 数据绑定按钮
│  │  └─────────────────────┴────┘        │
│  │                                      │
│  │  订单数                              │
│  │  ┌─────────────────────┬────┐        │
│  │  │ 42                  │ 🔗 │        │  ← 数字输入 + 数据绑定按钮
│  │  └─────────────────────┴────┘        │
│  │                                      │
│  │  显示操作区                           │
│  │  ┌───────────────────────┬────┐      │
│  │  │  ☑                   │ 🔗 │      │  ← 开关 + 数据绑定按钮
│  │  └───────────────────────┴────┘      │
│  │                                      │
│  ▼ 插槽                                │
│  │  扩展区域                             │
│  │  ┌──────────────────────────┐        │
│  │  │  📌 拖入组件或点击配置     │        │  ← 插槽放置区
│  │  └──────────────────────────┘        │
│  │  底部区域                             │
│  │  ┌──────────────────────────┐        │
│  │  │  📌 拖入组件或点击配置     │        │
│  │  └──────────────────────────┘        │
│  │                                      │
│  ▼ 事件                                │
│  │  点击客户名称 → 配置动作链 ...         │  ← 事件动作配置入口
│  │                                      │
│  ▼ 方法                                │
│  │  [校验]  [重置]  [获取数据]           │  ← 方法列表（供外部调用参考）
└─────────────────────────────────────────┘
```

##### 属性类型 → UI 控件映射

控件映射规则由 [自动渲染引擎](auto-rendering-engine.md#控件注册表) 统一管理，卡片属性面板复用同一套映射。每个字段 label 右侧提供 **Button Group（常量/变量/表达式）**，默认选中"常量"，切换模式时自动弹出变量选择器（见下文）。

##### 数据绑定 — 值模式切换与变量选择器

每个字段支持三种值模式，通过 label 右侧的 Button Group 切换：

- **常量**（默认）：直接输入静态值
- **变量**：点击后弹出变量选择器，选择变量引用
- **表达式**：点击后弹出变量选择器，切换到表达式 tab

切换模式时会清除已有值。选中变量/表达式后，输入区域显示 Tag 样式的绑定标识，点击可重新打开变量选择器修改。

```
┌─────────────────────────────────────────────────────┐
│  数据绑定 — 客户名称                                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  绑定方式:  ○ 静态值  ● 变量引用  ○ 表达式            │
│                                                      │
│  ── 变量引用 ──────────────────────────────────────  │
│                                                      │
│  ▼ 页面上下文                                         │
│    $context.currentUser.name                         │
│    $context.currentRecord.customerName               │
│    $context.route.params.id                          │
│                                                      │
│  ▼ 表单数据                                          │
│    $form.orderNo                                     │
│    $form.amount                                      │
│                                                      │
│  ▼ API 返回值                                        │
│    $api.getCustomerList.data[0].name                 │
│                                                      │
│  ▼ 其他组件                                          │
│    search_input.value                                │
│    table_01.selectedRow.name                         │
│                                                      │
│  ── 表达式 ────────────────────────────────────────  │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ $context.currentRecord.firstName             │   │
│  │   + " " +                                    │   │
│  │ $context.currentRecord.lastName              │   │
│  │                                              │   │
│  │ 📖 运算引擎函数  ▼  |  📖 字段引用  ▼         │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  预览结果: "张 三"                                    │
│                                                      │
│  [取消]  [确定]                                       │
└─────────────────────────────────────────────────────┘
```

变量选择器的数据源树由平台统一提供，包含：

- **页面上下文** (`$context`) — 当前用户、当前记录、路由参数、全局变量
- **表单数据** (`$form`) — 所属表单的字段值
- **API 返回值** (`$api`) — 页面已配置的 API 接口返回数据
- **其他组件** — 页面中其他组件的可读属性（通过组件 ID 引用）

选择变量后自动生成绑定表达式，用户无需手写。表达式模式下提供函数/字段引用的自动补全。

#### 事件配置 — 动作链编排

卡片暴露的事件通过**动作链编排器**配置，与原生组件事件配置方式一致：

```
┌─────────────────────────────────────────────────────┐
│  事件: 点击客户名称 (onCustomerClick)                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  动作链:                                              │
│  ┌─ 1. ─────────────────────────────────────────┐   │
│  │  动作类型: [打开页面 ▼]                        │   │
│  │  目标页面: [客户详情页 ▼]                      │   │
│  │  页面参数: customerId ← {{事件.客户ID}}        │   │
│  └──────────────────────────────────────────────┘   │
│           │                                          │
│           ▼                                          │
│  ┌─ 2. ─────────────────────────────────────────┐   │
│  │  动作类型: [刷新组件 ▼]                        │   │
│  │  目标组件: [订单表格 ▼]                        │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  [+ 添加动作]   [添加条件分支]                        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

事件数据通过 `{{事件.xxx}}` 模板变量引用，变量列表由 `EventDefinition.payload` 自动生成，用户从下拉列表选择，无需手写。

#### 方法调用 — 动作配置中引用

卡片暴露的方法出现在动作配置的**"调用组件方法"**动作类型中，供页面其他组件或流程节点调用：

```
┌─────────────────────────────────────────────────────┐
│  动作类型: [调用组件方法 ▼]                           │
├─────────────────────────────────────────────────────┤
│                                                      │
│  目标组件: [客户摘要卡片 (instance_001) ▼]            │
│                                                      │
│  调用方法: [校验 (validate) ▼]                        │
│                                                      │
│  参数配置:                                            │
│    strict  ┌───────────────────────────┐             │
│            │ ☑ (布尔值)                 │             │
│            └───────────────────────────┘             │
│                                                      │
│  返回值处理:                                          │
│    ○ 忽略返回值                                       │
│    ● 保存到变量: [validationResult ▼]                │
│    ○ 根据返回值判断后续动作                            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

方法的参数表单由 `MethodDefinition.params` 自动生成，与属性配置相同的控件映射规则。返回值可保存到页面变量供后续动作使用。

#### 插槽配置 — 拖拽填充

插槽在设计区显示为可放置的占位区域，支持两种配置方式：

1. **拖拽填充**：从左侧面板拖入组件到插槽区域，自动创建子组件
2. **点击配置**：点击插槽区域弹出组件选择面板，选择要放入的组件

插槽支持的约束由 `SlotDefinition` 定义：
- `accept` 限制可放入的组件类型（如只允许按钮类组件）
- `maxItems` 限制最大数量（如最多 3 个按钮）
- `defaultContent` 提供默认内容，用户可在此基础上修改

#### 保存为卡片

设计器工具栏提供 **"保存为卡片"** 按钮，将选中的组件组合保存为可复用的自定义卡片：

```
┌─────────────────────────────────────────────────────┐
│  保存为自定义卡片                                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  基本信息                                            │
│  名称: [客户摘要卡片                      ]           │
│  分类: [CRM ▼]                                      │
│  版本: [1.0.0     ]                                 │
│  描述: [客户信息摘要展示卡片            ]              │
│                                                      │
│  ▼ 暴露属性（自动推荐 + 手动调整）                     │
│  ┌──────────┬────────┬────────┬──────┐              │
│  │ 名称      │ 类型    │ 标题    │ 操作 │              │
│  ├──────────┼────────┼────────┼──────┤              │
│  │ customer │ string │ 客户名称 │ ✏️ 🗑│  ← 自动推荐  │
│  │ Name     │        │        │      │              │
│  │ orderCnt │ number │ 订单数  │ ✏️ 🗑│  ← 自动推荐  │
│  │ [+] 添加属性                                  │  │
│  └──────────────────────────────────────────┘       │
│                                                      │
│  ▼ 暴露方法                                          │
│  ┌──────────┬──────────────────────────────┐        │
│  │ validate │ 校验所有表单字段              │        │
│  │ reset    │ 重置表单为初始值              │        │
│  │ [+] 添加方法                                  │  │
│  └──────────────────────────────────────────┘       │
│                                                      │
│  ▼ 暴露事件                                          │
│  ┌──────────────────────┬──────────────────┐        │
│  │ onCustomerClick      │ 点击客户名称     │        │
│  │ [+] 添加事件                                  │  │
│  └──────────────────────┴──────────────────┘        │
│                                                      │
│  [取消]  [保存]                                       │
└─────────────────────────────────────────────────────┘
```

自动推荐逻辑：
- 内部组件引用了页面上下文/表单数据的变量 → 推荐为暴露属性
- 内部表单控件 → 推荐 `validate` / `reset` / `getData` 方法
- 内部按钮/可点击元素的事件 → 推荐为暴露事件

### 运行时渲染流程

```
渲染器遇到 type="card:card_customer_summary"
        │
        ▼
从组件注册表获取卡片定义 (CustomCardDefinition)
        │
        ▼
创建卡片作用域，注入 $props = 消费方传入的 props
  │
  ├─ 静态值 → 直接注入
  ├─ 变量引用 → 从运行时上下文解析
  └─ 表达式 → 运算引擎沙箱求值
        │
        ▼
遍历 bindings，对每个绑定：
  解析 expression（运算引擎沙箱执行）→ 赋值到 target 组件属性
        │
        ▼
渲染 template 组件树，遇到 type="slot" 的节点：
  替换为消费方传入的 slots[slotName] 内容
        │
        ▼
挂载 events 映射：内部组件事件 → 对外事件发射
        │
        ▼
注册方法到卡片实例：
  invokeMethod(instanceId, methodName, params)
    → 找到 MethodDefinition.implementation
    → 在卡片作用域内执行动作链
    → 返回结果给调用方
```

#### 方法调用时序

```
调用方（如提交按钮）                    卡片实例                       内部组件
      │                                 │                            │
      │  invokeMethod("validate")       │                            │
      │ ──────────────────────────────► │                            │
      │                                 │  解析 implementation 动作链  │
      │                                 │ ─────────────────────────► │
      │                                 │                            │  校验表单字段
      │                                 │  ◄──── 返回校验结果 ────── │
      │  ◄──── 返回 { valid, errors } ─ │                            │
      │                                 │                            │
```

## 运行时渲染器

运行时渲染器消费设计器产出的页面描述 JSON，驱动多端 UI 渲染。一切配置皆可序列化为 JSON，运行时无隐式状态。

**当前实现**：`PageRuntime` 组件（`frontend/src/components/PageRuntime.tsx`）提供简化版运行时渲染：
- 路由：`/:tenantId/app/:appId/page/:pageId`
- 加载页面 Schema → 递归渲染 antd 组件树 → 应用布局配置
- 暂不支持数据绑定/联动/事件，仅做静态渲染
- 完整运行时能力（数据绑定、联动引擎、事件系统）后续接入 `PageRenderer`

### 页面 Schema 定义

设计器产出的页面描述 JSON 是渲染器的唯一输入，完整结构如下：

```typescript
/** 页面描述 JSON — 渲染器的消费契约 */
interface PageSchema {
  pageId: string;                        // 页面唯一标识
  name: string;                          // 资源名称（业务标识，唯一可读字段）
  layout: LayoutConfig;                  // 全局布局配置
  components: ComponentNode[];           // 组件树
  dataSource?: string;                   // 页面数据源表达式（结果赋给 $data）
  theme?: ThemeConfig;                   // 页面级主题覆盖
  meta?: Record<string, any>;           // 扩展元数据
}

/** 组件节点 — 页面描述的基本单元 */
interface ComponentNode {
  id: string;                            // 组件实例唯一 ID（格式：{type}_{timestamp}，如 textarea_1781765600372）
  type: string;                          // 组件类型，匹配组件注册表
  name: string;                          // 字段名（中文名称，如 文本域_01，用于表单绑定和变量引用）
  parentId?: string;                     // 父组件 ID（树形结构）
  props: Record<string, PropValue>;      // 组件属性（支持字面量/变量引用/表达式）
  events?: Record<string, ActionChain[]>; // 事件 → 动作链映射
  layout?: ComponentLayout;              // 布局定位信息
  visible?: boolean | string;            // 显隐（布尔值或条件表达式）
  children?: string[];                   // 子组件 ID 列表（有序）
}

/** 属性值类型 — 支持字面量、变量引用、表达式 */
type PropValue =
  | any                                    // 字面量（string/number/boolean/object）
  | { type: 'variable', value: string }    // 变量引用
  | { type: 'expression', value: string }; // 表达式

/**
 * 页面根节点布局配置
 *
 * flex 模式直接复用 antd Flex props（vertical/wrap/justify/align/gap），
 * grid 模式使用 columns + CSS Grid 属性。
 */
interface LayoutConfig {
  type: 'grid' | 'flex';
  columns?: number;                      // grid 列数（默认 24）
  gap?: string | number;                 // 间距（flex/grid 通用）
  // ── antd Flex props ──
  vertical?: boolean;                    // 是否垂直排列（默认 true）
  wrap?: boolean;                        // 自动换行
  justify?: string;                      // 主轴对齐
  align?: string;                        // 交叉轴对齐
}

/** 组件布局定位 */
interface ComponentLayout {
  col?: number;                          // grid 列宽
  row?: number;                          // grid 行号
  colSpan?: number;                      // grid 跨列
  rowSpan?: number;                      // grid 跨行
  order?: number;                        // flex 排序
  flex?: string;                         // flex 属性
  alignSelf?: string;                    // flex 对齐
}

/** 页面数据源 — 单表达式模式 */
// PageSchema.dataSource: string | undefined
// 配置了即自动加载（页面加载时执行），结果赋给 $data
// 多个请求用 Promise.all() 在表达式内部处理
// 示例：
//   单个请求：await $fetch.get("/api/users")
//   多个请求：await Promise.all([$fetch.get("/api/users"), $fetch.get("/api/orders")])
//   服务端查询：await $table.user.filter(u => u.active).execute()
```

### 组件注册表

组件注册表是渲染器的核心基础设施，维护组件类型到**元数据**和**实现**的双重映射。

```typescript
interface ComponentRegistry {
  /** 注册单个组件（元数据） */
  register(entry: ComponentRegistration): void;

  /** 批量注册 */
  registerAll(entries: ComponentRegistration[]): void;

  /** 注册整个组件库（元数据 + 实现 + Schema） */
  registerLibrary(library: ComponentLibrary, components: Record<string, React.ComponentType>, schemas: Record<string, JSONSchema>): void;

  /** 查询组件元数据 */
  resolve(type: string): ComponentRegistration | null;

  /** 查询组件实现（返回实际 React 组件） */
  resolveComponent(type: string): React.ComponentType | null;

  /** 查询所有已注册组件（供设计器左侧面板使用） */
  list(): ComponentRegistration[];

  /** 按分类查询 */
  listByCategory(category: string): ComponentRegistration[];

  /** 导出注册表快照（可序列化） */
  export(): ComponentRegistration[];

  /** 导入注册表快照 */
  import(entries: ComponentRegistration[]): void;
}

/** 组件注册项 — 完全可序列化 */
interface ComponentRegistration {
  type: string;                          // 组件类型标识，如 "input", "card:card_xxx"
  name: string;                          // 显示名称
  category: 'basic' | 'advanced' | 'layout' | 'custom' | 'business';
  icon?: string;                         // 图标标识
  component: string;                     // 组件标识（序列化用），运行时通过 resolveComponent() 解析为实际组件
  propsSchema: JSONSchema;               // 属性 JSON Schema（自动渲染引擎消费）
  defaultProps?: Record<string, any>;     // 默认属性
  acceptsChildren?: boolean;             // 是否为容器组件
  library?: string;                      // 所属组件库，如 "antd", "element-plus"
  version?: string;                      // 组件版本
}
```

组件库切换机制：运行时维护多套 `ComponentRegistration[]`（按 `library` 字段区分），切换时调用 `registerAll()` 替换当前注册表。

### 数据绑定机制

页面 Schema 中的属性值支持三种形式，运行时统一解析：

#### PropValue 数据格式

```typescript
type PropValue =
  | any                                    // 字面量（string/number/boolean/object）
  | { type: 'variable', value: string }    // 变量引用
  | { type: 'expression', value: string }; // 表达式
```

**JSON 示例**：
```json
{
  "props": {
    "placeholder": "啊啊啊",
    "a": { "type": "variable", "value": "$platform.web" },
    "b": { "type": "expression", "value": "async () => { return $user.name; }" }
  }
}
```

| 值形式 | JSON 格式 | 运行时行为 |
|--------|----------|-----------|
| 字面量 | `"张三"`、`42`、`true` | 直接使用 |
| 变量引用 | `{ "type": "variable", "value": "$user.name" }` | 同步解析，从运行时上下文按路径取值 |
| 表达式 | `{ "type": "expression", "value": "async () => { ... }" }` | 异步执行，支持依赖收集和变更传播 |

**运行时解析流程**：
```
遍历 props
  │
  ├─ 字面量 → 直接使用
  ├─ { type: 'variable' } → 同步解析变量引用
  └─ { type: 'expression' } → 异步执行表达式 + 依赖收集
```

**依赖收集与变更传播**：
- 表达式执行时自动提取 `$xxx.yyy` 格式的变量依赖
- 依赖注册到 DependencyGraph
- 变量变更时自动重新执行依赖的表达式

**设计器侧显示规则**：

| 模式 | 属性面板显示 | 设计画布显示 |
|------|------------|------------|
| 常量 | 原值 | 原值 |
| 变量 | `变量` 标签 + 变量路径（如 `$platform.web`） | `[变量] $platform.web` |
| 表达式 | `表达式` 标签（不显示具体值） | `[表达式]` |

#### 运行时上下文（环境变量体系）

页面运行时提供统一的环境变量体系，所有变量引用和表达式均基于此上下文求值。

| 变量 | 类型 | 说明 | 可用模式 |
|------|------|------|---------|
| `$user` | `Record<string, any>` | 当前登录用户（动态字段，从用户表读取） | 变量引用 + 表达式 |
| `$platform` | `{ web, mobile, miniApp }` | 当前运行平台标识 | 变量引用 + 表达式 |
| `$route` | `{ params, query, path }` | 路由信息（params 含 tenantId/appId/pageId） | 变量引用 + 表达式 |
| `$component` | `Record<string, ComponentState>` | 页面组件实例状态（通过组件 ID 引用） | 变量引用 + 表达式 |
| `$data` | `any` | 页面数据源表达式执行结果（配置即自动加载，页面渲染前完成） | 变量引用 + 表达式 |
| `$table` | `ServerVariableProxy` | 服务端表查询（惰性求值，运行时转换为 HTTP 请求） | **仅表达式** |
| `$computation` | `ComputationEngine` | 运算引擎（执行服务端运算逻辑） | **仅表达式** |
| `$fetch` | `FetchProxy` | 第三方 HTTP 请求 | **仅表达式** |
| `$workflow` | `WorkflowContext` | 流程上下文（流程页面内有效） | **仅表达式** |

> **变量引用 vs 表达式**：变量引用为点路径取值（如 `$user.name`），不支持 `$table/$computation/$fetch`；表达式为 JS 语法（如 `$user.name + ' - ' + $platform.web`），支持所有环境变量，实质为异步函数。

```typescript
/** 运行时环境变量上下文 */
interface RenderContext {
  /** 当前用户（动态字段） */
  $user: {
    id: string;
    name: string;
    roles: string[];
    department: string;
    departmentName: string;
    position: string;
    [key: string]: any;
  };

  /** 平台标识 */
  $platform: {
    web: boolean;
    mobile: boolean;
    miniApp: boolean;
  };

  /** 路由信息 */
  $route: {
    params: Record<string, string>;
    query: Record<string, string>;
    path: string;
  };

  /** 页面组件实例状态 */
  $component: Record<string, {
    value: any;
    visible: boolean;
    disabled: boolean;
    loading: boolean;
    [key: string]: any;
  }>;

  /** 页面级数据源聚合 */
  $data: Record<string, {
    data: any;
    loading: boolean;
    error: Error | null;
  }>;

  /** 服务端表查询（惰性求值） */
  $table: ServerVariableProxy;

  /** 运算引擎 */
  $computation: ComputationEngine;

  /** 第三方请求 */
  $fetch: FetchProxy;

  /** 流程上下文（流程页面内有效） */
  $workflow?: {
    instanceId: string;
    nodeId: string;
    variables: Record<string, any>;
    snapshots: Record<string, any>;
  };
}
```

#### 值解析流程

```
渲染组件 props 时
  │
  ├─ 遍历每个 prop 值
  │   ├─ typeof === 静态值 → 直接注入
  │   ├─ 以 "$user." / "$platform." / "$route." 等开头 → 按路径从 RenderContext 取值（变量引用）
  │   └─ 包含 "${" 或多变量组合 → 运算引擎沙箱求值（表达式，异步函数）
  │
  ├─ 值变更时（双向绑定场景）
  │   └─ 写回 $data[fieldPath]，触发联动重算
  │
  └─ 依赖追踪
      └─ 记录每个组件依赖的变量路径，变量变化时仅重渲染依赖组件
```

#### 跨应用变量引用

当 `$table/$computation/$workflow` 涉及跨应用引用时，使用 appId（8位hex）标识目标应用，代码提示展示应用名称：

```
$table.[appId].[表名]          — 例如: $table.80e88653.user    // 山水OA
$computation.[appId].[运算名]   — 例如: $computation.80e88653.calcTotal
$workflow.[appId].[流程名]      — 例如: $workflow.80e88653.approval
```

**跨应用资源校验规则**：

| 类型 | 语法 | 校验 |
|------|------|------|
| 当前应用 | `$table.user` | 直接访问，无需校验 |
| 跨应用 | `$table.80e88653.user` | 需校验目标应用 `expose` 配置 |

校验流程：
1. 解析变量路径，区分当前应用/跨应用
2. 跨应用时，查询目标应用的 `app.expose[resourceType]`
3. 若目标资源未在 `expose` 中声明，报错拒绝
4. 校验通过后，在 `page.references` 中注册依赖

#### 环境变量动态注册

部分环境变量（`$component`、`$data`、`$table`）的属性是动态生成的，需要在运行时注册：

```typescript
// 注册页面组件到 $component
environmentRegistry.registerPageComponents({
  'input_01': { type: 'input', label: '客户名称' },
  'select_02': { type: 'select', label: '客户等级' },
  'btn_submit': { type: 'button', label: '提交按钮' },
});

// 注册页面数据源到 $data
environmentRegistry.registerPageDataSources({
  'orderList': { type: 'expression', description: '订单列表数据' },
  'customerInfo': { type: 'expression', description: '客户信息' },
});

// 注册可用数据表到 $table
environmentRegistry.registerAvailableTables({
  'user': { description: '用户表' },
  'order': { description: '订单表' },
});
```

**VariablePicker 组件自动处理动态注册**：

```typescript
<VariablePicker
  visible={true}
  mode="variable"
  value="$component.input_01.value"
  onChange={handleChange}
  onClear={handleClear}
  onClose={handleClose}
  // 传入页面组件列表，VariablePicker 打开时自动注册
  pageComponents={{
    'input_01': { type: 'input', label: '客户名称' },
    'select_02': { type: 'select', label: '客户等级' },
  }}
/>
```

**代码提示效果**：

输入 `$component.` 时显示页面组件列表：
```
$component.input_01    — 客户名称 (input_01)
$component.select_02   — 客户等级 (select_02)
$component.btn_submit  — 提交按钮 (btn_submit)
```

输入 `$component.input_01.` 时显示组件属性：
```
$component.input_01.value     — 组件当前值
$component.input_01.visible   — 是否可见
$component.input_01.disabled  — 是否禁用
$component.input_01.loading   — 是否加载中
```

#### 变量依赖追踪与变更传播

**依赖收集时机**：
- 组件挂载时，解析 props 中的变量引用/表达式，收集依赖
- 组件 props 变更时，重新收集依赖

**变更传播策略**：延迟批量更新（节流/防抖）

```
变量变更（如 $user.name 更新）
  │
  ├─ 1. 更新 RenderContext 中的值
  │
  ├─ 2. 查询依赖图：哪些组件/字段依赖 $user.name？
  │     └─ 返回：[component_a.props.label, component_b.props.value]
  │
  ├─ 3. 延迟批量更新（同一事件循环内的多次变更合并）
  │     └─ 按拓扑排序重新计算
  │
  └─ 4. 触发组件重渲染
```

**依赖优先级与循环检测**：

依赖图（DependencyGraph）负责管理变量依赖关系，支持：

1. **拓扑排序**：确定求值顺序，避免依赖未就绪的变量
2. **循环检测**：在注册依赖时检测循环依赖，避免死循环
3. **变更传播**：变量变更时，按拓扑排序通知所有依赖组件

```
依赖图示例：
  $user.name → component_a.props.label
  $user.name → component_b.props.value
  $data.order.amount → component_b.props.value

拓扑排序结果：
  1. component_a.props.label（依赖 $user.name）
  2. component_b.props.value（依赖 $user.name + $data.order.amount）

循环检测：
  若 A → B → C → A，检测到循环，报错拒绝注册
```

**变量引用 vs 表达式的执行差异**：

| 特性 | 变量引用 | 表达式 |
|------|---------|--------|
| 语法 | `$user.name`（点路径） | `$user.name + ' - ' + $platform.web`（JS 语法） |
| 执行方式 | 同步，按路径取值 | 异步，沙箱执行（async IIFE） |
| 依赖管理 | DependencyGraph 精准通知 | DependencyGraph 精准通知 |
| 禁用变量 | `$table/$computation/$fetch/$workflow` | 全部可用 |

**表达式引擎行为**：

```typescript
// evaluateAsync — 异步求值（支持 await）
const result = await expressionEngine.evaluateAsync('await $fetch.get("/api/users")', context);

// 自动调用函数定义 — 用户写函数形式时自动执行
// 输入：async () => { return await $fetch.get("/api/users") }
// 编译为：(async () => { return (async () => { return await $fetch.get(...) })(); })()
// 自动调用函数，而不是返回函数引用

// safeEvaluate — 同步求值（不支持 await，用于条件规则等）
const visible = expressionEngine.safeEvaluate('$user.role === "admin"', context);
```

**响应式上下文（ReactiveEnvContext）**：

统一管理所有环境变量（`$user`、`$component`、`$data` 等），提供精准变更通知：

```typescript
import { ReactiveEnvContext } from '@low-code/renderer';

// 创建（稳定引用，不会因内部值变化而改变）
const reactiveCtx = new ReactiveEnvContext({
  $user: { name: '张三' },
  $component: {},
  $data: {},
  $fetch: createFetchProxy(),
});

// 更新变量 — 自动通过 DependencyGraph 通知依赖组件
reactiveCtx.set('$component.input_01.value', '新值');
reactiveCtx.set('$data', apiResult);

// 批量更新 — 单次通知
reactiveCtx.batchUpdate({
  '$component.input_01.value': 'a',
  '$component.select_01.value': 'b',
});

// 获取上下文（稳定引用，传给表达式引擎）
const context = reactiveCtx.getContext();
```

**统一绑定解析（useBindings）**：

变量引用和表达式使用同一套依赖管理逻辑：

```typescript
// useBindings hook — 统一处理字面量、变量引用、表达式
const { resolvedProps, loading, errors } = useBindings(
  componentId,     // 组件 ID
  rawProps,        // 原始 props（含 {type:'variable', value:'$component.xxx'} 等）
  context,         // 稳定的上下文引用
  expressionEngine,
  reactiveCtx,     // 响应式上下文（用于版本追踪）
);

// 工作流程：
// 1. 分离字面量、变量引用、表达式
// 2. 所有依赖统一注册到 DependencyGraph
// 3. 依赖变更时精准通知：
//    - 变量引用 → setVarVersion → syncResolved 重算（同步）
//    - 表达式 → 仅重算受影响的表达式（异步）
//    - 无依赖的绑定不受影响
```

**依赖图双向匹配**：

`DependencyGraph.notifyVariableChange` 支持双向路径匹配，N 层路径变更通知 N-1 层和 N+1 层依赖：

```
变更路径：$component.xxx.value（3 层）
  ✓ 精确匹配：依赖 $component.xxx.value
  ✓ 子路径匹配：依赖 $component.xxx（N 层通知 N-1 层）

变更路径：$component.xxx（2 层）
  ✓ 精确匹配：依赖 $component.xxx
  ✓ 父路径匹配：依赖 $component.xxx.value（父通知子）

不匹配示例：
  变更 $component.xxx.value → 不匹配 $component.yyy.value（不同组件）
  变更 $component.xxx → 不匹配 $component.xxx_extra（. 分隔，不是前缀）
```

**回显机制**：

```
组件渲染
  │
  ├─ 1. 读取 Schema 中的 props 定义
  │     { "label": "$user.name", "value": "${$data.order.amount * 1.1}" }
  │
  ├─ 2. 读取该组件的绑定模式配置
  │     { "label": "variable", "value": "expression" }
  │
  ├─ 3. 分层处理
  │     ├─ 变量引用（同步）：直接按路径取值
  │     │   label = resolveValue("$user.name", "variable") → "张三"
  │     └─ 表达式（异步）：沙箱执行
  │         value = await resolveValue("${$data.order.amount * 1.1}", "expression") → 1100
  │
  ├─ 4. 注册依赖关系（用于后续变更传播）
  │     ├─ label 依赖 ["$user.name"]
  │     └─ value 依赖 ["$data.order.amount"]
  │
  └─ 5. 渲染组件
        <Component label="张三" value={1100} />
```

#### 核心实现组件

**EnvironmentRegistry** — 环境变量注册表
- 管理所有环境变量的元数据（类型、描述、子属性）
- 生成变量树数据（用于 VariablePicker）
- 生成 Monaco 代码提示数据
- 跨应用变量展示和校验
- 依赖收集

**DependencyGraph** — 依赖图管理器
- 管理变量依赖关系
- 拓扑排序（确定求值顺序）
- 循环检测（避免死循环）
- 变更传播（变量变更时通知依赖组件）

**RenderContextBuilder** — 运行时上下文构建器
- 构建页面运行时的环境变量上下文
- 加载用户信息、路由信息、平台信息
- 管理组件状态注册
- 监听数据源变更

**VariableBindingEngine** — 变量绑定引擎
- 依赖收集：解析变量引用/表达式，提取依赖路径
- 依赖注册：将组件/字段与变量路径的依赖关系注册到依赖图
- 值解析：将变量引用/表达式解析为实际值（分层处理：同步/异步）
- 变更传播：变量值变化时，延迟批量更新依赖组件
- 缓存管理：表达式执行结果缓存

**MonacoEditor** — Monaco 编辑器包装组件
- 提供代码编辑能力
- 支持变量代码提示（基于环境变量注册表）

#### 表达式编辑器

表达式编辑器基于 Monaco Editor，支持 JavaScript 语法高亮和自动补全。

**编辑器结构**：
```javascript
/**
 * 可用环境变量：
 * $user — 当前登录用户信息
 * $platform — 当前运行平台标识
 * $route — 当前路由信息
 * $component — 页面组件实例状态
 * $data — 页面级数据源聚合
 * $table — 服务端表查询（仅表达式）
 * $computation — 运算引擎（仅表达式）
 * $fetch — 第三方请求（仅表达式）
 * $workflow — 流程上下文（仅表达式）
 *
 * 示例：
 * const name = $user.name;
 * const platform = $platform.web;
 * return name + " - " + platform;
 */
async () => {
  // 用户在此编写代码
}
```

**保存逻辑**：保存时自动过滤开头的 JSDoc 注释，只保存函数本身。

**自动补全行为**：
- 输入 `$`：显示所有一级环境变量
- 输入 `$platform.`：显示 `$platform` 的子属性（`web`、`mobile`、`miniApp`）
- 输入 `$component.`：显示页面组件列表（动态注册）
- 提示格式：`[类型] 中文说明`，跨应用资源显示 `[应用名] 资源名`

#### 已知问题

**Monaco 内置补全干扰**：
- Monaco Editor 的 JavaScript 语言服务会提供内置补全建议（小扳手图标）
- 当输入 `$platform.` 时，除了自定义的子属性提示外，Monaco 内置补全可能还会显示 `$platform` 本身
- 当前通过 `wordBasedSuggestions: 'off'` 禁用基于单词的建议，但 Monaco 的语言服务补全仍可能出现
- 这是 Monaco Editor 的限制，目前无法完全禁用语言服务的补全

**$component 动态注册**：
- `$component` 的子属性（页面组件）需要在 VariablePicker 打开时动态注册
- 注册依赖 `pageComponents` prop 的传入，如果传入时机晚于 VariablePicker 打开，可能不会显示

### 条件规则引擎

页面级 `rules` 和组件级 `visible` 共享同一套条件规则引擎，所有规则完全可序列化为 JSON。

> **重要**：绑定概览仅展示页面组件中使用变量/表达式的属性，不涉及规则配置。

### 事件与动作系统

组件事件配置 JSON 通过事件编译器转换为可执行函数。动作类型完全可序列化，平台统一注册。

```typescript
/** 动作链 — 事件处理的序列化描述 */
type ActionChain = ActionStep[];

/** 动作步骤 */
interface ActionStep {
  action: string;                        // 动作类型标识，匹配平台统一动作类型字典
  params?: Record<string, any>;          // 动作参数
  condition?: string;                    // 执行条件表达式
  then?: ActionStep[];                   // 条件满足时的后续动作
  else?: ActionStep[];                   // 条件不满足时的后续动作
}
```

> 📄 平台统一的动作类型注册表详见 [系统字典 — 动作类型字典](system-dictionaries.md#动作类型字典)

#### 事件编译流程

```
设计器产出: { "onClick": [{ "action": "navigate", "url": "/detail/${id}" }] }
        │
        ▼
事件编译器 (EventCompiler)
  ├─ 解析 ActionChain JSON
  ├─ 为每个 ActionStep 匹配动作注册表中的处理器
  ├─ 编译条件表达式为可执行函数
  └─ 生成: (event, context) => { step1(context); if(cond) step2(context); ... }
        │
        ▼
绑定到组件: <Component onClick={compiledHandler} />
```

### 多端适配器接口

适配器屏蔽各端差异，统一渲染逻辑。适配器配置完全可序列化。

```typescript
/** 平台适配器接口 */
interface PlatformAdapter {
  /** 平台标识 */
  platform: 'web' | 'mobile' | 'miniapp';

  /** 组件映射：平台组件 type → 该平台的实现组件 */
  resolveComponent(type: string, library: string): React.ComponentType | null;

  /** 样式适配：主题 Token → 该平台的样式注入方式 */
  applyTheme(theme: ThemeConfig): void;

  /** 导航适配 */
  navigate(route: string, params?: Record<string, string>): void;

  /** 存储适配 */
  storage: {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
  };

  /** 平台 API 适配（网络请求、文件上传等） */
  api: {
    request(config: ApiRequestConfig): Promise<ApiResponse>;
    upload(file: File, config: UploadConfig): Promise<UploadResult>;
  };
}
```

```
┌──────────────────────────────────────────────────────────────┐
│                     页面描述 JSON Schema                      │
├──────────────────────────────────────────────────────────────┤
│                     运行时渲染核心                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ 组件注册表  │  │ 数据绑定    │  │ 条件规则    │             │
│  │ Registry   │  │ Resolver   │  │ Engine     │             │
│  └────────────┘  └────────────┘  └────────────┘             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
│  │ 事件编译器  │  │ 动作注册表  │  │ 表达式引擎  │             │
│  │ Event      │  │ Action     │  │ Expression │             │
│  │ Compiler   │  │ Registry   │  │ Engine     │             │
│  └────────────┘  └────────────┘  └────────────┘             │
├──────────────────────────────────────────────────────────────┤
│  Web 适配器    │  Mobile 适配器  │  小程序适配器               │
│  (React)       │  (React Native)│  (Taro/uni-app)            │
└──────────────────────────────────────────────────────────────┘
```

### 构建产物管理

#### TS → JSON Schema 编译管道

组件 Props 的 TypeScript 类型定义通过 `packages/build-tools` 编译为 JSON Schema：

```bash
# 扫描所有组件，批量生成 JSON Schema
npx tsx packages/build-tools/src/cli.ts scan

# 编译单个接口
npx tsx packages/build-tools/src/cli.ts compile <file> <interfaceName>

# 从 antd 类型定义同步类型到 schema.ts
npx tsx packages/build-tools/src/cli.ts sync-types
```

**SchemaCompiler 工作流程**：
1. `typescript-json-schema` 从 `schema.ts` 读取 Props 接口，生成基础 JSON Schema
2. 后处理：`description` → `title`，`group` → `x-group`，`priority` → `x-priority`
3. `$ref` 外部类型（React.ReactNode 等）→ 转为 `{ type: "string" }`
4. `@ignore` 标记的属性被排除（`typescript-json-schema` 原生支持）
5. 无 `x-group` 的属性默认归入 `"基础属性"`

产物存储：

```
packages/renderer/src/libraries/antd/
  ├── button/
  │   ├── component.tsx    # 组件实现（withPlatform 包装）
  │   ├── schema.ts        # Props 接口定义（JSDoc 含 x-group/x-priority）
  │   ├── button.json      # 编译产物：属性 JSON Schema
  │   └── index.ts         # 统一导出
  ├── input/
  │   └── ...
  └── ...（66 个组件）
```

JSDoc 注解到扩展字段的映射规则：

| JSDoc 注解 | 扩展字段 | 说明 |
|-----------|---------|------|
| `@group xxx` | `x-group: "xxx"` | 字段分组 |
| `@priority N` | `x-priority: N` | 排序权重 |
| `@component xxx` | `x-component: "xxx"` | 自定义控件 |
| `@visible expr` | `x-visible: "expr"` | 条件显隐 |
| `@disabled expr` | `x-disabled: "expr"` | 条件禁用 |
| `@ignore` | 属性被排除 | 废弃属性不出现在 schema 中 |
| `@dictionary xxx` | `x-dictionary: "xxx"` | 字典引用 |
| `@dataSource xxx` | `x-dataSource: "xxx"` | 变量绑定数据源 |
| `@validator xxx` | `x-validator: "xxx"` | 校验规则 |
| `@no-binding` | `x-no-binding: "..."` | 禁止变量/表达式绑定 |
| `@value-type xxx` | `x-value-type: "xxx"` | 组件值的 TypeScript 类型（从 antd 类型定义自动提取） |

#### 产物存储规范

```
Platform/                           # 平台内置资源（只读，随平台发布）
├── components/                     # 内置组件
│   ├── input/
│   │   ├── component.js            # 组件实现
│   │   └── propsSchema.json        # 编译产物：属性 JSON Schema
│   ├── select/
│   │   ├── component.js
│   │   └── propsSchema.json
│   └── ...
├── adapters/                       # 平台适配器
├── themes/                         # 内置主题
└── dictionaries/                   # 系统字典数据

App/                                # 租户应用资源（可导出/导入）
├── {appId}/
│   ├── app.json                    # 应用元信息
│   ├── pages/                      # 页面描述 JSON
│   │   ├── page_home.json
│   │   └── page_detail.json
│   ├── components/                 # 自定义组件/卡片
│   │   ├── card_customer_summary/
│   │   │   ├── definition.json     # 卡片定义（含 template/bindings/events）
│   │   │   └── propsSchema.json    # 编译产物：暴露属性 JSON Schema
│   │   └── ...
│   ├── entities/                   # 实体定义
│   ├── workflows/                  # 流程定义
│   ├── automations/                # 自动化规则
│   └── permissions/                # 权限配置
```

所有产物均为 JSON 格式，支持：
- **版本控制**：纳入 Git 管理
- **导出/导入**：应用级资源打包为 ZIP，跨环境迁移
- **差异对比**：JSON 结构化 diff

---

## 组件级数据源与刷新机制

### 组件级数据源配置

每个组件支持独立的数据源配置，无需依赖页面级数据源。数据源结果自动注入到组件的指定属性。

```typescript
/** 组件级数据源配置 */
interface ComponentDataSource {
  /** 数据源类型 */
  type: 'api' | 'server-variable';
  /** API 类型配置 */
  api?: ComponentApiConfig;
  /** 服务端变量表达式（如 $table.user.filter(...)） */
  serverVariable?: string;
  /** 目标属性（数据源结果注入到哪个 props） */
  targetProp: string;
  /** 是否自动加载（默认 true） */
  autoLoad?: boolean;
  /** 依赖的变量路径列表（用于依赖分析） */
  dependencies?: string[];
}
```

#### 配置示例

```jsonc
{
  "id": "dept_select",
  "type": "select",
  "dataSource": {
    "type": "api",
    "api": {
      "url": "/api/departments",
      "method": "GET",
      "params": { "status": "$form.filterStatus" },
      "dataPath": "data.list"
    },
    "targetProp": "options",
    "autoLoad": true,
    "dependencies": ["$form.filterStatus"]
  },
  "props": {
    "placeholder": "请选择部门"
  }
}
```

### 组件级刷新

每个组件支持 `refreshAll()` 和 `refreshProps()` 方法，用于重新加载数据源或重新解析变量绑定。

```typescript
// 刷新组件所有属性（包括重新加载数据源）
await actionContext.refreshComponent('dept_select');

// 刷新组件指定属性
await actionContext.refreshComponent('dept_select', ['options', 'value']);

// 按依赖顺序刷新多个组件
await actionContext.refreshWithDependencyOrder(['dept_select', 'user_select']);
```

#### 使用场景

```jsonc
// 列表页新增记录后，刷新下拉框数据源
{
  "id": "add_btn",
  "type": "button",
  "events": {
    "onClick": [
      { "action": "showModal", "params": { "modalId": "add_form" } },
      {
        "action": "refreshComponent",
        "condition": "$result.success === true",
        "params": { "target": "dept_select" }
      }
    ]
  }
}
```

### 统一依赖图

统一依赖图管理器（`UnifiedDependencyGraph`）打通了 `LinkageEngine`、`DataSourceManager` 和组件依赖，支持全局依赖分析和按顺序更新。

#### 核心能力

1. **依赖注册**：注册组件、数据源、字段联动的依赖关系
2. **影响分析**：分析变量变更后受影响的组件、数据源、字段
3. **拓扑排序**：生成按依赖顺序的更新序列
4. **循环检测**：检测并处理循环依赖

```typescript
// 分析变更影响
const impact = actionContext.analyzeChangeImpact(new Set(['$form.status', '$context.currentUser']));
console.log(impact.directAffectedComponents);  // 直接受影响的组件
console.log(impact.updateOrder);                // 按拓扑排序的更新顺序
```

#### 依赖顺序更新示例

场景：B 组件的 `label` 依赖 A 组件的 `value`

```jsonc
{
  "components": [
    {
      "id": "component_a",
      "type": "input",
      "props": { "value": "$user.name" }
    },
    {
      "id": "component_b",
      "type": "text",
      "props": { "label": "$components.component_a.value" }
    }
  ]
}
```

当 `$user.name` 变化时：
1. 统一依赖图分析出 `component_a` 直接受影响
2. `component_b` 依赖 `component_a`，间接受影响
3. 按拓扑排序：先更新 `component_a`，再更新 `component_b`

### 服务端变量解析器

服务端变量解析器（`ServerVariableResolver`）支持声明式查询语法，前端写查询描述，后端执行实际查询。

#### 语法规范

```
$table.{table}                           // 基础查询
  .filter(record=>record.field==value)   // 过滤条件
  .select('field1', 'field2')           // 选择字段
  .sort('field', 'asc'|'desc')          // 排序
  .limit(n)                              // 限制数量
  .first()                               // 取第一条
  .count()                               // 统计数量
  .sum('field')                          // 求和
  .avg('field')                          // 平均值
```

#### 配置示例

```jsonc
{
  "id": "user_select",
  "type": "select",
  "dataSource": {
    "type": "server-variable",
    "serverVariable": "$table.user.filter(record=>record.status=='active').select('id', 'name')",
    "targetProp": "options"
  }
}
```

#### UI 配置与表达式双向转换

服务端变量支持 UI 配置模式和表达式模式的双向转换：

```typescript
// UI 配置 → 表达式
const uiConfig = {
  table: 'user',
  select: ['id', 'name'],
  filters: [{ field: 'status', operator: '==', value: 'active', valueSource: 'literal' }]
};
const expression = serverVariableResolver.uiConfigToExpression(uiConfig);
// 结果：$table.user.filter(record=>record.status=='active').select('id', 'name')

// 表达式 → UI 配置
const parsedConfig = serverVariableResolver.expressionToUIConfig(expression);
// 结果：{ table: 'user', select: ['id', 'name'], filters: [...] }
```

#### 权限控制

服务端变量查询需要后端进行权限校验：

```typescript
// 后端查询执行流程
POST /api/query
{
  "table": "user",
  "where": { "status": "active" },
  "select": ["id", "name"]
}

// 后端执行：
// 1. 校验用户是否有 user 表的查询权限
// 2. 注入行级过滤条件（如：只能查自己部门的数据）
// 3. 转换为 SQL 执行
// SELECT id, name FROM user WHERE status = ? AND department_id = ?
```

### 模块依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                      UnifiedDependencyGraph                  │
│  (统一管理组件/数据源/字段联动的依赖关系)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ LinkageEngine│    │ DataSource  │    │ Component   │     │
│  │ (字段联动)   │    │ Manager     │    │ Refresh     │     │
│  │             │    │ (页面级)    │    │ Manager     │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                            ▼                                │
│                   ┌─────────────────┐                       │
│                   │  Renderer.tsx   │                       │
│                   │  (统一渲染)     │                       │
│                   │  refreshComp()  │                       │
│                   └─────────────────┘                       │
│                                                             │
│  ┌─────────────────┐                                        │
│  │ ServerVariable  │                                        │
│  │ Resolver        │                                        │
│  │ (服务端变量)    │                                        │
│  └────────┬────────┘                                        │
│           │                                                 │
│           ▼                                                 │
│  POST /api/query → 后端执行 SQL                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
