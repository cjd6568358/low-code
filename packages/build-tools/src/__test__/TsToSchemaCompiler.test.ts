import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { TsToSchemaCompiler } from '../TsToSchemaCompiler';

describe('TsToSchemaCompiler', () => {
  const compiler = new TsToSchemaCompiler();
  const fixturesDir = path.resolve(__dirname, 'fixtures');

  it('should compile InputProps interface to JSON Schema', () => {
    const schema = compiler.compileInterface(
      path.join(fixturesDir, 'InputProps.ts'),
      'InputProps',
    );

    // 基本结构
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();

    // 属性存在
    expect(schema.properties!.placeholder).toBeDefined();
    expect(schema.properties!.maxLength).toBeDefined();
    expect(schema.properties!.allowClear).toBeDefined();
    expect(schema.properties!.required).toBeDefined();
    expect(schema.properties!.pattern).toBeDefined();
    expect(schema.properties!.inputType).toBeDefined();

    // 类型正确
    expect(schema.properties!.placeholder!.type).toBe('string');
    expect(schema.properties!.maxLength!.type).toBe('number');
    expect(schema.properties!.allowClear!.type).toBe('boolean');

    // 枚举类型
    expect(schema.properties!.inputType!.enum).toEqual(['text', 'password', 'email', 'url', 'tel']);

    // x-* 扩展字段
    expect(schema.properties!.placeholder!['x-group']).toBe('基础属性');
    expect(schema.properties!.placeholder!['x-priority']).toBe(1);
    expect(schema.properties!.placeholder!['x-placeholder']).toBe('请输入');

    expect(schema.properties!.maxLength!['x-group']).toBe('基础属性');
    expect(schema.properties!.maxLength!['x-priority']).toBe(2);

    expect(schema.properties!.addonBefore!['x-group']).toBe('高级属性');
    expect(schema.properties!.addonBefore!['x-priority']).toBe(10);

    expect(schema.properties!.required!['x-group']).toBe('校验规则');
    expect(schema.properties!.required!['x-priority']).toBe(20);

    expect(schema.properties!.pattern!['x-validator']).toBe('pattern');
    expect(schema.properties!.dictCode!['x-dictionary']).toBe('input_options');

    console.log('Compiled Schema:', JSON.stringify(schema, null, 2));
  });

  it('should compile BaseProps interface', () => {
    const schema = compiler.compileInterface(
      path.join(fixturesDir, 'InputProps.ts'),
      'BaseProps',
    );

    expect(schema.type).toBe('object');
    expect(schema.properties!.visible).toBeDefined();
    expect(schema.properties!.disabled).toBeDefined();
    expect(schema.properties!.className).toBeDefined();
    expect(schema.properties!.style).toBeDefined();

    expect(schema.properties!.visible!.type).toBe('boolean');
    expect(schema.properties!.disabled!.type).toBe('boolean');
  });

  it('should compile all exported interfaces from file', () => {
    const results = compiler.compileFile(
      path.join(fixturesDir, 'InputProps.ts'),
    );

    expect(results.has('InputProps')).toBe(true);
    expect(results.has('BaseProps')).toBe(true);
    expect(results.size).toBe(2);
  });
});
