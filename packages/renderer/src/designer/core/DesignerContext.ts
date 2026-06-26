import { createContext, useContext } from 'react';
import type { DesignerState, DesignerAction } from './DesignerState';

export interface DesignerContextValue {
  state: DesignerState;
  dispatch: React.Dispatch<DesignerAction>;
  /** 应用级组件库标识（不可切换） */
  library: string;
  /** 当前应用 ID（用于加载页面列表等跨资源引用） */
  appId?: string;
  /** 当前租户 ID（用于拼接路由） */
  tenantId?: string;
  /** 保存回调（由 PageDesign 传入） */
  onSave?: () => void;
  /** 是否正在保存 */
  saving?: boolean;
}

export const DesignerContext = createContext<DesignerContextValue | null>(null);

export function useDesigner(): DesignerContextValue {
  const ctx = useContext(DesignerContext);
  if (!ctx) {
    throw new Error('useDesigner must be used within DesignerProvider');
  }
  return ctx;
}
