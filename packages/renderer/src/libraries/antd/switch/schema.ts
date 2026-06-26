/**
 * 开关 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 开关 组件属性 */
export interface SwitchProps extends BaseProps {
  // ==================== 基础属性 ====================

  /**
   * 选中
   * @group 基础属性
   * @priority 10
   */
  checked?: boolean;

  /**
   * 默认选中
   * @group 基础属性
   * @priority 11
   * @no-binding
   */
  defaultChecked?: boolean;

  /**
   * 选中文案
   * @group 基础属性
   * @priority 12
   */
  checkedChildren?: string;

  /**
   * 非选中文案
   * @group 基础属性
   * @priority 13
   */
  unCheckedChildren?: string;

  /**
   * 禁用
   * @group 基础属性
   * @priority 14
   */
  disabled?: boolean;

  /**
   * 加载中
   * @group 基础属性
   * @priority 15
   */
  loading?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 16
   * @no-binding
   * @enumLabels small:小, middle:居中
   */
  size?: 'small' | 'middle';

  /**
   * 标题
   * @group 基础属性
   * @priority 17
   */
  title?: string;

  /**
   * 自动聚焦
   * @group 高级属性
   * @priority 20
   * @no-binding
   */
  autoFocus?: boolean;
}
