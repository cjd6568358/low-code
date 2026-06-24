/**
 * 级联选择 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 字段名称映射 */
interface FieldNames {
  /** 选项值字段名 */
  value?: string;
  /** 选项标签字段名 */
  label?: string;
  /** 子选项字段名 */
  children?: string;
}

/** 级联选择 组件属性 */
export interface CascaderProps extends BaseProps {
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
   * 指定选中项
   * @group 基础属性
   * @priority 12
   */
  value?: string[];

  /**
   * 默认选中项
   * @group 基础属性
   * @priority 13
   * @no-binding
   */
  defaultValue?: string[];

  /**
   * 多选
   * @group 基础属性
   * @priority 14
   * @no-binding
   */
  multiple?: boolean;

  /**
   * 允许清除
   * @group 基础属性
   * @priority 15
   */
  allowClear?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 16
   * @no-binding
   */
  disabled?: boolean;

  /**
   * 自动聚焦
   * @group 基础属性
   * @priority 17
   * @no-binding
   */
  autoFocus?: boolean;

  // ==================== 数据配置 ====================

  /**
   * 字段名称映射
   * @group 基础属性
   * @priority 20
   * @no-binding
   */
  fieldNames?: FieldNames;

  /**
   * 次级菜单展开方式
   * @group 基础属性
   * @priority 21
   * @no-binding
   */
  expandTrigger?: 'click' | 'hover';

  /**
   * 选中即改变
   * @group 基础属性
   * @priority 22
   * @no-binding
   */
  changeOnSelect?: boolean;

  /**
   * 动态加载选项（异步加载子节点）
   * @group 高级属性
   * @priority 23
   * @no-binding
   */
  loadData?: (selectOptions: any[]) => void;

  /**
   * 自定义回填方式
   * @group 高级属性
   * @priority 24
   * @no-binding
   */
  displayRender?: (label: string[], selectedOptions?: any[]) => string;

  /**
   * 自定义选项渲染
   * @group 高级属性
   * @priority 25
   * @no-binding
   */
  optionRender?: (option: any) => string;

  /**
   * 多选时定义选中项回填方式
   * @group 基础属性
   * @priority 26
   * @no-binding
   */
  showCheckedStrategy?: 'SHOW_PARENT' | 'SHOW_CHILD';

  // ==================== 样式尺寸 ====================

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
   * 校验状态
   * @group 基础属性
   * @priority 32
   * @no-binding
   */
  status?: 'error' | 'warning';

  /**
   * 文字方向
   * @group 基础属性
   * @priority 33
   * @no-binding
   */
  direction?: 'ltr' | 'rtl';

  /**
   * 最多显示多少个标签
   * @group 基础属性
   * @priority 34
   */
  maxTagCount?: number | 'responsive';

  /**
   * 最大标签文本长度
   * @group 基础属性
   * @priority 35
   */
  maxTagTextLength?: number;

  /**
   * 自定义标签内容（超出 maxTagCount 时的省略展示）
   * @group 高级属性
   * @priority 36
   * @no-binding
   */
  maxTagPlaceholder?: (omittedValues: any[]) => string;

  /**
   * 可搜索
   * @group 基础属性
   * @priority 40
   * @no-binding
   */
  showSearch?: boolean;

  // ==================== 下拉菜单 ====================

  /**
   * 默认是否展开下拉菜单
   * @group 基础属性
   * @priority 50
   * @no-binding
   */
  defaultOpen?: boolean;

  /**
   * 下拉菜单是否展开（受控）
   * @group 基础属性
   * @priority 51
   */
  open?: boolean;

  /**
   * 弹出位置
   * @group 基础属性
   * @priority 52
   * @no-binding
   */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

  /**
   * 下拉菜单样式
   * @group 高级属性
   * @priority 53
   */
  popupStyle?: Record<string, unknown>;

  /**
   * 下拉菜单宽度是否与选择器同宽
   * @group 基础属性
   * @priority 54
   */
  popupMatchSelectWidth?: boolean | number;

  /**
   * 自定义下拉菜单内容
   * @group 高级属性
   * @priority 55
   * @no-binding
   */
  popupRender?: (menu: any) => any;

  /**
   * 下拉菜单对齐方式
   * @group 基础属性
   * @priority 56
   * @no-binding
   */
  popupAlign?: Record<string, unknown>;

  /**
   * 弹出动画名称
   * @group 基础属性
   * @priority 57
   * @no-binding
   */
  transitionName?: string;

  /**
   * 下拉菜单高度
   * @group 基础属性
   * @priority 58
   */
  listHeight?: number;

  /**
   * 无选项时的内容
   * @group 基础属性
   * @priority 59
   */
  notFoundContent?: string;

  /**
   * 根节点样式类名
   * @group 基础属性
   * @priority 60
   * @no-binding
   */
  rootClassName?: string;

  // ==================== 图标 ====================

  /**
   * 自定义后缀图标
   * @group 基础属性
   * @priority 70
   */
  suffixIcon?: string;

  /**
   * 自定义次级菜单展开图标
   * @group 基础属性
   * @priority 71
   */
  expandIcon?: string;

  /**
   * 自定义多选框清除图标
   * @group 基础属性
   * @priority 72
   */
  removeIcon?: string;

  // ==================== 事件 ====================

  /**
   * 值变化回调
   * @group 事件
   * @priority 80
   * @no-binding
   */
  onChange?: (value: string[], selectOptions: any[]) => void;

  /**
   * 下拉菜单展开变化回调
   * @group 事件
   * @priority 81
   * @no-binding
   */
  onOpenChange?: (visible: boolean) => void;

  /**
   * 清除回调
   * @group 事件
   * @priority 82
   * @no-binding
   */
  onClear?: () => void;

  /**
   * 获取焦点回调
   * @group 事件
   * @priority 83
   * @no-binding
   */
  onFocus?: () => void;

  /**
   * 失去焦点回调
   * @group 事件
   * @priority 84
   * @no-binding
   */
  onBlur?: () => void;
}
