/**
 * 消息提示 组件 Schema 定义
 *
 * antd message 是命令式 API（message.info/success/error 等），
 * 本 Schema 定义的是命令式调用时的配置参数（ArgsProps）。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 消息提示 组件属性 */
export interface MessageProps extends BaseProps {
  /**
   * 消息内容
   * @group 基础属性
   * @priority 10
   */
  content?: string;

  /**
   * 消息类型
   * @group 基础属性
   * @priority 11
   */
  type?: 'info' | 'success' | 'error' | 'warning' | 'loading';

  /**
   * 自动关闭延迟秒数，设为 0 则不自动关闭
   * @group 基础属性
   * @priority 12
   * @default 3
   */
  duration?: number;

  /**
   * 消息唯一标识，用于手动关闭
   * @group 基础属性
   * @priority 13
   * @no-binding
   */
  key?: string | number;

  /**
   * 自定义图标
   * @group 基础属性
   * @priority 14
   */
  icon?: string;

  /**
   * 悬浮时暂停自动关闭计时
   * @group 高级属性
   * @priority 20
   * @no-binding
   */
  pauseOnHover?: boolean;
}
