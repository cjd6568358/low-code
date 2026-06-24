/**
 * 二维码 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 嵌入图片设置 */
export interface QRCodeImageSettings {
  /** 图片地址 */
  src: string;
  /** 图片宽度（像素） */
  width: number;
  /** 图片高度（像素） */
  height: number;
  /** 是否挖空图片覆盖区域的二维码模块 */
  excavate: boolean;
  /** 水平偏移（从左上角开始，不指定则居中） */
  x?: number;
  /** 垂直偏移（从左上角开始，不指定则居中） */
  y?: number;
  /** 图片透明度，范围 0-1 */
  opacity?: number;
  /** CORS 属性设置 */
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
}

/** 二维码 组件属性 */
export interface QRCodeProps extends BaseProps {
  /**
   * 二维码值
   * @group 基础属性
   * @priority 10
   */
  value?: string;

  /**
   * 尺寸（像素）
   * @group 基础属性
   * @priority 11
   * @default 160
   */
  size?: number;

  /**
   * 状态
   * @group 基础属性
   * @priority 12
   * @default "active"
   */
  status?: 'active' | 'expired' | 'loading' | 'scanned';

  /**
   * 渲染类型
   * @group 基础属性
   * @priority 13
   */
  type?: 'canvas' | 'svg';

  /**
   * 纠错等级
   * @group 基础属性
   * @priority 14
   */
  errorLevel?: 'L' | 'M' | 'Q' | 'H';

  /**
   * 是否有边框
   * @group 基础属性
   * @priority 15
   */
  bordered?: boolean;

  /**
   * 图标地址
   * @group 高级属性
   * @priority 20
   */
  icon?: string;

  /**
   * 前景色
   * @group 高级属性
   * @priority 21
   */
  color?: string;

  /**
   * 背景色
   * @group 高级属性
   * @priority 22
   */
  bgColor?: string;

  /**
   * 是否自动提升纠错等级
   * @group 高级属性
   * @priority 23
   */
  boostLevel?: boolean;

  /**
   * 边距（模块数）
   * @group 高级属性
   * @priority 24
   */
  marginSize?: number;

  /**
   * 无障碍标题
   * @group 高级属性
   * @priority 25
   */
  title?: string;

  /**
   * 最小版本（1-40，值越大二维码越复杂）
   * @group 高级属性
   * @priority 26
   */
  minVersion?: number;

  /**
   * 图标尺寸
   * @group 高级属性
   * @priority 27
   */
  iconSize?: number | Record<string, unknown>;

  /**
   * 嵌入图片设置
   * @group 高级属性
   * @priority 28
   */
  imageSettings?: QRCodeImageSettings;
}
