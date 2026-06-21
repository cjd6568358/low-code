/**
 * 统计数值 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 统计数值 组件属性 */
export interface StatisticProps extends BaseProps {
  /**
   * 标题
   * @group 基础属性
   * @priority 10

   */
  title?: string;

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
  prefix?: string;

  /**
   * 后缀
   * @group 基础属性
   * @priority 13

   */
  suffix?: string;

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
  valueStyle?: Record<string, unknown>;

  /**
   * 千分符
   * @group 高级属性
   * @priority 21

   */
  groupSeparator?: string;
}
