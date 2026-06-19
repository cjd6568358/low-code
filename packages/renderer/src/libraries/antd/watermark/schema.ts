/**
 * 水印 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 水印 组件属性 */
export interface WatermarkProps extends BaseProps {
  /**
   * 文字
   * @group 基础属性
   * @priority 10

   */
  content?: string | string[];

  /**
   * 字体
   * @group 高级属性
   * @priority 20

   */
  font?: object;

  /**
   * 旋转
   * @group 高级属性
   * @priority 21

   */
  rotate?: number;

  /**
   * 层级
   * @group 高级属性
   * @priority 22

   */
  zIndex?: number;

  /**
   * 图片
   * @group 高级属性
   * @priority 23

   */
  image?: string;
}
