/**
 * 文本 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 文本 组件属性 */
export interface TextProps extends BaseProps {
  /**
   * 文本内容
   * @group 基础属性
   * @priority 10

   */
  children?: string;

  /**
   * 文本类型
   * @group 基础属性
   * @priority 11
   * @enumLabels secondary:secondary, success:成功, warning:警告, danger:危险
   */
  type?: 'secondary' | 'success' | 'warning' | 'danger';

  /**
   * 代码样式
   * @group 基础属性
   * @priority 12

   */
  code?: boolean;

  /**
   * 标记样式
   * @group 基础属性
   * @priority 13

   */
  mark?: boolean;

  /**
   * 下划线
   * @group 基础属性
   * @priority 14

   */
  underline?: boolean;

  /**
   * 删除线
   * @group 基础属性
   * @priority 15

   */
  delete?: boolean;

  /**
   * 加粗
   * @group 基础属性
   * @priority 16

   */
  strong?: boolean;

  /**
   * 斜体
   * @group 基础属性
   * @priority 17

   */
  italic?: boolean;
}
