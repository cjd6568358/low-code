/**
 * 悬浮按钮 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 悬浮按钮 组件属性 */
export interface FloatButtonProps extends BaseProps {
  /**
   * 图标
   * @group 基础属性
   * @priority 10

   */
  icon?: React.ReactNode;

  /**
   * 描述
   * @group 基础属性
   * @priority 11

   */
  description?: React.ReactNode;

  /**
   * 类型
   * @group 基础属性
   * @priority 12
   * @enum ["default","primary"]
   */
  type?: string;

  /**
   * 形状
   * @group 基础属性
   * @priority 13
   * @enum ["circle","square"]
   */
  shape?: string;

  /**
   * 提示
   * @group 高级属性
   * @priority 20

   */
  tooltip?: string | React.ReactNode;

  /**
   * 徽标
   * @group 高级属性
   * @priority 21

   */
  badge?: object;
}
