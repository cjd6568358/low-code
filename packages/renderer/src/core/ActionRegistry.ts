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

/** 返回上一页 */
const goBackExecutor: ActionExecutor = {
  async execute() {
    window.history.back();
  },
};

/** 刷新页面 */
const refreshExecutor: ActionExecutor = {
  async execute() {
    window.location.reload();
  },
};

/** 设置单个字段值 */
const setValueExecutor: ActionExecutor = {
  async execute(params, context) {
    const { target, value } = params;
    if (context.setFormValue && target) {
      context.setFormValue(target, value);
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

/** 重置值 */
const resetValueExecutor: ActionExecutor = {
  async execute(params, context) {
    const { target, formId } = params;
    if (context.setFormValue && target) {
      const activeId = formId ?? context.formRegistry?.getActiveFormId();
      const manager = activeId ? context.formRegistry?.get(activeId) : undefined;
      const initial = manager?.getInitialValues()?.[target];
      context.setFormValue(target, initial ?? undefined);
    }
  },
};

/** 重置表单 */
const resetFormExecutor: ActionExecutor = {
  async execute(params, context) {
    const { formId } = params;
    const activeId = formId ?? context.formRegistry?.getActiveFormId();
    if (!activeId) return;
    // 重置处理器内部使用 initialValuesRef（闭包捕获的初始值快照），
    // 通过 FormRegistry 调用 Form 组件注册的重置处理器
    context.formRegistry?.resetForm(activeId, {});
  },
};

/** 校验表单 */
const validateFormExecutor: ActionExecutor = {
  async execute(params, context) {
    const { formId, fields } = params;
    // 实际校验逻辑需要对接 Form 组件的 validate 方法
    // 目前返回成功，后续通过 formRegistry 扩展实现
    return { valid: true, errors: {} };
  },
};

/** 清除校验 */
const clearValidateExecutor: ActionExecutor = {
  async execute(params, context) {
    const { formId, fields } = params;
    // 实际清除逻辑需要对接 Form 组件的 clearValidate 方法
    // 目前为空操作，后续通过 formRegistry 扩展实现
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

/** 打开弹窗（返回 Promise，弹框关闭时 resolve，结果注入 $result） */
const showModalExecutor: ActionExecutor = {
  async execute(params, context) {
    const { modalId, data } = params;
    if (context.showModal) {
      return context.showModal(modalId, data);
    }
  },
};

/** 关闭弹窗（携带返回值，触发对应 showModal 的 Promise resolve） */
const closeModalExecutor: ActionExecutor = {
  async execute(params, context) {
    const { modalId, result } = params;
    if (context.closeModal) {
      context.closeModal(modalId, result);
    }
  },
};

/** 刷新组件 */
const refreshComponentExecutor: ActionExecutor = {
  async execute(params, context) {
    const { target, propNames } = params;
    if (context.refreshComponent) {
      return context.refreshComponent(target, propNames);
    }
  },
};

/** 显示加载 */
const showLoadingExecutor: ActionExecutor = {
  async execute(_params, _context) {
    // 占位实现
  },
};

/** 隐藏加载 */
const hideLoadingExecutor: ActionExecutor = {
  async execute(_params, _context) {
    // 占位实现
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
    if (context.apiRequest) {
      return context.apiRequest({
        url: `/api/workflows/${workflowId}/trigger`,
        method: 'POST',
        data: inputData,
      });
    }
  },
};

/** 执行脚本 */
const executeScriptExecutor: ActionExecutor = {
  async execute(params, context) {
    const { script } = params;
    if (!script) return;
    try {
      // 在沙箱中执行脚本，通过 $component.form_xxx.$form 访问表单数据
      const fn = new Function('$context', '$result', script);
      return fn(
        context.renderContext?.$context,
        context.$result,
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
  registry.register('openPage', navigateExecutor);
  registry.register('goBack', goBackExecutor);
  registry.register('refresh', refreshExecutor);

  // Data
  registry.register('setValue', setValueExecutor);
  registry.register('setValues', setValuesExecutor);
  registry.register('resetValue', resetValueExecutor);
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
  registry.register('notification', notificationExecutor);
  registry.register('refreshComponent', refreshComponentExecutor);
  registry.register('showLoading', showLoadingExecutor);
  registry.register('hideLoading', hideLoadingExecutor);

  // Workflow
  registry.register('triggerWorkflow', triggerWorkflowExecutor);
  registry.register('executeScript', executeScriptExecutor);

  // Control
  registry.register('condition', conditionExecutor);

  return registry;
}
