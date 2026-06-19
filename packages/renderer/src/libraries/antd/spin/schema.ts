/**
 * 加载中 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 加载中 组件属性 */
export interface SpinProps extends BaseProps {
  /**
   * 加载中
   * @group 基础属性
   * @priority 10

   */
  spinning?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 11
   * @enum ["small","default","large"]
   */
  size?: string;

  /**
   * 提示
   * @group 基础属性
   * @priority 12

   */
  tip?: string;

  /**
   * 延迟
   * @group 高级属性
   * @priority 20

   */
  delay?: number;

  /**
   * 指示器
   * @group 高级属性
   * @priority 21

   */
  indicator?: React.ReactNode;
}
