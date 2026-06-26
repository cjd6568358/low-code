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
   * 垂直排列（已废弃，使用 orientation 替代）
   * @ignore
   */
  vertical?: boolean;

  /**
   * 排列方向
   * @group 基础属性
   * @priority 11
   * @default horizontal
   * @enumLabels horizontal:水平, vertical:垂直
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * 换行
   * @group 基础属性
   * @priority 12
   * @default nowrap
   */
  wrap?: boolean | 'nowrap' | 'wrap' | 'wrap-reverse';

  /**
   * 主轴对齐
   * @group 基础属性
   * @priority 13
   * @default flex-start
   * @enumLabels flex-start:起始对齐, center:居中, flex-end:末尾对齐, space-between:两端对齐, space-around:环绕对齐, space-evenly:均分对齐
   */
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';

  /**
   * 交叉轴对齐
   * @group 基础属性
   * @priority 14
   * @default stretch
   * @enumLabels flex-start:起始对齐, center:居中, flex-end:末尾对齐, stretch:拉伸, baseline:基线
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
   * @default 8
   */
  gap?: 'small' | 'medium' | 'large' | number | string;
}
