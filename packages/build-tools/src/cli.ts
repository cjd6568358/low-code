#!/usr/bin/env node
import * as path from 'path';
import * as fs from 'fs';
import { SchemaCompiler } from './SchemaCompiler';
import { ComponentSchemaScanner } from './ComponentSchemaScanner';
import { AntdTypeExtractor } from './AntdTypeExtractor';

const args = process.argv.slice(2);
const command = args[0];

function printUsage(): void {
  console.log(`
Low Code Build Tools — TS → JSON Schema 编译管道

用法:
  lc-schema compile <file> <interface>    编译单个接口
  lc-schema scan [sourceDir]              批量扫描编译组件 Schema
  lc-schema sync-types [sourceDir]        从 antd 类型定义同步类型到 schema.ts
  lc-schema help                          显示帮助

示例:
  lc-schema compile packages/renderer/src/libraries/antd/button/schema.ts ButtonProps
  lc-schema scan                           默认扫描 packages/renderer/src/libraries/antd
  lc-schema scan packages/renderer/src/libraries/antd
  lc-schema sync-types                     从 antd 同步类型到所有 schema.ts

JSDoc 注解映射:
  @group xxx        → x-group: "xxx"       字段分组
  @priority N       → x-priority: N        排序权重
  @component xxx    → x-component: "xxx"   自定义控件
  @visible expr     → x-visible: "expr"    条件显隐
  @disabled expr    → x-disabled: "expr"   条件禁用
  @hidden           → x-hidden: true       强制隐藏
  @dictionary xxx   → x-dictionary: "xxx"  字典引用
  @dataSource xxx   → x-dataSource: "xxx"  数据源
  @validator xxx    → x-validator: "xxx"   校验规则
  @value-type xxx   → x-value-type: "xxx"  值类型（从 antd 类型定义提取）
`);
}

function compileSingle(): void {
  const file = args[1];
  const interfaceName = args[2];

  if (!file || !interfaceName) {
    console.error('错误: 需要指定文件路径和接口名称');
    console.error('用法: lc-schema compile <file> <interface>');
    process.exit(1);
  }

  const compiler = new SchemaCompiler();
  const absolutePath = path.resolve(file);

  try {
    const schema = compiler.compileInterface(absolutePath, interfaceName);
    console.log(JSON.stringify(schema, null, 2));
  } catch (e) {
    console.error(`编译失败: ${e}`);
    process.exit(1);
  }
}

function scanDirectory(): void {
  const defaultSourceDir = path.resolve(__dirname, '../../renderer/src/libraries/antd');
  const sourceDir = args[1] ? path.resolve(args[1]) : defaultSourceDir;

  const phaseLabels: Record<string, string> = {
    scanning: '扫描文件',
    compiling: '编译类型',
    writing: '写入产物',
  };

  const scanner = new ComponentSchemaScanner({
    sourceDir,
    onProgress: ({ phase, current, total, name }) => {
      if (phase === 'scanning' && current === 0) {
        console.log(`${phaseLabels[phase]}...`);
        return;
      }
      const progress = `[${current + 1}/${total}]`;
      const percent = Math.round(((current + 1) / total) * 100);
      process.stdout.write(`\r  ${phaseLabels[phase]} ${progress} (${percent}%) ${name}    `);
    },
  });

  console.log('开始扫描组件目录...\n');
  const results = scanner.scanAndWrite();

  // 清除最后一行进度
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  console.log(`\n完成! 共编译 ${results.length} 个组件 Schema`);

  if (results.length > 0) {
    console.log('\n编译结果:');
    for (const result of results) {
      console.log(`  ✓ ${result.type} (${result.interfaceName}) → ${path.relative(process.cwd(), result.outputPath)}`);
    }
  }
}

function syncTypes(): void {
  const defaultSourceDir = path.resolve(__dirname, '../../renderer/src/libraries/antd');
  const sourceDir = args[1] ? path.resolve(args[1]) : defaultSourceDir;

  console.log('从 antd 类型定义提取组件类型...\n');

  const extractor = new AntdTypeExtractor();

  // 扫描所有 schema.ts 文件
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  let updated = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const schemaPath = path.join(sourceDir, entry.name, 'schema.ts');
    if (!fs.existsSync(schemaPath)) continue;

    const componentType = entry.name;

    // 提取 value 和 children 的类型
    const extract = extractor.extractComponentTypes(componentType, ['value', 'children']);
    if (!extract || extract.props.length === 0) {
      skipped++;
      continue;
    }

    // 读取 schema.ts 内容
    let content = fs.readFileSync(schemaPath, 'utf-8');
    let modified = false;

    // 为每个提取的属性更新 JSDoc 注解
    for (const propType of extract.props) {
      const propName = propType.name;

      // 匹配属性定义的 JSDoc 注解
      // 格式: /** ... propName?: type; 或 propName: type;
      const propRegex = new RegExp(
        `(\\/\\*\\*[\\s\\S]*?)(\\*\\/[\\s\\S]*?\\b${propName}\\s*[?:])`,
        'm',
      );

      if (propRegex.test(content)) {
        // 检查是否已有 @value-type 注解
        const existingRegex = new RegExp(
          `(\\/\\*\\*[\\s\\S]*?)@value-type\\s+\\S+([\\s\\S]*?\\*\\/[\\s\\S]*?\\b${propName}\\s*[?:])`,
          'm',
        );

        if (existingRegex.test(content)) {
          // 更新现有的 @value-type
          content = content.replace(existingRegex, `$1@value-type ${propType.type}$2`);
        } else {
          // 在 JSDoc 结束前插入 @value-type
          content = content.replace(propRegex, `$1* @value-type ${propType.type}\n   $2`);
        }
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(schemaPath, content, 'utf-8');
      console.log(`  ✓ ${componentType}: ${extract.props.map(p => `${p.name}: ${p.type}`).join(', ')}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n完成! 更新 ${updated} 个组件，跳过 ${skipped} 个`);
}

// 主入口
switch (command) {
  case 'compile':
    compileSingle();
    break;
  case 'scan':
    scanDirectory();
    break;
  case 'sync-types':
    syncTypes();
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    printUsage();
    break;
  default:
    console.error(`未知命令: ${command}`);
    printUsage();
    process.exit(1);
}
