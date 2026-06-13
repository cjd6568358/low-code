#!/usr/bin/env node
import * as path from 'path';
import { TsToSchemaCompiler } from './TsToSchemaCompiler';
import { ComponentSchemaScanner } from './ComponentSchemaScanner';

const args = process.argv.slice(2);
const command = args[0];

function printUsage(): void {
  console.log(`
Low Code Build Tools — TS → JSON Schema 编译管道

用法:
  lc-schema compile <file> <interface>    编译单个接口
  lc-schema scan <sourceDir> <outputDir>  批量扫描编译组件 Schema
  lc-schema help                          显示帮助

示例:
  lc-schema compile src/components/input/InputProps.ts InputProps
  lc-schema scan packages/renderer/src/components Platform/components

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

  const compiler = new TsToSchemaCompiler();
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
  const sourceDir = args[1];
  const outputDir = args[2];

  if (!sourceDir || !outputDir) {
    console.error('错误: 需要指定源目录和输出目录');
    console.error('用法: lc-schema scan <sourceDir> <outputDir>');
    process.exit(1);
  }

  const scanner = new ComponentSchemaScanner({
    sourceDir: path.resolve(sourceDir),
    outputDir: path.resolve(outputDir),
  });

  console.log('扫描组件目录...');
  const results = scanner.scanAndWrite();
  console.log(`\n完成! 共编译 ${results.length} 个组件 Schema`);

  if (results.length > 0) {
    console.log('\n编译结果:');
    for (const result of results) {
      console.log(`  ${result.type} (${result.interfaceName}) → ${result.outputPath}`);
    }
  }
}

// 主入口
switch (command) {
  case 'compile':
    compileSingle();
    break;
  case 'scan':
    scanDirectory();
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
