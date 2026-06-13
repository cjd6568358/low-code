import * as ts from 'typescript';
import type { JSONSchema7 } from '@low-code/shared';

/**
 * JSDoc 注解 → x-* 扩展字段映射规则
 *
 * 文档定义：
 * | JSDoc 注解        | 扩展字段           | 说明       |
 * |-------------------|-------------------|-----------|
 * | @group xxx        | x-group: "xxx"    | 字段分组   |
 * | @priority N       | x-priority: N     | 排序权重   |
 * | @component xxx    | x-component: "xxx"| 自定义控件 |
 * | @visible expr     | x-visible: "expr" | 条件显隐   |
 * | @disabled expr    | x-disabled: "expr"| 条件禁用   |
 * | @hidden           | x-hidden: true    | 强制隐藏   |
 * | @dictionary xxx   | x-dictionary: "xxx"| 字典引用  |
 * | @dataSource xxx   | x-dataSource: "xxx"| 变量绑定数据源 |
 * | @validator xxx    | x-validator: "xxx"| 校验规则   |
 */
const JSDOC_TO_X_EXTENSION: Record<string, { field: string; transform?: (value: string) => any }> = {
  group: { field: 'x-group' },
  priority: { field: 'x-priority', transform: (v) => parseInt(v, 10) },
  component: { field: 'x-component' },
  visible: { field: 'x-visible' },
  disabled: { field: 'x-disabled' },
  hidden: { field: 'x-hidden', transform: () => true },
  dictionary: { field: 'x-dictionary' },
  dataSource: { field: 'x-dataSource' },
  validator: { field: 'x-validator' },
  'validator-message': { field: 'x-validator-message' },
  placeholder: { field: 'x-placeholder' },
  layout: { field: 'x-layout' },
  'layout-mode': { field: 'x-layout-mode' },
  decorator: { field: 'x-decorator' },
};

/** 编译选项 */
export interface CompileOptions {
  /** TypeScript 配置文件路径 */
  tsconfigPath?: string;
  /** 编译器选项 */
  compilerOptions?: ts.CompilerOptions;
  /** 是否包含继承的属性 */
  includeInherited?: boolean;
  /** 输出格式化缩进 */
  indent?: number;
}

/**
 * TS → JSON Schema 编译器
 *
 * 读取组件的 TypeScript Props 接口定义，
 * 自动转为 JSON Schema 并注入 x-* 扩展字段。
 *
 * 文档定义的工作流程：
 * 组件 TS 类型定义 (Props Interface)
 *     → TS → JSON Schema 转换 (ts-json-schema-generator)
 *     → 注入 x-group / x-priority 等扩展字段
 *     → 注册到自动渲染引擎 → 自动渲染为属性配置表单
 */
export class TsToSchemaCompiler {
  private program: ts.Program | null = null;
  private checker: ts.TypeChecker | null = null;

  /**
   * 编译单个接口为 JSON Schema
   */
  compileInterface(
    sourceFile: string,
    interfaceName: string,
    options: CompileOptions = {},
  ): JSONSchema7 {
    this.initProgram(sourceFile, options);

    const source = this.program!.getSourceFile(sourceFile);
    if (!source) {
      throw new Error(`Source file not found: ${sourceFile}`);
    }

    // 查找接口声明
    const interfaceDecl = this.findInterface(source, interfaceName);
    if (!interfaceDecl) {
      throw new Error(`Interface "${interfaceName}" not found in ${sourceFile}`);
    }

    const type = this.checker!.getTypeAtLocation(interfaceDecl);
    return this.convertTypeToSchema(type, interfaceDecl);
  }

  /**
   * 编译文件中的所有导出接口
   */
  compileFile(
    sourceFile: string,
    options: CompileOptions = {},
  ): Map<string, JSONSchema7> {
    this.initProgram(sourceFile, options);

    const source = this.program!.getSourceFile(sourceFile);
    if (!source) {
      throw new Error(`Source file not found: ${sourceFile}`);
    }

    const results = new Map<string, JSONSchema7>();

    ts.forEachChild(source, (node) => {
      if (ts.isInterfaceDeclaration(node) && this.isExported(node)) {
        const name = node.name.text;
        const type = this.checker!.getTypeAtLocation(node);
        results.set(name, this.convertTypeToSchema(type, node));
      }
    });

    return results;
  }

