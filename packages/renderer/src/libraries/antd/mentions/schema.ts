/**
 * 提及 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 提及 组件属性 */
export interface MentionsProps extends BaseProps {
  /**
   * 选项数据
   * @group 基础属性
   * @priority 10

   */
  options?: any[];

  /**
   * 占位提示
   * @group 基础属性
   * @priority 11

   */
  placeholder?: string;

  /**
   * 值
   * @group 基础属性
   * @priority 12

   */
  value?: string;

  /**
   * 触发前缀
   * @group 基础属性
   * @priority 13

   */
  prefix?: string | string[];

  /**
   * 禁用
   * @group 基础属性
   * @priority 14

   */
  disabled?: boolean;

  /**
   * 行数
   * @group 基础属性
   * @priority 15

   */
  rows?: number;
}
