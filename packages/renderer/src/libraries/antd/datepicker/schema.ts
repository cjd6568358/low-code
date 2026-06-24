/**
 * 日期选择 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 日期选择 组件属性 */
export interface DatePickerProps extends BaseProps {
  // ==================== 基础属性 ====================

  /**
   * 选择器类型
   * @group 基础属性
   * @priority 10
   * @no-binding
   * @default 'date'
   */
  picker?: 'date' | 'week' | 'month' | 'quarter' | 'year';

  /**
   * 占位提示
   * @group 基础属性
   * @priority 11
   */
  placeholder?: string;

  /**
   * 日期格式
   * @group 基础属性
   * @priority 12
   * @no-binding
   */
  format?: string;

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
   * 尺寸
   * @group 基础属性
   * @priority 15
   * @no-binding
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 默认面板日期
   * @group 基础属性
   * @priority 16
   * @no-binding
   */
  defaultPickerValue?: string;

  // ==================== 高级属性 ====================

  /**
   * 形态变体
   * @group 高级属性
   * @priority 20
   * @no-binding
   */
  variant?: 'outlined' | 'filled' | 'borderless' | 'underlined';

  /**
   * 校验状态
   * @group 高级属性
   * @priority 21
   * @no-binding
   */
  status?: 'error' | 'warning';

  /**
   * 弹出位置
   * @group 高级属性
   * @priority 22
   * @no-binding
   */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

  /**
   * 显示时间选择
   * @group 高级属性
   * @priority 23
   */
  showTime?: boolean;

  /**
   * 显示周数
   * @group 高级属性
   * @priority 24
   */
  showWeek?: boolean;

  /**
   * 显示"此刻"按钮
   * @group 高级属性
   * @priority 25
   */
  showNow?: boolean;

  /**
   * 输入框只读
   * @group 高级属性
   * @priority 26
   * @no-binding
   */
  inputReadOnly?: boolean;

  /**
   * 确认模式
   * @group 高级属性
   * @priority 27
   * @no-binding
   */
  needConfirm?: boolean;

  /**
   * 面板是否展开（受控）
   * @group 高级属性
   * @priority 28
   */
  open?: boolean;

  /**
   * 默认面板是否展开
   * @group 高级属性
   * @priority 29
   * @no-binding
   */
  defaultOpen?: boolean;

  /**
   * 不可选择的日期
   * @group 高级属性
   * @priority 30
   * @no-binding
   */
  disabledDate?: boolean;

  /**
   * 最小可选日期
   * @group 高级属性
   * @priority 31
   */
  minDate?: string;

  /**
   * 最大可选日期
   * @group 高级属性
   * @priority 32
   */
  maxDate?: string;

  /**
   * 输入时自动排序
   * @group 高级属性
   * @priority 33
   * @no-binding
   */
  order?: boolean;

  /**
   * 显示边框
   * @group 高级属性
   * @priority 34
   * @no-binding
   */
  bordered?: boolean;
}
