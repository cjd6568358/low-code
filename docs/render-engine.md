# 渲染引擎 (Render Engine)

渲染引擎是平台的核心模块，涵盖**统一设计器**和**运行时渲染器**两大部分。

## 统一设计器

统一设计器是应用资源的统一设计入口，路由格式：`/designer/:resourceType/:id`。

支持六种资源类型：

| 资源类型 | 路由 | 说明 |
|---------|------|------|
| 应用 | `/designer/app/:id` | 应用资源概览，展示所有资源列表 |
| 页面 | `/designer/page/:id` | 三栏可视化页面设计器 |
| 卡片 | `/designer/card/:id` | 自定义卡片编辑器 |
| 数据表 | `/designer/table/:id` | 数据表结构编辑器 |
| 流程 | `/designer/workflow/:id` | 流程编排编辑器（已实现） |
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
2. 后处理：`description` → `title`，JSDoc 标签 → `x-*` 扩展字段（完整映射见下方表格）
3. `$ref` 外部类型（React.ReactNode 等）→ 转为 `{ type: "string" }`
4. `CSSProperties` 展开 → 简化为 `{ type: "object" }`
5. 无 `x-group` 的属性 → 默认归入 `"基础属性"`

**schema.ts 规范**：
- 每个组件一个目录：`component.tsx` + `schema.ts` + `{type}.json` + `index.ts`
- Props 接口 `extends BaseProps`，继承公共属性
- JSDoc 注解定义 UI 元数据：`@group`、`@priority`、`@component`、`@visible`、`@disabled`、`@validator`、`@ignore` 等（完整列表见下方映射表）
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
- `enhanceValueOnChange()` 将编译后的事件处理器直接注入为组件 props（onClick → onClick，onBlur → onBlur 等），`onChange` 单独处理（自动关联 value ↔ onChange ↔ 联动规则）
- 运行时注入平台能力（`field`/`events`/`linkage`）
- Form 组件注册 props（`_formRegistry`/`_formId`）被 `PLATFORM_KEYS` 过滤后显式转发给 `FormWithProvider`

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

##### 6. 容器 overlay：passthrough 模式

**问题**：容器（Form/Flex 等）的 overlay 覆盖整个区域，`pointer-events: auto` 拦截了子组件的点击和拖拽，导致子组件无法选中。

**方案 — passthrough 模式**：
- 容器使用 `DesignOverlay` + `passthrough` prop
- passthrough 模式下交互层 `pointer-events: none`，不拦截子组件交互
- 选中框和 drop 指示器正常显示（`z-index: 10`）
- 容器通过 `withPlatform` 注入的 `onMouseDown`（点击边框/padding 区域）选中

##### 7. "+ 拖入更多" 容器外绝对定位

**问题**：容器的 "+ 拖入更多" 拖入区域放在 `ComponentImpl` 内部时，受容器布局影响（inline 布局时水平排列，flex 布局时参与排列）。

**方案**：
- 拖入区域移到 `ComponentImpl` 外部，用 `position: relative` 包裹层 + `position: absolute; bottom` 贴底
- 容器 `paddingBottom` 预留空间，内容不遮挡拖入区域
- 视觉上在容器虚线边框内，但不受容器布局（inline/flex/grid）影响

##### 8. "+ 拖入更多" 点击选中父容器

**交互行为**：点击容器内的"+ 拖入更多"按钮时，自动选中该父容器，方便用户快速定位和操作容器组件。

**实现**：
- 拖入区域 div 添加 `onClick` 事件处理器，调用 `handleSelect(node.id)` 选中父容器
- 添加 `cursor: 'pointer'` 样式，鼠标悬停时显示手型指针，提示可点击
- `onClick` 中调用 `e.stopPropagation()` 阻止事件冒泡到画布根 div（避免触发 `handleSelect(null)` 取消选中）

##### 8. 表单容器 FormContext 传递

**问题**：`components.ts` 中 `PlatformForm = withPlatform(Form)` 直接包了 antd 的 `Form`，绕过了 `FormWithProvider`（提供 `FormContext.Provider`）。子组件的 `useFormContext()` 永远返回 `null`，`isInForm` 为 false，Form.Item 自动包装不生效。

**修复**：`PlatformForm` 改为从 `form/component.tsx` 导入（使用 `FormWithProvider`，内含 `FormContext.Provider`）。

**Form.Item 自动包装**：`withPlatform` 检测 `isInForm && hasFieldName` 时，自动将组件包裹在 `Form.Item` 中，`label` 默认取 `name` 字段值。

