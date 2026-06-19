/**
 * 抽屉 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 抽屉 组件属性 */
export interface DrawerProps extends BaseProps {
  /**
   * 标题
   * @group 基础属性
   * @priority 10

   */
  title?: React.ReactNode;

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
   * @enum ["top","right","bottom","left"]
   */
  placement?: string;

  /**
   * 宽度
   * @group 基础属性
   * @priority 13

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

   */
  closable?: boolean;

  /**
   * 遮罩
   * @group 基础属性
   * @priority 16

   */
  mask?: boolean;

  /**
   * 底部
   * @group 高级属性
   * @priority 20

   */
  footer?: React.ReactNode;

  /**
   * 加载中
   * @group 高级属性
   * @priority 21

   */
  loading?: boolean;
}
