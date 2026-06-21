import * as fs from 'fs';
import * as path from 'path';
import type { JSONSchema7 } from '@low-code/shared';
import { SchemaCompiler } from './SchemaCompiler';

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
  /** 组件源目录（包含各组件子目录） */
  sourceDir: string;
  /** 产物输出目录（默认与 sourceDir 相同，即各组件目录下直接输出 .json） */
  outputDir?: string;
  /** Props 接口名称模式（默认匹配 *Props） */
  interfacePattern?: RegExp;
  /** 排除的目录/文件 */
  exclude?: string[];
  /** 进度回调 */
  onProgress?: (info: ProgressInfo) => void;
}

/** 进度信息 */
export interface ProgressInfo {
  /** 当前阶段 */
  phase: 'scanning' | 'compiling' | 'writing';
  /** 当前索引（从 0 开始） */
  current: number;
  /** 总数 */
  total: number;
  /** 当前处理的文件/组件名 */
  name: string;
}

/**
 * 组件 Schema 扫描器
 *
 * 扫描组件目录中的 schema.ts 文件，
 * 使用 SchemaCompiler 将 *Props 接口编译为 JSON Schema。
 *
 * 目录结构约定：
 * ```
 * antd/
 * ├── button/
 * │   ├── component.tsx    # 组件实现
 * │   ├── schema.ts        # Props 接口定义（JSDoc 含 x-group/x-priority）
 * │   ├── button.json      # 编译产物：属性 JSON Schema
 * │   └── index.ts         # 统一导出
 * ├── text/
 * │   ├── schema.ts
 * │   ├── text.json
 * │   └── ...
 * ```
 */
export class ComponentSchemaScanner {
  private compiler: SchemaCompiler;
  private config: ScannerConfig & { outputDir: string; interfacePattern: RegExp; exclude: string[] };

  constructor(config: ScannerConfig) {
    this.config = {
      outputDir: config.sourceDir,
      interfacePattern: /Props$/,
      exclude: ['node_modules', 'dist', '__tests__', '*.test.ts', '*.spec.ts', 'base-props.ts'],
      ...config,
    };
    this.compiler = new SchemaCompiler();
  }

  /**
   * 扫描组件目录，批量编译 Props 接口为 JSON Schema
   */
  scan(): ScanResult[] {
    const results: ScanResult[] = [];
    const schemaFiles = this.findSchemaFiles(this.config.sourceDir);

    for (const file of schemaFiles) {
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
   * 扫描并输出到文件（带进度回调）
   */
  scanAndWrite(): ScanResult[] {
    const onProgress = this.config.onProgress;

    // 阶段1：查找 schema 文件
    const schemaFiles = this.findSchemaFiles(this.config.sourceDir);
    onProgress?.({ phase: 'scanning', current: 0, total: schemaFiles.length, name: '' });

    // 阶段2：逐个编译
    const results: ScanResult[] = [];
    for (let i = 0; i < schemaFiles.length; i++) {
      const file = schemaFiles[i];
      const dirName = path.basename(path.dirname(file));
      onProgress?.({ phase: 'compiling', current: i, total: schemaFiles.length, name: dirName });

      try {
        const fileResults = this.processFile(file);
        results.push(...fileResults);
      } catch (e) {
        console.warn(`Failed to process ${file}:`, e);
      }
    }

    // 阶段3：逐个写入
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      onProgress?.({ phase: 'writing', current: i, total: results.length, name: result.type });
      this.writeSchema(result);
    }

    return results;
  }

  /**
   * 处理单个 schema.ts 文件
   */
  private processFile(filePath: string): ScanResult[] {
    const results: ScanResult[] = [];

    // 编译文件中的所有 *Props 接口
    const schemas = this.compiler.compileFile(filePath);

    for (const [interfaceName, schema] of schemas) {
      // 只处理匹配模式的接口
      if (!this.config.interfacePattern.test(interfaceName)) {
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
   * 从目录名推导：antd/button/schema.ts → button
   */
  private deriveComponentType(filePath: string, _interfaceName: string): string {
    const dir = path.dirname(filePath);
    return path.basename(dir);
  }

  /**
   * 计算输出路径
   * button/schema.ts → button/button.json
   */
  private getOutputPath(sourceFile: string, type: string): string {
    const dir = path.dirname(sourceFile);
    return path.join(dir, `${type}.json`);
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

    console.log(`  ✓ ${result.type} → ${path.relative(process.cwd(), result.outputPath)}`);
  }

  /**
   * 查找所有 schema.ts 文件
   */
  private findSchemaFiles(dir: string): string[] {
    const results: string[] = [];

    if (!fs.existsSync(dir)) {
      return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (this.shouldExclude(entry.name)) continue;

      const schemaPath = path.join(dir, entry.name, 'schema.ts');
      if (fs.existsSync(schemaPath)) {
        results.push(schemaPath);
      }
    }

    return results;
  }

  /**
   * 检查是否应排除
   */
  private shouldExclude(name: string): boolean {
    return this.config.exclude.some((pattern) => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(name);
      }
      return name === pattern;
    });
  }
}
