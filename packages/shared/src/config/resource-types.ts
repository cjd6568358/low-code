/**
 * 资源类型元数据 — 唯一数据源
 *
 * 前端、服务端、引擎层统一从此处引用，禁止在其他位置硬编码资源类型列表。
 * 新增资源类型只需在此处添加一条记录。
 */

/** 资源类型元数据条目 */
interface ResourceTypeEntry {
  /** 复数 key，用作目录名 / API key */
  value: string;
  /** 中文显示名 */
  label: string;
  /** 单数形式，用于路由 / ID 前缀 */
  singular: string;
  /** antd 图标名称（字符串），前端通过 ICON_REGISTRY 映射为 React 元素 */
  icon: string;
}

/** 资源类型元数据表 */
const RESOURCE_TYPE_TABLE: readonly ResourceTypeEntry[] = [
  { value: 'pages',        label: '页面',   singular: 'page',        icon: 'FileOutlined' },
  { value: 'cards',        label: '卡片',   singular: 'card',        icon: 'FormOutlined' },
  { value: 'tables',       label: '数据表', singular: 'table',       icon: 'TableOutlined' },
  { value: 'workflows',    label: '流程',   singular: 'workflow',    icon: 'NodeIndexOutlined' },
  { value: 'automations',  label: '自动化', singular: 'automation',  icon: 'ThunderboltOutlined' },
  { value: 'computations', label: '运算',   singular: 'computation', icon: 'CalculatorOutlined' },
];

// ─── 派生导出 ─────────────────────────────────────────────

/** 资源类型联合类型（从表数据自动推导） */
export type ExposableResourceType = typeof RESOURCE_TYPE_TABLE[number]['value'];

/** 资源类型列表（复数 key） */
export const RESOURCE_TYPES: readonly ExposableResourceType[] =
  RESOURCE_TYPE_TABLE.map((i) => i.value);

/** 资源类型 → 元数据映射 */
export const RESOURCE_META_MAP: Readonly<Record<ExposableResourceType, ResourceTypeEntry>> =
  Object.fromEntries(RESOURCE_TYPE_TABLE.map((i) => [i.value, i])) as Record<ExposableResourceType, ResourceTypeEntry>;
