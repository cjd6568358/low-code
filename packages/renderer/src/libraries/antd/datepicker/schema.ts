/**
 * 日期选择 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 日期选择 组件属性 */
export interface DatePickerProps extends BaseProps {
  /**
   * 占位提示
   * @group 基础属性
   * @priority 10

   */
  placeholder?: string;

  /**
   * 日期格式
   * @group 基础属性
   * @priority 11

   */
  format?: string;

  /**
   * 显示时间
   * @group 高级属性
   * @priority 20

   */
  showTime?: boolean;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 12

   */
  allowClear?: boolean;

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
   * @enum ["large","middle","small"]
   */
  size?: string;
}
