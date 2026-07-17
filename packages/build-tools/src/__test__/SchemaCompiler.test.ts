import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { SchemaCompiler } from '../SchemaCompiler';

describe('SchemaCompiler', () => {
  const compiler = new SchemaCompiler();
  const antdDir = path.resolve(__dirname, '../../../renderer/src/libraries/antd');

  describe('compileInterface', () => {
    it('should compile TextProps to JSON Schema with x-* extensions', () => {
      const schema = compiler.compileInterface(
        path.join(antdDir, 'text/schema.ts'),
        'TextProps',
      );

      // 基本结构
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();

      // 属性存在
      expect(schema.properties!.type).toBeDefined();
      expect(schema.properties!.code).toBeDefined();

      // x-* 扩展字段
      const typeProp = schema.properties!.type as Record<string, unknown>;
      expect(typeProp['x-group']).toBe('基础属性');
      expect(typeProp['x-priority']).toBe(11);
      expect(typeProp.title).toBe('文本类型');

      // union literal + @enumLabels → oneOf
      expect(typeProp.oneOf).toBeDefined();
      const textTypeValues = (typeProp.oneOf as Array<{ const: string }>).map(o => o.const);
      expect(textTypeValues).toEqual(
        expect.arrayContaining(['secondary', 'success', 'warning', 'danger']),
      );
      // enum 已被 @enumLabels 后处理删除
      expect(typeProp.enum).toBeUndefined();

      // BaseProps 继承
      expect(schema.properties!.name).toBeDefined();
      expect(schema.properties!.visible).toBeDefined();
      expect(schema.properties!.style).toBeDefined();

      // style 应被简化（CSSProperties 展开 → {type: "object"}）
      const styleProp = schema.properties!.style as Record<string, unknown>;
      expect(styleProp.type).toBe('object');
      expect(styleProp.properties).toBeUndefined();
    });

    it('should compile ButtonProps with union literal enum', () => {
      const schema = compiler.compileInterface(
        path.join(antdDir, 'button/schema.ts'),
        'ButtonProps',
      );

      // type 属性：union literal + @enumLabels → oneOf
      const typeProp = schema.properties!.type as Record<string, unknown>;
      expect(typeProp.oneOf).toBeDefined();
      const btnTypeValues = (typeProp.oneOf as Array<{ const: string }>).map(o => o.const);
      expect(btnTypeValues).toEqual(
        expect.arrayContaining(['primary', 'default', 'dashed', 'text', 'link']),
      );

      // children（React.ReactNode）应被简化（无 type，仅 title + x-*）
      const childrenProp = schema.properties!.children as Record<string, unknown>;
      expect(childrenProp.title).toBe('按钮内容');
      expect(childrenProp.$ref).toBeUndefined();

      // @ignore 属性应被排除
      expect(schema.properties!.iconPosition).toBeUndefined();
    });
  });

  describe('compileFile', () => {
    it('should compile all *Props from a schema.ts file', () => {
      const results = compiler.compileFile(
        path.join(antdDir, 'button/schema.ts'),
      );

      expect(results.has('ButtonProps')).toBe(true);
      expect(results.size).toBe(1);
    });
  });
});
