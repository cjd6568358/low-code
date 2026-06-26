/**
 * SchemaCompiler — 基于 typescript-json-schema 的 TS → JSON Schema 编译器
 *
 * 使用 typescript-json-schema 从 TypeScript 接口生成 JSON Schema，
 * 并通过后处理注入 x-* 扩展字段（x-group / x-priority 等）。
 *
 * JSDoc 注解映射规则：
 * | JSDoc 注解        | 扩展字段              | 说明                     |
 * |-------------------|----------------------|--------------------------|
 * | @group xxx        | x-group: "xxx"       | 字段分组                 |
 * | @priority N       | x-priority: N        | 排序权重                 |
 * | @component xxx    | x-component: "xxx"   | 自定义控件               |
 * | @visible expr     | x-visible: "expr"    | 条件显隐                 |
 * | @disabled expr    | x-disabled: "expr"   | 条件禁用                 |
 * | @ignore           | （编译时丢弃）        | 属性不出现在 JSON Schema |
 * | @dictionary xxx   | x-dictionary: "xxx"  | 字典引用                 |
 * | @dataSource xxx   | x-dataSource: "xxx"  | 数据源                   |
 * | @validator xxx    | x-validator: "xxx"   | 校验规则                 |
 * | @default xxx      | default: xxx         | 默认值                   |
 */
import * as path from 'path';
import { generateSchema, getProgramFromFiles } from 'typescript-json-schema';
import type { Args } from 'typescript-json-schema';
import type { JSONSchema7 } from '@low-code/shared';

/** 编译选项 */
export interface CompileOptions {
  /** TypeScript 项目根目录（用于解析 paths），默认仓库根目录 */
  basePath?: string;
  /** 额外的 tsconfig paths */
  paths?: Record<string, string[]>;
}

/** 需要映射为 x-* 前缀的 JSDoc 标签名 */
const X_PREFIX_TAGS = new Set([
  'group', 'priority', 'component', 'visible', 'disabled',
  'dictionary', 'dataSource', 'validator', 'validator-message',
  'placeholder', 'layout', 'layout-mode', 'decorator',
  'no-binding', 'value-type', 'enumLabels',
]);

/** typescript-json-schema 需识别的额外关键字（不带 x- 前缀） */
const PASSTHROUGH_KEYWORDS = new Set(['default']);

/** typescript-json-schema 默认参数 */
const DEFAULT_ARGS: Partial<Args> = {
  ref: false,
  topRef: false,
  required: false,
  titles: false,
  defaultProps: false,
  noExtraProps: false,
  propOrder: true,
  typeOfKeyword: false,
  validationKeywords: [...X_PREFIX_TAGS, ...PASSTHROUGH_KEYWORDS],
};

/**
 * TS → JSON Schema 编译器
 *
 * 封装 typescript-json-schema，提供：
 * - 单接口编译（compileInterface）
 * - 文件全接口编译（compileFile）
 * - 自动后处理（x-* 字段注入、React 类型简化）
 */
export class SchemaCompiler {
  private basePath: string;
  private paths: Record<string, string[]>;

  constructor(options: CompileOptions = {}) {
    this.basePath = options.basePath || path.resolve(__dirname, '../../..');
    this.paths = {
      '@low-code/shared': ['packages/shared/src'],
      ...options.paths,
    };
  }

  /**
   * 编译单个接口为 JSON Schema
   *
   * @param sourceFile — 源文件绝对路径
   * @param interfaceName — 接口名称（如 "ButtonProps"）
   * @returns 后处理过的 JSON Schema
   */
  compileInterface(sourceFile: string, interfaceName: string): JSONSchema7 {
    const program = this.createProgram(sourceFile);
    const schema = generateSchema(program, interfaceName, DEFAULT_ARGS, [sourceFile]);

    if (!schema) {
      throw new Error(`Failed to compile interface "${interfaceName}" from ${sourceFile}`);
    }

    return this.postProcess(schema as JSONSchema7);
  }

  /**
   * 编译文件中所有导出的 *Props 接口
   *
   * @param sourceFile — 源文件绝对路径
   * @returns 接口名 → JSON Schema 的映射
   */
  compileFile(sourceFile: string): Map<string, JSONSchema7> {
    const program = this.createProgram(sourceFile);

    // 获取文件中导出的符号
    const sourceFileObj = program.getSourceFile(sourceFile);
    if (!sourceFileObj) {
      throw new Error(`Source file not found: ${sourceFile}`);
    }

    const typeChecker = program.getTypeChecker();
    const symbol = typeChecker.getSymbolAtLocation(sourceFileObj);
    if (!symbol) {
      return new Map();
    }

    const results = new Map<string, JSONSchema7>();
    const exports = typeChecker.getExportsOfModule(symbol);

    for (const exp of exports) {
      const name = exp.getName();
      // 只处理 *Props 接口
      if (!name.endsWith('Props')) continue;

      try {
        const schema = generateSchema(program, name, DEFAULT_ARGS, [sourceFile]);
        if (schema) {
          results.set(name, this.postProcess(schema as JSONSchema7));
        }
      } catch {
        // 跳过编译失败的接口
      }
    }

    return results;
  }

