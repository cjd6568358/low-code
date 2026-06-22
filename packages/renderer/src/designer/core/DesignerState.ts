import React from 'react';
import { generateComponentName } from '../utils';
import type {
  PageSchema,
  ComponentNode,
  ThemeConfig,
  ComponentRegistration,
  WatermarkConfig,
} from '@low-code/shared';

/** 设计器状态 */
export interface DesignerState {
  /** 当前页面 Schema */
  schema: PageSchema;
  /** 选中的组件 ID */
  selectedComponentId: string | null;
  /** 拖拽中的组件类型 */
  draggingType: string | null;
  /** 预览模式 */
  previewMode: 'design' | 'preview';
  /** 预览设备（仅 web/mobile） */
  previewDevice: 'web' | 'mobile';
  /** 当前组件库 */
  currentLibrary: string;
  /** 组件搜索关键词 */
  searchKeyword: string;
}

/** 设计器动作 */
export type DesignerAction =
  | { type: 'SET_SCHEMA'; payload: PageSchema }
  | { type: 'ADD_COMPONENT'; payload: { node: ComponentNode; parentId?: string; index?: number } }
  | { type: 'UPDATE_COMPONENT'; payload: { id: string; changes: Partial<ComponentNode> } }
  | { type: 'REMOVE_COMPONENT'; payload: { id: string } }
  | { type: 'MOVE_COMPONENT'; payload: { id: string; newParentId?: string; newIndex: number } }
  | { type: 'SELECT_COMPONENT'; payload: string | null }
  | { type: 'SET_DRAGGING'; payload: string | null }
  | { type: 'SET_PREVIEW_MODE'; payload: 'design' | 'preview' }
  | { type: 'SET_PREVIEW_DEVICE'; payload: 'web' | 'mobile' }
  | { type: 'SET_LIBRARY'; payload: string }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'UPDATE_THEME'; payload: Partial<ThemeConfig> }
  | { type: 'UPDATE_LAYOUT'; payload: PageSchema['layout'] }
  | { type: 'UPDATE_PAGE_META'; payload: { name?: string } }
  | { type: 'UPDATE_PAGE_WATERMARK'; payload: WatermarkConfig | undefined };

