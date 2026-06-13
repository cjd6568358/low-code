import type { FieldValidator } from '@low-code/shared';

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

  constructor(registry?: ValidatorRegistryImpl) {
    this.registry = registry || new ValidatorRegistryImpl();
    this.registerBuiltinValidators();
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

    // enum
    if (fieldSchema.enum) {
      const error = await check('enum', { options: fieldSchema.enum });
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
   */
  validateLevel3(
    allValues: Record<string, any>,
    crossFieldRules: Array<{
      fields: string[];
      validator: string;
      message: string;
      params?: Record<string, any>;
    }>,
  ): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    for (const rule of crossFieldRules) {
      const validator = this.registry.resolve(rule.validator);
      if (!validator) continue;

      const values = rule.fields.map((f) => allValues[f]);
      const error = validator(values, rule.params, allValues);
      if (error) {
        for (const field of rule.fields) {
          if (!errors[field]) errors[field] = [];
          errors[field].push(rule.message || String(error));
        }
      }
    }

    return errors;
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
   */
  async validate(
    fields: Array<{
      field: string;
      schema: Record<string, any>;
      customValidators?: FieldValidator[];
    }>,
    allValues: Record<string, any>,
    options?: {
      crossFieldRules?: Array<{
        fields: string[];
        validator: string;
        message: string;
        params?: Record<string, any>;
      }>;
      validationApi?: string;
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
    if (options?.crossFieldRules) {
      const crossErrors = this.validateLevel3(allValues, options.crossFieldRules);
      for (const [field, msgs] of Object.entries(crossErrors)) {
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
      level: Object.keys(errors).length > 0 ? 1 : 4,
    };
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
}
