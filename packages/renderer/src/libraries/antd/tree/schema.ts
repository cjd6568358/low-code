/**
 * 树形控件 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 树形控件 组件属性 */
export interface TreeProps extends BaseProps {
  /**
   * 树数据
   * @group 基础属性
   * @priority 10
   */
  treeData?: object[];

  /**
   * 自定义字段名
   * @group 基础属性
   * @priority 11
   */
  fieldNames?: Record<string, unknown>;

  /**
   * 可勾选
   * @group 基础属性
   * @priority 12
   */
  checkable?: boolean;

  /**
   * 勾选完全受控（父子节点选中状态不再关联）
   * @group 基础属性
   * @priority 13
   */
  checkStrictly?: boolean;

  /**
   * 可拖拽
   * @group 基础属性
   * @priority 14
   */
  draggable?: boolean;

  /**
   * 连接线
   * @group 基础属性
   * @priority 15
   */
  showLine?: boolean;

  /**
   * 显示图标
   * @group 基础属性
   * @priority 16
   */
  showIcon?: boolean;

  /**
   * 可选择
   * @group 基础属性
   * @priority 17
   */
  selectable?: boolean;

  /**
   * 多选
   * @group 基础属性
   * @priority 18
   */
  multiple?: boolean;

  /**
   * 禁用
   * @group 基础属性
   * @priority 19
   */
  disabled?: boolean;

  /**
   * 节点占满整行
   * @group 基础属性
   * @priority 20
   */
  blockNode?: boolean;

  /**
   * 默认展开所有节点
   * @group 基础属性
   * @priority 30
   */
  defaultExpandAll?: boolean;

  /**
   * 默认自动展开父节点
   * @group 基础属性
   * @priority 31
   */
  defaultExpandParent?: boolean;

  /**
   * 自动展开父节点
   * @group 基础属性
   * @priority 32
   */
  autoExpandParent?: boolean;

  /**
   * 默认展开的节点 key
   * @group 基础属性
   * @priority 33
   */
  defaultExpandedKeys?: string[];

  /**
   * 展开的节点 key（受控）
   * @group 基础属性
   * @priority 34
   */
  expandedKeys?: string[];

  /**
   * 默认勾选的节点 key
   * @group 基础属性
   * @priority 35
   */
  defaultCheckedKeys?: string[];

  /**
   * 勾选的节点 key（受控）
   * @group 基础属性
   * @priority 36
   */
  checkedKeys?: string[] | Record<string, unknown>;

  /**
   * 默认选中的节点 key
   * @group 基础属性
   * @priority 37
   */
  defaultSelectedKeys?: string[];

  /**
   * 选中的节点 key（受控）
   * @group 基础属性
   * @priority 38
   */
  selectedKeys?: string[];

  /**
   * 已加载的节点 key（异步加载用）
   * @group 基础属性
   * @priority 39
   */
  loadedKeys?: string[];

  /**
   * 点击展开行为
   * @group 基础属性
   * @priority 40
   */
  expandAction?: false | 'click' | 'doubleClick';

  /**
   * 开启虚拟滚动
   * @group 基础属性
   * @priority 60
   */
  virtual?: boolean;

  /**
   * 虚拟滚动高度
   * @group 基础属性
   * @priority 61
   */
  height?: number;

  /**
   * 虚拟滚动节点高度
   * @group 基础属性
   * @priority 62
   */
  itemHeight?: number;

  /**
   * 虚拟滚动宽度
   * @group 基础属性
   * @priority 63
   */
  scrollWidth?: number;
}
