/**
 * 评分 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 评分 组件属性 */
export interface RateProps extends BaseProps {
  /**
   * 值
   * @group 基础属性
   * @priority 10

   */
  value?: number;

  /**
   * 总数
   * @group 基础属性
   * @priority 11

   */
  count?: number;

  /**
   * 允许半选
   * @group 基础属性
   * @priority 12

   */
  allowHalf?: boolean;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 13

   */
  allowClear?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 14

   */
  disabled?: boolean;

  /**
   * 自定义字符
   * @group 高级属性
   * @priority 20

   */
  character?: string;
}
