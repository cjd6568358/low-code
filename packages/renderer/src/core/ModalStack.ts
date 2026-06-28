/**
 * 弹框栈管理器
 *
 * 支持多层弹框嵌套：A 打开 B，B 关闭后返回结果给 A，A 继续执行后再关闭返回给调用方。
 * 每个 showModal 调用创建一个 Promise，弹窗自身关闭时 resolve 该 Promise 并传递 result。
 */

/** 弹框栈条目 */
interface ModalEntry {
  /** 资源类型：page | card */
  resourceType: string;
  /** 资源 ID */
  resourceId: string;
  /** 传递给弹窗的数据 */
  data?: any;
  /** Promise resolve 函数 */
  resolve: (result?: any) => void;
}

export class ModalStack {
  /** 栈底 → 栈顶 */
  private stack: ModalEntry[] = [];

  /** 状态变化回调（供宿主 UI 监听以渲染/关闭弹框） */
  private onChange?: (event: ModalChangeEvent) => void;

  constructor(onChange?: (event: ModalChangeEvent) => void) {
    this.onChange = onChange;
  }

  /**
   * 打开弹框，返回 Promise
   * - 将条目压入栈
   * - 通知宿主渲染弹框（加载指定页面/卡片资源）
   * - 弹窗自身关闭时调用 resolveModal 返回结果
   */
  open(resourceType: string, resourceId: string, data?: any): Promise<any> {
    return new Promise<any>((resolve) => {
      const entry: ModalEntry = { resourceType, resourceId, data, resolve };
      this.stack.push(entry);

      this.onChange?.({
        type: 'open',
        resourceType,
        resourceId,
        data,
        depth: this.stack.length,
      });
    });
  }

  /**
   * 关闭当前栈顶弹框并返回结果（弹窗内部调用）
   * - 弹窗的"确定"按钮调用此方法
   * - result 会注入到 showModal 的 $result 中
   */
  resolve(result?: any): void {
    if (this.stack.length === 0) return;

    const entry = this.stack.pop()!;
    entry.resolve(result);

    this.onChange?.({
      type: 'close',
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      result,
      depth: this.stack.length,
    });
  }

  /**
   * 关闭所有弹框（closeModal 动作调用）
   * - 所有 showModal 的 Promise resolve 为 undefined
   */
  closeAll(): void {
    if (this.stack.length === 0) return;

    // 从栈顶到底部依次关闭
    const entries = [...this.stack].reverse();
    this.stack = [];

    for (const entry of entries) {
      entry.resolve(undefined);
      this.onChange?.({
        type: 'close',
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        result: undefined,
        depth: this.stack.length,
      });
    }
  }

  /** 当前栈深度 */
  get depth(): number {
    return this.stack.length;
  }

  /** 当前栈顶弹框信息 */
  get topModal(): { resourceType: string; resourceId: string } | undefined {
    const entry = this.stack[this.stack.length - 1];
    return entry ? { resourceType: entry.resourceType, resourceId: entry.resourceId } : undefined;
  }

  /** 是否有弹框在栈中 */
  has(resourceId: string): boolean {
    return this.stack.some((e) => e.resourceId === resourceId);
  }

  /** 清空栈（页面卸载时调用） */
  clear(): void {
    for (const entry of this.stack.reverse()) {
      entry.resolve(undefined);
    }
    this.stack = [];
  }
}

/** 弹框栈变化事件 */
export interface ModalChangeEvent {
  type: 'open' | 'close';
  resourceType: string;
  resourceId: string;
  data?: any;
  result?: any;
  depth: number;
}
