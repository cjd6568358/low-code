/**
 * AntdTypeExtractor — 从 antd 类型定义中提取组件属性类型
 *
 * 解析 antd 组件的 .d.ts 文件，提取 value/children 等关键属性的类型，
 * 用于自动更新 schema.ts 文件。
 */
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

/** 提取的属性类型信息 */
export interface ExtractedPropType {
  /** 属性名 */
  name: string;
  /** TypeScript 类型字符串 */
  type: string;
  /** 是否可选 */
  optional: boolean;
}

/** 组件类型提取结果 */
export interface ComponentTypeExtract {
  /** 组件类型名（如 'rate'、'input'） */
  componentType: string;
  /** 提取的属性类型列表 */
  props: ExtractedPropType[];
}

/**
 * antd 类型提取器
 */
export class AntdTypeExtractor {
  private program: ts.Program;
  private typeChecker: ts.TypeChecker;
  private antdPath: string;

  constructor(antdPath?: string) {
    this.antdPath = antdPath || path.resolve(__dirname, '../../../node_modules/antd');
    const indexPath = path.join(this.antdPath, 'es/index.d.ts');

    this.program = ts.createProgram([indexPath], {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      jsx: ts.JsxEmit.React,
      skipLibCheck: true,
      declaration: true,
    });
    this.typeChecker = this.program.getTypeChecker();
  }

  /**
   * 提取单个组件的类型信息
   *
   * @param componentType 组件类型（如 'rate'、'input'）
   * @param propNames 要提取的属性名列表（默认 ['value', 'children']）
   */
  extractComponentTypes(
    componentType: string,
    propNames: string[] = ['value', 'children'],
  ): ComponentTypeExtract | null {
    // 查找组件的类型定义文件
    const componentPath = this.findComponentPath(componentType);
    if (!componentPath) {
      return null;
    }

    // 解析 Props 接口
    const propsType = this.resolvePropsType(componentPath, componentType);
    if (!propsType) {
      return null;
    }

    // 提取指定属性的类型
    const props = this.extractPropTypes(propsType, propNames);

    return {
      componentType,
      props,
    };
  }

  /**
   * 批量提取组件类型
   */
  extractBatchTypes(
    componentTypes: string[],
    propNames: string[] = ['value', 'children'],
  ): Map<string, ComponentTypeExtract> {
    const results = new Map<string, ComponentTypeExtract>();

    for (const type of componentTypes) {
      const extract = this.extractComponentTypes(type, propNames);
      if (extract) {
        results.set(type, extract);
      }
    }

    return results;
  }

  /**
   * 查找组件的类型定义文件路径
   */
  private findComponentPath(componentType: string): string | null {
    // 尝试多种路径
    const possiblePaths = [
      path.join(this.antdPath, `es/${componentType}/index.d.ts`),
      path.join(this.antdPath, `lib/${componentType}/index.d.ts`),
      path.join(this.antdPath, `es/${componentType}.d.ts`),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return null;
  }

  /**
   * 解析组件的 Props 类型
   */
  private resolvePropsType(componentPath: string, componentType: string): ts.Type | null {
    const sourceFile = this.program.getSourceFile(componentPath);
    if (!sourceFile) {
      return null;
    }

    // 查找导出的 *Props 接口
    const symbol = this.typeChecker.getSymbolAtLocation(sourceFile);
    if (!symbol) {
      return null;
    }

    const exports = this.typeChecker.getExportsOfModule(symbol);
    for (const exp of exports) {
      const name = exp.getName();
      if (name.endsWith('Props') && name !== 'RcProps') {
        const type = this.typeChecker.getDeclaredTypeOfSymbol(exp);
        return type;
      }
    }

    return null;
  }

  /**
   * 从类型中提取指定属性的类型
   */
  private extractPropTypes(propsType: ts.Type, propNames: string[]): ExtractedPropType[] {
    const results: ExtractedPropType[] = [];

    for (const propName of propNames) {
      const prop = propsType.getProperty(propName);
      if (!prop) {
        continue;
      }

      const propType = this.typeChecker.getTypeOfSymbol(prop);
      const typeString = this.typeChecker.typeToString(
        propType,
        undefined,
        ts.TypeFormatFlags.NoTruncation,
      );

      const declarations = prop.getDeclarations();
      const optional = declarations?.some(
        (d) => ts.isPropertySignature(d) && !!d.questionToken,
      ) ?? false;

      results.push({
        name: propName,
        type: typeString,
        optional,
      });
    }

    return results;
  }

  /**
   * 将提取的类型转换为 JSDoc 注解格式
   */
  static formatAsJsdoc(propType: ExtractedPropType): string {
    return `@value-type ${propType.type}`;
  }
}
