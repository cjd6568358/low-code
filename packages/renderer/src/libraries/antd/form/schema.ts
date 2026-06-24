/**
 * 表单 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 表单 组件属性 */
export interface FormProps extends BaseProps {
  // === 布局 ===

  /**
   * 布局方式
   * @group 基础属性
   * @priority 10
   * @no-binding
   * @default "horizontal"
   */
  layout?: 'horizontal' | 'vertical' | 'inline';

  /**
   * 标签对齐
   * @group 基础属性
   * @priority 11
   * @no-binding
   * @default 'right'
   */
  labelAlign?: 'left' | 'right';

  /**
   * 标签列宽
   * @group 基础属性
   * @priority 12
   * @no-binding
   */
  labelCol?: object;

  /**
   * 内容列宽
   * @group 基础属性
   * @priority 13
   * @no-binding
   */
  wrapperCol?: object;

  /**
   * 标签自动换行
   * @group 基础属性
   * @priority 14
   * @no-binding
   */
  labelWrap?: boolean;

  // === 显示 ===

  /**
   * 显示冒号
   * @group 基础属性
   * @priority 20
   * @no-binding
   * @default true
   */
  colon?: boolean;

  /**
   * 必填标记
   * @group 基础属性
   * @priority 21
   * @no-binding
   * @default true
   */
  requiredMark?: boolean | 'optional';

  /**
   * 提示配置
   * @group 基础属性
   * @priority 22
   * @no-binding
   */
  tooltip?: object;

  /**
   * 表单名称
   * @group 基础属性
   * @priority 5
   * @no-binding
   */
  name?: string;

  // === 状态 ===

  /**
   * 禁用
   * @group 基础属性
   * @priority 30
   * @no-binding
   */
  disabled?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 31
   * @no-binding
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 变体
   * @group 基础属性
   * @priority 32
   * @no-binding
   */
  variant?: 'outlined' | 'borderless' | 'filled';

  // === 行为 ===

  /**
   * 提交失败自动滚动到首个错误字段
   * @group 高级属性
   * @priority 40
   * @no-binding
   */
  scrollToFirstError?: boolean;

  /**
   * 字段卸载时保留值
   * @group 高级属性
   * @priority 41
   * @no-binding
   */
  preserve?: boolean;
}
