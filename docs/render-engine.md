# 渲染引擎 (Render Engine)

渲染引擎是平台的核心模块，涵盖**页面设计器**和**运行时渲染器**两大部分。

## 页面设计器

页面设计器采用**三栏布局**，提供直观高效的可视化搭建体验。

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
│  🔍 搜索    │  │  Web  │  Mobile  │  小程序   │  │              │
└──────────────┴──┴───────────────────────────┴──┴──────────────┘
```

### 左侧 — 组件面板

- **组件分类**：基础组件、高级组件、业务组件、自定义组件库
- **拖拽添加**：从面板拖拽组件到设计区，自动生成组件配置
- **组件搜索**：支持按名称/标签快速检索组件

### 组件库切换

设计器支持切换不同组件库，当前默认使用 **Ant Design**。

左侧基础组件为所有组件库的**交集子集**，确保跨库通用：

| 基础组件 | Ant Design | Element Plus | 其他组件库 |
|---------|------------|--------------|-----------|
| Input 输入框 | ✅ Input | ✅ ElInput | ✅ |
| Select 选择器 | ✅ Select | ✅ ElSelect | ✅ |
| Button 按钮 | ✅ Button | ✅ ElButton | ✅ |
| Table 表格 | ✅ Table | ✅ ElTable | ✅ |
| Form 表单 | ✅ Form | ✅ ElForm | ✅ |
| DatePicker 日期 | ✅ DatePicker | ✅ ElDatePicker | ✅ |
| Switch 开关 | ✅ Switch | ✅ ElSwitch | ✅ |
| Checkbox 多选 | ✅ Checkbox | ✅ ElCheckbox | ✅ |
| Radio 单选 | ✅ Radio | ✅ ElRadio | ✅ |
| Upload 上传 | ✅ Upload | ✅ ElUpload | ✅ |

> 高级组件和业务组件可包含组件库特有能力，切换组件库时按需降级或替换。

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

  // 组件库映射
  componentLibrary: 'antd' | 'element-plus' | 'custom';

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

- **拖拽开发**：基于 DND (Drag and Drop) 实现可视化页面搭建
- **布局系统**：支持 Flex / Grid 两种主流布局模式
- **实时预览**：设计区即所见即所得，支持切换 Web / Mobile / 小程序预览
- **组件操作**：选中、拖拽排序、复制粘贴、删除、嵌套组合
- **条件规则配置**：支持配置显隐规则，按条件控制表单/页面组件的展示与隐藏

### 右侧 — 属性配置面板

属性配置面板通过 **TS → JSON Schema** 自动转换机制，读取组件的 TypeScript 类型定义并自动渲染为可视化配置表单。

#### 工作流程

```
组件 TS 类型定义 (Props Interface)
        │
        ▼
  TS → JSON Schema 转换 (ts-json-schema-generator)
        │
        ▼
  注入优先级 + 分组元数据
        │
        ▼
  JSON Schema → 配置表单自动渲染 (FormRender / RJSF)
```

#### TS 转 JSON Schema 示例

```typescript
// 组件 TS 定义
interface InputProps extends BaseProps {
  /** @group 基础属性 */
  /** @priority 1 */
  placeholder?: string;

  /** @group 基础属性 */
  /** @priority 2 */
  maxLength?: number;

  /** @group 基础属性 */
  /** @priority 3 */
  allowClear?: boolean;

  /** @group 高级属性 */
  /** @priority 10 */
  addonBefore?: React.ReactNode;

  /** @group 校验规则 */
  /** @priority 20 */
  required?: boolean;

  /** @group 校验规则 */
  /** @priority 21 */
  pattern?: string;
}
```

```jsonc
// 自动生成的 JSON Schema
{
  "type": "object",
  "properties": {
    "placeholder": { "type": "string", "title": "占位提示", "x-priority": 1, "x-group": "基础属性" },
    "maxLength": { "type": "number", "title": "最大长度", "x-priority": 2, "x-group": "基础属性" },
    "allowClear": { "type": "boolean", "title": "允许清除", "x-priority": 3, "x-group": "基础属性" },
    "addonBefore": { "type": "string", "title": "前置标签", "x-priority": 10, "x-group": "高级属性" },
    "required": { "type": "boolean", "title": "必填", "x-priority": 20, "x-group": "校验规则" },
    "pattern": { "type": "string", "title": "正则校验", "x-priority": 21, "x-group": "校验规则" }
  }
}
```

#### 面板展示结构

属性面板按 **Tab → Group → 字段** 三级结构组织，字段按 `x-priority` 排序：

```
┌─────────────────────────────────────┐
│  [属性]  [样式]  [事件]  [数据]       │  ← Tab 切换
├─────────────────────────────────────┤
│  ▼ 基础属性                         │  ← Group 折叠
│  ├ 占位提示  [请输入...]     (p=1)   │  ← 按 priority 排序
│  ├ 最大长度  [50]           (p=2)   │
│  └ 允许清除  [✓]            (p=3)   │
│                                     │
│  ▼ 高级属性                         │
│  └ 前置标签  [¥]            (p=10)  │
│                                     │
│  ▶ 校验规则                         │  ← 折叠状态
└─────────────────────────────────────┘
```

#### 展示配置能力

| 能力 | 说明 |
|------|------|
| Tab 分组 | 属性 / 样式 / 事件 / 数据 四大 Tab，支持自定义扩展 |
| Group 折叠 | 每个 Tab 内按 `x-group` 分组，支持展开/折叠 |
| 优先级排序 | 组内字段按 `x-priority` 数值升序排列 |
| 字段覆盖 | 支持在 JSON Schema 上覆盖 `x-component`、`x-decorator` 等自定义渲染器 |
| 字段隐藏 | `x-hidden: true` 或 `visible: false` 隐藏特定字段 |
| 条件联动 | 支持 `x-visible` / `x-disabled` 条件表达式 |

### 属性定义体系

使用 TypeScript 抽象所有基础组件的属性定义为 `BaseProps`，通过继承机制派生各组件自身的 Props 类型：

```typescript
// 基础属性抽象
interface BaseProps {
  visible?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  // ...通用属性
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

## 运行时渲染器

- **多端支持**：Web / Mobile / 小程序，复用同一套运行时
- **JSON Schema 驱动**：设计器产出的页面描述 JSON 直接驱动运行时渲染
- **跨端适配层**：通过适配器模式屏蔽各端差异，统一组件渲染逻辑

```
┌─────────────────────────────────────────────────┐
│               页面描述 JSON Schema                │
├─────────────┬───────────────┬───────────────────┤
│  Web 适配器  │  Mobile 适配器  │  小程序适配器      │
│  (React)    │  (React Native)│  (Taro/uni-app)   │
└─────────────┴───────────────┴───────────────────┘
```
