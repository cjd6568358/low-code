/**
 * 气泡确认 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 气泡确认 组件属性 */
export interface PopconfirmProps extends BaseProps {
  /**
   * 标题
   * @group 基础属性
   * @priority 10

   */
  title?: React.ReactNode;

  /**
   * 描述
   * @group 基础属性
   * @priority 11

   */
  description?: React.ReactNode;

  /**
   * 确认文案
   * @group 基础属性
   * @priority 12

   */
  okText?: string;

  /**
   * 取消文案
   * @group 基础属性
   * @priority 13

   */
  cancelText?: string;

  /**
   * 位置
   * @group 基础属性
   * @priority 14
   * @enum ["top","left","right","bottom","topLeft","topRight","bottomLeft","bottomRight"]
   */
  placement?: string;

  /**
   * 确认类型
   * @group 高级属性
   * @priority 20
   * @enum ["primary","default","dashed","text","link"]
   */
  okType?: string;
}
