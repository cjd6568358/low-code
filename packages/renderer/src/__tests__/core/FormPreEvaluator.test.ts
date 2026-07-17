/**
 * FormPreEvaluator 测试用例
 *
 * 验证表单预求值器的核心功能：扫描、排序、批量求值。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { preEvaluateForm } from '../../core/FormPreEvaluator.js';
import type { ComponentNode } from '@low-code/shared';

function makeComponent(id: string, type: string, props: Record<string, any>, children?: string[]): ComponentNode {
  return { id, type, name: id, props, children };
}

function makeFormComponent(formId: string, childrenIds: string[]): ComponentNode {
  return { id: formId, type: 'Form', name: formId, props: {}, children: childrenIds };
}

function buildComponentMap(nodes: ComponentNode[]): Map<string, ComponentNode> {
  const map = new Map<string, ComponentNode>();
  for (const node of nodes) map.set(node.id, node);
  return map;
}

describe('FormPreEvaluator', () => {
  let mockExpressionEngine: any;

  beforeEach(() => {
    mockExpressionEngine = {
      evaluateAsync: vi.fn(),
      safeEvaluate: vi.fn(),
    };
  });

  describe('preEvaluateForm', () => {
    it('应该预求值表单字段', async () => {
      const componentMap = buildComponentMap([
        makeFormComponent('form1', ['input1', 'input2']),
        makeComponent('input1', 'Input', {
          initialValue: { type: 'expression', value: 'return $user.name', async: true },
        }),
        makeComponent('input2', 'Input', {
          initialValue: { type: 'expression', value: 'return $user.age', async: true },
        }),
      ]);

      mockExpressionEngine.evaluateAsync
        .mockResolvedValueOnce('Alice')
        .mockResolvedValueOnce(25);

      const result = await preEvaluateForm(
        'form1',
        componentMap,
        { $user: { name: 'Alice', age: 25 } },
        mockExpressionEngine,
      );

      expect(result.fieldValues['input1']).toBe('Alice');
      expect(result.fieldValues['input2']).toBe(25);
    });

    it('应该跳过非表达式字段', async () => {
      const componentMap = buildComponentMap([
        makeFormComponent('form1', ['input1']),
        makeComponent('input1', 'Input', {
          value: '静态值',
          placeholder: '请输入',
        }),
      ]);

      const result = await preEvaluateForm('form1', componentMap, {}, mockExpressionEngine);

      expect(Object.keys(result.fieldValues)).toHaveLength(0);
      expect(mockExpressionEngine.evaluateAsync).not.toHaveBeenCalled();
    });

    it('应该分层求值（无 $component 依赖的先执行）', async () => {
      const componentMap = buildComponentMap([
        makeFormComponent('form1', ['input2', 'input1']),
        makeComponent('input2', 'Input', {
          initialValue: { type: 'expression', value: 'return $component.input1.value + " world"', async: true },
        }),
        makeComponent('input1', 'Input', {
          initialValue: { type: 'expression', value: 'return "hello"', async: true },
        }),
      ]);

      mockExpressionEngine.evaluateAsync
        .mockResolvedValueOnce('hello')
        .mockResolvedValueOnce('hello world');

      await preEvaluateForm('form1', componentMap, {}, mockExpressionEngine);

      // input1（无 $component 依赖）应该先求值
      expect(mockExpressionEngine.evaluateAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ value: 'return "hello"' }),
        expect.any(Object),
      );
      // input2（依赖 $component.input1）应该后求值
      expect(mockExpressionEngine.evaluateAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ value: 'return $component.input1.value + " world"' }),
        expect.any(Object),
      );
    });

    it('应该同层并行求值', async () => {
      const componentMap = buildComponentMap([
        makeFormComponent('form1', ['input1', 'input2', 'input3']),
        makeComponent('input1', 'Input', {
          initialValue: { type: 'expression', value: 'return "a"', async: true },
        }),
        makeComponent('input2', 'Input', {
          initialValue: { type: 'expression', value: 'return "b"', async: true },
        }),
        makeComponent('input3', 'Input', {
          initialValue: { type: 'expression', value: 'return "c"', async: true },
        }),
      ]);

      mockExpressionEngine.evaluateAsync.mockResolvedValue('test');

      await preEvaluateForm('form1', componentMap, {}, mockExpressionEngine);

      expect(mockExpressionEngine.evaluateAsync).toHaveBeenCalledTimes(3);
    });

    it('应该处理表达式求值失败', async () => {
      const componentMap = buildComponentMap([
        makeFormComponent('form1', ['input1']),
        makeComponent('input1', 'Input', {
          initialValue: { type: 'expression', value: 'throw new Error("test")', async: true },
        }),
      ]);

      mockExpressionEngine.evaluateAsync.mockRejectedValue(new Error('test'));

      const result = await preEvaluateForm('form1', componentMap, {}, mockExpressionEngine);

      // 失败的表达式不应该阻塞其他字段
      expect(Object.keys(result.fieldValues)).toHaveLength(0);
    });

    it('应该处理空组件树', async () => {
      const componentMap = buildComponentMap([
        makeFormComponent('form1', []),
      ]);

      const result = await preEvaluateForm('form1', componentMap, {}, mockExpressionEngine);

      expect(Object.keys(result.fieldValues)).toHaveLength(0);
      expect(mockExpressionEngine.evaluateAsync).not.toHaveBeenCalled();
    });

    it('应该只收集 initialValue 的 fieldValues', async () => {
      const componentMap = buildComponentMap([
        makeFormComponent('form1', ['input1']),
        makeComponent('input1', 'Input', {
          initialValue: { type: 'expression', value: 'return "val"', async: true },
          placeholder: { type: 'expression', value: 'return "ph"', async: true },
        }),
      ]);

      mockExpressionEngine.evaluateAsync
        .mockResolvedValueOnce('val')
        .mockResolvedValueOnce('ph');

      const result = await preEvaluateForm('form1', componentMap, {}, mockExpressionEngine);

      // fieldValues 只包含 initialValue
      expect(result.fieldValues['input1']).toBe('val');
      // placeholder 不在 fieldValues 中
      expect(Object.keys(result.fieldValues)).toHaveLength(1);
    });
  });
});
