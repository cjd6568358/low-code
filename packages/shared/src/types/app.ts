/**
 * 应用级类型定义
 *
 * 描述 app.json 的 TypeScript 结构，供前端、服务端、引擎层共享。
 *
 * `expose` 和 `references` 结构对称：
 * - expose 说"我暴露了什么"
 * - references 说"我引用了谁的什么"
 * 两者都按资源类型分组，key 即类型，value 为 ID 列表。
 */

/** 应用内可暴露/可引用的资源类型（对应 tenants/{id}/apps/{id}/ 下的子目录） */
export type ExposableResourceType =
  | 'pages'
  | 'cards'
  | 'tables'
  | 'workflows'
  | 'automations'
  | 'computations';

/**
 * 应用元数据 — 与 tenants/{id}/apps/{id}/app.json 一一对应
 */
export interface AppSchema {
  schemaVersion: number;
  version: number;
  appId: string;
  name: string;
  description: string;
  icon: string;
  appVersion: string;
  status: 'draft' | 'published' | 'archived';
  componentLibrary: string;
  visibility: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  /**
   * 跨应用引用声明 — 按资源类型分组
   *
   * 与 `expose` 互为镜像：expose 说"我暴露了什么"，references 说"我引用了谁的什么"。
   * 只能引用目标应用 `expose` 中已声明的资源。
   */
  references: CrossAppReferences;
  /**
   * 资源暴露配置 — 控制哪些资源可被跨应用引用
   *
   * 按资源类型分组，只有在此处列出的资源 ID 才允许被其他应用引用。
   * 未配置或为空表示不暴露任何资源。
   */
  expose?: AppExposeConfig;
}

/**
 * 应用资源暴露配置
 *
 * 按资源类型分组，每组记录允许被跨应用引用的裸资源 ID 列表。
 * 只有在此配置中出现的资源才能被其他应用 `references` 引用。
 *
 * ID 约定：裸 8 位 hex，不带资源类型前缀（前缀仅用于文件名）。
 *
 * @example
 * ```json
 * {
 *   "pages": ["abc12345"],
 *   "tables": ["xyz78901", "def45678"]
 * }
 * ```
 */
export type AppExposeConfig = Partial<Record<ExposableResourceType, string[]>>;

/**
 * 跨应用引用集合 — 按资源类型分组
 *
 * 每条引用为 `"{appId}.{resourceId}"` 格式的单一字符串。
 * 与 `AppExposeConfig` 结构对称。
 *
 * @example
 * ```json
 * {
 *   "tables": ["80e88653.xyz78901"],
 *   "pages": ["80e88653.abc12345"]
 * }
 * ```
 */
export type CrossAppReferences = Partial<Record<ExposableResourceType, string[]>>;

/**
 * 应用内引用集合 — 按资源类型分组
 *
 * 用在 page.json / table.json 等资源文件中，声明本资源依赖的同应用内其他资源。
 * 由编译器自动生成。
 *
 * 每条引用为裸资源 ID 字符串（同应用内无需 appId）。
 *
 * @example
 * ```json
 * {
 *   "tables": ["xyz78901"]
 * }
 * ```
 */
export type ResourceReferences = Partial<Record<ExposableResourceType, string[]>>;
