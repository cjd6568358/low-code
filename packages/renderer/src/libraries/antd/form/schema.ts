/**
 * 表单 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 表单 组件属性 */
export interface FormProps extends BaseProps {
  /**
   * 布局
   * @group 基础属性
   * @priority 10
   * @enum ["horizontal","vertical","inline"]
   */
  layout?: string;

  /**
   * 标签列宽
   * @group 基础属性
   * @priority 11

   */
  labelCol?: object;

  /**
   * 内容列宽
   * @group 基础属性
   * @priority 12

   */
  wrapperCol?: object;

  /**
   * 标签对齐
   * @group 基础属性
   * @priority 13
   * @enum ["left","right"]
   */
  labelAlign?: string;

  /**
   * 冒号
   * @group 基础属性
   * @priority 14

   */
  colon?: boolean;

  /**
   * 必填标记
   * @group 基础属性
   * @priority 15

   */
  requiredMark?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 16

   */
  disabled?: boolean;
}
