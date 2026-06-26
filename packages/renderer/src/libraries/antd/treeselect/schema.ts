/**
 * 树选择 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 字段名称映射 */
interface FieldNames {
  /** 值字段名 */
  value?: string;
  /** 标签字段名 */
  label?: string;
  /** 子节点字段名 */
  children?: string;
}

/** 树选择 组件属性 */
export interface TreeSelectProps extends BaseProps {
  // ==================== 基础属性 ====================

  /**
   * 树数据
   * @group 基础属性
   * @priority 10
   */
  treeData?: object[];

  /**
   * 占位提示
   * @group 基础属性
   * @priority 11
   */
  placeholder?: string;

  /**
   * 多选
   * @group 基础属性
   * @priority 12
   */
  multiple?: boolean;

  /**
   * 可勾选
   * @group 基础属性
   * @priority 13
   */
  treeCheckable?: boolean;

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
   */
  disabled?: boolean;

  /**
   * 指定选中项
   * @group 基础属性
   * @priority 16
   */
  value?: string | number | (string | number)[];

  /**
   * 默认选中项
   * @group 基础属性
   * @priority 17
   */
  defaultValue?: string | number | (string | number)[];

  /**
   * 是否以 LabeledValue 格式传值
   * @group 基础属性
   * @priority 18
   * @no-binding
   */
  labelInValue?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 19
   * @no-binding
   * @enumLabels small:小, middle:居中, large:大
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 加载中
   * @group 基础属性
   * @priority 20
   */
  loading?: boolean;

  /**
   * 自动聚焦
   * @group 基础属性
   * @priority 21
   * @no-binding
   */
  autoFocus?: boolean;

  /**
   * 勾选完全受控（父子节点选中状态不再关联）
   * @group 基础属性
   * @priority 22
   * @no-binding
   */
  treeCheckStrictly?: boolean;

  /**
   * 可搜索
   * @group 基础属性
   * @priority 23
   */
  showSearch?: boolean;

  // ==================== 数据配置 ====================

  /**
   * 自定义字段名
   * @group 基础属性
   * @priority 30
   * @no-binding
   */
  fieldNames?: FieldNames;

  /**
   * 作为显示的 prop 值
   * @group 基础属性
   * @priority 31
   * @no-binding
   */
  treeNodeLabelProp?: string;

  /**
   * 简单格式树数据
   * @group 基础属性
   * @priority 32
   * @no-binding
   */
  treeDataSimpleMode?: boolean | object;

  /**
   * 定义选中项回填的方式
   * @group 基础属性
   * @priority 33
   * @no-binding
   * @enumLabels SHOW_ALL:全部, SHOW_PARENT:父节点, SHOW_CHILD:子节点
   */
  showCheckedStrategy?: 'SHOW_ALL' | 'SHOW_PARENT' | 'SHOW_CHILD';

  /**
   * 自动分词分隔符
   * @group 基础属性
   * @priority 34
   * @no-binding
   */
  tokenSeparators?: string[];

  /**
   * 选中后是否自动清空搜索框
   * @group 基础属性
   * @priority 35
   * @no-binding
   * @default true
   */
  autoClearSearchValue?: boolean;

  // ==================== 展开与选中 ====================

  /**
   * 默认展开所有树节点
   * @group 基础属性
   * @priority 40
   * @no-binding
   */
  treeDefaultExpandAll?: boolean;

  /**
   * 默认展开的树节点
   * @group 基础属性
   * @priority 41
   * @no-binding
   */
  treeDefaultExpandedKeys?: string[];

  /**
   * 展开的树节点（受控）
   * @group 基础属性
   * @priority 42
   */
  treeExpandedKeys?: string[];

  /**
   * 已加载的节点（异步加载用）
   * @group 基础属性
   * @priority 43
   */
  treeLoadedKeys?: string[];

  /**
   * 点击展开行为
   * @group 基础属性
   * @priority 44
   * @no-binding
   */
  treeExpandAction?: false | 'click' | 'doubleClick';

  /**
   * 显示连接线
   * @group 基础属性
   * @priority 45
   * @no-binding
   */
  treeLine?: boolean;

  // ==================== 高级属性 ====================

  /**
   * 形态变体
   * @group 高级属性
   * @priority 50
   * @no-binding
   * @enumLabels outlined:描边, filled:填充, borderless:无边框, underlined:下划线
   */
  variant?: 'outlined' | 'filled' | 'borderless' | 'underlined';

  /**
   * 状态
   * @group 高级属性
   * @priority 51
   * @no-binding
   * @enumLabels error:错误, warning:警告
   */
  status?: 'error' | 'warning';

  /**
   * 弹出位置
   * @group 高级属性
   * @priority 52
   * @no-binding
   * @enumLabels bottomLeft:左下, bottomRight:右下, topLeft:左上, topRight:右上
   */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

  /**
   * 最多显示标签数量
   * @group 高级属性
   * @priority 53
   */
  maxTagCount?: number | 'responsive';

  /**
   * 最大标签文本长度
   * @group 高级属性
   * @priority 54
   */
  maxTagTextLength?: number;

  /**
   * 最多可选数量
   * @group 高级属性
   * @priority 55
   */
  maxCount?: number;

  /**
   * 最大输入长度
   * @group 高级属性
   * @priority 56
   */
  maxLength?: number;

  /**
   * 下拉菜单是否展开（受控）
   * @group 高级属性
   * @priority 57
   */
  open?: boolean;

  /**
   * 默认是否展开下拉菜单
   * @group 高级属性
   * @priority 58
   * @no-binding
   */
  defaultOpen?: boolean;

  /**
   * 无选项时的内容
   * @group 高级属性
   * @priority 59
   */
  notFoundContent?: string;

  // ==================== 展示配置 ====================

  /**
   * 前缀
   * @group 基础属性
   * @priority 60
   */
  prefix?: string;

  /**
   * 后缀图标
   * @group 基础属性
   * @priority 61
   */
  suffix?: string;

  /**
   * 下拉菜单的 className
   * @group 基础属性
   * @priority 62
   * @no-binding
   */
  popupClassName?: string;

  /**
   * 下拉菜单的样式
   * @group 基础属性
   * @priority 63
   */
  popupStyle?: Record<string, unknown>;

  /**
   * 下拉菜单宽度是否与选择器同宽
   * @group 基础属性
   * @priority 64
   */
  popupMatchSelectWidth?: boolean | number;

  /**
   * 文字方向
   * @group 基础属性
   * @priority 65
   * @no-binding
   * @enumLabels ltr:从左到右, rtl:从右到左
   */
  direction?: 'ltr' | 'rtl';

  /**
   * 是否显示滚动条
   * @group 基础属性
   * @priority 66
   * @no-binding
   */
  showScrollBar?: boolean | 'optional';

  /**
   * 触发下拉的行为
   * @group 基础属性
   * @priority 67
   * @no-binding
   */
  showAction?: ('focus' | 'click')[];

  // ==================== 虚拟滚动 ====================

  /**
   * 是否使用虚拟滚动
   * @group 高级属性
   * @priority 70
   * @no-binding
   */
  virtual?: boolean;

  /**
   * 下拉菜单高度
   * @group 高级属性
   * @priority 71
   * @default 256
   */
  listHeight?: number;

  /**
   * 下拉菜单项高度
   * @group 高级属性
   * @priority 72
   */
  listItemHeight?: number;

  /**
   * 下拉菜单项滚动偏移量
   * @group 高级属性
   * @priority 73
   */
  listItemScrollOffset?: number;
}
