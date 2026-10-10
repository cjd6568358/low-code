import type {
  CrossFieldParams,
  CrossFieldRule,
  CrossFieldValidationResult,
  CrossFieldValidatorType,
  FieldValidator,
  SyncExpressionEvaluator,
} from '@low-code/shared';

/** 校验级别 */
export type ValidationLevel = 1 | 2 | 3 | 4;

/** 校验触发时机 */
export type ValidationTrigger = 'onChange' | 'onBlur' | 'onSubmit' | 'manual';

/** 校验结果 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  level: ValidationLevel;
}

/** 校验器函数类型 */
export type ValidatorFunction = (
  value: any,
  params: Record<string, any> | undefined,
  allValues: Record<string, any>,
) => string | null | Promise<string | null>;

/** 合法 JS 标识符（表达式上下文只允许这类 key） */
const IDENTIFIER_REGEX = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** 浮点比较默认容差 */
const DEFAULT_TOLERANCE = 1e-6;

/**
 * 判断是否为「配置诊断」消息
 *
 * 这类消息描述的是规则配置/运行环境问题（而非业务校验失败），
 * 需要直接展示给用户，优先级高于规则里填写的通用提示文案。
 *
 * @param message 校验器返回的消息
 * @returns 是否为配置诊断消息
 */
function isDiagnosticMessage(message: string): boolean {
  return (
    message.startsWith('未注册的校验器')
    || message.startsWith('未注入表达式引擎')
    || message.startsWith('缺少校验表达式')
    || message.startsWith('表达式求值失败')
    || message.startsWith('合计校验缺少参数配置')
    || message.startsWith('跨字段校验器不支持异步返回')
    || message.includes('格式无法比较')
    || message.includes('不是数组，无法求和')
  );
}

/**
 * 判断值是否为空
 *
 * 与 antd 语义一致：`null` / `undefined` / 空字符串 / 空数组 视为空。
 *
 * @param value 待判断的值
 * @returns 是否为空
 */
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * 判断是否为合法 JS 标识符
 *
 * 表达式求值把上下文展开为函数形参，形参必须是合法标识符；
 * 组件 ID（如 `node_01`）合法，含中文/短横线的字段名会被排除。
 *
 * @param key 字段名
 * @returns 是否可作为形参
 */
function isIdentifierKey(key: string): boolean {
  return IDENTIFIER_REGEX.test(key);
}

/** 内置跨字段校验类型定义 */
export interface BuiltinCrossFieldValidator {
  /** 校验类型标识 */
  type: CrossFieldValidatorType;
  /** 显示名称 */
  label: string;
  /** 使用说明 */
  description: string;
  /** 是否必须配置自定义表达式 */
  requiresExpression: boolean;
  /** 该类型需要的额外参数（用于设计器动态渲染） */
  paramFields: Array<{ key: keyof CrossFieldParams; label: string; required: boolean }>;
}

/** 内置跨字段校验类型清单（设计器据此渲染选项） */
export const BUILTIN_CROSS_FIELD_VALIDATORS: readonly BuiltinCrossFieldValidator[] = [
  {
    type: 'dateRange',
    label: '日期区间',
    description: '要求 fields[1] 不早于 fields[0]（取前两个字段）',
    requiresExpression: false,
    paramFields: [],
  },
  {
    type: 'numberRange',
    label: '数值区间',
    description: '要求 fields[1] 不小于 fields[0]（取前两个字段）',
    requiresExpression: false,
    paramFields: [],
  },
  {
    type: 'sumEquals',
    label: '合计一致',
    description: '明细行数值求和后需等于目标字段值',
    requiresExpression: false,
    paramFields: [
      { key: 'sumField', label: '明细数组字段', required: true },
      { key: 'itemField', label: '行内数值字段', required: true },
      { key: 'totalField', label: '合计字段', required: true },
    ],
  },
  {
    type: 'notEqual',
    label: '互不相同',
    description: '参与校验的字段两两不相等',
    requiresExpression: false,
    paramFields: [],
  },
  {
    type: 'requiredAll',
    label: '要么全填要么全空',
    description: '参与校验的字段需同时有值或同时为空',
    requiresExpression: false,
    paramFields: [],
  },
  {
    type: 'requiredAny',
    label: '至少填写一个',
    description: '参与校验的字段至少有一个非空',
    requiresExpression: false,
    paramFields: [],
  },
  {
    type: 'expression',
    label: '自定义表达式',
    description: '基于表单字段值求值，返回 falsy 即校验失败',
    requiresExpression: true,
    paramFields: [],
  },
] as const;

