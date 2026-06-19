/**
 * 固钉 组件 — withPlatform 包装
 *
 * 提供设计态能力（拖拽、选中、overlay 定位）
 * 和运行时平台能力（field/events/linkage）。
 */
import { Affix } from 'antd';
import { withPlatform } from '../../../components/platform';

/** 固钉 平台组件（设计态 + 运行时） */
export const PlatformAffix = withPlatform(Affix) as React.ComponentType<any>;
