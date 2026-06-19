/**
 * 开关 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 开关 组件属性 */
export interface SwitchProps extends BaseProps {
  /**
   * 选中
   * @group 基础属性
   * @priority 10

   */
  checked?: boolean;

  /**
   * 选中文案
   * @group 基础属性
   * @priority 11

   */
  checkedChildren?: React.ReactNode;

  /**
   * 非选中文案
   * @group 基础属性
   * @priority 12

   */
  unCheckedChildren?: React.ReactNode;

  /**
   * 禁用
   * @group 基础属性
   * @priority 13

   */
  disabled?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 14
   * @enum ["default","small"]
   */
  size?: string;

  /**
   * 加载中
   * @group 高级属性
   * @priority 20

   */
  loading?: boolean;
}
