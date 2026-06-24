/**
 * 漫游引导 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 漫游引导 组件属性 */
export interface TourProps extends BaseProps {
  /**
   * 步骤
   * @group 基础属性
   * @priority 10
   */
  steps?: any[];

  /**
   * 当前步骤
   * @group 基础属性
   * @priority 11
   */
  current?: number;

  /**
   * 类型
   * @group 基础属性
   * @priority 12
   * @default "default"
   */
  type?: 'default' | 'primary';

  /**
   * 遮罩
   * @group 基础属性
   * @priority 13
   */
  mask?: boolean | {
    style?: Record<string, unknown>;
    color?: string;
  };

  /**
   * 箭头
   * @group 基础属性
   * @priority 14
   * @default true
   */
  arrow?: boolean | {
    pointAtCenter?: boolean;
  };

  /**
   * 受控展开
   * @group 基础属性
   * @priority 15
   */
  open?: boolean;

  /**
   * 默认展开
   * @group 基础属性
   * @priority 16
   */
  defaultOpen?: boolean;

  /**
   * 键盘导航
   * @group 基础属性
   * @priority 17
   */
  keyboard?: boolean;

  /**
   * 默认步骤索引
   * @group 基础属性
   * @priority 18
   */
  defaultCurrent?: number;

  /**
   * 可关闭
   * @group 基础属性
   * @priority 19
   * @default true
   */
  closable?: boolean;

  /**
   * 关闭图标
   * @group 高级属性
   * @priority 20
   */
  closeIcon?: string;

  /**
   * 动画
   * @group 高级属性
   * @priority 21
   * @default true
   */
  animated?: boolean | {
    placeholder?: boolean;
  };

  /**
   * 弹出位置
   * @group 高级属性
   * @priority 22
   */
  placement?: 'top' | 'left' | 'right' | 'bottom' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom';

  /**
   * 滚动至可见
   * @group 高级属性
   * @priority 23
   */
  scrollIntoViewOptions?: boolean | {
    behavior?: 'auto' | 'smooth';
    block?: 'center' | 'end' | 'nearest' | 'start';
    inline?: 'center' | 'end' | 'nearest' | 'start';
  };

  /**
   * 层级
   * @group 高级属性
   * @priority 24
   */
  zIndex?: number;

  /**
   * 禁用交互
   * @group 高级属性
   * @priority 25
   */
  disabledInteraction?: boolean;

  /**
   * 高亮间距
   * @group 高级属性
   * @priority 26
   */
  gap?: {
    offset?: number | [number, number];
    radius?: number;
  };

  /**
   * CSS 类名
   * @group 样式
   * @priority 30
   */
  className?: string;

  /**
   * 根节点类名
   * @group 样式
   * @priority 31
   */
  rootClassName?: string;
}
