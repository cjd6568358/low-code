/**
 * 抽屉 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 抽屉 组件属性 */
export interface DrawerProps extends BaseProps {
  /**
   * 标题
   * @group 基础属性
   * @priority 10

   */
  title?: string;

  /**
   * 打开
   * @group 基础属性
   * @priority 11

   */
  open?: boolean;

  /**
   * 位置
   * @group 基础属性
   * @priority 12
   * @default "right"
   * @enumLabels top:顶部, right:右, bottom:底部, left:左
   */
  placement?: 'top' | 'right' | 'bottom' | 'left';

  /**
   * 宽度
   * @group 基础属性
   * @priority 13
   * @default 256
   */
  width?: number | string;

  /**
   * 高度
   * @group 基础属性
   * @priority 14

   */
  height?: number | string;

  /**
   * 可关闭
   * @group 基础属性
   * @priority 15
   * @default true
   */
  closable?: boolean;

  /**
   * 遮罩
   * @group 基础属性
   * @priority 16
   * @default true
   */
  mask?: boolean;

  /**
   * 底部
   * @group 高级属性
   * @priority 20

   */
  footer?: string;

  /**
   * 加载中
   * @group 高级属性
   * @priority 21

   */
  loading?: boolean;
}
