/**
 * 颜色选择 组件 — withPlatform 包装
 *
 * 提供设计态能力（拖拽、选中、overlay 定位）
 * 和运行时平台能力（field/events/linkage）。
 *
 * ColorPicker 默认固定宽度（颜色块）。
 */
import React from 'react';
import { ColorPicker } from 'antd';
import { withPlatform } from '../../../components/platform';

/** 包装 ColorPicker，默认撑满容器宽度 */
function ColorPickerFullWidth(props: React.ComponentProps<typeof ColorPicker>) {
  return <ColorPicker {...props} style={props.style} />;
}

/** 颜色选择 平台组件（设计态 + 运行时） */
export const PlatformColorPicker = withPlatform(ColorPickerFullWidth);
