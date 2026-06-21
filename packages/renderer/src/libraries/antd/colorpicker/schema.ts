/**
 * 颜色选择 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 颜色选择 组件属性 */
export interface ColorPickerProps extends BaseProps {
  /**
   * 颜色值
   * @group 基础属性
   * @priority 10

   */
  value?: string;

  /**
   * 默认颜色
   * @group 基础属性
   * @priority 11

   */
  defaultValue?: string;

  /**
   * 显示文字
   * @group 基础属性
   * @priority 12

   */
  showText?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 13

  /**
   * 禁用
   * @group 基础属性
   * @priority 14

   */
  disabled?: boolean;
}
