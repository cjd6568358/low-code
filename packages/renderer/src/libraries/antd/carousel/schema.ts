/**
 * 走马灯 组件 Schema 定义
 *
 * Props 接口 extends BaseProps，继承公共属性。
 * JSDoc 注释中直接定义中文标题 + x-group + x-priority。
 * JSON Schema 从 TS 类型直接生成，包含所有注解。
 */
import type { BaseProps } from '../base-props';

/** 走马灯 组件属性 */
export interface CarouselProps extends BaseProps {
  /**
   * 自动播放
   * @group 基础属性
   * @priority 10
   */
  autoplay?: boolean | { dotDuration?: boolean };

  /**
   * 指示点
   * @group 基础属性
   * @priority 11
   * @default true
   */
  dots?: boolean | { className?: string };

  /**
   * 指示点位置（已废弃，请使用 dotPlacement）
   * @group 基础属性
   * @priority 12
   * @default "bottom"
   * @ignore 使用 dotPlacement 代替
   */
  dotPosition?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * 动效
   * @group 基础属性
   * @priority 13
   */
  effect?: 'scrollx' | 'fade';

  /**
   * 指示点位置
   * @group 基础属性
   * @priority 14
   * @default "bottom"
   */
  dotPlacement?: 'top' | 'bottom' | 'start' | 'end';

  /**
   * 初始幻灯片索引
   * @group 基础属性
   * @priority 15
   */
  initialSlide?: number;

  /**
   * 循环播放
   * @group 基础属性
   * @priority 16
   */
  infinite?: boolean;

  /**
   * 等待动画完成
   * @group 基础属性
   * @priority 17
   */
  waitForAnimate?: boolean;

  /**
   * 切换速度(ms)
   * @group 高级属性
   * @priority 20
   * @default 500
   */
  speed?: number;

  /**
   * 自动播放间隔（毫秒）
   * @group 高级属性
   * @priority 21
   */
  autoplaySpeed?: number;

  /**
   * 鼠标悬停暂停
   * @group 高级属性
   * @priority 22
   */
  pauseOnHover?: boolean;

  /**
   * 聚焦暂停
   * @group 高级属性
   * @priority 23
   */
  pauseOnFocus?: boolean;

  /**
   * 指示点悬停暂停
   * @group 高级属性
   * @priority 24
   */
  pauseOnDotsHover?: boolean;

  /**
   * 显示箭头
   * @group 高级属性
   * @priority 25
   */
  arrows?: boolean;

  /**
   * 指示点样式类名
   * @group 高级属性
   * @priority 26
   */
  dotsClass?: string;

  /**
   * 同时显示幻灯片数
   * @group 高级属性
   * @priority 27
   */
  slidesToShow?: number;

  /**
   * 每次滚动幻灯片数
   * @group 高级属性
   * @priority 28
   */
  slidesToScroll?: number;

  /**
   * 居中模式
   * @group 高级属性
   * @priority 29
   */
  centerMode?: boolean;

  /**
   * 居中模式内边距
   * @group 高级属性
   * @priority 30
   */
  centerPadding?: string;

  /**
   * 行数
   * @group 高级属性
   * @priority 31
   */
  rows?: number;

  /**
   * 每行幻灯片数
   * @group 高级属性
   * @priority 32
   */
  slidesPerRow?: number;

  /**
   * 可变宽度
   * @group 高级属性
   * @priority 33
   */
  variableWidth?: boolean;

  /**
   * 自适应高度
   * @group 高级属性
   * @priority 34
   */
  adaptiveHeight?: boolean;

  /**
   * 垂直模式
   * @group 高级属性
   * @priority 35
   */
  vertical?: boolean;

  /**
   * 从右到左
   * @group 高级属性
   * @priority 36
   */
  rtl?: boolean;

  /**
   * 可拖拽
   * @group 高级属性
   * @priority 37
   */
  draggable?: boolean;

  /**
   * 可滑动
   * @group 高级属性
   * @priority 38
   */
  swipe?: boolean;

  /**
   * 滑动切换
   * @group 高级属性
   * @priority 39
   */
  swipeToSlide?: boolean;

  /**
   * 垂直滑动
   * @group 高级属性
   * @priority 40
   */
  verticalSwiping?: boolean;

  /**
   * 触摸移动
   * @group 高级属性
   * @priority 41
   */
  touchMove?: boolean;

  /**
   * 触摸阈值
   * @group 高级属性
   * @priority 42
   */
  touchThreshold?: number;

  /**
   * 点击聚焦
   * @group 高级属性
   * @priority 43
   */
  focusOnSelect?: boolean;

  /**
   * 边缘摩擦
   * @group 高级属性
   * @priority 44
   */
  edgeFriction?: number;

  /**
   * CSS 缓动函数
   * @group 高级属性
   * @priority 45
   */
  cssEase?: string;

  /**
   * 缓动函数
   * @group 高级属性
   * @priority 46
   */
  easing?: string;

  /**
   * 使用 CSS 过渡
   * @group 高级属性
   * @priority 47
   */
  useCSS?: boolean;

  /**
   * 使用 CSS 变换
   * @group 高级属性
   * @priority 48
   */
  useTransform?: boolean;

  /**
   * 懒加载模式
   * @group 高级属性
   * @priority 49
   */
  lazyLoad?: 'ondemand' | 'progressive' | 'anticipated';

  /**
   * 无障碍访问
   * @group 高级属性
   * @priority 50
   */
  accessibility?: boolean;

  /**
   * 响应式配置
   * @group 高级属性
   * @priority 51
   */
  responsive?: { breakpoint: number; settings: 'unslick' | Record<string, unknown> }[];

  /**
   * 幻灯片选择器
   * @group 高级属性
   * @priority 52
   */
  slide?: string;

  /**
   * 样式类名
   * @group 高级属性
   * @priority 60
   */
  className?: string;

  /**
   * 根节点样式类名
   * @group 高级属性
   * @priority 61
   */
  rootClassName?: string;

  /**
   * 组件 ID
   * @group 高级属性
   * @priority 70
   */
  id?: string;

  /**
   * 跳转到指定幻灯片
   * @group 高级属性
   * @priority 71
   */
  slickGoTo?: number;

  /**
   * 内容
   * @group 高级属性
   * @priority 72
   */
  children?: string;
}
