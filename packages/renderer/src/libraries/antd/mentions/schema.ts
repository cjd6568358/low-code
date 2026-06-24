/**
 * 提及 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 提及 组件属性 */
export interface MentionsProps extends BaseProps {
  // ==================== 基础属性 ====================

  /**
   * 选项数据
   * @group 基础属性
   * @priority 10
   */
  options?: any[];

  /**
   * 占位提示
   * @group 基础属性
   * @priority 11
   */
  placeholder?: string;

  /**
   * 值
   * @group 基础属性
   * @priority 12
   */
  value?: string;

  /**
   * 默认值
   * @group 基础属性
   * @priority 13
   * @no-binding
   */
  defaultValue?: string;

  /**
   * 触发前缀
   * @group 基础属性
   * @priority 14
   * @no-binding
   */
  prefix?: string | string[];

  /**
   * 分隔符
   * @group 基础属性
   * @priority 15
   * @no-binding
   */
  split?: string;

  /**
   * 禁用
   * @group 基础属性
   * @priority 16
   */
  disabled?: boolean;

  /**
   * 只读
   * @group 基础属性
   * @priority 17
   * @no-binding
   */
  readOnly?: boolean;

  /**
   * 自动聚焦
   * @group 基础属性
   * @priority 18
   * @no-binding
   */
  autoFocus?: boolean;

  // ==================== 文本域属性 ====================

  /**
   * 行数
   * @group 基础属性
   * @priority 20
   */
  rows?: number;

  /**
   * 自适应高度
   * @group 基础属性
   * @priority 21
   * @no-binding
   */
  autoSize?: boolean | { minRows?: number; maxRows?: number };

  /**
   * 最大长度
   * @group 基础属性
   * @priority 22
   */
  maxLength?: number;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 23
   * @no-binding
   */
  allowClear?: boolean;

  // ==================== 展示配置 ====================

  /**
   * 尺寸
   * @group 基础属性
   * @priority 30
   * @no-binding
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 形态变体
   * @group 基础属性
   * @priority 31
   * @no-binding
   */
  variant?: 'outlined' | 'filled' | 'borderless' | 'underlined';

  /**
   * 状态
   * @group 基础属性
   * @priority 32
   * @no-binding
   */
  status?: 'error' | 'warning';

  /**
   * 加载中
   * @group 基础属性
   * @priority 33
   */
  loading?: boolean;

  // ==================== 高级属性 ====================

  /**
   * 无选项时的内容
   * @group 高级属性
   * @priority 40
   */
  notFoundContent?: string;

  /**
   * 弹出位置
   * @group 高级属性
   * @priority 41
   * @no-binding
   */
  placement?: 'top' | 'bottom';

  /**
   * 文字方向
   * @group 高级属性
   * @priority 42
   * @no-binding
   */
  direction?: 'ltr' | 'rtl';
}