/** 解析数值（无法解析返回 null） */
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

/** 解析时间戳（支持时间戳、Date、ISO 字符串；无法解析返回 null） */
function toTimeOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = new Date(String(value)).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * 校验器注册表
 * 文档定义四层校验：
 * Level 1: 基础同步校验（required/type/range/pattern/enum）— onChange 触发
 * Level 2: 自定义同步/异步校验器 — onBlur 触发
 * Level 3: 跨字段校验（日期范围/求和一致性）— onSubmit 触发
 * Level 4: 服务端校验 — onSubmit 触发
 */
export class ValidatorRegistryImpl {
  private validators = new Map<string, ValidatorFunction>();

  /**
   * 注册校验器
   */
  register(name: string, validator: ValidatorFunction): void {
    this.validators.set(name, validator);
  }

  /**
   * 解析校验器
   */
  resolve(name: string): ValidatorFunction | null {
    return this.validators.get(name) || null;
  }

  /**
   * 列出所有已注册校验器
   */
  list(): string[] {
    return Array.from(this.validators.keys());
  }
}

/**
 * 校验引擎
 * 执行四层校验
 */
export class ValidationEngine {
  private registry: ValidatorRegistryImpl;
  /** 表达式引擎（跨字段表达式校验使用，可选） */
  private expressionEngine?: SyncExpressionEvaluator;
  /** 表单级校验器是否已注册（懒加载，避免无表单场景污染注册表） */
  private formValidatorsReady = false;

  /**
   * @param registry 校验器注册表（缺省新建）
   * @param expressionEngine 表达式引擎（只需同步求值能力），用于 `expression` 型跨字段校验
   */
  constructor(registry?: ValidatorRegistryImpl, expressionEngine?: SyncExpressionEvaluator) {
    this.registry = registry || new ValidatorRegistryImpl();
    this.expressionEngine = expressionEngine;
    this.registerBuiltinValidators();
  }

  /**
   * 注册跨字段校验器（表单场景使用）
   *
   * 与 Level 1 字段级校验器分开，因为它们作用于「字段值数组」而非单个值，
   * 签名不同（`validateLevel3` 直接调用并收集错误）。
   */
  registerFormValidators(): void {
    if (this.formValidatorsReady) return;
    this.formValidatorsReady = true;

    for (const meta of BUILTIN_CROSS_FIELD_VALIDATORS) {
      if (meta.type === 'expression') continue; // 表达式类型由引擎直接求值
      this.registry.register(`cross_${meta.type}`, (value, params) =>
        this.runCrossFieldValidator(meta.type, value, params),
      );
    }
  }

