/**
 * 徽标 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 徽标 组件属性 */
export interface BadgeProps extends BaseProps {
  /**
   * 数量
   * @group 基础属性
   * @priority 10

   */
  count?: number;

  /**
   * 红点
   * @group 基础属性
   * @priority 11

   */
  dot?: boolean;

  /**
   * 显示零
   * @group 基础属性
   * @priority 12

   */
  showZero?: boolean;

  /**
   * 封顶值
   * @group 基础属性
   * @priority 13

   */
  overflowCount?: number;

  /**
   * 颜色
   * @group 基础属性
   * @priority 14

   */
  color?: string;
}
