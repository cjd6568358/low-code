/**
 * 导航菜单 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 导航菜单 组件属性 */
export interface MenuProps extends BaseProps {
  /**
   * 菜单数据
   * @group 基础属性
   * @priority 10

   */
  items?: any[];

  /**
   * 模式
   * @group 基础属性
   * @priority 11
   * @enum ["vertical","horizontal","inline"]
   */
  mode?: string;

  /**
   * 主题
   * @group 基础属性
   * @priority 12
   * @enum ["light","dark"]
   */
  theme?: string;

  /**
   * 默认选中
   * @group 基础属性
   * @priority 13

   */
  defaultSelectedKeys?: string[];

  /**
   * 默认展开
   * @group 基础属性
   * @priority 14

   */
  defaultOpenKeys?: string[];
}
