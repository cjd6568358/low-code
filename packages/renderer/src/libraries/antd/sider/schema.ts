/**
 * 侧边栏 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 侧边栏 组件属性 */
export interface SiderProps extends BaseProps {
  /**
   * 是否折叠
   * @group 基础属性
   * @priority 10

   */
  collapsed?: boolean;

  /**
   * 可折叠
   * @group 基础属性
   * @priority 11

   */
  collapsible?: boolean;

  /**
   * 宽度
   * @group 基础属性
   * @priority 12

   */
  width?: number;

  /**
   * 折叠宽度
   * @group 基础属性
   * @priority 13

   */
  collapsedWidth?: number;

  /**
   * 翻转箭头
   * @group 基础属性
   * @priority 14

   */
  reverseArrow?: boolean;

  /**
   * 主题
   * @group 基础属性
   * @priority 15
   */
  theme?: 'light' | 'dark';
}