**异步 initialValue 处理**：antd `Form.Item` 只在首次挂载时读取 `initialValue`。当 `initialValue` 是异步表达式时，通过**表单预求值机制**解决：`FormWithProvider` 在渲染子组件前调用 `preEvaluateForm()`，扫描所有子组件的 expression bindings，按依赖拓扑序批量求值，结果写入 `BindingCache` 并通过 `form.setFieldsValue()` 注入 form store。子组件挂载时 `useBindings` 命中缓存直接复用，`Form.Item` 的 `initialValue` 已经是正确值。详见 [表单运行时架构 — 表单预求值机制](form-runtime-architecture.md#141-表单预求值机制)。

**FormContext.form**：`FormContext` 通过 `form` 属性暴露 antd 表单实例，供 `withPlatform` 在异步 `initialValue` 补偿场景中调用 `form.setFieldsValue()`。

**labelCol/wrapperCol 归一化**：`FormWithProvider` 将字符串/数字格式的 `labelCol`/`wrapperCol`（如 `"8"`）转换为 antd 期望的对象格式（如 `{span: 8}`）。

**labelCol 像素模式（inline 布局专用）**：`labelCol` 支持以 `"px"` 结尾的像素值（如 `"80px"`），表示 label 的最小宽度而非栅格列数。

- 背景：inline 布局下 Form.Item 宽度由内容撑开，小尺寸组件（如 ColorPicker 触发器仅 ~32px）会导致整个行宽不足，label 被挤压
- 栅格模式：`"8"` → `{ span: 8 }`（antd 栅格列数，水平/垂直布局适用）
- 像素模式：`"80px"` → `{ style: { minWidth: '80px' } }`（inline 布局适用，label 保底宽度）
- `FormWithProvider` 通过 `FormContext.labelColPx` 标记通知 `withPlatform`，在 inline 模式下给 Form.Item 的 labelCol 注入 minWidth

##### 9. 面板拖入容器后 dragState 未清理

**问题**：从左侧面板拖拽组件到容器（Flex/Grid 等）的 drop zone 后，容器 overlay 持续显示蓝色 drop 指示背景，无法通过点击取消。

**根因**：容器 drop zone 的 `onDrop` 只调用了 `ADD_COMPONENT`，没有重置 `dragState`。拖拽源自左侧面板（非画布组件），画布组件的 `handleDragEnd` 不会触发。`dragState.overId` 始终指向容器 ID，`showDrop` 为 true，overlay 持续显示 drop 指示背景。

**修复**：容器 `onDrop` 末尾补上 dragState 重置（与根级别 `handleCanvasDrop` 一致）：
```jsx
onDrop={(e) => {
  e.stopPropagation();
  e.preventDefault();
  const built = buildNodeFromDrop(e, registry, schema.components, node.type);
  if (built) {
    dispatch({ type: 'ADD_COMPONENT', payload: { ... } });
  }
  // 清理拖拽状态（面板拖入无 handleDragEnd 触发，需手动重置）
  dragSourceRef.current = null;
  setDragState({ sourceId: null, overId: null, dropPosition: null });
}}
```

**关键原则**：所有 `onDrop` handler 必须清理 dragState，无论拖拽源是画布内组件还是左侧面板。画布内拖拽有 `handleDragEnd` 兜底，面板拖入没有。

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
| `EventActionChainEditor` | 事件动作链编排器（支持条件分支表达式编辑器、批量赋值变量树选择器、嵌套条件分支过滤） |

> `VariableTreeSelector`（变量树选择弹窗，内部使用 `VariableTree`）和 `ExpressionEditor`（表达式编辑器） 由自动渲染引擎内建提供，无需各引擎重复注册。

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

- `packages/renderer/src/core/expression-type-infer.ts` — 表达式类型推断工具（含括号平衡算法提取 return 表达式）
- `packages/renderer/src/components/MonacoEditor.tsx` — Monaco 编辑器包装（暴露格式化/诊断方法）
- `packages/renderer/src/components/VariableTree.tsx` — 通用变量树组件（单选/多选，支持自定义数据源或 EnvironmentRegistry 自动生成，`leafOnly` 限定仅叶子节点可选，`env` prop 限定顶层变量）
- `packages/renderer/src/components/VariableTreeSelector.tsx` — 变量树选择弹窗（内部使用 VariableTree，支持 `leafOnly` prop，`env` prop 限定显示的顶层变量）
- `packages/renderer/src/components/ExpressionEditor.tsx` — 表达式编辑器（Monaco-based，同步/异步模式，弹窗覆盖层）
- `packages/renderer/src/components/TypeMismatchModal.tsx` — 类型不匹配确认对话框

### 流程设计器

流程设计器基于 `react-flow-builder` 实现可视化流程编排，使用 BPMN JSON Schema 作为流程定义格式。

#### 架构

```
frontend/src/designers/WorkflowDesign.tsx    ← 包装层（加载/保存/工具栏）
packages/renderer/src/workflow/              ← 引擎层
  ├── designer/WorkflowDesigner.tsx          ← 核心设计器组件
  ├── nodes/                                 ← 8 种节点显示组件
  ├── config/NodeConfigDrawer.tsx            ← 节点配置抽屉
  ├── hooks/useBpmnConverter.ts              ← BPMN JSON 转换器
  ├── runtime/                               ← 运行时组件（ApprovalForm/TaskList/FlowChart）
  └── api/workflowApi.ts                     ← API 客户端
packages/workflow-bpmn/                      ← BPMN 类型定义 + 序列化/校验工具
```

#### 支持的节点类型

| 节点 | 类型 | 说明 |
|------|------|------|
| 开始 | `start` | 流程起点（isStart） |
| 结束 | `end` | 流程终点（isEnd） |
| 审批 | `approval` | 人工审批节点 |
| 条件 | `condition` | 条件分支网关 |
| 并行 | `parallel` | 并行分支 |
| 延时 | `timer` | 定时等待 |
| 通知 | `notify` | 消息通知 |
| 自动化 | `service` | 自动执行任务 |

#### 数据流

```
AppDesignPage (ResourceDesigner)
  └─ WorkflowDesign (wrapper)
       ├─ fetch GET /api/workflows/:id?appId=xxx → 提取 schema (BpmnDocument)
       ├─ <WorkflowDesigner value={schema} onChange={setSchema} />
       ├─ 保存 → PUT /api/workflows/:id?appId=xxx { schema }
       └─ 发布 → POST /api/workflows/:id/publish?appId=xxx
```

#### 关键类型

- `BpmnDocument` — 流程定义顶层结构，包含 `id`、`name`、`processes: ProcessDefinition[]`
- `ProcessDefinition` — 流程定义，包含 `nodes: FlowNode[]`、`edges: Edge[]`
- `FlowNode` — 节点联合类型（StartEvent / EndEvent / UserTask / ExclusiveGateway 等）
- `WorkflowDefinition` — 服务端流程定义，包含 `schema`、`status`、`version` 等元数据

## 自定义卡片规范

自定义卡片是由基础组件组合而成的**最小化业务组件**，支持保存为模板复用，卡片内部可递归嵌套其他卡片。卡片对外暴露可控的属性（Props）、事件（Events）、方法（Methods）接口，对内封装内部实现，行为等同于用户自定义的原生组件。

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

/** 事件定义 */
interface EventDefinition {
  name: string;                        // 事件名，如 "onCustomerClick"
  title: string;
  description?: string;
  payload?: Record<string, string>;    // 事件携带的数据结构描述
}
```

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
    { "id": "order_stat", "type": "statistic", "parentId": "stat_row", "props": { "title": "订单数" } }
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
      { "action": "navigate", "linkType": "external", "url": "/customer/{{customerId}}", "target": "_self" }
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

自定义卡片的所有对外接口（属性、方法、事件）均通过设计器 UI 完成配置，无需手写 JSON 或表达式。

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
│    $user.name                                        │
│    $component.xxx.props.value                        │
│    $route.params.id                                  │
│                                                      │
│  ▼ 表单数据（通过 Form 实例访问）                     │
│    $component.form_01.$form.orderNo                  │
│    $component.form_01.$form.amount                   │
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

- **页面上下文** (`$user`、`$platform`、`$route`) — 当前用户、平台标识、路由参数
- **组件状态** (`$component.xxx`) — 组件的值、可见性、禁用状态等
- **表单数据** (`$component.formId.$form.xxx`) — Form 实例的字段值（通过 Form 组件 ID 访问）
- **数据源** (`$data`) — 页面已配置的数据源返回数据
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
│  │  动作类型: [打开页面 ▼]  [🟢禁用开关]          │   │
│  │  链接类型: [平台内页面 ▼]                      │   │
│  │  目标页面: [客户详情页 ▼]                      │   │
│  │  查询参数: [表达式...]                         │   │
│  │  目标窗口: [当前窗口 ▼]                        │   │
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

##### 条件分支编辑器

条件分支动作支持可视化配置条件表达式和 Then/Else 分支：

```
┌─────────────────────────────────────────────────────┐
│  动作类型: [条件分支 ▼]                               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  条件表达式:                                          │
│  ┌─────────────────────────────────┬──────────┐     │
│  │ $event.value > 10               │ 编辑表达式 │     │
│  └─────────────────────────────────┴──────────┘     │
│  示例: $event.value > 10, $result.success === true   │
│                                                      │
│  ✅ Then（条件为真时执行）                             │
│  ┌─ 1. ─────────────────────────────────────────┐   │
│  │  动作类型: [消息提示 ▼]  (已过滤: 条件分支)     │   │
│  │  类型: [信息 ▼]                               │   │
│  │  内置: [操作成功]                              │   │
│  └──────────────────────────────────────────────┘   │
│  [+ 添加 Then 动作]                                  │
│                                                      │
│  ❌ Else（条件为假时执行）                             │
│  ┌─ 1. ─────────────────────────────────────────┐   │
│  │  动作类型: [消息提示 ▼]  (已过滤: 条件分支)     │   │
│  │  类型: [错误 ▼]                               │   │
│  │  内置: [条件不满足]                            │   │
│  └──────────────────────────────────────────────┘   │
│  [+ 添加 Else 动作]                                  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**关键特性**：

- **表达式编辑器**：点击"编辑表达式"按钮打开 Monaco 编辑器，支持语法高亮、自动补全（`$event`、`$result`、`$component` 等环境变量）、实时类型推断
- **嵌套限制**：Then/Else 分支的动作类型下拉列表**自动过滤掉"条件分支"**，防止无限嵌套
- **分支独立**：Then 和 Else 分支各自维护独立的动作链，互不影响

##### 批量设置值编辑器

批量设置值动作支持为多个字段配置赋值。点击"+ 添加赋值"打开 VariableTreeSelector 多选模式，勾选赋值目标后批量添加，每字段支持三种值模式：

```
┌─────────────────────────────────────────────────────┐
│  动作类型: [批量设置值 ▼]                             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  批量设置值                                           │
│                                                      │
│  ┌─ $component.username.value ─────────────────┐   │
│  │  [常量] [变量] [表达式]                        │   │
│  │  ┌─────────────────────────┬──────────┐      │   │
│  │  │ $data.customerName      │ 选择变量  │      │   │
│  │  └─────────────────────────┴──────────┘      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌─ $component.status.value ──────────────────┐   │
│  │  [常量] [变量] [表达式]                        │   │
│  │  ┌─────────────────────────┬──────────┐      │   │
│  │  │ active                  │          │      │   │
│  │  └─────────────────────────┴──────────┘      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  [+ 添加赋值]  ← 打开 VariableTreeSelector 多选     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**值模式说明**：

| 模式 | 说明 | 输入方式 |
|------|------|---------|
| 常量 | 静态值，直接输入 | 文本输入框 |
| 变量 | 变量引用，如 `$data.name` | 文本输入 + "选择变量"按钮（打开 VariableTreeSelector 单选） |
| 表达式 | 表达式，如 `$event.value * 2` | 文本输入 + "选择表达式"按钮（打开 Monaco 编辑器） |

**赋值目标选择**：点击"+ 添加赋值"打开 VariableTreeSelector 多选模式，展示组件变量树（`$component.*`），支持勾选多个赋值目标后批量添加。赋值 key 格式为 `$component.{name}.{property}`。

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
渲染 template 组件树
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

**当前实现**：`PageRuntime` 组件（`frontend/src/components/PageRuntime.tsx`）基于 `PageRenderer` 完整渲染引擎：
- 路由：`/:tenantId/app/:appId/page/:pageId`
- 加载页面 Schema → `PageRenderer` 递归渲染 antd 组件树 → 应用布局配置
- 支持数据绑定（变量引用/表达式）、联动引擎、事件动作链、条件规则
- 组件 ID 同时作为 Form.Item 的 name 和 form store key

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
  id: string;                            // 组件实例唯一 ID（格式：{type}_{序号}，如 input_01），同时作为 Form.Item 的 name 和 form store key
  type: string;                          // 组件类型，匹配组件注册表
  name: string;                          // 显示名称（中文，如 输入框_01），用于变量引用路径和设计器展示
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
  | { type: 'expression', value: string, async?: boolean }; // 表达式（value 为函数体）

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
  | { type: 'expression', value: string, async?: boolean }; // 表达式（value 为函数体）
```

**JSON 示例**：
```json
{
  "props": {
    "placeholder": "啊啊啊",
    "a": { "type": "variable", "value": "$platform.web" },
    "b": { "type": "expression", "value": "return $user.name", "async": true }
  }
}
```

| 值形式 | JSON 格式 | 运行时行为 |
|--------|----------|-----------|
| 字面量 | `"张三"`、`42`、`true` | 直接使用 |
| 变量引用 | `{ "type": "variable", "value": "$user.name" }` | 同步解析，从运行时上下文按路径取值 |
| 表达式 | `{ "type": "expression", "value": "return $user.name", "async": true }` | 运行时拼接为 `async ({params}) => { body }` 后执行 |

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

**VariableTreeSelector 组件自动处理动态注册**：

```typescript
<VariableTreeSelector
  visible={true}
  mode="variable"
  value="$component.input_01.value"
  onChange={handleChange}
  onClear={handleClear}
  onClose={handleClose}
  // 传入页面组件列表，VariableTreeSelector 打开时自动注册
  pageComponents={{
    'input_01': { type: 'input', label: '客户名称' },
    'select_02': { type: 'select', label: '客户等级' },
  }}
/>
```

**`env` prop — 限定显示的顶层环境变量**：

通过 `env` prop 可以只显示指定的顶层变量节点，不传则显示全部。适用于只需要某个子集的场景（如刷新组件时只需 `$component`）：

```typescript
// 只显示 $component 节点（多选模式，用于刷新组件选择）
<VariableTreeSelector
  visible
  multiSelect
  env={['$component']}
  onChange={handleChange}
  onClear={handleClear}
  onClose={handleClose}
  pageComponents={pageComponents}
/>

// 显示 $data 和 $component 两个节点
<VariableTreeSelector
  env={['$data', '$component']}
  // ...
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
// evaluateAsync — 接收 ExpressionBinding，根据 async 标志决定执行方式
// async: true → 拼接为 async ({params}) => { body }，返回 Promise
// async: false → 拼接为 ({params}) => { body }，同步返回结果
const result = await expressionEngine.evaluateAsync(
  { type: 'expression', value: 'return await $fetch.get("/api/users")', async: true },
  context,
);

// safeEvaluate — 同步求值，支持简单表达式和函数体（自动包裹 IIFE）
const visible = expressionEngine.safeEvaluate('$user.role === "admin"', context);
const computed = expressionEngine.safeEvaluate('return $data.a + $data.b', context);
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
- 生成变量树数据（用于 VariableTree / VariableTreeSelector）
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

**BindingCache** — 表达式结果缓存
- 模块级单例，key = `componentId.propKey`
- 表单预求值时写入，useBindings 读取时命中直接复用
- 依赖变更时缓存失效，重新求值

**FormPreEvaluator** — 表单预求值器
- 扫描表单内所有子组件的 expression bindings
- 按依赖拓扑排序（无 $component 依赖的先求值）
- 批量求值（同步 safeEvaluate，异步 await evaluateAsync）
- 结果写入 BindingCache，返回 initialValue 字段值供 form.setFieldsValue

#### 表达式编辑器

表达式编辑器基于 Monaco Editor，支持 JavaScript 语法高亮和自动补全。

**编辑器结构**：
```javascript
/**
 * 示例: return $user.name + $route.query
 */
async ({$user, $platform, $route, $component, $data, $table, $computation, $fetch, $workflow, $event, $result}) => {
  // 用户在此编写代码
}
```

- 环境变量通过解构参数传入，鼠标悬浮到 JSDoc 中的变量名可查看说明（Monaco HoverProvider）
- 保存时自动过滤 JSDoc 注释和函数外壳，只保存函数体（`return ...`），运行时根据 async 标志动态拼接
- `onChange` 返回 `{ type: 'expression', value: string, async: boolean }`，value 为函数体，async 标识随值一起存储
- 弹窗支持 `modalWidth`（默认 820）和 `modalMaxHeight`（默认 '90vh'）自定义宽高

**自动补全行为**：
- 输入 `$`：显示所有一级环境变量
- 输入 `$platform.`：显示 `$platform` 的子属性（`web`、`mobile`、`miniApp`）
- 输入 `$component.`：显示页面组件列表（动态注册）
- 提示格式：`[类型] 中文说明`，跨应用资源显示 `[应用名] 资源名`

#### 实时类型检查

编辑器支持实时类型检查功能，在用户输入过程中自动推断表达式返回类型，并与属性期望类型进行对比：

**功能特性**：
1. **属性期望类型展示**：编辑器上方显示当前属性期望的类型（蓝色标签）
2. **当前返回类型展示**：编辑器下方实时显示推断的返回类型
3. **类型兼容性检查**：
   - ✅ 兼容：绿色标签，表示类型匹配
   - ⚠️ 不兼容：橙色标签，表示类型不匹配
   - ❌ 错误：红色标签，表示禁止的返回类型（如 Promise）

**实时推断规则**：
- 使用 debounce（300ms）避免频繁计算
- 支持变量模式和表达式模式
- 复杂表达式可手动指定返回类型覆盖自动推断
- `any` 类型跳过校验
- `undefined`/`null` 类型不兼容具体类型（空函数体会触发二次确认）
- 含运算符的表达式（如 `$user.name + $route.query`）正确走运算符推断，不误判为变量路径

**UI 布局**：
```
┌─────────────────────────────────────────────┐
│  📋 属性期望类型：string                      │  ← 编辑器上方
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐│
│  │  Monaco 编辑器                           ││
│  └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│  📊 当前返回类型：string ✅                    │  ← 编辑器下方
│  ⚠️ 类型不匹配：期望 string，实际 number       │  ← 不匹配时显示
└─────────────────────────────────────────────┘
```

#### 保存前自动格式化与语法检查

表达式保存前经过 Monaco 内置格式化和语法检查，确保代码质量和正确性。

**格式化能力**（Monaco 内置）：
- 自动缩进和代码对齐
- 花括号智能配对
- 代码风格统一

**语法检查**（Monaco 语法验证）：
- 实时语法错误检测
- 错误时**阻止保存**，弹窗提示错误位置和原因
- 仅 error 级别阻止保存，warning 不阻止

**保存流程**：
```
点击确定
  ↓
① Monaco 格式化（自动缩进、对齐）
  ↓
② Monaco 语法检查 → 有错误？阻止保存，弹窗提示
  ↓
③ 类型校验 → 不匹配？弹窗确认
  ↓
④ 保存
```

**MonacoEditor 暴露的方法**：

| 方法 | 说明 |
|------|------|
| `getEditor()` | 获取编辑器实例 |
| `formatDocument()` | 格式化文档 |
| `getFormattedValue()` | 获取格式化后的值 |
| `getDiagnostics()` | 获取代码诊断信息 |
| `hasErrors()` | 检查是否有语法错误 |

**实现文件**：
- `packages/renderer/src/components/MonacoEditor.tsx` — MonacoEditorRef 接口
- `packages/renderer/src/components/VariableTreeSelector.tsx` — 组件变量树选择器
- `packages/renderer/src/components/ExpressionEditor.tsx` — formatExpression / getCodeErrors

#### Monaco 格式化修复（2026-06-28）

**问题**：Monaco standalone editor 的 `editor.action.formatDocument` 对 JavaScript 代码片段不生效。

**根因**：缺少 `monaco-editor/esm/vs/language/typescript/monaco.contribution` 的导入。该模块注册了 JavaScript/TypeScript 的格式化提供器，不导入则 `editor.action.formatDocument` 没有可用的格式化器。

**修复**：在 `MonacoEditor.tsx` 中动态导入该模块，并等待加载完成后再创建编辑器：

```typescript
const tsContributionReady = import('monaco-editor/esm/vs/language/typescript/monaco.contribution');

// useEffect 中等待加载完成后再创建编辑器
tsContributionReady.then(() => {
  // 配置 JavaScript 语言服务
  // 创建编辑器实例
  // ...
});
```

同时配置 `javascriptDefaults` 启用编译器选项：

```typescript
const tsDefaults = (monaco.languages.typescript as any).javascriptDefaults;
tsDefaults.setCompilerOptions({
  target: 99, // ScriptTarget.ESNext
  module: 99, // ModuleKind.ESNext
  allowNonTsExtensions: true,
  noEmit: true,
  allowJs: true,
});
```

**已知问题**：

**Monaco 内置补全干扰**：
- Monaco Editor 的 JavaScript 语言服务会提供内置补全建议（小扳手图标）
- 当输入 `$platform.` 时，除了自定义的子属性提示外，Monaco 内置补全可能还会显示 `$platform` 本身
- 当前通过 `wordBasedSuggestions: 'off'` 禁用基于单词的建议，但 Monaco 的语言服务补全仍可能出现
- 这是 Monaco Editor 的限制，目前无法完全禁用语言服务的补全

**$component 动态注册**：
- `$component` 的子属性（页面组件）需要在 VariableTreeSelector / ExpressionEditor 打开时动态注册
- 注册依赖 `pageComponents` prop 的传入，如果传入时机晚于 VariableTreeSelector / ExpressionEditor 打开，可能不会显示

**Flex 组件 `vertical` 已废弃**：
- `vertical`（boolean）标记为 `@ignore`，不再出现在 JSON Schema 中
- 统一使用 `orientation`（`'horizontal' | 'vertical'`），与 antd 的 `useOrientation` 优先级一致
- 设计时 `DesignCanvas` 容器渲染：Flex/Grid 组件的布局属性（`orientation`/`align`/`justify`/`wrap`/`gap`）通过 `node.props` 传给 antd 组件自身处理，不手动转 inline style
- @see `packages/renderer/src/libraries/antd/flex/schema.ts`（`@ignore` 标记）
- @see `packages/renderer/src/designer/panels/DesignCanvas.tsx`（容器样式逻辑）

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
  disabled?: boolean;                    // 是否禁用（跳过执行）
  then?: ActionStep[];                   // 条件满足时的后续动作
  else?: ActionStep[];                   // 条件不满足时的后续动作
}
```

#### 动作执行上下文 (ActionContext)

动作执行器通过 `ActionContext` 获取运行时能力：

```typescript
interface ActionContext {
  renderContext: Record<string, any>;    // 运行时环境变量（$user/$platform/$route 等）
  event?: any;                           // 原生事件对象
  $result?: any;                         // 上一个动作的返回值
  formRegistry?: FormRegistryLike;       // 表单注册表
  setFormValue?: (field: string, value: any) => void;         // 设置表单字段值
  setComponentProp?: (componentId: string, propName: string, value: any) => void;  // 设置组件属性
  navigate?: (url: string, params?: Record<string, string>) => void;
  showModal?: (resourceType: string, resourceId: string, data?: any) => Promise<any>;
  closeModal?: () => void;  // 关闭所有弹窗
  resolveModal?: (result?: any) => void;  // 弹窗自身关闭，返回结果
  apiRequest?: (config: any) => Promise<any>;
  invokeMethod?: (targetId: string, method: string, params?: any) => Promise<any>;  // 调用组件方法
  refreshComponent?: (targetId: string, propNames?: string[]) => Promise<any>;
}
```

#### setValues 批量设值

`setValues` 动作支持设置表单字段值和组件属性值：

- **表单字段**：key 为字段名（如 `orderNo`），调用 `setFormValue`
- **组件属性**：key 以 `$component.` 开头（如 `$component.input_01.disabled`），调用 `setComponentProp`
- **值格式**：支持字面量、`{ type: 'variable', value: '$platform.mobile' }`、`{ type: 'expression', value: 'return ...', async: true }`

```jsonc
{
  "action": "setValues",
  "params": {
    "values": {
      "$component.input_01.value": { "type": "variable", "value": "$route.path" },
      "$component.input_01.disabled": { "type": "expression", "value": "return $platform.mobile", "async": true }
    }
  }
}
```

运行时通过 `componentOverrides` 机制将组件属性覆盖合并到 `resolvedProps`，触发 React 重渲染。

**变量多选模式**：`triggerWorkflow` 和 `showModal` 的数据参数支持变量多选，返回格式为 `{ type: "variable", value: { key1: "$data.a", key2: "$data.b" } }`，运行时逐 key 按路径取值合并为对象。

**Form store 同步**：当 `setValues` 设置 `$component.xxx.value` 时，除了更新 `componentOverrides`，还会同步调用 `form.setFieldsValue()` 更新 antd Form store。这是因为 Form.Item 通过 `React.cloneElement` 注入表单 store 的 value，会覆盖 `componentOverrides` 中的值。组件 ID（`node.id`）同时作为 Form.Item 的 `name` prop 和 form store key，保持三者统一。

#### Form 组件注册

Form 组件挂载时自动注册到 `FormRegistry`，同时注册 antd Form 实例。卸载时注销。注册后 `resetForm`/`validate`/`setFieldValue` 等动作可正确定位表单实例。

```typescript
// FormWithProvider 挂载时
const [formInstance] = Form.useForm();  // 获取 antd 表单实例
const manager = new FormDataContextManager(expressionEngine, linkageEngine);
manager.init({ formId });
formRegistry.register(formId, manager);
formRegistry.registerAntdForm(formId, formInstance);  // 注册 antd 实例（用于 setFieldsValue）

// FormWithProvider 卸载时
formRegistry.unregister(formId);  // 同时清理 antd 实例
```

**Form.Item name 统一使用组件 ID**：Renderer 渲染时将 `node.id` 注入为 `name` prop（而非 `node.name`），确保 Form.Item 的字段名、form store key、`setValues` 的 component ID 三者一致。

#### invokeMethod 组件方法调用

`invokeMethod` 动作支持命令式调用其他组件的方法，与 `setValue`（声明式属性设置）互补。

**使用场景**：

| 场景 | 示例 |
|------|------|
| 表格操作 | 刷新数据、清除选择、滚动到行、跳转页码 |
| 表单操作 | 校验、重置、提交、获取值 |
| 弹窗控制 | 打开/关闭 Drawer、Modal |
| 标签切换 | 切换到指定 Tab 页 |
| 自定义卡片 | 调用卡片 interface.methods 中定义的业务方法 |

```jsonc
// 示例：按钮点击 → 刷新表格
{
  "action": "invokeMethod",
  "params": {
    "target": "table_01",
    "method": "refresh"
  }
}

// 示例：按钮点击 → 校验表单
{
  "action": "invokeMethod",
  "params": {
    "target": "form_01",
    "method": "validate"
  }
}
```

**ComponentMethodRegistry 架构**：

```
PageRenderer
  ├─ 创建 ComponentMethodRegistry 实例（每页面独立）
  ├─ 通过 ComponentMethodRegistryContext.Provider 注入组件树
  │
  ├─ 预注册（useEffect，组件树渲染前）
  │   └─ 遍历 schema.components → ComponentRegistration.methods
  │      注册空壳处理器（console.warn 提示未实现）
  │      确保事件链中靠前组件能 invokeMethod 到靠后组件
  │
  ├─ 内置组件挂载后（可选）
  │   └─ useComponentMethods() 覆盖空壳为真实实现
  │
  └─ 自定义卡片（card:xxx）
      └─ renderNode 中自动调用 CardRenderer.createMethodInvoker()
         注册 interface.methods 到 ComponentMethodRegistry
```

**ComponentMethodRegistry API**：

```typescript
class ComponentMethodRegistry {
  /** 注册组件方法（mount 时调用） */
  register(componentId: string, componentType: string,
    methods: Record<string, MethodHandler>,
    meta?: Record<string, MethodMeta>): void;

  /** 注销组件所有方法（unmount 时调用） */
  unregister(componentId: string): void;

  /** 调用方法 — 找不到时 warn 并返回 undefined */
  async invoke(componentId: string, methodName: string, params?: any): Promise<any>;

  /** 获取所有已注册方法（设计时/调试用） */
  listAll(): RegisteredMethod[];

  /** 检查组件是否已注册 */
  hasComponent(componentId: string): boolean;

  /** 清空所有注册 */
  clear(): void;
}
```

**预注册机制**：`PageRenderer` 在组件树渲染前的 `useEffect` 中，遍历 `schema.components`，从 `ComponentRegistration.methods` 元数据为每个组件注册空壳处理器。这解决了事件链中组件渲染顺序依赖问题 — 组件 A 的 onClick 可以 invokeMethod 到尚未挂载的组件 B。组件 B 挂载后通过 `useComponentMethods` 覆盖空壳为真实实现。

**内置组件方法声明**：

| 组件 | 方法 | 说明 |
|------|------|------|
| Table | `refresh` / `clearSelection` / `scrollToRow` / `setPage` | 数据刷新、选择、滚动、分页 |
| Form | `validate` / `reset` / `submit` / `getValues` | 表单校验、重置、提交、取值 |
| Drawer | `open` / `close` / `toggle` | 抽屉状态控制 |
| Modal | `open` / `close` / `toggle` | 弹窗状态控制 |
| Pagination | `setPage` | 分页跳转 |
| Tabs | `switchTab` | 标签切换 |
| Collapse | `expandAll` / `collapseAll` | 折叠面板控制 |

元数据定义在 `packages/renderer/src/libraries/antd/component-methods.ts`，通过 `ComponentRegistration.methods` 注入注册表。运行时实际处理器待逐个组件实现（当前为空壳 warn）。

**设计时**：PropertyPanel 从 `ComponentRegistration.methods` 收集所有组件的可用方法，传给 `EventActionChainEditor` 的 `availableMethods`。设计器 UI 提供目标组件 + 方法的下拉选择。

**运行时**：`invokeMethod` executor 通过 `context.invokeMethod` → `ComponentMethodRegistry.invoke()` 查找并执行方法处理器。

```typescript
// 组件通过 hook 注册方法（覆盖预注册的空壳）
useComponentMethods('table_01', 'table', {
  refresh: () => reload(),
  clearSelection: () => setSelectedKeys([]),
}, {
  refresh: { label: '刷新数据' },
  clearSelection: { label: '清除选择' },
});

// ActionContext 注入
invokeMethod: async (targetId, method, params) => {
  return methodRegistry.invoke(targetId, method, params);
}
```

**返回值处理**：`invokeMethod` 的返回值自动写入 `$result`，后续动作可通过 `$result.xxx` 引用。

**关键实现文件**：
- `packages/renderer/src/core/ComponentMethodRegistry.ts` — 组件方法注册表
- `packages/renderer/src/components/ComponentMethodRegistryContext.tsx` — React Context + useComponentMethods hook
- `packages/renderer/src/libraries/antd/component-methods.ts` — antd 组件方法元数据声明
- `packages/shared/src/types/registry.ts` — ComponentMethodDef / ComponentMethod 类型定义

#### 事件动作链编排器 (EventActionChainEditor)

事件动作链编排器是设计器中配置组件事件的核心控件，支持可视化编排动作链。

**核心功能**：

| 功能 | 说明 |
|------|------|
| 事件管理 | 添加/删除/编辑组件事件，自动从组件 Schema 提取可用事件列表 |
| 动作编排 | 拖拽排序动作步骤，支持 16 种标准动作类型 |
| 动作禁用 | 每个动作步骤支持 Switch 开关禁用/启用，禁用后运行时跳过执行，UI 半透明显示 |
| 弹窗配置 | showModal 支持下拉选择页面/卡片资源，数据参数支持变量多选/表达式 |
| 流程选择 | triggerWorkflow 支持下拉选择当前应用 + 跨应用暴露的流程 |
| 条件分支 | 支持 If-Then-Else 条件分支，条件表达式使用 Monaco 编辑器 |
| 批量赋值 | 通过 VariableTreeSelector 多选赋值目标，每字段支持常量/变量/表达式三种模式 |
| 页面导航 | navigate/redirect 动作支持平台内页面下拉选择 + 查询参数变量/表达式配置（PropValue 格式） |
| 嵌套限制 | 条件分支内的动作链自动过滤"条件分支"类型，防止无限嵌套 |

**实现文件**：
- `packages/renderer/src/designer/panels/EventActionChainEditor.tsx` — 主组件
- `packages/renderer/src/components/VariableTreeSelector.tsx` — 组件变量树选择器
- `packages/renderer/src/components/ExpressionEditor.tsx` — 表达式编辑器

**Props 接口**：

```typescript
interface EventActionChainEditorProps {
  events: Record<string, ActionChain[]>;
  onChange: (events: Record<string, ActionChain[]>) => void;
  availableEvents?: Array<{ name: string; title: string }>;
  availableMethods?: ComponentMethod[];
  formComponents?: Array<{ id: string; name: string }>;
  pageComponents?: Record<string, { type: string; label?: string }>;
  pageDataSources?: Record<string, { type: string; description?: string }>;
  appId?: string;                        // 当前应用 ID（用于加载页面列表、流程列表、弹窗资源）
  tenantId?: string;                     // 当前租户 ID（用于拼接路由）
}
```

**内部数据加载**：

| Hook | 数据源 | 用途 |
|------|--------|------|
| `useAppPages(appId)` | `GET /api/apps/:appId` → `resources.pages` | navigate/redirect 页面选择 |
| `useAppWorkflows(appId)` | `GET /api/apps/:appId` + 跨应用 references | triggerWorkflow 流程选择 |
| `useAppModalResources(appId)` | `GET /api/apps/:appId` → `resources.pages` + `resources.cards` | showModal 资源选择 |

> 📄 平台统一的动作类型注册表详见 [系统字典 — 动作类型字典](system-dictionaries.md#动作类型字典)

#### 事件编译流程

```
设计器产出: { "onClick": [{ "action": "navigate", "linkType": "internal", "pageId": "abc12345", "url": "/t/app/aid/page/abc12345", "queryParams": { "type": "expression", "value": "return { status: $data.status }", "async": true }, "target": "_self" }] }
        │
        ▼
事件编译器 (EventCompiler)
  ├─ 解析 ActionChain JSON
  ├─ 跳过 disabled === true 的动作步骤
  ├─ 为每个 ActionStep 匹配动作注册表中的处理器
  ├─ 编译条件表达式为可执行函数
  ├─ navigate/redirect 的 queryParams 解析（resolvePropValue）
  ├─ triggerWorkflow 的 inputData 解析（resolvePropValue）
  ├─ showModal 的 data 解析（resolvePropValue）
  ├─ resolvePropValue 统一处理：
  │   ├─ 单选变量 { type: "variable", value: "$data.xx" } → resolveVariablePath 取值
  │   ├─ 多选变量 { type: "variable", value: { a: "$data.a" } } → 逐 key 取值合并
  │   └─ 表达式 { type: "expression", value: "..." } → safeEvaluate 求值
  ├─ 条件分支特殊处理（见下方）
  └─ 生成: (event, context) => { step1(context); if(cond) step2(context); ... }
        │
        ▼
绑定到组件: <Component onClick={compiledHandler} />
```

#### 条件分支运行时执行

条件分支（`action: 'condition'`）不在 ActionRegistry 中执行，由 EventCompiler 在 `executeStep` 中做特殊分支处理：

```
executeStep(step)
  │
  ├─ 1. step.disabled === true → 跳过
  │
  ├─ 2. step.condition 存在 → 步骤级前置条件（任何动作均可带）
  │     ├─ safeEvaluate(step.condition) → falsy → 执行 step.else 或跳过
  │     └─ truthy → 继续
  │
  ├─ 3. step.action === 'condition' → 条件分支动作
  │     ├─ safeEvaluate(params.condition, {$data, $user, $result, $event})
  │     ├─ truthy → executeSubChain(params.then)
  │     └─ falsy → executeSubChain(params.else)
  │
  └─ 4. 其他动作 → resolveParams → executor.execute()
```

**关键细节**：

- 条件表达式使用 `safeEvaluate` 求值（白名单沙箱），上下文包含 `$data`/`$user`/`$result`/`$event` 等环境变量
- 条件表达式格式为 JS 表达式（如 `$data.status === 'active'`），不使用 `{{xxx}}` 模板语法
- Then/Else 子链通过 `executeSubChain` 递归执行，子链中的每个步骤独立走完整 `executeStep` 流程（含模板变量解析）
- `$result` 从上一步骤透传到子链，子链最后一步的返回值成为后续步骤的 `$result`
- ActionRegistry 中的 `conditionExecutor` 是空壳占位，仅确保 `has('condition')` 不报警告
- 设计器通过 `excludeActions={['condition']}` 禁止 Then/Else 内嵌套条件分支

**Schema 格式**：

```jsonc
{
  "action": "condition",
  "params": {
    "condition": "$data.amount > 10000",
    "then": [
      { "action": "showMessage", "params": { "type": "success", "content": "大额订单" } }
    ],
    "else": [
      { "action": "showMessage", "params": { "type": "info", "content": "普通订单" } }
    ]
  }
}
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
│  ┌────────────┐  ┌────────────┐                             │
│  │ 弹框栈管理  │  │ 模态弹窗    │                             │
│  │ ModalStack │  │ Modal      │                             │
│  │            │  │ Renderer   │                             │
│  └────────────┘  └────────────┘                             │
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
2. 后处理：`description` → `title`，JSDoc 标签 → `x-*` 扩展字段（完整映射见下方表格）
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

JSDoc 注解到扩展字段的映射规则（源码定义见 `packages/build-tools/src/SchemaCompiler.ts` 的 `X_PREFIX_TAGS`）：

| JSDoc 注解 | 扩展字段 | 说明 |
|-----------|---------|------|
| `@group xxx` | `x-group: "xxx"` | 字段分组 |
| `@priority N` | `x-priority: N` | 排序权重 |
| `@component xxx` | `x-component: "xxx"` | 自定义控件 |
| `@visible expr` | `x-visible: "expr"` | 条件显隐 |
| `@disabled expr` | `x-disabled: "expr"` | 条件禁用 |
| `@dictionary xxx` | `x-dictionary: "xxx"` | 字典引用 |
| `@dataSource xxx` | `x-dataSource: "xxx"` | 变量绑定数据源 |
| `@validator xxx` | `x-validator: "xxx"` | 校验规则名 |
| `@validator-message xxx` | `x-validator-message: "xxx"` | 校验错误提示 |
| `@placeholder xxx` | `x-placeholder: "xxx"` | 占位提示 |
| `@layout xxx` | `x-layout: "xxx"` | 布局方式 |
| `@layout-mode xxx` | `x-layout-mode: "xxx"` | 布局模式 |
| `@decorator xxx` | `x-decorator: "xxx"` | 装饰器 |
| `@no-binding` | `x-no-binding` | 禁止变量/表达式绑定 |
| `@value-type xxx` | `x-value-type: "xxx"` | 组件值的 TypeScript 类型（从 antd 类型定义自动提取） |
| `@default xxx` | `default: xxx` | 属性默认值（标准 JSON Schema 关键字） |
| `@ignore` | （编译时丢弃） | 属性不出现在 JSON Schema 中 |

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
  type: 'api';
  /** API 类型配置 */
  api?: ComponentApiConfig;
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
      "params": { "status": "$component.filterForm.$form.filterStatus" },
      "dataPath": "data.list"
    },
    "targetProp": "options",
    "autoLoad": true,
    "dependencies": ["$component.filterForm.$form.filterStatus"]
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

#### 设计器配置

设计器中「刷新组件」动作使用 `VariableTreeSelector` 多选模式（`env={['$component']}`），从组件变量树中勾选目标组件，支持多选。组件变量树中所有节点（含父节点组件）均可选中：

- **选中组件节点**（如 `$component.dept_select`）→ 刷新该组件全部属性，写入 `params.targets`
- **展开组件后选中属性节点**（如 `$component.dept_select.options`）→ 只刷新指定属性，写入 `params.propNames`

```jsonc
// 数据格式
{
  "action": "refreshComponent",
  "params": {
    "targets": ["dept_select", "user_select"],   // 组件 ID 列表（多选）
    "propNames": ["options", "value"]             // 可选：只刷新指定属性
  }
}
```

#### 使用场景

```jsonc
// 列表页新增记录后，刷新下拉框数据源
{
  "id": "add_btn",
  "type": "button",
  "events": {
    "onClick": [
      { "action": "showModal", "params": { "resourceType": "page", "resourceId": "abc12345", "data": {} } },
      {
        "action": "refreshComponent",
        "condition": "$result.success === true",
        "params": { "targets": ["dept_select"] }
      }
    ]
  }
}

// 多组件刷新 + 指定属性
{
  "action": "refreshComponent",
  "params": {
    "targets": ["dept_select", "user_select"],
    "propNames": ["options"]
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
const impact = actionContext.analyzeChangeImpact(new Set(['$component.form_01.$form.status', '$user']));
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

服务端变量通过 `QueryProxy` 模块执行，前端通过 `$table` Proxy 链构建查询，后端执行实际 SQL。

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

通过设计器 PropertyPanel "数据源" Tab 配置页面级数据源，结果赋给 `$data`：

```jsonc
// 页面 schema（PageSchema.dataSource 字段存储函数体）
{
  "dataSource": "return $table.user.filter(record=>record.status=='active').select('id', 'name').execute()"
}
```

ExpressionEditor 编辑器中显示为完整函数：
```js
async ({$user, $table, $platform, ...}) => {
  return $table.user.filter(record=>record.status=='active').select('id', 'name').execute()
}
```

保存时 `stripFunctionWrapper` 只保留函数体，运行时根据 `async` 标志重新包装为函数执行。

#### UI 配置与表达式双向转换

> **@deprecated 暂未实现** — `uiConfigToExpression` / `expressionToUIConfig` 方法已有代码骨架，待 UI 配置面板（表单化编辑器）开发后启用。

#### 运行时执行流程

唯一执行路径：**页面数据源函数体 → 表达式引擎 → $table Proxy 链 → 后端查询**

```
设计器 PropertyPanel "数据源" Tab
  → DataSourcePanel → ExpressionEditor
  → 用户在编辑器中编写函数体（如 return $table.user.filter(...).execute()）
  → ExpressionEditor 保存时 stripFunctionWrapper，只存函数体 + async 标志
  → dispatch SET_SCHEMA → schema.dataSource = "return $table.user.filter(...).execute()"

运行时 Renderer.tsx
  → expressionEngine.evaluateAsync(
      { type: 'expression', value: schema.dataSource, async: true },
      envContext  // { $user, $table, $platform, ... }
    )
  → 引擎包装为 async ({$user, $table, ...}) => { return $table.user.filter(...).execute() }
  → 执行函数，$table 参数命中 QueryProxy 链
  → QueryProxy.createQueryProxy() 收集结构化条件
  → POST /api/apps/:appId/query
  → 结果赋给 $data
```

#### filter 解析策略

Proxy 链的 `filter()` 方法从箭头函数 `toString()` 中提取结构化条件：

- **可解析的简单条件**（如 `record => record.status == 'active'`）→ 正则提取字段/操作符/值 → SQL WHERE
- **无法解析的复杂函数**（如 `record => complexLogic(record)`）→ 降级为 memoryFilter 字符串 → 后端 SQL 查全表（LIMIT 10000）+ Node.js 内存过滤

#### 权限控制

服务端变量查询需要后端进行权限校验：

```typescript
// 后端查询执行流程
POST /api/apps/:appId/query
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
│  POST /api/apps/:appId/query → 后端执行 SQL                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
