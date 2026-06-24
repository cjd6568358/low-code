/**
 * 列表 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 列表 组件属性 */
export interface ListProps extends BaseProps {
  /**
   * 数据源
   * @group 基础属性
   * @priority 10
   */
  dataSource?: any[];

  /**
   * 加载中
   * @group 基础属性
   * @priority 11
   */
  loading?: boolean;

  /**
   * 边框
   * @group 基础属性
   * @priority 12
   */
  bordered?: boolean;

  /**
   * 分割线
   * @group 基础属性
   * @priority 13
   */
  split?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 14
   */
  size?: 'small' | 'default' | 'large';

  /**
   * 列表项布局
   * @group 基础属性
   * @priority 15
   */
  itemLayout?: 'horizontal' | 'vertical';

  /**
   * 栅格布局配置
   * @group 基础属性
   * @priority 16
   */
  grid?: Record<string, unknown>;

  /**
   * 头部
   * @group 高级属性
   * @priority 20
   */
  header?: string;

  /**
   * 底部
   * @group 高级属性
   * @priority 21
   */
  footer?: string;

  /**
   * 额外内容
   * @group 高级属性
   * @priority 22
   */
  extra?: string;

  /**
   * 加载更多
   * @group 高级属性
   * @priority 23
   */
  loadMore?: string;

  /**
   * 分页
   * @group 高级属性
   * @priority 24
   */
  pagination?: object;
}
