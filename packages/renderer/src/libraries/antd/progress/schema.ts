/**
 * 进度条 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 进度条 组件属性 */
export interface ProgressProps extends BaseProps {
  /**
   * 百分比
   * @group 基础属性
   * @priority 10

   */
  percent?: number;

  /**
   * 类型
   * @group 基础属性
   * @priority 11
   * @default "line"
   * @enumLabels line:线条, circle:圆形, dashboard:dashboard
   */
  type?: 'line' | 'circle' | 'dashboard';

  /**
   * 状态
   * @group 基础属性
   * @priority 12
   * @default "normal"
   * @enumLabels success:成功, exception:异常, normal:正常, active:激活
   */
  status?: 'success' | 'exception' | 'normal' | 'active';

  /**
   * 显示信息
   * @group 基础属性
   * @priority 13
   * @default true
   */
  showInfo?: boolean;

  /**
   * 颜色
   * @group 高级属性
   * @priority 20
   */
  strokeColor?: string;

  /**
   * 轨道颜色
   * @group 高级属性
   * @priority 21
   * @ignore 请使用 railColor 替代
   */
  trailColor?: string;

  /**
   * 轨道颜色
   * @group 高级属性
   * @priority 22
   */
  railColor?: string;

  /**
   * 尺寸
   * @group 高级属性
   * @priority 23
   */
  size?: number | [number, number];

  /**
   * 进度条线的宽度，单位 px
   * @group 高级属性
   * @priority 24
   */
  strokeWidth?: number;

  /**
   * 进度条端点形状
   * @group 高级属性
   * @priority 25
   * @enumLabels butt:butt, square:方形, round:圆角
   */
  strokeLinecap?: 'butt' | 'square' | 'round';

  /**
   * 成功进度条配置
   * @group 高级属性
   * @priority 26
   */
  success?: {
    /** 成功进度百分比 */
    percent?: number;
    /** 成功进度条颜色 */
    strokeColor?: string;
  };

  /**
   * 仪表盘进度条缺口角度（0-295）
   * @group 高级属性
   * @priority 30
   */
  gapDegree?: number;

  /**
   * 仪表盘进度条缺口位置
   * @group 高级属性
   * @priority 31
   * @enumLabels top:顶部, bottom:底部, start:起始, end:结束
   */
  gapPlacement?: 'top' | 'bottom' | 'start' | 'end';

  /**
   * 进度条分步数（圆环/仪表盘类型下生效）
   * @group 高级属性
   * @priority 32
   */
  steps?: number | {
    /** 分步数 */
    count: number;
    /** 每步间距 */
    gap: number;
  };

  /**
   * 百分比标签位置
   * @group 高级属性
   * @priority 33
   */
  percentPosition?: {
    /** 对齐方式 */
    align?: 'start' | 'center' | 'end';
    /** 显示位置 */
    type?: 'inner' | 'outer';
  };
}
