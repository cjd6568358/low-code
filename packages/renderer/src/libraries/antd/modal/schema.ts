/**
 * 对话框 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 对话框 组件属性 */
export interface ModalProps extends BaseProps {
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
   * 宽度
   * @group 基础属性
   * @priority 12
   * @default 520
   */
  width?: number | string;

  /**
   * 居中
   * @group 基础属性
   * @priority 13

   */
  centered?: boolean;

  /**
   * 可关闭
   * @group 基础属性
   * @priority 14
   * @default true
   */
  closable?: boolean;

  /**
   * 遮罩
   * @group 基础属性
   * @priority 15
   * @default true
   */
  mask?: boolean;

  /**
   * 点击遮罩关闭
   * @group 基础属性
   * @priority 16
   * @default true
   */
  maskClosable?: boolean;

  /**
   * 底部
   * @group 高级属性
   * @priority 20

   */
  footer?: string;

  /**
   * 确认文案
   * @group 高级属性
   * @priority 21

   */
  okText?: string;

  /**
   * 取消文案
   * @group 高级属性
   * @priority 22

   */
  cancelText?: string;

  /**
   * 确认加载
   * @group 高级属性
   * @priority 23

   */
  confirmLoading?: boolean;

  /**
   * 关闭销毁
   * @group 高级属性
   * @priority 24

   */
  destroyOnClose?: boolean;
}
