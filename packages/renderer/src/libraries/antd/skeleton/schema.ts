/**
 * 骨架屏 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 骨架屏 组件属性 */
export interface SkeletonProps extends BaseProps {
  /**
   * 动画
   * @group 基础属性
   * @priority 10

   */
  active?: boolean;

  /**
   * 加载中
   * @group 基础属性
   * @priority 11

   */
  loading?: boolean;

  /**
   * 头像
   * @group 基础属性
   * @priority 12

   */
  avatar?: boolean | object;

  /**
   * 标题
   * @group 基础属性
   * @priority 13

   */
  title?: boolean | object;

  /**
   * 段落
   * @group 基础属性
   * @priority 14

   */
  paragraph?: boolean | object;

  /**
   * 圆角
   * @group 高级属性
   * @priority 20

   */
  round?: boolean;
}
