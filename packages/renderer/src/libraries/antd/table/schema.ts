/**
 * 表格 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 表格 组件属性 */
export interface TableProps extends BaseProps {
  /**
   * 数据源
   * @group 基础属性
   * @priority 10

   */
  dataSource?: any[];

  /**
   * 列配置
   * @group 基础属性
   * @priority 11

   */
  columns?: any[];

  /**
   * 边框
   * @group 基础属性
   * @priority 12

   */
  bordered?: boolean;

  /**
   * 加载中
   * @group 基础属性
   * @priority 13

   */
  loading?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 14
   * @default 'large'

   * @enumLabels small:小, middle:居中, large:大
   */
  size?: 'small' | 'middle' | 'large';

  /**
   * 列统一属性
   * @group 基础属性
   * @priority 15

   */
  column?: Record<string, unknown>;

  /**
   * 虚拟滚动
   * @group 基础属性
   * @priority 16

   */
  virtual?: boolean;

  /**
   * 分页
   * @group 高级属性
   * @priority 20

   */
  pagination?: object | false;

  /**
   * 滚动
   * @group 高级属性
   * @priority 21

   */
  scroll?: { x?: number | string; y?: number | string; scrollToFirstRowOnChange?: boolean };

  /**
   * 行选择
   * @group 高级属性
   * @priority 22

   */
  rowSelection?: object;

  /**
   * 排序方向
   * @group 高级属性
   * @priority 23

   */
  sortDirections?: ('ascend' | 'descend')[];

  /**
   * 排序提示
   * @group 高级属性
   * @priority 24

   */
  showSorterTooltip?: boolean | Record<string, unknown>;

  /**
   * 国际化文案
   * @group 高级属性
   * @priority 25

   */
  locale?: Record<string, unknown>;

  /**
   * 根节点 CSS 类名
   * @group 样式
   * @priority 51

   */
  rootClassName?: string;

  /**
   * 弹出容器
   * @group 高级属性
   * @priority 26

   */
  getPopupContainer?: string;

  /**
   * 表格变化回调
   * @group 事件
   * @priority 80

   */
  onChange?: string;
}