  /**
   * 初始化 TypeScript 程序
   */
  private initProgram(sourceFile: string, options: CompileOptions): void {
    const compilerOptions: ts.CompilerOptions = options.compilerOptions || {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: true,
    };

    this.program = ts.createProgram([sourceFile], compilerOptions);
    this.checker = this.program.getTypeChecker();
  }

  /**
   * 查找接口声明
   */
  private findInterface(source: ts.SourceFile, name: string): ts.InterfaceDeclaration | undefined {
    let result: ts.InterfaceDeclaration | undefined;

    ts.forEachChild(source, (node) => {
      if (ts.isInterfaceDeclaration(node) && node.name.text === name) {
        result = node;
      }
    });

    return result;
  }

  /**
   * 检查是否导出
   */
  private isExported(node: ts.Declaration): boolean {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (modifiers) {
      return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    }
    return false;
  }

  /**
   * 将 TS 类型转换为 JSON Schema
   */
  private convertTypeToSchema(type: ts.Type, node?: ts.Declaration): JSONSchema7 {
    const schema: JSONSchema7 = { type: 'object', properties: {} };
    const required: string[] = [];

    const properties = type.getProperties();
    for (const prop of properties) {
      const propName = prop.getName();
      const propType = this.checker!.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration || node!);
      const propDeclaration = prop.valueDeclaration || prop.declarations?.[0];

      const propSchema = this.convertPropertyType(propType, propDeclaration);

      // 提取 JSDoc 注解
      if (propDeclaration) {
        this.extractJSDocExtensions(propDeclaration, propSchema);
      }

      // 检查是否必填
      if (prop.flags & ts.SymbolFlags.Optional) {
        // 可选
      } else {
        required.push(propName);
      }

      // 提取描述
      const jsdocTags = prop.getJsDocTags();
      const descriptionTag = jsdocTags.find((t) => t.name === 'description');
      if (descriptionTag?.text) {
        propSchema.description = descriptionTag.text.map((t) => t.text).join('');
      }

      // 从注释中提取 title
      if (propDeclaration) {
        const symbol = this.checker!.getSymbolAtLocation(
          ts.isPropertySignature(propDeclaration) ? propDeclaration.name : propDeclaration,
        );
        if (symbol) {
          const documentation = symbol.getDocumentationComment(this.checker!);
          if (documentation.length > 0 && !propSchema.title) {
            propSchema.title = documentation[0].text.trim();
          }
        }
      }

      schema.properties![propName] = propSchema;
    }

    if (required.length > 0) {
      schema.required = required;
    }