  /**
   * 创建 TypeScript Program
   */
  private createProgram(sourceFile: string) {
    const compilerOptions: Record<string, unknown> = {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      baseUrl: this.basePath,
      paths: this.paths,
    };

    return getProgramFromFiles([sourceFile], compilerOptions, this.basePath);
  }

  /**
   * 后处理：将 typescript-json-schema 输出转换为目标格式
   *
   * 变换规则：
   * 1. 移除顶层 $schema
   * 2. description → title
   * 3. group → x-group, priority → x-priority
   * 4. React 类型引用（$ref）→ 转为 string
   * 5. CSSProperties 展开 → 简化为 {type: "object"}
   * 6. 移除 definitions
   * 注：@ignore 属性在 generateSchema 阶段已被 typescript-json-schema 丢弃
   */
  private postProcess(schema: JSONSchema7): JSONSchema7 {
    const result = { ...schema };

    // 移除顶层 $schema 和 propertyOrder
    delete (result as Record<string, unknown>)['$schema'];
    delete (result as Record<string, unknown>)['propertyOrder'];

    // 处理 properties
    if (result.properties) {
      const processed: Record<string, JSONSchema7> = {};
      for (const [key, prop] of Object.entries(result.properties)) {
        processed[key] = this.postProcessProperty(prop as JSONSchema7);
      }
      result.properties = processed;
    }

    // 移除 definitions（React 类型定义等）
    delete (result as Record<string, unknown>)['definitions'];

    return result;
  }

  /**
   * 后处理单个属性
   */
  private postProcessProperty(prop: JSONSchema7): JSONSchema7 {
    const result: Record<string, unknown> = {};

    // 处理 $ref（React 类型引用 → 转为 string）
    if (prop.$ref) {
      if (prop.$ref.includes('React.ReactNode') || prop.$ref.includes('ReactElement')) {
        result.type = 'string';
      } else if (prop.$ref.includes('CSSProperties')) {
        result.type = 'object';
      } else {
        // 其他 $ref，保留 description 但不保留 $ref
        result.type = 'string';
      }
    } else {
      // 非 $ref 类型：保留基础 JSON Schema 字段
      if (prop.type !== undefined) result.type = prop.type;
      if (prop.enum !== undefined) result.enum = prop.enum;
      if (prop.anyOf !== undefined) result.anyOf = prop.anyOf;
      if (prop.oneOf !== undefined) result.oneOf = prop.oneOf;
      if (prop.allOf !== undefined) result.allOf = prop.allOf;
    }

    // description → title（JSDoc 首行）
    if (prop.description) {
      result.title = prop.description;
    }

    // 映射 x-* 扩展字段
    for (const [key, value] of Object.entries(prop)) {
      if (X_PREFIX_TAGS.has(key)) {
        result[`x-${key}`] = value;
      }
    }

    // 透传标准 JSON Schema 关键字（如 @default）
    for (const key of PASSTHROUGH_KEYWORDS) {
      if (key in prop && prop[key] !== undefined) {
        result[key] = prop[key];
      }
    }

    // @enumLabels → oneOf 生成（必须在 x-* 映射之后）
    // 支持两种格式：
    //   @enumLabels 水平, 垂直           → 按 enum 索引一一对应（要求顺序一致）
    //   @enumLabels horizontal:水平, vertical:垂直  → 按 key 匹配（不受排序影响）
    if (result.enum && result['x-enumLabels']) {
      const enumValues = result.enum as unknown[];
      const rawLabels = String(result['x-enumLabels']).split(/\s*,\s*/);

      // 判断是否为 key:value 格式
      const isKeyValue = rawLabels.some(l => l.includes(':'));

      if (isKeyValue) {
        // key:value 格式 → 按 key 匹配
        const labelMap = new Map<string, string>();
        for (const item of rawLabels) {
          const colonIdx = item.indexOf(':');
          if (colonIdx >= 0) {
            labelMap.set(item.substring(0, colonIdx), item.substring(colonIdx + 1));
          }
        }
        result.oneOf = enumValues.map(val => ({
          const: val,
          title: labelMap.get(String(val)) || String(val),
        }));
      } else if (rawLabels.length === enumValues.length) {
        // 索引格式 → 按位置一一对应
        result.oneOf = enumValues.map((val, i) => ({
          const: val,
          title: rawLabels[i],
        }));
      }

      if (result.oneOf) {
        delete result.enum;
      }
      delete result['x-enumLabels'];
    }

    // 没有 x-group 的属性默认归入"基础属性"
    if (!result['x-group']) {
      result['x-group'] = '基础属性';
    }

    // 处理嵌套对象（如 CSSProperties 展开）
    if (prop.type === 'object' && prop.properties && !prop.$ref) {
      // 检测是否为 CSSProperties 展开（属性数量 > 20 表示是 CSS 属性全集）
      const propCount = Object.keys(prop.properties).length;
      if (propCount > 20) {
        // CSSProperties 展开：简化为 {type: "object"}
        result.type = 'object';
        // 不保留 properties 和 propertyOrder
      } else {
        // 普通嵌套对象：递归处理
        const nested: Record<string, JSONSchema7> = {};
        for (const [k, v] of Object.entries(prop.properties)) {
          nested[k] = this.postProcessProperty(v as JSONSchema7);
        }
        result.properties = nested;
      }
    }

    return result as JSONSchema7;
  }
}
