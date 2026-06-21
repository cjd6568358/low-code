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
  /**
   * 选中
   * @group 基础属性
   * @priority 10

   */
  checked?: boolean;

  /**
   * 选中文案
   * @group 基础属性
   * @priority 11

   */
  checkedChildren?: string;

  /**
   * 非选中文案
   * @group 基础属性
   * @priority 12

   */
  unCheckedChildren?: string;

  /**
   * 禁用
   * @group 基础属性
   * @priority 13

   */
  disabled?: boolean;

  /**
   * 加载中
   * @group 基础属性
   * @priority 14
   */
  loading?: boolean;
}
