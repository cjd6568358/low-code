/**
 * 表达式引擎 workerpool 沙箱测试
 */
import { describe, it, expect } from 'vitest';
import { createExpressionEngine } from '../engine/expression.js';

describe('safeEvaluate (workerpool)', () => {
  const engine = createExpressionEngine({ defaultTimeout: 1000 });

  it('正常求值', async () => {
    const result = await engine.safeEvaluate('1 + 2', {});
    expect(result).toBe(3);
  });

  it('带上下文变量', async () => {
    const result = await engine.safeEvaluate('$a * $b', { a: 3, b: 7 });
    expect(result).toBe(21);
  });

  it('while(true) 超时硬杀', async () => {
    const start = Date.now();
    await expect(engine.safeEvaluate('while(true){}', {}, 500)).rejects.toMatchObject({
      type: 'timeout',
    });
    const elapsed = Date.now() - start;
    // 应在 ~500ms 内超时，不超过 3s（含 worker 创建开销）
    expect(elapsed).toBeLessThan(3000);
  });

  it('for(;;) 超时硬杀', async () => {
    const start = Date.now();
    await expect(engine.safeEvaluate('for(;;){}', {}, 500)).rejects.toMatchObject({
      type: 'timeout',
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });

  it('禁止全局对象', async () => {
    await expect(engine.safeEvaluate('globalThis', {})).rejects.toMatchObject({
      type: 'runtime',
    });
  });

  it('运行时错误', async () => {
    await expect(engine.safeEvaluate('nonexistent.var', {})).rejects.toMatchObject({
      type: 'runtime',
    });
  });
});
