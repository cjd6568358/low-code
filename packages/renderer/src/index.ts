// Core
export { ComponentRegistryImpl, componentRegistry } from './core/ComponentRegistry';
export { DataBindingResolver } from './core/DataBindingResolver';
export type { ResolvedProps } from './core/DataBindingResolver';
export { ConditionRuleEngine } from './core/ConditionRuleEngine';
export { ActionRegistryImpl, createDefaultActionRegistry } from './core/ActionRegistry';
export { EventCompiler } from './core/EventCompiler';
export { LinkageEngine } from './core/LinkageEngine';
export { CardRenderer } from './core/CardRenderer';
export { WebAdapter, webAdapter } from './core/WebAdapter';
export { PageRenderer } from './core/Renderer';
export { ValidatorRegistryImpl, ValidationEngine } from './core/ValidationEngine';
export { FormDataContextManager } from './core/FormDataContext';
export { FormRegistry } from './core/FormRegistry';
export { FormRegistryContext, useFormRegistryContext } from './components/FormRegistryContext';
export type { FormRegistryContextValue } from './components/FormRegistryContext';
export { ComponentMethodRegistry } from './core/ComponentMethodRegistry';
export type { MethodHandler, MethodMeta, RegisteredMethod } from './core/ComponentMethodRegistry';
export { ComponentMethodRegistryContext, useComponentRegistryContext, useComponentMethods } from './components/ComponentMethodRegistryContext';
export type { ComponentMethodRegistryContextValue } from './components/ComponentMethodRegistryContext';
export { DataSourceManager } from './core/DataSourceManager';
export { DependencyTracker } from './core/DependencyTracker';
export { ComponentRefreshManager } from './core/ComponentRefreshManager';
export { UnifiedDependencyGraph } from './core/UnifiedDependencyGraph';
export { createQueryProxy, createTableProxy, parseFilterToCondition } from './core/QueryProxy';
export { ReactiveEnvContext } from './core/ReactiveEnvContext';
export { useBindings } from './hooks/useBindings';
export { DependencyGraphImpl, dependencyGraph as expressionDependencyGraph, extractDependencies } from './core/DependencyGraph';

// Environment & Variable Binding
export { environmentRegistry, dependencyGraph } from './core/EnvironmentRegistry';
export type {
  MonacoCompletionItem,
  CrossAppSource,
  VariableTreeNode,
  VariablePathParseResult,
  CrossAppValidationResult,
} from './core/EnvironmentRegistry';
export { RenderContextBuilder, createDefaultRenderContextBuilder } from './core/RenderContext';
export type {
  AuthService,
  PlatformAdapter as RenderPlatformAdapter,
  RouterService,
  DataSourceManager as RenderDataSourceManager,
  ServerVariableResolver as RenderServerVariableResolver, // 接口（非类），定义在 RenderContext.ts
  ComputationEngineService,
  FetchService,
  WorkflowService,
} from './core/RenderContext';
export { VariableBindingEngineImpl, variableBindingEngine } from './core/VariableBindingEngine';

// Hooks
export {
  useExpressionValue,
  useExpressionValues,
  useResolvedProps,
  isExpressionBinding,
  isVariableBinding,
} from './hooks';
export type {
  UseExpressionValueOptions,
  UseExpressionValueResult,
  WithExpressionResolverOptions,
} from './hooks';

// Components
export { MonacoEditor } from './components/MonacoEditor';
export type { MonacoEditorProps, CompletionItem } from './components/MonacoEditor';
export { SelectableTree } from './components/SelectableTree';
export type { SelectableTreeProps, TreeNodeData, SelectedKeys, SelectedKeysChange } from './components/SelectableTree';
export { VariableTree } from './components/VariableTree';
export type { VariableTreeProps, VariableTreeMultiValue } from './components/VariableTree';
export { ResolvedComponent } from './core/ResolvedComponent';
export type { ResolvedComponentProps } from './core/ResolvedComponent';

// Libraries（组件库定义：组件实现 + 分类映射 + JSON Schema）
export {
  antdComponentImpls, antdCategoryMap, antdContainerTypes, antdSchemas,
  ANTD_MANIFEST,
} from './libraries/antd';
export type { AntdComponentMeta } from './libraries/antd';
export { antdComponentMethods } from './libraries/antd/component-methods';
export { antdPlatformComponents as antdComponents } from './libraries/antd/components';
export { antdSchemas as componentSchemas } from './libraries/antd';

// Designer（页面/卡片设计器）
export { Designer } from './designer/Designer';
export type { DesignerProps } from './designer/Designer';
export { useDesigner } from './designer/core/DesignerContext';
export type { DesignerContextValue } from './designer/core/DesignerContext';
export { createInitialDesignerState, designerReducer } from './designer/core/DesignerState';
export type { DesignerState, DesignerAction } from './designer/core/DesignerState';
export { ComponentPanel } from './designer/panels/ComponentPanel';
export { DesignCanvas } from './designer/panels/DesignCanvas';
export { PropertyPanel } from './designer/panels/PropertyPanel';
export { ConditionBuilder } from './designer/panels/ConditionBuilder'; // 保留导出，供未来使用
export { EventActionChainEditor } from './designer/panels/EventActionChainEditor';
export { SaveCardDialog } from './designer/panels/SaveCardDialog';
export { VariableTreeSelector } from './components/VariableTreeSelector';
export type { VariableTreeSelectorProps, VariableTreeSelectorMultiValue } from './components/VariableTreeSelector';
export { ExpressionEditor } from './components/ExpressionEditor';
export type { ExpressionEditorProps } from './components/ExpressionEditor';
export { TypeMismatchModal } from './components/TypeMismatchModal';
export { StyleEditor } from './designer/panels/StyleEditor';
export { DataSourcePanel } from './designer/panels/DataSourcePanel';

// Workflow（流程设计器）
export { WorkflowDesigner } from './workflow/designer/WorkflowDesigner';
export type { WorkflowDesignerProps } from './workflow/designer/WorkflowDesigner';

// Re-export shared types for convenience
export type {
  PageSchema,
  ComponentNode,
  ComponentDataSource,
  ComponentApiConfig,
  ServerVariableQuery,
  LayoutConfig,
  ComponentLayout,
  DataSourceConfig,
  PageRule, // 保留导出，供未来使用
  RenderContext,
  ActionChain,
  ActionStep,
  ActionExecutor,
  ActionContext,
  ComponentRegistration,
  ComponentLibrary,
  ThemeConfig,
  PlatformAdapter,
  CustomCardDefinition,
  CardInterface,
  PropBinding,
  EventDefinition,
  JSONSchema7,
  LinkageRule,
  FieldValidator,
  DictItem,
  WatermarkConfig,
} from '@low-code/shared';

// Export new module types
export type { ComponentRefreshResult } from './core/ComponentRefreshManager';
export type {
  DependencyNodeType,
  DependencyNode,
  DependencyEdge,
  ChangeImpactAnalysis,
} from './core/UnifiedDependencyGraph';

