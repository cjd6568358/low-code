/** 表单运行时上下文 */
export interface FormDataContext {
  values: Record<string, any>;
  initialValues: Record<string, any>;
  source: 'new' | 'edit' | 'draft' | 'snapshot';
  meta: {
    recordId?: string;
    draftId?: string;
    snapshotId?: string;
    formId: string;
    loadedAt: number;
  };
}

/** 联动规则 */
export interface LinkageRule {
  id: string;
  triggerField: string;
  targetField: string;
  type: 'value' | 'options' | 'visible' | 'disabled' | 'required' | 'attribute';
  rule: ValueRule | OptionsRule | VisibleRule | DisabledRule | RequiredRule | AttributeRule;
}

export interface ValueRule {
  mode: 'map' | 'expression' | 'conditional' | 'query';
  map?: Record<string, any>;
  expression?: string;
  branches?: ConditionalBranch[];
  default?: any;
  queryConfig?: {
    api: string;
    params?: Record<string, string>;
    resultField?: string;
  };
}

export interface ConditionalBranch {
  condition: string;
  value: any;
  valueType?: 'literal' | 'expression' | 'variable';
}

export interface OptionsRule {
  source: 'static' | 'api' | 'dependent';
  staticOptions?: Array<{ label: string; value: any }>;
  api?: string;
  dependsOn?: string;
}

export interface VisibleRule {
  condition: string;
}

export interface DisabledRule {
  condition: string;
}

export interface RequiredRule {
  condition: string;
}

export interface AttributeRule {
  attribute: string;
  condition: string;
  value: any;
}

/** 校验器注册项 */
export interface FieldValidator {
  name: string;
  validate: string;
  message: string;
  params?: Record<string, any>;
}

/** 校验器注册表 */
export interface ValidatorRegistry {
  register(name: string, validator: FieldValidator): void;
  resolve(name: string): FieldValidator | null;
}
