/**
 * 加载中 组件 — withPlatform 包装
 *
 * 提供设计态能力（拖拽、选中、overlay 定位）
 * 和运行时平台能力（field/events/linkage）。
 */
import { Spin } from 'antd';
import { withPlatform } from '../../../components/platform';

/** 加载中 平台组件（设计态 + 运行时） */
export const PlatformSpin = withPlatform(Spin);
