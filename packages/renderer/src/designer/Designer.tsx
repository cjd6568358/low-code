import React, { useReducer, useMemo } from 'react';
import type { PageSchema, ComponentRegistration } from '@low-code/shared';
import { ComponentRegistryImpl } from '@low-code/renderer';
import {
  antdComponentImpls, antdCategoryMap, antdContainerTypes, antdSchemas,
} from '@low-code/renderer';
import type { ComponentLibrary } from '@low-code/shared';
import { designerReducer, createInitialDesignerState } from './core/DesignerState';
import { DesignerContext } from './core/DesignerContext';
import { ComponentPanel } from './panels/ComponentPanel';
import { DesignCanvas } from './panels/DesignCanvas';
import { PropertyPanel } from './panels/PropertyPanel';

/** 设计器属性 */
export interface DesignerProps {
  /** 初始页面 Schema */
  schema?: PageSchema;
  /** 额外的组件注册 */
  components?: ComponentRegistration[];
  /**
   * 组件库标识（应用级配置，设计器中不可切换）
   * 在应用创建时指定，后续所有页面/卡片搭建共用
   * 支持：'antd'（默认）、'builtin'（原生 HTML）
   */
  library?: string;
  /** Schema 变更回调 */
  onChange?: (schema: PageSchema) => void;
  /** 保存回调（由 PageDesign 传入，画布顶部保存按钮和 Ctrl+S 触发） */
  onSave?: () => void;
  /** 是否正在保存 */
  saving?: boolean;
}

/** 内置组件库注册表 */
const LIBRARY_REGISTRY: Record<string, {
  library: ComponentLibrary;
  components: Record<string, React.ComponentType<any>>;
  schemas: Record<string, Record<string, any>>;
}> = {
  antd: {
    library: {
      name: 'antd',
      basePropsSchema: { type: 'object', properties: {} } as any,
      categoryMap: antdCategoryMap,
      containerTypes: antdContainerTypes,
    },
    components: antdComponentImpls,
    schemas: antdSchemas,
  },
};

/**
 * 页面设计器主组件
 * 三栏布局：左侧组件面板 / 中间设计区 / 右侧属性面板
 *
 * 设计器采用统一的 web 布局。
 * mobile/小程序通过环境变量微调布局细节，预览支持 web/mobile 切换。
 *
 * 组件库在应用创建时指定，设计器中不可切换，
 * 所有页面/卡片搭建共用同一套组件库。
 */
export function Designer(props: DesignerProps) {
  const { schema: initialSchema, components: extraComponents, library = 'antd', onChange, onSave, saving } = props;

  // 初始化状态
  const [state, dispatch] = useReducer(
    designerReducer,
    createInitialDesignerState(initialSchema),
  );

  // 初始化组件注册表（使用应用级指定的组件库）
  const registry = useMemo(() => {
    const reg = new ComponentRegistryImpl();

    // 注册组件库
    const libConfig = LIBRARY_REGISTRY[library] || LIBRARY_REGISTRY.antd;
    reg.registerLibrary(libConfig.library, libConfig.components, libConfig.schemas);

    // 注册额外组件
    if (extraComponents) {
      reg.registerAll(extraComponents);
    }

    return reg;
  }, [extraComponents, library]);

  // Schema 变更通知
  React.useEffect(() => {
    onChange?.(state.schema);
  }, [state.schema, onChange]);

  return (
    <DesignerContext.Provider value={{ state, dispatch, library, onSave, saving }}>
      <div
        style={{
          display: 'flex',
          height: '100%',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: '14px',
          color: '#000000d9',
          backgroundColor: '#fff',
        }}
      >
        {/* 左侧 — 组件面板 */}
        <ComponentPanel registry={registry} />

        {/* 中间 — 设计区 */}
        <DesignCanvas registry={registry} />

        {/* 右侧 — 属性面板 */}
        <PropertyPanel registry={registry} />
      </div>
    </DesignerContext.Provider>
  );
}
