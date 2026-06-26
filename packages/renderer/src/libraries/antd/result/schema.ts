/**
 * 结果 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 结果 组件属性 */
export interface ResultProps extends BaseProps {
  /**
   * 状态
   * @group 基础属性
   * @priority 10
   * @default "info"
   * @enumLabels success:成功, error:错误, info:信息, warning:警告, 404:404, 403:403, 500:500
   */
  status?: 'success' | 'error' | 'info' | 'warning' | '404' | '403' | '500';

  /**
   * 标题
   * @group 基础属性
   * @priority 11

   */
  title?: string;

  /**
   * 副标题
   * @group 基础属性
   * @priority 12

   */
  subTitle?: string;

  /**
   * 额外内容
   * @group 高级属性
   * @priority 20

   */
  extra?: string;

  /**
   * 图标
   * @group 高级属性
   * @priority 21

   */
  icon?: string;

  /**
   * 子内容
   * @group 基础属性
   * @priority 13
   */
  children?: string;

  /**
   * 自定义 CSS 类名
   * @group 样式
   * @priority 51
   */
  className?: string;

  /**
   * 根节点 CSS 类名
   * @group 样式
   * @priority 52
   */
  rootClassName?: string;

  /**
   * 语义化类名配置
   * @group 样式
   * @priority 53
   */
  classNames?: Record<string, unknown>;

  /**
   * 语义化样式配置
   * @group 样式
   * @priority 54
   */
  styles?: Record<string, unknown>;
}
