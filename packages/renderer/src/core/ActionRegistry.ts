import type { ActionExecutor, ActionContext } from '@low-code/shared';

/**
 * 动作注册表
 * 维护动作类型标识到执行器的映射
 */
export class ActionRegistryImpl {
  private executors = new Map<string, ActionExecutor>();

  register(code: string, executor: ActionExecutor): void {
    this.executors.set(code, executor);
  }

  resolve(code: string): ActionExecutor | null {
    return this.executors.get(code) || null;
  }

  list(): string[] {
    return Array.from(this.executors.keys());
  }

  has(code: string): boolean {
    return this.executors.has(code);
  }
}

// ========== 内建动作处理器 ==========

/** 页面跳转 */
const navigateExecutor: ActionExecutor = {
  async execute(params, context) {
    const { url, params: routeParams, target, queryParams } = params;

    // 拼接查询参数到 URL（queryParams 已由 EventCompiler 求值为对象）
    let finalUrl = url ?? '';
    if (queryParams && typeof queryParams === 'object') {
      const entries = Object.entries(queryParams).filter(([, v]) => v != null);
      if (entries.length > 0) {
        const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
      }
    }

    if (target === '_blank' || target === 'openPage') {
      window.open(finalUrl, '_blank');
    } else if (context.navigate) {
      context.navigate(finalUrl, routeParams);
    } else {
      window.location.href = finalUrl;
    }
  },
};

/** 批量设值 */
const setValuesExecutor: ActionExecutor = {
  async execute(params, context) {
    const { values } = params;
    if (!values) return;

    for (const [field, rawValue] of Object.entries(values)) {
      // 解析值（支持 { type: 'variable'|'expression', value: '...' } 格式）
      let resolvedValue = rawValue;
      if (rawValue && typeof rawValue === 'object' && 'type' in rawValue && 'value' in rawValue) {
        const typed = rawValue as { type: string; value: string };
        if (typed.type === 'variable') {
          // 变量引用：从 renderContext 按路径取值
          resolvedValue = resolveVariablePath(typed.value, context.renderContext);
        } else if (typed.type === 'expression') {
          // 表达式：暂不支持运行时求值，保留原值
          resolvedValue = typed.value;
        }
      }

      // $component.xxx.prop → 设置组件属性
      if (field.startsWith('$component.')) {
        const parts = field.slice('$component.'.length).split('.');
        if (parts.length >= 2 && context.setComponentProp) {
          const componentId = parts[0];
          const propName = parts.slice(1).join('.');
          context.setComponentProp(componentId, propName, resolvedValue);
          // 同步更新 antd Form store（Form.Item 的 name prop 使用组件 ID，与 form store key 一致）
          if (propName === 'value' && context.formRegistry?.setFieldValue) {
            context.formRegistry.setFieldValue(componentId, resolvedValue);
          }
        }
        continue;
      }

      // 其他 → 表单字段
      if (context.setFormValue) {
        context.setFormValue(field, resolvedValue);
      }
    }
  },
};

/** 从 renderContext 按变量路径取值（如 $platform.mobile → true） */
function resolveVariablePath(path: string, renderContext: Record<string, any>): any {
  const parts = path.split('.');
  let current: any = renderContext;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/** 重置表单 */
const resetFormExecutor: ActionExecutor = {
  async execute(params, context) {
    const { formId } = params;
    const activeId = formId ?? context.formRegistry?.getActiveFormId();
    if (!activeId) return;
    // 重置处理器内部使用 initialValuesRef（闭包捕获的初始值快照），
    // 通过 FormRegistry 调用 Form 组件注册的重置处理器
    context.formRegistry?.resetForm?.(activeId, {});
  },
};

/** 校验表单 */
const validateFormExecutor: ActionExecutor = {
  async execute(params, context) {
    const { formId, fields } = params;
    if (!context.formRegistry?.validateForm) {
      console.warn('[validateForm] formRegistry.validateForm not available');
      return { valid: true, errors: {} };
    }
    const activeId = formId ?? context.formRegistry.getActiveFormId();
    return context.formRegistry.validateForm(activeId, fields);
  },
};

/** 清除校验 */
const clearValidateExecutor: ActionExecutor = {
  async execute(params, context) {
    const { formId, fields } = params;
    if (!context.formRegistry?.clearValidate) {
      console.warn('[clearValidate] formRegistry.clearValidate not available');
      return;
    }
    const activeId = formId ?? context.formRegistry.getActiveFormId();
    context.formRegistry.clearValidate(activeId, fields);
  },
};

/** 调用 API */
const apiCallExecutor: ActionExecutor = {
  async execute(params, context) {
    const { url, method = 'GET', data, headers } = params;
    if (context.apiRequest) {
      return context.apiRequest({ url, method, data, headers });
    }
    // Fallback: fetch
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: method !== 'GET' ? JSON.stringify(data) : undefined,
    });
    return response.json();
  },
};

/** 调用组件方法 */
const invokeMethodExecutor: ActionExecutor = {
  async execute(params, context) {
    const { target, method, params: methodParams } = params;
    if (context.invokeMethod) {
      return context.invokeMethod(target, method, methodParams);
    }
  },
};

/** 消息提示 */
const messageExecutor: ActionExecutor = {
  async execute(params, context) {
    const { type = 'info', content, duration = 3000 } = params;
    if (context.showMessage) {
      context.showMessage(type, content, duration);
    } else {
      // Fallback: alert
      console.log(`[${type}] ${content}`);
    }
  },
};

/** 通知提醒 */
const notificationExecutor: ActionExecutor = {
  async execute(params, context) {
    const { title, content, type = 'info' } = params;
    if (context.showMessage) {
      context.showMessage(type, `${title}: ${content}`, 5000);
    }
  },
};

