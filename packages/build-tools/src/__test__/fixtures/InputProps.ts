/**
 * 输入框组件属性
 */
export interface InputProps extends BaseProps {
  /**
   * 占位提示
   * @group 基础属性
   * @priority 1
   * @placeholder 请输入
   */
  placeholder?: string;

  /**
   * 最大长度
   * @group 基础属性
   * @priority 2
   */
  maxLength?: number;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 3
   */
  allowClear?: boolean;

  /**
   * 前置标签
   * @group 高级属性
   * @priority 10
   */
  addonBefore?: string;

  /**
   * 后置标签
   * @group 高级属性
   * @priority 11
   */
  addonAfter?: string;

  /**
   * 必填
   * @group 校验规则
   * @priority 20
   */
  required?: boolean;

  /**
   * 正则校验
   * @group 校验规则
   * @priority 21
   * @validator pattern
   */
  pattern?: string;

  /**
   * 输入类型
   * @group 基础属性
   * @priority 4
   */
  inputType?: 'text' | 'password' | 'email' | 'url' | 'tel';

  /**
   * 数据字典
   * @group 数据绑定
   * @dictionary input_options
   */
  dictCode?: string;
}

/** 基础属性 */
export interface BaseProps {
  /** 是否可见 */
  visible?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** CSS 类名 */
  className?: string;
  /** 内联样式 */
  style?: Record<string, any>;
}
