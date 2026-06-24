/**
 * 警告提示 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 警告提示 组件属性 */
export interface AlertProps extends BaseProps {
  /**
   * 提示内容
   * @group 基础属性
   * @priority 10
   */
  message?: string;

  /**
   * 标题
   * @group 基础属性
   * @priority 11
   */
  title?: string;

  /**
   * 描述
   * @group 基础属性
   * @priority 12
   */
  description?: string;

  /**
   * 类型
   * @group 基础属性
   * @priority 13
   * @default "info"
   */
  type?: 'success' | 'info' | 'warning' | 'error';

  /**
   * 变体风格
   * @group 基础属性
   * @priority 14
   * @default "outlined"
   */
  variant?: 'outlined' | 'filled';

  /**
   * 显示图标
   * @group 基础属性
   * @priority 15
   */
  showIcon?: boolean;

  /**
   * 自定义图标
   * @group 基础属性
   * @priority 16
   */
  icon?: string;

  /**
   * 可关闭
   * @group 基础属性
   * @priority 17
   */
  closable?: boolean;

  /**
   * 操作区
   * @group 高级属性
   * @priority 20
   */
  action?: string;

  /**
   * 横幅
   * @group 高级属性
   * @priority 21
   */
  banner?: boolean;

  /**
   * 元素ID
   * @group 高级属性
   * @priority 22
   */
  id?: string;

  /**
   * 关闭回调
   * @group 事件
   * @priority 80
   */
  onClose?: string;

  /**
   * 点击回调
   * @group 事件
   * @priority 81
   */
  onClick?: string;
}
