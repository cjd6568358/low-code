/**
 * 锚点 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 锚点 组件属性 */
export interface AnchorProps extends BaseProps {
  /**
   * 锚点数据
   * @group 基础属性
   * @priority 10

   */
  items?: any[];

  /**
   * 方向
   * @group 基础属性
   * @priority 11
   * @enum ["vertical","horizontal"]
   */
  direction?: string;

  /**
   * 固定模式
   * @group 基础属性
   * @priority 12

   */
  affix?: boolean;

  /**
   * 偏移顶部
   * @group 基础属性
   * @priority 13

   */
  offsetTop?: number;

  /**
   * 锚点偏移
   * @group 基础属性
   * @priority 14

   */
  targetOffset?: number;
}