  /**
   * 执行单个内置跨字段校验
   *
   * @param type 校验类型
   * @param value `validateLevel3` 传入的字段值数组
   * @param params 校验参数
   * @returns 错误消息，通过时返回 null
   */
  private runCrossFieldValidator(
    type: CrossFieldValidatorType,
    value: unknown,
    params?: Record<string, any>,
  ): string | null {
    const values = Array.isArray(value) ? value : [value];

    switch (type) {
      case 'dateRange':
      case 'numberRange': {
        const [left, right] = values;
        // 任一为空则不比较（空值由 required 规则负责）
        if (isEmptyValue(left) || isEmptyValue(right)) return null;

        const parse = type === 'dateRange' ? toTimeOrNull : toNumberOrNull;
        const leftNum = parse(left);
        const rightNum = parse(right);
        if (leftNum === null || rightNum === null) return '字段值格式无法比较';

        // 区间允许相等，仅右小于左时失败
        return rightNum < leftNum ? '结束值不能小于起始值' : null;
      }

      case 'notEqual': {
        // 过滤空值：空值之间的"相等"不算冲突
        const filled = values.filter(v => !isEmptyValue(v));
        const seen = new Set<string>();
        for (const item of filled) {
          const key = typeof item === 'object' ? JSON.stringify(item) : String(item);
          if (seen.has(key)) return '存在重复值';
          seen.add(key);
        }
        return null;
      }

      case 'requiredAll': {
        const filledCount = values.filter(v => !isEmptyValue(v)).length;
        if (filledCount === 0 || filledCount === values.length) return null;
        return '这些字段需要同时填写或同时留空';
      }

      case 'requiredAny': {
        return values.some(v => !isEmptyValue(v)) ? null : '至少需要填写其中一个字段';
      }

      case 'sumEquals': {
        const sumField = params?.sumField;
        const itemField = params?.itemField;
        const totalField = params?.totalField;
        if (!sumField || !itemField || !totalField) {
          return '合计校验缺少参数配置（明细字段/行内字段/合计字段）';
        }

        const rows = params?.__scope?.[sumField];
        const total = toNumberOrNull(params?.__scope?.[totalField]);
        if (total === null) return null; // 合计为空时不校验
        if (!Array.isArray(rows)) return `${sumField} 不是数组，无法求和`;

        const sum = rows.reduce<number>((acc, row) => {
          if (typeof row !== 'object' || row === null) return acc;
          return acc + (toNumberOrNull((row as Record<string, unknown>)[itemField]) ?? 0);
        }, 0);

        const tolerance = typeof params?.tolerance === 'number' ? params.tolerance : DEFAULT_TOLERANCE;
        return Math.abs(sum - total) > tolerance
          ? `合计不一致：明细求和为 ${sum}，目标值为 ${total}`
          : null;
      }

      default:
        return null;
    }
  }

  /**
   * 注册内建校验器
   */
  private registerBuiltinValidators(): void {
    // required
    this.registry.register('required', (value) => {
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
        return '此字段为必填项';
      }
      return null;
    });

