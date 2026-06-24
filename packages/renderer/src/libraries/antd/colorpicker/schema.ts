/**
 * 颜色选择 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 颜色选择 组件属性 */
export interface ColorPickerProps extends BaseProps {
  /**
   * 颜色值
   * @group 基础属性
   * @priority 10
   */
  value?: string;

  /**
   * 默认颜色
   * @group 基础属性
   * @priority 11
   */
  defaultValue?: string;

  /**
   * 颜色模式
   * @group 基础属性
   * @priority 12
   */
  mode?: string;

  /**
   * 显示文字
   * @group 基础属性
   * @priority 13
   */
  showText?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 14
   */
  size?: string;

  /**
   * 禁用
   * @group 基础属性
   * @priority 15
   */
  disabled?: boolean;

  /**
   * 禁用透明度
   * @group 基础属性
   * @priority 16
   */
  disabledAlpha?: boolean;

  /**
   * 禁用格式切换
   * @group 基础属性
   * @priority 17
   */
  disabledFormat?: boolean;

  /**
   * 是否允许清除
   * @group 基础属性
   * @priority 18
   */
  allowClear?: boolean;

  /**
   * 弹出框打开状态
   * @group 高级属性
   * @priority 20
   */
  open?: boolean;

  /**
   * 触发方式
   * @group 高级属性
   * @priority 21
   */
  trigger?: string;

  /**
   * 弹出位置
   * @group 高级属性
   * @priority 22
   */
  placement?: string;

  /**
   * 是否显示箭头
   * @group 高级属性
   * @priority 23
   */
  arrow?: boolean;

  /**
   * 颜色格式
   * @group 高级属性
   * @priority 30
   * @default 'hex'
   */
  format?: string;

  /**
   * 默认颜色格式
   * @group 高级属性
   * @priority 31
   */
  defaultFormat?: string;

  /**
   * 弹出框打开状态变化回调
   * @group 事件
   * @priority 40
   */
  onOpenChange?: string;

  /**
   * 颜色格式变化回调
   * @group 事件
   * @priority 41
   */
  onFormatChange?: string;

  /**
   * 清除颜色回调
   * @group 事件
   * @priority 42
   */
  onClear?: string;

  /**
   * 颜色选择完成回调
   * @group 事件
   * @priority 43
   */
  onChangeComplete?: string;
}
