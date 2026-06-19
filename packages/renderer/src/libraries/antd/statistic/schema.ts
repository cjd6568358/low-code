/**
 * 统计数值 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 统计数值 组件属性 */
export interface StatisticProps extends BaseProps {
  /**
   * 标题
   * @group 基础属性
   * @priority 10

   */
  title?: React.ReactNode;

  /**
   * 数值
   * @group 基础属性
   * @priority 11

   */
  value?: number | string;

  /**
   * 前缀
   * @group 基础属性
   * @priority 12

   */
  prefix?: React.ReactNode;

  /**
   * 后缀
   * @group 基础属性
   * @priority 13

   */
  suffix?: React.ReactNode;

  /**
   * 精度
   * @group 基础属性
   * @priority 14

   */
  precision?: number;

  /**
   * 数值样式
   * @group 高级属性
   * @priority 20

   */
  valueStyle?: React.CSSProperties;

  /**
   * 千分符
   * @group 高级属性
   * @priority 21

   */
  groupSeparator?: string;
}
