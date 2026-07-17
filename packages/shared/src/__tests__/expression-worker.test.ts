/**
 * 表达式引擎 workerpool 沙箱测试
 *
 * 注意：safeEvaluate 使用 workerpool 创建子线程执行表达式。
 * vitest 默认在 worker 线程运行测试，而 workerpool 不能在 worker 内嵌套创建。
 * 通过检测 vitest 线程池环境决定是否跳过。
 */
import { describe, it, expect } from 'vitest';
import { createExpressionEngine } from '../engine/expression.js';

// vitest 使用 worker_threads 运行测试时，process.env.VITEST_POOL_ID 存在
// 此时 safeEvaluate 的 workerpool 无法嵌套创建，需要跳过
const isVitestWorker = !!process.env.VITEST_POOL_ID;

describe.skipIf(isVitestWorker)('safeEvaluate (workerpool)', () => {
  const engine = createExpressionEngine({ defaultTimeout: 1000 });

  it('正常求值', async () => {
    const result = await engine.safeEvaluate('1 + 2', {});
    expect(result).toBe(3);
  });

  it('带上下文变量', async () => {
    const result = await engine.safeEvaluate('$a * $b', { $a: 3, $b: 7 });
    expect(result).toBe(21);
  });

  it('while(true) 超时硬杀', async () => {
    const start = Date.now();
    await expect(engine.safeEvaluate('while(true){}', {}, 500)).rejects.toMatchObject({
      type: 'timeout',
    });
    const elapsed = Date.now() - start;
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
