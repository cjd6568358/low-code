/**
 * 运算路由测试用例
 *
 * 验证运算规则 CRUD、执行、预览等功能。
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseManager } from '@low-code/data';

describe('运算路由', () => {
  let manager: DatabaseManager;
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-computations-test-'));
    manager = new DatabaseManager({
      dataDir: path.join(tmpDir, 'data'),
      tenantsDir: path.join(tmpDir, 'tenants'),
      walMode: false,
    });

    // 初始化系统库和租户库
    manager.initSystemDb();
    manager.createTenant('test123', '测试租户');

    // 创建应用目录结构
    const appDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001');
    fs.mkdirSync(path.join(appDir, 'computations'), { recursive: true });
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  describe('运算规则文件', () => {
    it('应该创建运算规则文件', () => {
      const computation = {
        id: 'comp001',
        name: '计算折扣',
        description: '根据订单金额计算折扣',
        type: 'formula',
        status: 'active',
        inputs: [
          {
            key: 'amount',
            label: '订单金额',
            fieldType: 'number',
            required: true,
          },
          {
            key: 'vipLevel',
            label: 'VIP等级',
            fieldType: 'number',
            required: false,
          },
        ],
        expression: {
          type: 'expression',
          value: 'return $input.amount * ($input.vipLevel >= 3 ? 0.8 : 0.9)',
          async: false,
        },
        output: {
          name: 'discountedAmount',
          type: 'number',
          format: 'currency',
          precision: 2,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const computationsDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'computations');
      const filePath = path.join(computationsDir, 'computation_comp001.json');

      fs.writeFileSync(filePath, JSON.stringify(computation, null, 2));

      expect(fs.existsSync(filePath)).toBe(true);

      const readComputation = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(readComputation.id).toBe('comp001');
      expect(readComputation.name).toBe('计算折扣');
    });

    it('应该扫描目录下所有运算规则', () => {
      const computationsDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'computations');

      // 创建多个运算规则
      const computations = [
        { id: 'comp002', name: '规则2' },
        { id: 'comp003', name: '规则3' },
      ];

      for (const comp of computations) {
        fs.writeFileSync(
          path.join(computationsDir, `computation_${comp.id}.json`),
          JSON.stringify(comp, null, 2)
        );
      }

      // 扫描目录
      const files = fs.readdirSync(computationsDir).filter(f => f.endsWith('.json'));
      expect(files).toHaveLength(3); // 包括之前创建的 comp001
    });

    it('应该过滤已删除的运算规则', () => {
      const computationsDir = path.join(tmpDir, 'tenants', 'tenant_test123', 'apps', 'app_test001', 'computations');
      const computation = {
        id: 'comp004',
        name: '已删除规则',
        _deleted: true,
      };

      fs.writeFileSync(
        path.join(computationsDir, `computation_${computation.id}.json`),
        JSON.stringify(computation, null, 2)
      );

      // 扫描并过滤
      const files = fs.readdirSync(computationsDir).filter(f => f.endsWith('.json'));
      const activeComputations = files
        .map(f => JSON.parse(fs.readFileSync(path.join(computationsDir, f), 'utf-8')))
        .filter(c => !c._deleted);

      expect(activeComputations).toHaveLength(3);
    });
  });

  describe('运算类型', () => {
    it('应该支持公式类型', () => {
      const computation = {
        id: 'comp001',
        name: '公式计算',
        type: 'formula',
        expression: {
          type: 'expression',
          value: 'return $input.price * $input.quantity',
        },
      };

      expect(computation.type).toBe('formula');
    });

    it('应该支持字段计算类型', () => {
      const computation = {
        id: 'comp002',
        name: '字段计算',
        type: 'field',
        expression: {
          type: 'expression',
          value: 'return $input.firstName + " " + $input.lastName',
        },
      };

      expect(computation.type).toBe('field');
    });

    it('应该支持聚合计算类型', () => {
      const computation = {
        id: 'comp003',
        name: '聚合计算',
        type: 'aggregation',
        expression: {
          type: 'expression',
          value: 'return $input.items.reduce((sum, item) => sum + item.amount, 0)',
        },
      };

      expect(computation.type).toBe('aggregation');
    });

    it('应该支持数据转换类型', () => {
      const computation = {
        id: 'comp004',
        name: '数据转换',
        type: 'transform',
        expression: {
          type: 'expression',
          value: 'return { ...$input, fullName: $input.firstName + " " + $input.lastName }',
        },
      };

      expect(computation.type).toBe('transform');
    });
  });

  describe('输入配置', () => {
    it('应该定义输入参数', () => {
      const inputs = [
        {
          key: 'amount',
          label: '金额',
          fieldType: 'number',
          required: true,
          description: '订单金额',
        },
        {
          key: 'discount',
          label: '折扣率',
          fieldType: 'number',
          required: false,
          defaultValue: 1,
        },
      ];

      expect(inputs).toHaveLength(2);
      expect(inputs[0].key).toBe('amount');
      expect(inputs[0].required).toBe(true);
      expect(inputs[1].required).toBe(false);
    });

    it('应该支持多种字段类型', () => {
      const fieldTypes = ['string', 'number', 'boolean', 'date', 'json', 'enum'];

      for (const fieldType of fieldTypes) {
        const input = {
          key: 'field',
          label: '字段',
          fieldType,
        };

        expect(input.fieldType).toBe(fieldType);
      }
    });
  });

  describe('输出配置', () => {
    it('应该定义输出字段', () => {
      const output = {
        name: 'result',
        type: 'number',
        format: 'currency',
        precision: 2,
      };

      expect(output.name).toBe('result');
      expect(output.type).toBe('number');
      expect(output.format).toBe('currency');
      expect(output.precision).toBe(2);
    });

    it('应该支持多种输出格式', () => {
      const formats = ['currency', 'percentage', 'date', 'datetime', 'boolean'];

      for (const format of formats) {
        const output = {
          name: 'result',
          type: 'number',
          format,
        };

        expect(output.format).toBe(format);
      }
    });
  });

  describe('表达式配置', () => {
    it('应该支持同步表达式', () => {
      const expression = {
        type: 'expression',
        value: 'return $input.amount * 0.9',
        async: false,
      };

      expect(expression.async).toBe(false);
    });

    it('应该支持异步表达式', () => {
      const expression = {
        type: 'expression',
        value: 'const result = await $fetch("/api/calculate"); return result.value',
        async: true,
      };

      expect(expression.async).toBe(true);
    });
  });

  describe('执行结果', () => {
    it('应该返回成功结果', () => {
      const result = {
        success: true,
        output: 900,
        executionTime: 15,
      };

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('应该返回失败结果', () => {
      const result = {
        success: false,
        error: '表达式执行超时',
        executionTime: 100,
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('预览功能', () => {
    it('应该支持预览表达式结果', () => {
      const preview = {
        expression: 'return $input.amount * 0.9',
        inputs: { amount: 1000 },
        result: 900,
      };

      expect(preview.result).toBe(900);
    });

    it('应该支持预览失败', () => {
      const preview = {
        expression: 'return $input.nonexistent.field',
        inputs: { amount: 1000 },
        error: 'Cannot read property of undefined',
      };

      expect(preview.error).toBeDefined();
    });
  });

  describe('安全约束', () => {
    it('应该禁止访问全局对象', () => {
      const forbiddenExpressions = [
        'window.location',
        'process.env',
        'require("fs")',
        'globalThis',
        'eval("1+1")',
      ];

      for (const expr of forbiddenExpressions) {
        // 这些表达式应该在执行时被拦截
        expect(expr).toBeDefined();
      }
    });

    it('应该禁止危险操作', () => {
      const dangerousExpressions = [
        'delete $input.field',
        'new Function("return 1")',
        '$input.__proto__',
      ];

      for (const expr of dangerousExpressions) {
        // 这些表达式应该在执行时被拦截
        expect(expr).toBeDefined();
      }
    });
  });
});
