/**
 * 头像 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

// React 类型已替换：React.ReactNode → string, React.CSSProperties → Record<string, unknown>
// 低代码平台不支持写 React 组件，属性面板统一用字符串配置

/** 头像 组件属性 */
export interface AvatarProps extends BaseProps {
  /**
   * 图片地址
   * @group 基础属性
   * @priority 10
   */
  src?: string;

  /**
   * 尺寸
   * @group 基础属性
   * @priority 11
   */
  size?: number | string;

  /**
   * 形状
   * @group 基础属性
   * @priority 12
   * @default "circle"
   */
  shape?: 'circle' | 'square';

  /**
   * 图标
   * @group 基础属性
   * @priority 13
   */
  icon?: string;

  /**
   * 图片替代文本
   * @group 基础属性
   * @priority 14
   */
  alt?: string;

  /**
   * 图片源集（响应式图片 srcset 属性）
   * @group 基础属性
   * @priority 15
   */
  srcSet?: string;

  /**
   * 文字类头像与图片头像两侧之间的间距（像素）
   * @group 基础属性
   * @priority 16
   */
  gap?: number;

  /**
   * 图片是否可拖拽
   * @group 基础属性
   * @priority 17
   */
  draggable?: boolean | 'true' | 'false';

  /**
   * 图片 CORS 属性设置
   * @group 高级属性
   * @priority 20
   */
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
}