    // type
    this.registry.register('type', (value, params) => {
      if (value == null || value === '') return null;
      const expectedType = params?.type;
      switch (expectedType) {
        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) return '请输入有效的数字';
          break;
        case 'integer':
          if (!Number.isInteger(Number(value))) return '请输入整数';
          break;
        case 'boolean':
          if (typeof value !== 'boolean') return '请输入布尔值';
          break;
        case 'string':
          if (typeof value !== 'string') return '请输入字符串';
          break;
      }
      return null;
    });

    // range (min/max)
    this.registry.register('range', (value, params) => {
      if (value == null || value === '') return null;
      const num = Number(value);
      if (params?.min !== undefined && num < params.min) {
        return `值不能小于 ${params.min}`;
      }
      if (params?.max !== undefined && num > params.max) {
        return `值不能大于 ${params.max}`;
      }
      return null;
    });

    // length (minLength/maxLength)
    this.registry.register('length', (value, params) => {
      if (value == null) return null;
      const str = String(value);
      if (params?.minLength !== undefined && str.length < params.minLength) {
        return `长度不能少于 ${params.minLength} 个字符`;
      }
      if (params?.maxLength !== undefined && str.length > params.maxLength) {
        return `长度不能超过 ${params.maxLength} 个字符`;
      }
      return null;
    });

    // pattern (正则)
    this.registry.register('pattern', (value, params) => {
      if (value == null || value === '') return null;
      const pattern = params?.pattern;
      if (!pattern) return null;
      const regex = new RegExp(pattern);
      if (!regex.test(String(value))) {
        return params?.message || '格式不正确';
      }
      return null;
    });

    // enum (枚举)
    this.registry.register('enum', (value, params) => {
      if (value == null || value === '') return null;
      const options = params?.options;
      if (!options || !Array.isArray(options)) return null;
      if (!options.includes(value)) {
        return `请选择有效的选项`;
      }
      return null;
    });

    // email
    this.registry.register('email', (value) => {
      if (value == null || value === '') return null;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(String(value))) return '请输入有效的邮箱地址';
      return null;
    });

    // phone
    this.registry.register('phone', (value) => {
      if (value == null || value === '') return null;
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(String(value))) return '请输入有效的手机号码';
      return null;
    });

    // url
    this.registry.register('url', (value) => {
      if (value == null || value === '') return null;
      try {
        new URL(String(value));
        return null;
      } catch {
        return '请输入有效的 URL';
      }
    });

    // idcard
    this.registry.register('idcard', (value) => {
      if (value == null || value === '') return null;
      const idRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
      if (!idRegex.test(String(value))) return '请输入有效的身份证号码';
      return null;
    });
  }

  /**
   * Level 1: 基础同步校验（onChange 触发）
   * 校验 required, type, range, pattern, enum
   */
  async validateLevel1(
    field: string,
    value: any,
    fieldSchema: Record<string, any>,
    allValues: Record<string, any>,
  ): Promise<string | null> {
    const check = async (name: string, params?: Record<string, any>): Promise<string | null> => {
      const fn = this.registry.resolve(name);
      if (!fn) return null;
      const result = await fn(value, params, allValues);
      return result ? this.formatMessage(result, field, fieldSchema) : null;
    };

    // required
    if (fieldSchema.required) {
      const error = await check('required');
      if (error) return error;
    }

    if (value == null || value === '') return null;

    // type
    if (fieldSchema.type) {
      const error = await check('type', { type: fieldSchema.type });
      if (error) return error;
    }

    // range
    if (fieldSchema.minimum !== undefined || fieldSchema.maximum !== undefined) {
      const error = await check('range', { min: fieldSchema.minimum, max: fieldSchema.maximum });
      if (error) return error;
    }

    // length
    if (fieldSchema.minLength !== undefined || fieldSchema.maxLength !== undefined) {
      const error = await check('length', { minLength: fieldSchema.minLength, maxLength: fieldSchema.maxLength });
      if (error) return error;
    }

    // pattern
    if (fieldSchema.pattern) {
      const error = await check('pattern', { pattern: fieldSchema.pattern, message: fieldSchema['x-validator-message'] });
      if (error) return error;
    }

    // enum（支持 oneOf 和 enum 两种格式）
    const enumValues = fieldSchema.enum
      || (fieldSchema.oneOf?.map((item: { const: unknown }) => item.const));
    if (enumValues) {
      const error = await check('enum', { options: enumValues });
      if (error) return error;
    }

    // x-validator（自定义校验器名）
    if (fieldSchema['x-validator']) {
      const validator = this.registry.resolve(fieldSchema['x-validator']);
      if (validator) {
        const result = await validator(value, undefined, allValues);
        if (result) return this.formatMessage(result, field, fieldSchema);
      }
    }

    return null;
  }

  /**
   * Level 2: 自定义同步/异步校验（onBlur 触发）
   */
  async validateLevel2(
    field: string,
    value: any,
    validators: FieldValidator[],
    allValues: Record<string, any>,
  ): Promise<string | null> {
    for (const validatorDef of validators) {
      const validator = this.registry.resolve(validatorDef.validate);
      if (!validator) continue;

      const result = await validator(value, validatorDef.params, allValues);
      if (result) {
        return this.formatMessage(validatorDef.message || result, field, {});
      }
    }
    return null;
  }

  /**
   * Level 3: 跨字段校验（onSubmit 触发）
   *
   * 三条执行路径：
   * 1. `validator='expression'` → 用表达式引擎求值 `rule.expression`，返回 falsy 即失败
   * 2. `validator` 为内置类型 → 走 `cross_<type>` 已注册校验器
   * 3. `validator` 为注册表中的其他名称 → 按 `(字段值数组, params, 全部值)` 调用
   *
   * 错误统一挂到 `targetField`（缺省 `fields[0]`），便于回写 antd Form 字段错误。
   *
   * @param allValues 表单全部字段值
   * @param rules 跨字段规则列表
   * @returns 校验结果（含字段级错误映射）
   */
  validateLevel3(
    allValues: Record<string, any>,
    rules: CrossFieldRule[],
  ): CrossFieldValidationResult {
    this.registerFormValidators();

    const errors: Record<string, string[]> = {};

    for (const rule of rules) {
      const internalMessage = this.evaluateCrossFieldRule(rule, allValues);
      if (!internalMessage) continue;

      // 配置类诊断（缺少表达式/未注册校验器/表达式求值异常）优先于用户填写的通用提示，
      // 否则「未注入表达式引擎」这类问题会被 rule.message 掩盖，设计期难以发现。
      const displayMessage = isDiagnosticMessage(internalMessage)
        ? internalMessage
        : (rule.message || internalMessage);

      const targetField = rule.targetField || rule.fields[0];
      if (!targetField) continue;
      if (!errors[targetField]) errors[targetField] = [];
      errors[targetField].push(displayMessage);
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * 求值单条跨字段规则
   *
   * @param rule 跨字段规则
   * @param allValues 表单全部字段值
   * @returns 错误消息（通过时返回 null）
   */
  private evaluateCrossFieldRule(
    rule: CrossFieldRule,
    allValues: Record<string, any>,
  ): string | null {
    // 1. 自定义表达式
    if (rule.validator === 'expression' || (!rule.validator && rule.expression)) {
      if (!rule.expression) return '缺少校验表达式';
      if (!this.expressionEngine) return '未注入表达式引擎，无法执行表达式校验';

      const scope = this.buildExpressionScope(rule.fields, allValues);
      try {
        const result = this.expressionEngine.safeEvaluateSync(rule.expression, scope);
        return result ? null : (rule.message || '表达式校验未通过');
      } catch (error) {
        // 表达式写错时不应吞掉：报为校验失败并保留原始信息，便于设计期发现问题
        return `表达式求值失败：${error instanceof Error ? error.message : String(error)}`;
      }
    }

    if (!rule.validator) return '未指定校验类型';

    const validatorName = this.registry.resolve(`cross_${rule.validator}`)
      ? `cross_${rule.validator}`
      : rule.validator;
    const validator = this.registry.resolve(validatorName);
    if (!validator) return `未注册的校验器：${rule.validator}`;

    const values = rule.fields.map(f => allValues[f]);
    // __scope 供 sumEquals 之类的校验读取完整表单值
    const params = { ...(rule.params ?? {}), __scope: allValues };
    const result = validator(values, params, allValues);

    // 内置跨字段校验器为同步实现；Promise 结果无法在同步流程中使用，此处按未通过处理
    if (result instanceof Promise) {
      return '跨字段校验器不支持异步返回';
    }
    return result;
  }

  /**
   * 构建表达式作用域
   *
   * 把参与字段的值以「字段 ID」为 key 暴露给表达式，
   * 同时过滤非法标识符 key（表达式会被编译为函数形参）。
   *
   * @param fields 参与字段名
   * @param allValues 表单全部字段值
   * @returns 可用于表达式求值的作用域
   */
  private buildExpressionScope(
    fields: string[],
    allValues: Record<string, any>,
  ): Record<string, unknown> {
    const scope: Record<string, unknown> = {};

    // 全部字段（仅合法标识符），表达式可引用任意字段
    for (const [key, value] of Object.entries(allValues)) {
      if (isIdentifierKey(key)) scope[key] = value;
    }

    // 显式声明参与字段，保证即使字段名为非法标识符也能通过 `fields` 数组访问。
    // 注意顺序：必须放在字段展开之后，避免表单里存在名为 fields 的字段时覆盖该别名。
    scope.fields = fields.map(f => allValues[f]);
    const scopedFields: Record<string, unknown> = {};
    for (const f of fields) scopedFields[f] = allValues[f];
    scope.f = scopedFields;

    return scope;
  }

  /**
   * Level 4: 服务端校验（onSubmit 触发）
   */
  async validateLevel4(
    apiRequest: (config: any) => Promise<any>,
    validationApi: string,
    allValues: Record<string, any>,
  ): Promise<Record<string, string[]>> {
    const errors: Record<string, string[]> = {};

    try {
      const response = await apiRequest({
        url: validationApi,
        method: 'POST',
        data: allValues,
      });

      const serverErrors = response?.data?.errors || response?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        for (const [field, messages] of Object.entries(serverErrors)) {
          errors[field] = Array.isArray(messages) ? messages.map(String) : [String(messages)];
        }
      }
    } catch (e) {
      console.warn('Server validation failed:', e);
    }

    return errors;
  }

  /**
   * 完整校验（提交时执行 Level 1-4）
   *
   * @param fields 待校验字段（含各自的 Schema 与自定义校验器）
   * @param allValues 表单全部字段值
   * @param options 跨字段规则与服务端校验配置
   * @returns 汇总校验结果
   */
  async validate(
    fields: Array<{
      field: string;
      schema: Record<string, any>;
      customValidators?: FieldValidator[];
    }>,
    allValues: Record<string, any>,
    options?: {
      /** Level 3 跨字段规则 */
      crossFieldRules?: CrossFieldRule[];
      /** Level 4 服务端校验接口地址 */
      validationApi?: string;
      /** Level 4 请求函数 */
      apiRequest?: (config: any) => Promise<any>;
    },
  ): Promise<ValidationResult> {
    const errors: Record<string, string[]> = {};

    // Level 1: 基础同步校验
    for (const { field, schema } of fields) {
      const error = await this.validateLevel1(field, allValues[field], schema, allValues);
      if (error) {
        if (!errors[field]) errors[field] = [];
        errors[field].push(error);
      }
    }

    // Level 2: 自定义校验
    for (const { field, customValidators } of fields) {
      if (customValidators && customValidators.length > 0) {
        const error = await this.validateLevel2(field, allValues[field], customValidators, allValues);
        if (error) {
          if (!errors[field]) errors[field] = [];
          errors[field].push(error);
        }
      }
    }

    // Level 3: 跨字段校验
    if (options?.crossFieldRules && options.crossFieldRules.length > 0) {
      const crossResult = this.validateLevel3(allValues, options.crossFieldRules);
      for (const [field, msgs] of Object.entries(crossResult.errors)) {
        if (!errors[field]) errors[field] = [];
        errors[field].push(...msgs);
      }
    }

    // Level 4: 服务端校验
    if (options?.validationApi && options?.apiRequest) {
      const serverErrors = await this.validateLevel4(
        options.apiRequest,
        options.validationApi,
        allValues,
      );
      for (const [field, msgs] of Object.entries(serverErrors)) {
        if (!errors[field]) errors[field] = [];
        errors[field].push(...msgs);
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      level: this.resolveFailedLevel(options),
    };
  }

  /**
   * 推断失败所处的最高校验级别（用于错误分级展示）
   *
   * @param options 本次校验使用的配置
   * @returns 已启用的最高级别
   */
  private resolveFailedLevel(options?: {
    crossFieldRules?: CrossFieldRule[];
    validationApi?: string;
  }): ValidationLevel {
    if (options?.validationApi) return 4;
    if (options?.crossFieldRules && options.crossFieldRules.length > 0) return 3;
    return 1;
  }

  /**
   * 格式化错误消息（支持 {{field}} 占位符）
   */
  private formatMessage(message: string, field: string, schema: Record<string, any>): string {
    return message
      .replace(/\{\{field\}\}/g, schema.title || field)
      .replace(/\{\{min\}\}/g, String(schema.minimum ?? ''))
      .replace(/\{\{max\}\}/g, String(schema.maximum ?? ''));
  }

  /**
   * 获取注册表实例
   */
  getRegistry(): ValidatorRegistryImpl {
    return this.registry;
  }

  /**
   * 注入表达式引擎（用于跨字段表达式校验）
   *
   * 允许在构造后注入，避免 `ValidationEngine` 与表达式引擎产生循环依赖。
   *
   * @param engine 表达式引擎
   */
  setExpressionEngine(engine: SyncExpressionEvaluator): void {
    this.expressionEngine = engine;
  }
}
