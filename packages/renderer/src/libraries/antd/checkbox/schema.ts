/**
 * 多选 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 多选 组件属性 */
export interface CheckboxProps extends BaseProps {
  /**
   * 选中
   * @group 基础属性
   * @priority 10
   */
  checked?: boolean;

  /**
   * 默认选中
   * @group 基础属性
   * @priority 11
   */
  defaultChecked?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 12
   */
  disabled?: boolean;

  /**
   * 半选
   * @group 基础属性
   * @priority 13
   */
  indeterminate?: boolean;

  /**
   * 是否必填
   * @group 基础属性
   * @priority 14
   */
  required?: boolean;

  /**
   * 标签文本
   * @group 基础属性
   * @priority 15
   */
  title?: string;

  /**
   * 选项文本
   * @group 基础属性
   * @priority 20
   */
  children?: string;

  /**
   * 选项值
   * @group 基础属性
   * @priority 21
   */
  value?: string;

  /**
   * 组件 ID
   * @group 高级属性
   * @priority 30
   */
  id?: string;

  /**
   * CSS 类名
   * @group 高级属性
   * @priority 31
   */
  className?: string;

  /**
   * 自动获取焦点
   * @group 高级属性
   * @priority 32
   */
  autoFocus?: boolean;

  /**
   * Tab 键序号
   * @group 高级属性
   * @priority 33
   */
  tabIndex?: number;
}
