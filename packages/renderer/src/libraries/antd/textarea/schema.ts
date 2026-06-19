/**
 * 文本域 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 文本域 组件属性 */
export interface TextAreaProps extends BaseProps {
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
   * 行数
   * @group 基础属性
   * @priority 12

   */
  rows?: number;

  /**
   * 自适应高度
   * @group 高级属性
   * @priority 20

   */
  autoSize?: boolean | { minRows?: number; maxRows?: number };

  /**
   * 显示字数
   * @group 基础属性
   * @priority 13

   */
  showCount?: boolean;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 14

   */
  allowClear?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 15

   */
  disabled?: boolean;

  /**
   * 只读
   * @group 基础属性
   * @priority 16

   */
  readOnly?: boolean;
}
