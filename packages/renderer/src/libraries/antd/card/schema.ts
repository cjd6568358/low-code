/**
 * 卡片 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 卡片 组件属性 */
export interface CardProps extends BaseProps {
  /**
   * 标题
   * @group 基础属性
   * @priority 10

   */
  title?: React.ReactNode;

  /**
   * 额外操作
   * @group 基础属性
   * @priority 11

   */
  extra?: React.ReactNode;

  /**
   * 边框
   * @group 基础属性
   * @priority 12

   */
  bordered?: boolean;

  /**
   * 悬浮效果
   * @group 基础属性
   * @priority 13

   */
  hoverable?: boolean;

  /**
   * 加载中
   * @group 基础属性
   * @priority 14

   */
  loading?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 15
   * @enum ["default","small"]
   */
  size?: string;

  /**
   * 类型
   * @group 基础属性
   * @priority 16
   * @enum ["inner"]
   */
  type?: string;
}
