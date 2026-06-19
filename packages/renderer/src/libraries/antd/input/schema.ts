/**
 * 输入框 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 输入框 组件属性 */
export interface InputProps extends BaseProps {
  /**
   * 占位提示
   * @group 基础属性
   * @priority 10

   */
  placeholder?: string;

  /**
   * 最大长度
   * @group 基础属性
   * @priority 11

   */
  maxLength?: number;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 12

   */
  allowClear?: boolean;

  /**
   * 显示字数
   * @group 基础属性
   * @priority 13

   */
  showCount?: boolean;

  /**
   * 前缀
   * @group 高级属性
   * @priority 20

   */
  prefix?: React.ReactNode;

  /**
   * 后缀
   * @group 高级属性
   * @priority 21

   */
  suffix?: React.ReactNode;

  /**
   * 前置标签
   * @group 高级属性
   * @priority 22

   */
  addonBefore?: React.ReactNode;

  /**
   * 后置标签
   * @group 高级属性
   * @priority 23

   */
  addonAfter?: React.ReactNode;

  /**
   * 禁用
   * @group 基础属性
   * @priority 14

   */
  disabled?: boolean;

  /**
   * 只读
   * @group 基础属性
   * @priority 15

   */
  readOnly?: boolean;
}
