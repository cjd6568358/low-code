/**
 * 时间选择 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 时间选择 组件属性 */
export interface TimePickerProps extends BaseProps {
  /**
   * 占位提示
   * @group 基础属性
   * @priority 10

   */
  placeholder?: string;

  /**
   * 时间格式
   * @group 基础属性
   * @priority 11

   */
  format?: string;

  /**
   * 12小时制
   * @group 高级属性
   * @priority 20

   */
  use12Hours?: boolean;

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
}
