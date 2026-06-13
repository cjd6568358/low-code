import React, { useReducer, useMemo } from 'react';
import type { PageSchema, ComponentRegistration } from '@low-code/shared';
import { ComponentRegistryImpl, builtinComponents } from '@low-code/renderer';
import { componentSchemas } from '@low-code/renderer';
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
   */
  library?: string;
  /** Schema 变更回调 */
  onChange?: (schema: PageSchema) => void;
}

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
  const { schema: initialSchema, components: extraComponents, library = 'antd', onChange } = props;

  // 初始化状态
  const [state, dispatch] = useReducer(
    designerReducer,
    createInitialDesignerState(initialSchema),
  );

  // 组件分类映射（严格按文档定义）
  const categoryMap: Record<string, { category: 'basic' | 'advanced' | 'layout' | 'custom'; name: string }> = {
    // 基础组件
    input: { category: 'basic', name: '输入框' },
    textarea: { category: 'basic', name: '文本域' },
    number: { category: 'basic', name: '数字输入' },
    select: { category: 'basic', name: '选择器' },
    radio: { category: 'basic', name: '单选' },
    checkbox: { category: 'basic', name: '多选' },
    switch: { category: 'basic', name: '开关' },
    datepicker: { category: 'basic', name: '日期选择' },
    timepicker: { category: 'basic', name: '时间选择' },
    upload: { category: 'basic', name: '上传' },
    button: { category: 'basic', name: '按钮' },
    // 高级组件
    table: { category: 'advanced', name: '表格' },
    form: { category: 'advanced', name: '表单' },
    chart: { category: 'advanced', name: '图表' },
    calendar: { category: 'advanced', name: '日历' },
    richtext: { category: 'advanced', name: '富文本编辑' },
    tree: { category: 'advanced', name: '树形控件' },
    // 布局组件
    tabs: { category: 'layout', name: '标签页' },
    card: { category: 'layout', name: '卡片' },
    divider: { category: 'layout', name: '分割线' },
    grid: { category: 'layout', name: '栅格' },
    flex: { category: 'layout', name: '弹性布局' },
    // 插槽组件（卡片专用，暴露变量/方法/事件给调用方）
    slot: { category: 'custom', name: '插槽' },
  };

  // 容器组件类型（接受子组件）
  const containerTypes = new Set(['form', 'card', 'flex', 'grid', 'tabs']);

  // 初始化组件注册表（使用应用级指定的组件库）
  const registry = useMemo(() => {
    const reg = new ComponentRegistryImpl();

    // 注册内建组件（绑定到应用指定的组件库，按文档分类，使用完整 propsSchema）
    for (const [type] of Object.entries(builtinComponents)) {
      const meta = categoryMap[type] || { category: 'basic' as const, name: type };
      reg.register({
        type,
        name: meta.name,
        category: meta.category,
        component: type,
        propsSchema: componentSchemas[type] || { type: 'object', properties: {} },
        acceptsChildren: containerTypes.has(type),
        library,
      });
    }

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
    <DesignerContext.Provider value={{ state, dispatch, library }}>
      <div
        style={{
          display: 'flex',
          height: '100vh',
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
