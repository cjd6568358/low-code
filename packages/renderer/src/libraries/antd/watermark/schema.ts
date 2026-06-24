/**
 * 水印 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 水印字体配置 */
export interface WatermarkFont {
  /**
   * 字体颜色
   * @group 高级属性
   * @priority 20
   */
  color?: string;

  /**
   * 字体大小
   * @group 高级属性
   * @priority 21
   */
  fontSize?: number | string;

  /**
   * 字体粗细
   * @group 高级属性
   * @priority 22
   */
  fontWeight?: 'normal' | 'lighter' | 'bold' | 'bolder' | number;

  /**
   * 字体样式
   * @group 高级属性
   * @priority 23
   */
  fontStyle?: 'none' | 'normal' | 'italic' | 'oblique';

  /**
   * 字体族
   * @group 高级属性
   * @priority 24
   */
  fontFamily?: string;

  /**
   * 文本对齐方式
   * @group 高级属性
   * @priority 25
   */
  textAlign?: 'start' | 'center' | 'end' | 'left' | 'right';
}

/** 水印 组件属性 */
export interface WatermarkProps extends BaseProps {
  /**
   * 文字
   * @group 基础属性
   * @priority 10
   */
  content?: string | string[];

  /**
   * 字体配置
   * @group 高级属性
   * @priority 20
   */
  font?: WatermarkFont;

  /**
   * 旋转角度
   * @group 高级属性
   * @priority 21
   * @default -22
   */
  rotate?: number;

  /**
   * 层级
   * @group 高级属性
   * @priority 22
   */
  zIndex?: number;

  /**
   * 图片地址
   * @group 高级属性
   * @priority 23
   */
  image?: string;

  /**
   * 水印宽度
   * @group 基础属性
   * @priority 11
   * @default 120
   */
  width?: number;

  /**
   * 水印高度
   * @group 基础属性
   * @priority 12
   * @default 64
   */
  height?: number;

  /**
   * 水印间距 [水平, 垂直]
   * @group 高级属性
   * @priority 26
   */
  gap?: [number, number];

  /**
   * 水印偏移量 [水平, 垂直]
   * @group 高级属性
   * @priority 27
   */
  offset?: [number, number];

  /**
   * 是否继承父级水印
   * @group 高级属性
   * @priority 28
   */
  inherit?: boolean;
}
