/**
 * 标签 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 标签 组件属性 */
export interface TagProps extends BaseProps {
  /**
   * 颜色
   * @group 基础属性
   * @priority 10

   */
  color?: string;

  /**
   * 可关闭
   * @group 基础属性
   * @priority 11

   */
  closable?: boolean;

  /**
   * 图标
   * @group 基础属性
   * @priority 12

   */
  icon?: React.ReactNode;

  /**
   * 边框
   * @group 基础属性
   * @priority 13

   */
  bordered?: boolean;
}
