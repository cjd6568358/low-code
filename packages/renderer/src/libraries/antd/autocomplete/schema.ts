/**
 * 自动完成 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 自动完成 组件属性 */
export interface AutoCompleteProps extends BaseProps {
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
   * 当前值
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
   * 允许清除
   * @group 基础属性
   * @priority 14
   */
  allowClear?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 15
   * @no-binding
   */
  disabled?: boolean;

  /**
   * 自动聚焦
   * @group 基础属性
   * @priority 16
   * @no-binding
   */
  autoFocus?: boolean;

  /**
   * 最大输入长度
   * @group 基础属性
   * @priority 17
   */
  maxLength?: number;

  // ==================== 搜索配置 ====================

  /**
   * 可搜索
   * @group 基础属性
   * @priority 20
   * @no-binding
   */
  showSearch?: boolean;

  /**
   * 选中后自动回填到输入框
   * @group 基础属性
   * @priority 21
   * @no-binding
   */
  backfill?: boolean;

  // ==================== 下拉菜单 ====================

  /**
   * 默认是否展开下拉菜单
   * @group 基础属性
   * @priority 30
   * @no-binding
   */
  defaultOpen?: boolean;

  /**
   * 下拉菜单是否展开（受控）
   * @group 基础属性
   * @priority 31
   */
  open?: boolean;

  /**
   * 下拉菜单宽度是否与输入框同宽
   * @group 基础属性
   * @priority 32
   */
  popupMatchSelectWidth?: boolean | number;

  /**
   * 弹出位置
   * @group 基础属性
   * @priority 33
   * @no-binding
   * @enumLabels bottomLeft:左下, bottomRight:右下, topLeft:左上, topRight:右上
   */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

  /**
   * 无选项时的内容
   * @group 基础属性
   * @priority 34
   */
  notFoundContent?: string;

  /**
   * 下拉菜单自定义渲染
   * @group 基础属性
   * @priority 35
   * @no-binding
   */
  popupRender?: object;

  /**
   * 下拉菜单样式
   * @group 基础属性
   * @priority 36
   */
  popupStyle?: Record<string, unknown>;

  /**
   * 下拉菜单对齐方式
   * @group 基础属性
   * @priority 37
   * @no-binding
   */
  popupAlign?: Record<string, unknown>;

  /**
   * 默认高亮第一个选项
   * @group 基础属性
   * @priority 38
   * @no-binding
   * @default true
   */
  defaultActiveFirstOption?: boolean;

  // ==================== 样式尺寸 ====================

  /**
   * 尺寸
   * @group 基础属性
   * @priority 40
   * @no-binding
   * @enumLabels small:小, middle:居中, large:大
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 状态
   * @group 基础属性
   * @priority 41
   * @no-binding
   * @enumLabels error:错误, warning:警告
   */
  status?: 'error' | 'warning';

  /**
   * 形态变体
   * @group 基础属性
   * @priority 42
   * @no-binding
   * @enumLabels outlined:描边, filled:填充, borderless:无边框, underlined:下划线
   */
  variant?: 'outlined' | 'filled' | 'borderless' | 'underlined';

  /**
   * 文字方向
   * @group 基础属性
   * @priority 43
   * @no-binding
   * @enumLabels ltr:从左到右, rtl:从右到左
   */
  direction?: 'ltr' | 'rtl';

  // ==================== 事件 ====================

  /**
   * 值变化回调
   * @group 事件
   * @priority 50
   * @no-binding
   */
  onChange?: object;

  /**
   * 搜索回调
   * @group 事件
   * @priority 51
   * @no-binding
   */
  onSearch?: object;

  /**
   * 选项选中回调
   * @group 事件
   * @priority 52
   * @no-binding
   */
  onSelect?: object;

  /**
   * 清除回调
   * @group 事件
   * @priority 53
   * @no-binding
   */
  onClear?: object;

  /**
   * 下拉菜单展开变化回调
   * @group 事件
   * @priority 54
   * @no-binding
   */
  onOpenChange?: object;

  /**
   * 获取焦点回调
   * @group 事件
   * @priority 55
   * @no-binding
   */
  onFocus?: object;

  /**
   * 失去焦点回调
   * @group 事件
   * @priority 56
   * @no-binding
   */
  onBlur?: object;

  /**
   * 下拉菜单滚动回调
   * @group 事件
   * @priority 57
   * @no-binding
   */
  onPopupScroll?: object;

  // ==================== 高级属性 ====================

  /**
   * 是否使用虚拟滚动
   * @group 高级属性
   * @priority 60
   * @no-binding
   */
  virtual?: boolean;

  /**
   * 下拉菜单高度
   * @group 高级属性
   * @priority 61
   */
  listHeight?: number;

  /**
   * 下拉菜单项高度
   * @group 高级属性
   * @priority 62
   */
  listItemHeight?: number;
}
