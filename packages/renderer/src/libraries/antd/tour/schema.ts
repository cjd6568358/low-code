/**
 * 漫游引导 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 漫游引导 组件属性 */
export interface TourProps extends BaseProps {
  /**
   * 步骤
   * @group 基础属性
   * @priority 10

   */
  steps?: any[];

  /**
   * 当前步骤
   * @group 基础属性
   * @priority 11

   */
  current?: number;

  /**
   * 类型
   * @group 基础属性
   * @priority 12
   * @enum ["default","primary"]
   */
  type?: string;

  /**
   * 遮罩
   * @group 基础属性
   * @priority 13

   */
  mask?: boolean;

  /**
   * 箭头
   * @group 基础属性
   * @priority 14

   */
  arrow?: boolean;
}