    return schema;
  }

  /**
   * 转换单个属性类型
   */
  private convertPropertyType(type: ts.Type, node?: ts.Declaration): JSONSchema7 {
    const schema: JSONSchema7 = {};

    // 处理联合类型
    if (type.isUnion()) {
      const types = type.types;
      const nonNull = types.filter((t) => t.flags !== ts.TypeFlags.Undefined && t.flags !== ts.TypeFlags.Null);

      if (nonNull.length === 1) {
        // 可选类型（T | undefined）
        return this.convertPropertyType(nonNull[0], node);
      }

      // 检查是否为布尔联合（boolean = true | false）
      const booleanLiterals = nonNull.filter((t) => t.flags & ts.TypeFlags.BooleanLiteral);
      if (booleanLiterals.length === nonNull.length && nonNull.length === 2) {
        schema.type = 'boolean';
        return schema;
      }

      // 检查是否为字面量联合（枚举）
      const literals = nonNull.filter((t) => t.flags & ts.TypeFlags.StringLiteral);
      if (literals.length === nonNull.length) {
        schema.type = 'string';
        schema.enum = literals.map((t) => (t as ts.StringLiteralType).value);
        return schema;
      }

      const numberLiterals = nonNull.filter((t) => t.flags & ts.TypeFlags.NumberLiteral);
      if (numberLiterals.length === nonNull.length) {
        schema.type = 'number';
        schema.enum = numberLiterals.map((t) => (t as ts.NumberLiteralType).value);
        return schema;
      }

      // 混合联合类型
      schema.oneOf = nonNull.map((t) => this.convertPropertyType(t, node));
      return schema;
    }

    // 基础类型
    const flags = type.getFlags();

    if (flags & ts.TypeFlags.String) {
      schema.type = 'string';
    } else if (flags & ts.TypeFlags.Number) {
      schema.type = 'number';
    } else if (flags & ts.TypeFlags.Boolean) {
      schema.type = 'boolean';
    } else if (flags & ts.TypeFlags.Void || flags & ts.TypeFlags.Undefined || flags & ts.TypeFlags.Null) {
      // skip
    } else if (flags & ts.TypeFlags.Object) {
      const objectType = type as ts.ObjectType;

      // 数组
      if (this.checker!.isArrayType(objectType)) {
        schema.type = 'array';
        const elementType = (type as ts.TypeReference).typeArguments?.[0];
        if (elementType) {
          schema.items = this.convertPropertyType(elementType, node);
        }
      }
      // 元组
      else if (this.checker!.isTupleType(objectType)) {
        schema.type = 'array';
        const typeArgs = (type as ts.TypeReference).typeArguments;
        if (typeArgs) {
          schema.items = typeArgs.map((t) => this.convertPropertyType(t, node));
        }
      }
      // Record / Map
      else if (this.isRecordType(objectType)) {
        schema.type = 'object';
        const typeArgs = (type as ts.TypeReference).typeArguments;
        if (typeArgs && typeArgs.length >= 2) {
          schema.additionalProperties = this.convertPropertyType(typeArgs[1], node);
        }
      }
      // 函数
      else if (type.getCallSignatures().length > 0) {
        schema.type = 'string';
        schema['x-component'] = 'FunctionEditor';
      }
      // React.ReactNode
      else if (this.isReactNodeType(type)) {
        schema.type = 'string';
        schema['x-component'] = 'ComponentSelector';
      }
      // CSSProperties
      else if (this.isCSSPropertiesType(type)) {
        schema.type = 'object';
        schema['x-component'] = 'StyleEditor';
      }
      // 嵌套对象
      else {
        schema.type = 'object';
        schema.properties = {};
        for (const prop of type.getProperties()) {
          const propType = this.checker!.getTypeOfSymbolAtLocation(
            prop,
            prop.valueDeclaration || node!,
          );
          schema.properties[prop.getName()] = this.convertPropertyType(propType, prop.valueDeclaration);
        }
      }
    }

    return schema;
  }

  /**
   * 从 JSDoc 注解中提取 x-* 扩展字段
   */
  private extractJSDocExtensions(node: ts.Declaration, schema: JSONSchema7): void {
    const jsdocTags = this.getJSDocTags(node);

    for (const [tag, value] of Object.entries(jsdocTags)) {
      const mapping = JSDOC_TO_X_EXTENSION[tag];
      if (mapping) {
        const transformedValue = mapping.transform ? mapping.transform(value) : value;
        schema[mapping.field] = transformedValue;
      }
    }
  }

  /**
   * 获取节点的所有 JSDoc 标签
   */
  private getJSDocTags(node: ts.Declaration): Record<string, string> {
    const tags: Record<string, string> = {};

    const jsdoc = ts.getJSDocTags(node);
    for (const tag of jsdoc) {
      const tagName = tag.tagName.text;
      const comment = tag.comment;
      if (typeof comment === 'string') {
        tags[tagName] = comment;
      } else if (Array.isArray(comment)) {
        tags[tagName] = comment.map((c) => c.text).join('');
      }
    }

    return tags;
  }

  /**
   * 检查是否为 Record 类型
   */
  private isRecordType(type: ts.ObjectType): boolean {
    const symbol = type.getSymbol();
    if (!symbol) return false;
    const name = symbol.getName();
    return name === '__type' || name === 'Record';
  }

  /**
   * 检查是否为 React.ReactNode
   */
  private isReactNodeType(type: ts.Type): boolean {
    const symbol = type.getSymbol();
    if (!symbol) return false;
    const name = symbol.getName();
    return name === 'ReactNode' || name === 'ReactElement';
  }

  /**
   * 检查是否为 CSSProperties
   */
  private isCSSPropertiesType(type: ts.Type): boolean {
    const symbol = type.getSymbol();
    if (!symbol) return false;
    return symbol.getName() === 'CSSProperties';
  }
}