/** 打开弹窗（加载页面/卡片资源，返回 Promise，弹窗自身关闭时 resolve） */
const showModalExecutor: ActionExecutor = {
  async execute(params, context) {
    const { resourceType, resourceId, data } = params;
    if (context.showModal && resourceType && resourceId) {
      return context.showModal(resourceType, resourceId, data);
    }
  },
};

/** 关闭所有弹窗（所有 showModal 的 Promise resolve 为 undefined） */
const closeModalExecutor: ActionExecutor = {
  async execute(_params, context) {
    if (context.closeModal) {
      context.closeModal();
    }
  },
};

/** 刷新组件（targets = 组件 ID 列表，propNames = 指定属性列表） */
const refreshComponentExecutor: ActionExecutor = {
  async execute(params, context) {
    const { targets, propNames } = params;
    if (!Array.isArray(targets) || targets.length === 0) return;

    if (targets.length === 1 && context.refreshComponent) {
      return context.refreshComponent(targets[0], propNames);
    }

    // 多个目标：优先用 refreshWithDependencyOrder，否则逐个调用
    if (context.refreshWithDependencyOrder) {
      return context.refreshWithDependencyOrder(targets);
    }
    if (context.refreshComponent) {
      const results = [];
      for (const id of targets) {
        results.push(await context.refreshComponent(id, propNames));
      }
      return results;
    }
  },
};

/** 显示加载 */
const showLoadingExecutor: ActionExecutor = {
  async execute(params, context) {
    const { message } = params;
    if (context.showLoading) {
      context.showLoading(message);
    }
  },
};

/** 隐藏加载 */
const hideLoadingExecutor: ActionExecutor = {
  async execute(_params, context) {
    if (context.hideLoading) {
      context.hideLoading();
    }
  },
};

/** 提交表单 */
const submitExecutor: ActionExecutor = {
  async execute(params, context) {
    const { api, redirectUrl, formId } = params;
    if (api && context.apiRequest) {
      const formData = context.formRegistry?.getFormData(formId) ?? {};
      await context.apiRequest({
        url: api,
        method: 'POST',
        data: formData,
      });
    }
    if (redirectUrl) {
      if (context.navigate) {
        context.navigate(redirectUrl);
      } else {
        window.location.href = redirectUrl;
      }
    }
  },
};

/** 触发流程 */
const triggerWorkflowExecutor: ActionExecutor = {
  async execute(params, context) {
    const { workflowId, inputData } = params;

    // 获取 appId：优先从 params，其次从 renderContext
    let appId = params.appId;
    let actualWorkflowId = workflowId;

    // 处理跨应用流程 ID 格式: ${refAppId}.${wfId}
    if (workflowId && workflowId.includes('.')) {
      const [refAppId, refWfId] = workflowId.split('.');
      appId = appId || refAppId;
      actualWorkflowId = refWfId;
    }

    // 从 renderContext 中获取 appId（如果 params 中没有）
    if (!appId) {
      const route = context.renderContext?.$route;
      appId = route?.params?.appId;
    }

    if (!appId) {
      console.error('[triggerWorkflow] 缺少 appId');
      return;
    }

    if (context.apiRequest) {
      const user = context.renderContext?.$user;
      return context.apiRequest({
        url: `/api/workflows/${actualWorkflowId}/trigger`,
        method: 'POST',
        params: { appId },
        data: {
          ...inputData,
          startedBy: user?.id,
          startedByName: user?.name,
        },
      });
    }
  },
};

/** 执行脚本（customScript） — 支持 async/await，注入完整上下文 */
const executeScriptExecutor: ActionExecutor = {
  async execute(params, context) {
    const { script } = params;
    if (!script) return;
    try {
      // 使用 AsyncFunction 支持脚本中直接 await
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const fn = new AsyncFunction(
        '$context', '$result', '$event', '$fetch', '$component',
        script,
      );
      return await fn(
        context.renderContext?.$context,
        context.$result,
        context.event,
        context.apiRequest,
        context.renderContext?.$component,
      );
    } catch (e) {
      console.error('Script execution error:', e);
    }
  },
};

/** 条件分支 */
const conditionExecutor: ActionExecutor = {
  async execute(_params, _context) {
    // 条件分支由 EventCompiler 在编译阶段处理
    // 此处为占位，实际逻辑在 EventCompiler 中
  },
};

/**
 * 创建默认动作注册表（包含所有内建动作）
 */
export function createDefaultActionRegistry(): ActionRegistryImpl {
  const registry = new ActionRegistryImpl();

  // Navigation
  registry.register('navigate', navigateExecutor);
  registry.register('redirect', navigateExecutor);

  // Data
  registry.register('setValues', setValuesExecutor);
  registry.register('resetForm', resetFormExecutor);
  registry.register('submit', submitExecutor);
  registry.register('apiCall', apiCallExecutor);
  registry.register('invokeMethod', invokeMethodExecutor);

  // Validation
  registry.register('validate', validateFormExecutor);
  registry.register('clearValidate', clearValidateExecutor);

  // UI
  registry.register('showModal', showModalExecutor);
  registry.register('closeModal', closeModalExecutor);
  registry.register('message', messageExecutor);
  registry.register('showMessage', messageExecutor);
  registry.register('notification', notificationExecutor);
  registry.register('refreshComponent', refreshComponentExecutor);
  registry.register('showLoading', showLoadingExecutor);
  registry.register('hideLoading', hideLoadingExecutor);

  // Workflow
  registry.register('triggerWorkflow', triggerWorkflowExecutor);
  registry.register('executeScript', executeScriptExecutor);
  registry.register('customScript', executeScriptExecutor);

  // Control
  registry.register('condition', conditionExecutor);

  return registry;
}
