/**
 * BaseProps — 所有组件共有的公共属性
 *
 * 每个组件的 Props 接口通过 extends BaseProps 继承这些属性。
 * 生成 JSON Schema 时自动包含 BaseProps 的所有属性。
 */

/** 组件公共属性 */
export interface BaseProps {
  /**
   * 字段名称
   * @group 基础属性
   * @priority 0
   */
  name?: string;

  /**
   * 字段标签
   * @group 基础属性
   * @priority 1
   */
  label?: string;

  /**
   * 是否可见
   * @group 基础属性
   * @priority 2
   */
  visible?: boolean;

  /**
   * 内联样式
   * @group 样式
   * @priority 50
   */
  style?: React.CSSProperties;
}
