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
   * 排列方向（水平/垂直）
   * @group 基础属性
   * @priority 11
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * 换行
   * @group 基础属性
   * @priority 12
   */
  wrap?: boolean | 'nowrap' | 'wrap' | 'wrap-reverse';

  /**
   * 主轴对齐
   * @group 基础属性
   * @priority 13
   */
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';

  /**
   * 交叉轴对齐
   * @group 基础属性
   * @priority 14
   */
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';

  /**
   * flex 属性简写
   * @group 基础属性
   * @priority 15
   */
  flex?: number | string;

  /**
   * 间距，支持预设尺寸或具体数值
   * @group 基础属性
   * @priority 16
   */
  gap?: 'small' | 'medium' | 'large' | number | string;
}
