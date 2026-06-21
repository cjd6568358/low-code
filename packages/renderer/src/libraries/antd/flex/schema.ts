/**
 * 弹性布局 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 弹性布局 组件属性 */
export interface FlexProps extends BaseProps {
  /**
   * 垂直排列
   * @group 基础属性
   * @priority 10

   */
  vertical?: boolean;

  /**
   * 换行
   * @group 基础属性
   * @priority 11
   */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';

  /**
   * 主轴对齐
   * @group 基础属性
   * @priority 12
   */
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';

  /**
   * 交叉轴对齐
   * @group 基础属性
   * @priority 13
   */
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';

  /**
   * 间距
   * @group 基础属性
   * @priority 14

   */
  gap?: number | string;
}
