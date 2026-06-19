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
  width?: number;

  /**
   * 高度
   * @group 基础属性
   * @priority 13

   */
  height?: number;

  /**
   * 预览
   * @group 基础属性
   * @priority 14

   */
  preview?: boolean;

  /**
   * 兜底图
   * @group 高级属性
   * @priority 20

   */
  fallback?: string;
}
