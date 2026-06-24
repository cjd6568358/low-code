/**
 * 栅格 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 栅格 Row 组件属性 */
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
   * @default 'start'
   */
  justify?: 'start' | 'end' | 'center' | 'space-around' | 'space-between' | 'space-evenly';

  /**
   * 垂直对齐
   * @group 基础属性
   * @priority 12
   * @default 'top'
   */
  align?: 'top' | 'middle' | 'bottom' | 'stretch';

  /**
   * 自动换行
   * @group 基础属性
   * @priority 13
   */
  wrap?: boolean;
}

/** 栅格 Col 组件属性 */
export interface ColProps extends BaseProps {
  /**
   * 栅格占位格数
   * @group 基础属性
   * @priority 10
   */
  span?: number | string;

  /**
   * 栅格左侧偏移格数
   * @group 基础属性
   * @priority 11
   */
  offset?: number | string;

  /**
   * 栅格顺序
   * @group 基础属性
   * @priority 12
   */
  order?: number | string;

  /**
   * 栅格向右移动格数
   * @group 基础属性
   * @priority 13
   */
  push?: number | string;

  /**
   * 栅格向左移动格数
   * @group 基础属性
   * @priority 14
   */
  pull?: number | string;

  /**
   * flex 布局填充
   * @group 基础属性
   * @priority 15
   */
  flex?: number | 'none' | 'auto';

  /**
   * 响应式 xs 断点（<576px）
   * @group 高级属性
   * @priority 20
   */
  xs?: number | string;

  /**
   * 响应式 sm 断点（≥576px）
   * @group 高级属性
   * @priority 21
   */
  sm?: number | string;

  /**
   * 响应式 md 断点（≥768px）
   * @group 高级属性
   * @priority 22
   */
  md?: number | string;

  /**
   * 响应式 lg 断点（≥992px）
   * @group 高级属性
   * @priority 23
   */
  lg?: number | string;

  /**
   * 响应式 xl 断点（≥1200px）
   * @group 高级属性
   * @priority 24
   */
  xl?: number | string;

  /**
   * 响应式 xxl 断点（≥1600px）
   * @group 高级属性
   * @priority 25
   */
  xxl?: number | string;

  /**
   * 响应式 xxxl 断点（≥2000px）
   * @group 高级属性
   * @priority 26
   */
  xxxl?: number | string;
}
