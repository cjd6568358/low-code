/**
 * 卡片 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 卡片 组件属性 */
export interface CardProps extends BaseProps {
  /**
   * 标题
   * @group 基础属性
   * @priority 10
   */
  title?: string;

  /**
   * 额外操作
   * @group 基础属性
   * @priority 11
   */
  extra?: string;

  /**
   * 边框
   * @group 基础属性
   * @priority 12
   */
  bordered?: boolean;

  /**
   * 悬浮效果
   * @group 基础属性
   * @priority 13
   */
  hoverable?: boolean;

  /**
   * 加载中
   * @group 基础属性
   * @priority 14
   */
  loading?: boolean;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 15
   * @enumLabels default:默认, small:小
   */
  size?: 'default' | 'small';

  /**
   * 类型
   * @group 基础属性
   * @priority 16
   */
  type?: 'inner';

  /**
   * 卡片封面
   * @group 基础属性
   * @priority 17
   */
  cover?: string;

  /**
   * 卡片操作组
   * @group 基础属性
   * @priority 18
   */
  actions?: string[];

  /**
   * 页签标题列表
   * @group 高级属性
   * @priority 30
   */
  tabList?: string;

  /**
   * 页签额外操作区
   * @group 高级属性
   * @priority 31
   */
  tabBarExtraContent?: string;

  /**
   * 当前激活页签的 key
   * @group 高级属性
   * @priority 32
   */
  activeTabKey?: string;

  /**
   * 默认激活页签的 key
   * @group 高级属性
   * @priority 33
   */
  defaultActiveTabKey?: string;

  /**
   * 页签切换回调
   * @group 事件
   * @priority 34
   */
  onTabChange?: string;

  /**
   * 卡片变体
   * @group 基础属性
   * @priority 19
   * @enumLabels borderless:无边框, outlined:描边
   */
  variant?: 'borderless' | 'outlined';
}