/** 设计器 Reducer */
export function designerReducer(state: DesignerState, action: DesignerAction): DesignerState {
  switch (action.type) {
    case 'SET_SCHEMA':
      return { ...state, schema: action.payload };

    case 'ADD_COMPONENT': {
      const { node, parentId, index } = action.payload;
      // 兜底：确保组件有 name
      const ensuredName = node.name || generateComponentName(node.type, state.schema.components);
      const newNode = { ...node, name: ensuredName, parentId };
      const components = [...state.schema.components];

      if (parentId) {
        // 添加到父组件的 children
        const parentIdx = components.findIndex((c) => c.id === parentId);
        if (parentIdx !== -1) {
          const parent = { ...components[parentIdx] };
          parent.children = [...(parent.children || [])];
          if (index !== undefined) {
            parent.children.splice(index, 0, node.id);
          } else {
            parent.children.push(node.id);
          }
          components[parentIdx] = parent;
        }
      }

      // 根级别插入：支持 index 指定位置
      if (parentId) {
        components.push(newNode);
      } else if (index !== undefined) {
        components.splice(index, 0, newNode);
      } else {
        components.push(newNode);
      }

      const newSchema = { ...state.schema, components };
      return { ...state, schema: newSchema, selectedComponentId: node.id };
    }

    case 'UPDATE_COMPONENT': {
      const { id, changes } = action.payload;
      const components = state.schema.components.map((c) =>
        c.id === id ? { ...c, ...changes } : c,
      );
      return { ...state, schema: { ...state.schema, components } };
    }

    case 'REMOVE_COMPONENT': {
      const { id } = action.payload;
      // 递归收集要删除的组件 ID
      const idsToRemove = new Set<string>();
      const collectIds = (componentId: string) => {
        idsToRemove.add(componentId);
        const node = state.schema.components.find((c) => c.id === componentId);
        if (node?.children) {
          node.children.forEach(collectIds);
        }
      };
      collectIds(id);

      // 从父组件的 children 中移除
      const targetNode = state.schema.components.find((c) => c.id === id);
      let components = state.schema.components.filter((c) => !idsToRemove.has(c.id));

      if (targetNode?.parentId) {
        components = components.map((c) => {
          if (c.id === targetNode.parentId) {
            return {
              ...c,
              children: (c.children || []).filter((childId) => childId !== id),
            };
          }
          return c;
        });
      }

      const newSchema = { ...state.schema, components };
      return {
        ...state,
        schema: newSchema,
        selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
      };
    }

    case 'MOVE_COMPONENT': {
      const { id, newParentId, newIndex } = action.payload;
      const components = [...state.schema.components];
      const node = components.find((c) => c.id === id);
      if (!node) return state;

      const sameParent = node.parentId === newParentId;
      let adjustedIndex = newIndex;

      // 从旧父组件移除
      if (node.parentId) {
        const oldParentIdx = components.findIndex((c) => c.id === node.parentId);
        if (oldParentIdx !== -1) {
          const oldParent = { ...components[oldParentIdx] };
          const oldChildren = oldParent.children || [];
          const oldIndex = oldChildren.indexOf(id);
          oldParent.children = oldChildren.filter((childId) => childId !== id);
          components[oldParentIdx] = oldParent;
          if (sameParent && oldIndex < newIndex) {
            adjustedIndex = newIndex - 1;
          }
        }
      } else {
        // 根级别源
        const oldRootIdx = components.findIndex((c) => c.id === id);
        if (oldRootIdx !== -1) {
          if (!newParentId) {
            // 根级别内移动：splice 取出再插入
            const [removed] = components.splice(oldRootIdx, 1);
            if (oldRootIdx < newIndex) {
              adjustedIndex = newIndex - 1;
            }
            removed.parentId = undefined;
            components.splice(adjustedIndex, 0, removed);
          } else {
            // 根级别 → 容器：不 splice，只更新 parentId + 插入 children
            components[oldRootIdx] = { ...components[oldRootIdx], parentId: newParentId };
            const newParentIdx = components.findIndex((c) => c.id === newParentId);
            if (newParentIdx !== -1) {
              const newParent = { ...components[newParentIdx] };
              newParent.children = [...(newParent.children || [])];
              newParent.children.splice(newIndex, 0, id);
              components[newParentIdx] = newParent;
            }
          }

          return { ...state, schema: { ...state.schema, components } };
        }
      }

      // 更新节点的 parentId
      const nodeIdx = components.findIndex((c) => c.id === id);
      components[nodeIdx] = { ...node, parentId: newParentId };

      // 添加到新父组件
      if (newParentId) {
        const newParentIdx = components.findIndex((c) => c.id === newParentId);
        if (newParentIdx !== -1) {
          const newParent = { ...components[newParentIdx] };
          newParent.children = [...(newParent.children || [])];
          newParent.children.splice(adjustedIndex, 0, id);
          components[newParentIdx] = newParent;
        }
      }

      return { ...state, schema: { ...state.schema, components } };
    }

    case 'SELECT_COMPONENT':
      return { ...state, selectedComponentId: action.payload };

    case 'SET_DRAGGING':
      return { ...state, draggingType: action.payload };

    case 'SET_PREVIEW_MODE':
      return { ...state, previewMode: action.payload };

    case 'SET_PREVIEW_DEVICE':
      return { ...state, previewDevice: action.payload };

    case 'SET_LIBRARY':
      return { ...state, currentLibrary: action.payload };

    case 'SET_SEARCH':
      return { ...state, searchKeyword: action.payload };

    case 'UPDATE_THEME': {
      const newSchema = {
        ...state.schema,
        theme: { ...state.schema.theme, ...action.payload } as ThemeConfig,
      };
      return { ...state, schema: newSchema };
    }

    case 'UPDATE_LAYOUT': {
      return { ...state, schema: { ...state.schema, layout: action.payload } };
    }

    case 'UPDATE_PAGE_META': {
      return { ...state, schema: { ...state.schema, ...action.payload } };
    }

    case 'UPDATE_PAGE_WATERMARK': {
      return { ...state, schema: { ...state.schema, watermark: action.payload } };
    }

    default:
      return state;
  }
}

/** 补全组件缺失的 name 字段 */
function backfillComponentNames(components: ComponentNode[]): ComponentNode[] {
  let hasChange = false;
  // 逐个处理，已处理的加入列表供后续生成参考
  const processed: ComponentNode[] = [];

  for (const c of components) {
    if (c.name) {
      processed.push(c);
    } else {
      hasChange = true;
      const name = generateComponentName(c.type, processed);
      processed.push({ ...c, name });
    }
  }

  return hasChange ? processed : components;
}

/** 创建初始状态 */
export function createInitialDesignerState(schema?: PageSchema): DesignerState {
  const defaultSchema: PageSchema = {
    pageId: `page_${Date.now()}`,
    name: '新页面',
    layout: { type: 'flex', vertical: true, gap: 16 },
    components: [],
  };

  const finalSchema = schema
    ? { ...schema, components: backfillComponentNames(schema.components) }
    : defaultSchema;

  return {
    schema: finalSchema,
    selectedComponentId: null,
    draggingType: null,
    previewMode: 'design',
    previewDevice: 'web',
    currentLibrary: 'antd',
    searchKeyword: '',
  };
}
