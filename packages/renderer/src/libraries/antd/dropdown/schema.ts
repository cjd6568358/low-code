/**
 * 下拉菜单 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 下拉菜单 组件属性 */
export interface DropdownProps extends BaseProps {
  /**
   * 菜单配置
   * @group 基础属性
   * @priority 10

   */
  menu?: Record<string, any>;

  /**
   * 弹出位置
   * @group 基础属性
   * @priority 11
   */
  placement?: 'bottomLeft' | 'bottomCenter' | 'bottomRight' | 'topLeft' | 'topCenter' | 'topRight';

  /**
   * 触发方式
   * @group 基础属性
   * @priority 12

   */
  trigger?: string[];

  /**
   * 箭头
   * @group 基础属性
   * @priority 13

   */
  arrow?: boolean;
}
