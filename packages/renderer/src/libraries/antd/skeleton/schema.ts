/**
 * 骨架屏 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 骨架屏 组件属性 */
export interface SkeletonProps extends BaseProps {
  /**
   * 动画
   * @group 基础属性
   * @priority 10
   */
  active?: boolean;

  /**
   * 加载中
   * @group 基础属性
   * @priority 11
   */
  loading?: boolean;

  /**
   * 头像
   * @group 基础属性
   * @priority 12
   */
  avatar?: boolean | {
    /** 头像尺寸 */
    size?: 'large' | 'small' | 'default' | number;
    /** 头像形状 */
    shape?: 'circle' | 'square';
  };

  /**
   * 标题
   * @group 基础属性
   * @priority 13
   * @default true
   */
  title?: boolean | {
    /** 标题宽度 */
    width?: number | string;
  };

  /**
   * 段落
   * @group 基础属性
   * @priority 14
   * @default true
   */
  paragraph?: boolean | {
    /** 段落行数 */
    rows?: number;
    /** 段落宽度，多行时可传数组分别设置每行宽度 */
    width?: number | string | Array<number | string>;
  };

  /**
   * 圆角
   * @group 高级属性
   * @priority 20
   */
  round?: boolean;
}
