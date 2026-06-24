/**
 * 分页 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 分页 组件属性 */
export interface PaginationProps extends BaseProps {
  // ==================== 基础属性 ====================

  /**
   * 总数
   * @group 基础属性
   * @priority 10
   */
  total?: number;

  /**
   * 当前页
   * @group 基础属性
   * @priority 11
   */
  current?: number;

  /**
   * 默认当前页
   * @group 基础属性
   * @priority 12
   * @no-binding
   */
  defaultCurrent?: number;

  /**
   * 每页条数
   * @group 基础属性
   * @priority 13
   */
  pageSize?: number;

  /**
   * 默认每页条数
   * @group 基础属性
   * @priority 14
   * @no-binding
   * @default 10
   */
  defaultPageSize?: number;

  /**
   * 禁用
   * @group 基础属性
   * @priority 15
   */
  disabled?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 16
   * @no-binding
   */
  size?: 'small' | 'default';

  // ==================== 展示配置 ====================

  /**
   * 显示条数切换
   * @group 基础属性
   * @priority 20
   */
  showSizeChanger?: boolean;

  /**
   * 指定每页可以显示多少条
   * @group 基础属性
   * @priority 21
   * @no-binding
   */
  pageSizeOptions?: (string | number)[];

  /**
   * 快速跳转
   * @group 基础属性
   * @priority 22
   */
  showQuickJumper?: boolean;

  /**
   * 显示总数
   * @group 基础属性
   * @priority 23
   */
  showTotal?: boolean;

  /**
   * 少于 5 条时隐藏分页
   * @group 基础属性
   * @priority 24
   */
  hideOnSinglePage?: boolean;

  /**
   * 显示较少的页码按钮
   * @group 基础属性
   * @priority 25
   */
  showLessItems?: boolean;

  /**
   * 显示前后翻页按钮
   * @group 基础属性
   * @priority 26
   */
  showPrevNextJumpers?: boolean;

  /**
   * 显示页码按钮的 title
   * @group 基础属性
   * @priority 27
   */
  showTitle?: boolean;

  /**
   * 对齐方式
   * @group 基础属性
   * @priority 28
   * @no-binding
   */
  align?: 'start' | 'center' | 'end';

  // ==================== 高级属性 ====================

  /**
   * 简洁模式
   * @group 高级属性
   * @priority 30
   */
  simple?: boolean;

  /**
   * 根据屏幕宽度自动调整
   * @group 高级属性
   * @priority 31
   */
  responsive?: boolean;

  /**
   * 小于该值时自动隐藏 sizeChanger
   * @group 高级属性
   * @priority 32
   */
  totalBoundaryShowSizeChanger?: number;
}
