/**
 * 从组件目录的 schema.ts 生成 JSON Schema
 *
 * 使用 TsToSchemaCompiler 读取组件的 Props 接口，
 * 自动提取 JSDoc 注解（x-group/x-priority/中文标题），
 * 生成标准 JSON Schema 文件。
 *
 * 用法：npx tsx packages/build-tools/src/generate-component-schemas.ts
 */
import fs from 'fs';
import path from 'path';
import { TsToSchemaCompiler } from './TsToSchemaCompiler';

const LIBRARIES_DIR = path.resolve(__dirname, '../../renderer/src/libraries');

// 组件库配置
const LIBRARIES = [
  {
    name: 'antd',
    dir: path.join(LIBRARIES_DIR, 'antd'),
    // 需要生成 schema 的组件目录
    components: [
      'button',
      // TODO: 批量生成后补充其余组件
    ],
  },
];

const compiler = new TsToSchemaCompiler();

for (const lib of LIBRARIES) {
  console.log(`\n═══ 组件库: ${lib.name} ═══\n`);

  for (const compName of lib.components) {
    const schemaFile = path.join(lib.dir, compName, 'schema.ts');
    const outFile = path.join(lib.dir, compName, `${compName}.json`);

    if (!fs.existsSync(schemaFile)) {
      console.log(`  ❌ ${compName}: schema.ts not found`);
      continue;
    }

    try {
      // 读取 schema.ts，找到 Props 接口
      const source = fs.readFileSync(schemaFile, 'utf-8');
      const interfaceMatch = source.match(/export\s+interface\s+(\w+Props)/);

      if (!interfaceMatch) {
        console.log(`  ❌ ${compName}: no *Props interface found`);
        continue;
      }

      const interfaceName = interfaceMatch[1];
      const schema = compiler.compileFromFile(schemaFile, interfaceName);

      // 写入 JSON Schema
      fs.writeFileSync(outFile, JSON.stringify(schema, null, 2), 'utf-8');
      console.log(`  ✅ ${compName} → ${interfaceName}`);
    } catch (err: any) {
      const msg = err.message?.split('\n')[0]?.slice(0, 120) || 'Unknown error';
      console.log(`  ❌ ${compName}: ${msg}`);
    }
  }
}

console.log('\nDone.');
