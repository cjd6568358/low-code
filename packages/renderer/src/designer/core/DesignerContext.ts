import { createContext, useContext } from 'react';
import type { DesignerState, DesignerAction } from './DesignerState';

export interface DesignerContextValue {
  state: DesignerState;
  dispatch: React.Dispatch<DesignerAction>;
  /** 应用级组件库标识（不可切换） */
  library: string;
}

export const DesignerContext = createContext<DesignerContextValue | null>(null);

export function useDesigner(): DesignerContextValue {
  const ctx = useContext(DesignerContext);
  if (!ctx) {
    throw new Error('useDesigner must be used within DesignerProvider');
  }
  return ctx;
}
