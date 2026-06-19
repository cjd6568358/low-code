/**
 * 统计数值 组件 — withPlatform 包装
 *
 * 提供设计态能力（拖拽、选中、overlay 定位）
 * 和运行时平台能力（field/events/linkage）。
 */
import { Statistic } from 'antd';
import { withPlatform } from '../../../components/platform';

/** 统计数值 平台组件（设计态 + 运行时） */
export const PlatformStatistic = withPlatform(Statistic) as React.ComponentType<any>;
