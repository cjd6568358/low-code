/**
 * 步骤条 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 步骤条 组件属性 */
export interface StepsProps extends BaseProps {
  /**
   * 步骤数据
   * @group 基础属性
   * @priority 10
   */
  items?: object[];

  /**
   * 当前步骤
   * @group 基础属性
   * @priority 11
   */
  current?: number;

  /**
   * 方向
   * @group 基础属性
   * @priority 12
   * @default "horizontal"
   * @ignore 使用 orientation 代替
   */
  direction?: 'horizontal' | 'vertical';

  /**
   * 排列方向
   * @group 基础属性
   * @priority 13
   * @default "horizontal"
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * 尺寸
   * @group 基础属性
   * @priority 14
   */
  size?: 'small' | 'default' | 'medium';

  /**
   * 类型
   * @group 基础属性
   * @priority 15
   */
  type?: 'default' | 'navigation' | 'inline' | 'panel' | 'dot';

  /**
   * 标题放置位置
   * @group 基础属性
   * @priority 16
   */
  titlePlacement?: 'horizontal' | 'vertical';

  /**
   * 状态
   * @group 基础属性
   * @priority 17
   */
  status?: 'wait' | 'process' | 'finish' | 'error';

  /**
   * 初始步骤
   * @group 基础属性
   * @priority 18
   */
  initial?: number;

  /**
   * 变体风格
   * @group 高级属性
   * @priority 20
   * @default "filled"
   */
  variant?: 'filled' | 'outlined';

  /**
   * 点状步骤
   * @group 高级属性
   * @priority 21
   */
  progressDot?: boolean;

  /**
   * 响应式布局
   * @group 高级属性
   * @priority 22
   */
  responsive?: boolean;

  /**
   * 文字自动省略
   * @group 高级属性
   * @priority 23
   */
  ellipsis?: boolean;

  /**
   * 偏移量（inline 模式下生效）
   * @group 高级属性
   * @priority 24
   */
  offset?: number;

  /**
   * 百分比进度
   * @group 高级属性
   * @priority 25
   */
  percent?: number;

  /**
   * 根节点样式类名
   * @group 高级属性
   * @priority 26
   */
  rootClassName?: string;
}
