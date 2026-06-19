/**
 * 滑动条 组件 — withPlatform 包装
 *
 * 提供设计态能力（拖拽、选中、overlay 定位）
 * 和运行时平台能力（field/events/linkage）。
 */
import { Slider } from 'antd';
import { withPlatform } from '../../../components/platform';

/** 滑动条 平台组件（设计态 + 运行时） */
export const PlatformSlider = withPlatform(Slider);
