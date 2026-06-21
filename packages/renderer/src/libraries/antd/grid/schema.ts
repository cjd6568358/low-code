/**
 * 栅格 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 栅格 组件属性 */
export interface RowProps extends BaseProps {
  /**
   * 栅格间距
   * @group 基础属性
   * @priority 10

   */
  gutter?: number | [number, number];

  /**
   * 水平排列
   * @group 基础属性
   * @priority 11
   */
  justify?: 'start' | 'end' | 'center' | 'space-around' | 'space-between' | 'space-evenly';

  /**
   * 垂直对齐
   * @group 基础属性
   * @priority 12
   */
  align?: 'top' | 'middle' | 'bottom';

  /**
   * 自动换行
   * @group 基础属性
   * @priority 13

   */
  wrap?: boolean;
}
