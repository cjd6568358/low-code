/**
 * 组件库定义
 *
 * antd 为默认组件库，提供 BaseProps、组件实现、JSON Schema 三件套。
 * 新增组件库只需实现同结构的文件并在 Designer 中传入 library 名即可。
 */

export {
  antdBasePropsSchema,
  antdComponentImpls,
  antdCategoryMap,
  antdContainerTypes,
  antdSchemas,
} from './antd-library';

// antd 组件清单（全量枚举，用于筛选适合设计器拖拽的组件）
export { ANTD_MANIFEST } from './antd-manifest';
export type { AntdComponentMeta } from './antd-manifest';
