/**
 * 图片 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 图片 组件属性 */
export interface ImageProps extends BaseProps {
  /**
   * 图片地址
   * @group 基础属性
   * @priority 10
   */
  src?: string;

  /**
   * 替代文本
   * @group 基础属性
   * @priority 11
   */
  alt?: string;

  /**
   * 宽度
   * @group 基础属性
   * @priority 12
   */
  width?: number | string;

  /**
   * 高度
   * @group 基础属性
   * @priority 13
   */
  height?: number | string;

  /**
   * 预览
   * @group 基础属性
   * @priority 14
   * @default true
   */
  preview?: boolean;

  /**
   * 兜底图
   * @group 基础属性
   * @priority 15
   */
  fallback?: string;

  /**
   * CORS 属性设置
   * @group 基础属性
   * @priority 16
   */
  crossOrigin?: '' | 'anonymous' | 'use-credentials';

  /**
   * 加载策略
   * @group 基础属性
   * @priority 17
   */
  loading?: 'lazy' | 'eager';

  /**
   * 图片解码方式
   * @group 基础属性
   * @priority 18
   */
  decoding?: 'async' | 'sync' | 'auto';

  /**
   * 响应式图片地址集
   * @group 高级属性
   * @priority 20
   */
  srcSet?: string;

  /**
   * 响应式图片尺寸描述
   * @group 高级属性
   * @priority 21
   */
  sizes?: string;

  /**
   * Referrer 策略
   * @group 高级属性
   * @priority 22
   */
  referrerPolicy?: string;

  /**
   * 是否可拖拽
   * @group 高级属性
   * @priority 23
   */
  draggable?: boolean | 'true' | 'false';

  /**
   * 关联 map 元素的 name 属性
   * @group 高级属性
   * @priority 24
   */
  useMap?: string;

  /**
   * 是否作为服务器端图像映射
   * @group 高级属性
   * @priority 25
   */
  isMap?: boolean;
}
