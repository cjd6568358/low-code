/**
 * 面包屑 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 面包屑 组件属性 */
export interface BreadcrumbProps extends BaseProps {
  /**
   * 面包屑数据
   * @group 基础属性
   * @priority 10
   */
  items?: object[];

  /**
   * 分隔符
   * @group 基础属性
   * @priority 11
   */
  separator?: string;

  /**
   * 下拉菜单图标
   * @group 基础属性
   * @priority 12
   */
  dropdownIcon?: string;

  /**
   * 自定义 CSS 类名
   * @group 样式
   * @priority 51
   */
  className?: string;

  /**
   * 根节点 CSS 类名
   * @group 样式
   * @priority 52
   */
  rootClassName?: string;

  /**
   * 语义化类名配置
   * @group 样式
   * @priority 53
   */
  classNames?: Record<string, unknown>;

  /**
   * 语义化样式配置
   * @group 样式
   * @priority 54
   */
  styles?: Record<string, unknown>;

  /**
   * 自定义渲染函数（表达式字符串）
   * @group 高级属性
   * @priority 80
   */
  itemRender?: string;
}
