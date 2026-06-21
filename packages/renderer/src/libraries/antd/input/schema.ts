/**
 * 输入框 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 输入框 组件属性 */
export interface InputProps extends BaseProps {
  /**
   * 占位提示
   * @group 基础属性
   * @priority 10

   */
  placeholder?: string;

  /**
   * 最大长度
   * @group 基础属性
   * @priority 11

   */
  maxLength?: number;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 12

   */
  allowClear?: boolean;

  /**
   * 显示字数
   * @group 基础属性
   * @priority 13

   */
  showCount?: boolean;

  /**
   * 前缀
   * @group 高级属性
   * @priority 20

   */
  prefix?: string;

  /**
   * 后缀
   * @group 高级属性
   * @priority 21

   */
  suffix?: string;

  /**
   * 前置标签
   * @group 高级属性
   * @priority 22

   */
  addonBefore?: string;

  /**
   * 后置标签
   * @group 高级属性
   * @priority 23

   */
  addonAfter?: string;

  /**
   * 禁用
   * @group 基础属性
   * @priority 14

   */
  disabled?: boolean;

  /**
   * 只读
   * @group 基础属性
   * @priority 15

   */
  readOnly?: boolean;
}
