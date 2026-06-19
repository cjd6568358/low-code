/**
 * 滑动条 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 滑动条 组件属性 */
export interface SliderProps extends BaseProps {
  /**
   * 最小值
   * @group 基础属性
   * @priority 10

   */
  min?: number;

  /**
   * 最大值
   * @group 基础属性
   * @priority 11

   */
  max?: number;

  /**
   * 步长
   * @group 基础属性
   * @priority 12

   */
  step?: number;

  /**
   * 值
   * @group 基础属性
   * @priority 13

   */
  value?: number | [number, number];

  /**
   * 双滑块
   * @group 基础属性
   * @priority 14

   */
  range?: boolean;

  /**
   * 垂直
   * @group 基础属性
   * @priority 15

   */
  vertical?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 16

   */
  disabled?: boolean;

  /**
   * 刻度标记
   * @group 高级属性
   * @priority 20

   */
  marks?: Record<number, string>;
}
