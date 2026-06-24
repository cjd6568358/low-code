/**
 * 单选 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 单选 组件属性 */
export interface RadioProps extends BaseProps {
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
   * 自动获取焦点
   * @group 基础属性
   * @priority 13
   */
  autoFocus?: boolean;

  /**
   * 必填
   * @group 基础属性
   * @priority 14
   */
  required?: boolean;

  /**
   * 根据 value 进行比较，判断是否选中（配合 Radio.Group 使用）
   * @group 基础属性
   * @priority 15
   */
  value?: string;

  /**
   * 组件 ID
   * @group 基础属性
   * @priority 20
   */
  id?: string;

  /**
   * CSS 类名
   * @group 样式
   * @priority 51
   */
  className?: string;

  /**
   * 提示文本
   * @group 基础属性
   * @priority 21
   */
  title?: string;
}
