/**
 * 选择器 组件 Schema 定义
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
  /** 分组标签字段名 */
  groupLabel?: string;
  /** 子选项字段名 */
  options?: string;
}

/** 选择器 组件属性 */
export interface SelectProps extends BaseProps {
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
   * 模式
   * @group 基础属性
   * @priority 12
   * @enumLabels multiple:多选, tags:标签
   */
  mode?: 'multiple' | 'tags';

  /**
   * 允许清除
   * @group 基础属性
   * @priority 13
   */
  allowClear?: boolean;

  /**
   * 可搜索
   * @group 基础属性
   * @priority 14
   */
  showSearch?: boolean;

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

  // ==================== 数据配置 ====================

  /**
   * 字段名称映射
   * @group 基础属性
   * @priority 30
   * @no-binding
   */
  fieldNames?: FieldNames;

  /**
   * 搜索时过滤对应的 option 属性
   * @group 基础属性
   * @priority 31
   * @no-binding
   */
  optionFilterProp?: string | string[];

  /**
   * 回填到选中项的属性
   * @group 基础属性
   * @priority 32
   * @no-binding
   */
  optionLabelProp?: string;

  /**
   * 自动分词分隔符
   * @group 基础属性
   * @priority 33
   * @no-binding
   */
  tokenSeparators?: string[];

  /**
   * 选中后是否自动清空搜索框
   * @group 基础属性
   * @priority 34
   * @no-binding
   * @default true
   */
  autoClearSearchValue?: boolean;

  /**
   * 是否根据输入项进行筛选
   * @group 基础属性
   * @priority 35
   * @no-binding
   */
  filterOption?: boolean;

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
   * 状态
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
   * 最多显示标签数量
   * @group 高级属性
   * @priority 43
   */
  maxTagCount?: number | 'responsive';

  /**
   * 最大标签文本长度
   * @group 高级属性
   * @priority 44
   */
  maxTagTextLength?: number;

  /**
   * 最多可选数量
   * @group 高级属性
   * @priority 45
   */
  maxCount?: number;

  /**
   * 最大输入长度
   * @group 高级属性
   * @priority 46
   */
  maxLength?: number;

  /**
   * 下拉菜单是否展开（受控）
   * @group 高级属性
   * @priority 47
   */
  open?: boolean;

  /**
   * 默认是否展开下拉菜单
   * @group 高级属性
   * @priority 48
   * @no-binding
   */
  defaultOpen?: boolean;

  /**
   * 无选项时的内容
   * @group 高级属性
   * @priority 49
   */
  notFoundContent?: string;

  /**
   * 是否使用虚拟滚动
   * @group 高级属性
   * @priority 50
   * @no-binding
   */
  virtual?: boolean;

  /**
   * 下拉菜单高度
   * @group 高级属性
   * @priority 51
   * @default 256
   */
  listHeight?: number;

  /**
   * 下拉菜单项高度
   * @group 高级属性
   * @priority 52
   */
  listItemHeight?: number;

  /**
   * 下拉菜单宽度是否与选择器同宽
   * @group 高级属性
   * @priority 53
   */
  popupMatchSelectWidth?: boolean | number;

  /**
   * 下拉菜单样式
   * @group 高级属性
   * @priority 54
   */
  popupStyle?: Record<string, unknown>;

  /**
   * 文字方向
   * @group 高级属性
   * @priority 55
   * @no-binding
   * @enumLabels ltr:从左到右, rtl:从右到左
   */
  direction?: 'ltr' | 'rtl';

  /**
   * 是否显示滚动条
   * @group 高级属性
   * @priority 56
   * @no-binding
   */
  showScrollBar?: boolean | 'optional';

  /**
   * 触发下拉的行为
   * @group 高级属性
   * @priority 57
   * @no-binding
   */
  showAction?: ('focus' | 'click')[];

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
}
