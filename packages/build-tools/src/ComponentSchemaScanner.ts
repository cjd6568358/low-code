import * as fs from 'fs';
import * as path from 'path';
import type { JSONSchema7 } from '@low-code/shared';
import { TsToSchemaCompiler } from './TsToSchemaCompiler';

/** 扫描结果 */
export interface ScanResult {
  /** 组件类型标识 */
  type: string;
  /** 接口名称 */
  interfaceName: string;
  /** 源文件路径 */
  sourceFile: string;
  /** 编译产物 JSON Schema */
  schema: JSONSchema7;
  /** 产物输出路径 */
  outputPath: string;
}

/** 扫描器配置 */
export interface ScannerConfig {
  /** 组件源目录 */
  sourceDir: string;
  /** 产物输出目录 */
  outputDir: string;
  /** Props 接口名称模式（默认匹配 *Props） */
  interfacePattern?: RegExp;
  /** 是否包含子目录 */
  recursive?: boolean;
  /** 排除的目录/文件 */
  exclude?: string[];
}

/**
 * 组件 Schema 扫描器
 *
 * 文档定义的产物存储规范：
 * ```
 * Platform/                           # 平台内置资源（只读，随平台发布）
 * ├── components/                     # 内置组件
 * │   ├── input/
 * │   │   ├── component.js            # 组件实现
 * │   │   └── propsSchema.json        # 编译产物：属性 JSON Schema
 * │   ├── select/
 * │   │   ├── component.js
 * │   │   └── propsSchema.json
 * │   └── ...
 *
 * App/                                # 租户应用资源（可导出/导入）
 * ├── {appId}/
 * │   ├── components/                 # 自定义组件/卡片
 * │   │   ├── card_customer_summary/
 * │   │   │   ├── definition.json     # 卡片定义
 * │   │   │   └── propsSchema.json    # 编译产物：暴露属性 JSON Schema
 * ```
 */
export class ComponentSchemaScanner {
  private compiler: TsToSchemaCompiler;
  private config: ScannerConfig;

  constructor(config: ScannerConfig) {
    this.config = {
      interfacePattern: /Props$/,
      recursive: true,
      exclude: ['node_modules', 'dist', '__tests__', '*.test.ts', '*.spec.ts'],
      ...config,
    };
    this.compiler = new TsToSchemaCompiler();
  }

  /**
   * 扫描组件目录，批量编译 Props 接口为 JSON Schema
   */
  scan(): ScanResult[] {
    const results: ScanResult[] = [];
    const files = this.findTypeScriptFiles(this.config.sourceDir);

    for (const file of files) {
      try {
        const fileResults = this.processFile(file);
        results.push(...fileResults);
      } catch (e) {
        console.warn(`Failed to process ${file}:`, e);
      }
    }

    return results;
  }

  /**
   * 扫描并输出到文件
   */
  scanAndWrite(): ScanResult[] {
    const results = this.scan();

    for (const result of results) {
      this.writeSchema(result);
    }

    return results;
  }

  /**
   * 处理单个文件
   */
  private processFile(filePath: string): ScanResult[] {
    const results: ScanResult[] = [];

    // 编译文件中的所有导出接口
    const schemas = this.compiler.compileFile(filePath);

    for (const [interfaceName, schema] of schemas) {
      // 只处理匹配模式的接口（如 *Props）
      if (!this.config.interfacePattern!.test(interfaceName)) {
        continue;
      }

      // 推导组件类型标识
      const type = this.deriveComponentType(filePath, interfaceName);

      // 计算输出路径
      const outputPath = this.getOutputPath(filePath, type);

      results.push({
        type,
        interfaceName,
        sourceFile: filePath,
        schema,
        outputPath,
      });
    }

    return results;
  }

  /**
   * 推导组件类型标识
   * 从文件路径和接口名推导：
   * - packages/renderer/src/components/input/InputProps.ts → input
   * - components/select/SelectProps.ts → select
   */
  private deriveComponentType(filePath: string, interfaceName: string): string {
    // 从接口名推导：InputProps → input, DatePickerProps → datepicker
    const baseName = interfaceName.replace(/Props$/, '');
    return this.camelToKebab(baseName);
  }

  /**
   * 计算输出路径
   */
  private getOutputPath(sourceFile: string, type: string): string {
    // 保持目录结构，替换 .ts 为 propsSchema.json
    const relativePath = path.relative(this.config.sourceDir, sourceFile);
    const dir = path.dirname(relativePath);
    return path.join(this.config.outputDir, dir, type, 'propsSchema.json');
  }

  /**
   * 写入 Schema 到文件
   */
  private writeSchema(result: ScanResult): void {
    const dir = path.dirname(result.outputPath);

    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 写入 JSON
    const json = JSON.stringify(result.schema, null, 2);
    fs.writeFileSync(result.outputPath, json, 'utf-8');

    console.log(`  ✓ ${result.type} → ${result.outputPath}`);
  }

  /**
   * 递归查找 TypeScript 文件
   */
  private findTypeScriptFiles(dir: string): string[] {
    const results: string[] = [];

    if (!fs.existsSync(dir)) {
      return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // 排除
      if (this.shouldExclude(entry.name)) {
        continue;
      }

      if (entry.isDirectory() && this.config.recursive) {
        results.push(...this.findTypeScriptFiles(fullPath));
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * 检查是否应排除
   */
  private shouldExclude(name: string): boolean {
    return this.config.exclude!.some((pattern) => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(name);
      }
      return name === pattern;
    });
  }

  /**
   * camelCase 转 kebab-case
   */
  private camelToKebab(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
  }
}
