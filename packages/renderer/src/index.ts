// Core
export { ComponentRegistryImpl, componentRegistry } from './core/ComponentRegistry';
export { DataBindingResolver } from './core/DataBindingResolver';
export { ConditionRuleEngine } from './core/ConditionRuleEngine';
export { ActionRegistryImpl, createDefaultActionRegistry } from './core/ActionRegistry';
export { EventCompiler } from './core/EventCompiler';
export { LinkageEngine } from './core/LinkageEngine';
export { CardRenderer } from './core/CardRenderer';
export { WebAdapter, webAdapter } from './core/WebAdapter';
export { PageRenderer } from './core/Renderer';
export { ValidatorRegistryImpl, ValidationEngine } from './core/ValidationEngine';
export { FormDataContextManager } from './core/FormDataContext';
export { DataSourceManager } from './core/DataSourceManager';
export { DependencyTracker } from './core/DependencyTracker';
export { ComponentRefreshManager } from './core/ComponentRefreshManager';
export { UnifiedDependencyGraph } from './core/UnifiedDependencyGraph';
export { ServerVariableResolver } from './core/ServerVariableResolver';

// Components
export { builtinComponents } from './components/builtin';
export { antdComponents } from './components/antd-components';

// Schemas
export { componentSchemas } from './schemas';
export {
  InputPropsSchema,
  TextareaPropsSchema,
  NumberPropsSchema,
  SelectPropsSchema,
  RadioPropsSchema,
  CheckboxPropsSchema,
  SwitchPropsSchema,
  DatePickerPropsSchema,
  TimePickerPropsSchema,
  UploadPropsSchema,
  ButtonPropsSchema,
  TablePropsSchema,
  FormPropsSchema,
  CardPropsSchema,
  FlexPropsSchema,
  DividerPropsSchema,
  TabsPropsSchema,
  TextPropsSchema,
} from './schemas';
export {
  BuiltinInput,
  BuiltinTextarea,
  BuiltinNumber,
  BuiltinSelect,
  BuiltinRadio,
  BuiltinCheckbox,
  BuiltinSwitch,
  BuiltinDatePicker,
  BuiltinTimePicker,
  BuiltinUpload,
  BuiltinButton,
  BuiltinTable,
  BuiltinForm,
  BuiltinCard,
  BuiltinFlex,
  BuiltinGrid,
  BuiltinDivider,
  BuiltinTabs,
  BuiltinText,
} from './components/builtin';
export { SlotComponent } from './components/SlotComponent';
export type { SlotComponentProps } from './components/SlotComponent';

// Mock
export { sampleFormSchema, sampleDashboardSchema } from './mock/sampleSchema';
export {
  COMPONENT_TYPES,
  COMPONENT_LIBRARIES,
  LAYOUT_TYPES,
  DEVICE_TYPES,
  ACTION_TYPES,
  CONDITION_OPERATORS,
  LINKAGE_TYPES,
  FIELD_TYPES,
  FORMAT_FIELD_TYPES,
  FORM_CONTROL_TYPES,
  getMockDictionary,
  getDictionaryCodes,
} from './mock/dictionaries';

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
export { ConditionBuilder } from './designer/panels/ConditionBuilder';
export { EventActionChainEditor } from './designer/panels/EventActionChainEditor';
export { SaveCardDialog } from './designer/panels/SaveCardDialog';
export { VariablePicker } from './designer/panels/VariablePicker';

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
  PageRule,
  RenderContext,
  ActionChain,
  ActionStep,
  ActionExecutor,
  ActionContext,
  ComponentRegistration,
  ThemeConfig,
  PlatformAdapter,
  CustomCardDefinition,
  CardInterface,
  PropBinding,
  SlotDefinition,
  EventDefinition,
  JSONSchema7,
  LinkageRule,
  FieldValidator,
  DictItem,
} from '@low-code/shared';

// Export new module types
export type { ComponentRefreshResult } from './core/ComponentRefreshManager';
export type {
  DependencyNodeType,
  DependencyNode,
  DependencyEdge,
  ChangeImpactAnalysis,
} from './core/UnifiedDependencyGraph';
export type {
  ServerVariableParseResult,
  ServerVariableUIConfig,
} from './core/ServerVariableResolver';
