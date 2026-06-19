/**
 * 走马灯 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 走马灯 组件属性 */
export interface CarouselProps extends BaseProps {
  /**
   * 自动播放
   * @group 基础属性
   * @priority 10

   */
  autoplay?: boolean;

  /**
   * 指示点
   * @group 基础属性
   * @priority 11

   */
  dots?: boolean;

  /**
   * 指示点位置
   * @group 基础属性
   * @priority 12
   * @enum ["top","bottom","left","right"]
   */
  dotPosition?: string;

  /**
   * 动效
   * @group 基础属性
   * @priority 13
   * @enum ["scrollx","fade"]
   */
  effect?: string;

  /**
   * 速度
   * @group 高级属性
   * @priority 20

   */
  speed?: number;
}
