// Core
export { SchemaRegistryImpl, schemaRegistry } from './core/SchemaRegistry';
export type { SchemaRegistration } from './core/SchemaRegistry';

export { ControlRegistryImpl, controlRegistry } from './core/ControlRegistry';
export type { ControlProps, DiscriminatorConfig } from './core/ControlRegistry';

export { MockDictionaryService, dictionaryService } from './core/DictionaryService';

export { AutoFormRenderer } from './core/AutoFormRenderer';
export type { AutoFormRendererProps } from './core/AutoFormRenderer';

export { PropValueField, detectValueMode, extractDisplayValue } from './core/PropValueField';
export type { PropValueFieldProps, ValueMode } from './core/PropValueField';

// Controls — 统一使用 antd 控件
export {
  AntdAutoInput,
  AntdAutoTextarea,
  AntdAutoNumber,
  AntdAutoSwitch,
  AntdAutoSelect,
  AntdAutoDatePicker,
  AntdAutoTimePicker,
  AntdAutoCheckbox,
  AntdAutoRadio,
  registerAntdControls,
} from './controls/antd-controls';

// 兼容导出
export { registerAntdControls as registerBuiltinControls } from './controls/antd-controls';
