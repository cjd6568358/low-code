/**
 * 时间选择 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 时间选择 组件属性 */
export interface TimePickerProps extends BaseProps {
  // ==================== 基础属性 ====================

  /**
   * 占位提示
   * @group 基础属性
   * @priority 10
   */
  placeholder?: string;

  /**
   * 时间格式
   * @group 基础属性
   * @priority 11
   */
  format?: string;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 12
   */
  allowClear?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 13
   */
  disabled?: boolean;

  /**
   * 12小时制
   * @group 基础属性
   * @priority 14
   */
  use12Hours?: boolean;

  /**
   * 默认值
   * @group 基础属性
   * @priority 15
   */
  defaultValue?: string;

  /**
   * 当前值（受控）
   * @group 基础属性
   * @priority 16
   */
  value?: string;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 17
   * @no-binding
   * @enumLabels small:小, middle:居中, large:大
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 输入框只读
   * @group 基础属性
   * @priority 18
   * @no-binding
   */
  inputReadOnly?: boolean;

  /**
   * 自动获取焦点
   * @group 基础属性
   * @priority 19
   * @no-binding
   */
  autoFocus?: boolean;

  // ==================== 时间步长 ====================

  /**
   * 小时选项间隔
   * @group 高级属性
   * @priority 20
   * @no-binding
   */
  hourStep?: number;

  /**
   * 分钟选项间隔
   * @group 高级属性
   * @priority 21
   * @no-binding
   */
  minuteStep?: number;

  /**
   * 秒选项间隔
   * @group 高级属性
   * @priority 22
   * @no-binding
   */
  secondStep?: number;

  /**
   * 毫秒选项间隔
   * @group 高级属性
   * @priority 23
   * @no-binding
   */
  millisecondStep?: number;

  // ==================== 显示控制 ====================

  /**
   * 显示小时
   * @group 基础属性
   * @priority 30
   * @no-binding
   */
  showHour?: boolean;

  /**
   * 显示分钟
   * @group 基础属性
   * @priority 31
   * @no-binding
   */
  showMinute?: boolean;

  /**
   * 显示秒
   * @group 基础属性
   * @priority 32
   * @no-binding
   */
  showSecond?: boolean;

  /**
   * 显示毫秒
   * @group 基础属性
   * @priority 33
   * @no-binding
   */
  showMillisecond?: boolean;

  /**
   * 显示此刻按钮
   * @group 基础属性
   * @priority 34
   * @no-binding
   */
  showNow?: boolean;

  /**
   * 隐藏禁止选项
   * @group 基础属性
   * @priority 35
   * @no-binding
   */
  hideDisabledOptions?: boolean;

  /**
   * 滚动时即刻变更
   * @group 基础属性
   * @priority 36
   * @no-binding
   */
  changeOnScroll?: boolean;

  // ==================== 高级属性 ====================

  /**
   * 形态变体
   * @group 高级属性
   * @priority 40
   * @no-binding
   * @enumLabels outlined:描边, filled:填充, borderless:无边框, underlined:下划线
   */
  variant?: 'outlined' | 'filled' | 'borderless' | 'underlined';

  /**
   * 校验状态
   * @group 高级属性
   * @priority 41
   * @no-binding
   * @enumLabels error:错误, warning:警告
   */
  status?: 'error' | 'warning';

  /**
   * 弹出位置
   * @group 高级属性
   * @priority 42
   * @no-binding
   * @enumLabels bottomLeft:左下, bottomRight:右下, topLeft:左上, topRight:右上
   */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

  /**
   * 默认面板时间
   * @group 高级属性
   * @priority 43
   */
  defaultOpenValue?: string;

  /**
   * 面板是否打开（受控）
   * @group 高级属性
   * @priority 44
   */
  open?: boolean;

  /**
   * 默认面板是否打开
   * @group 高级属性
   * @priority 45
   * @no-binding
   */
  defaultOpen?: boolean;

  /**
   * 是否需要确认按钮
   * @group 高级属性
   * @priority 46
   * @no-binding
   */
  needConfirm?: boolean;

  /**
   * 弹出层过渡动画名称
   * @group 高级属性
   * @priority 47
   * @no-binding
   */
  transitionName?: string;

  /**
   * 文字方向
   * @group 高级属性
   * @priority 48
   * @no-binding
   * @enumLabels ltr:从左到右, rtl:从右到左
   */
  direction?: 'ltr' | 'rtl';

  /**
   * 排序（开始时间早于结束时间）
   * @group 高级属性
   * @priority 49
   * @no-binding
   */
  order?: boolean;

  // ==================== 样式配置 ====================

  /**
   * 弹出层类名
   * @group 基础属性
   * @priority 60
   * @no-binding
   */
  popupClassName?: string;

  /**
   * 根节点类名
   * @group 基础属性
   * @priority 61
   * @no-binding
   */
  rootClassName?: string;

  /**
   * 附加内容
   * @group 基础属性
   * @priority 62
   */
  addon?: string;
}
