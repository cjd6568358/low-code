/**
 * 环境变量注册表
 *
 * 管理所有环境变量的元数据，支持：
 * - 变量树生成
 * - Monaco 代码提示数据
 * - 跨应用变量展示
 */

import type {
  VariableDefinition,
  VariableMode,
  VariableProperty,
} from '@low-code/shared';

/** Monaco 提示项 */
interface MonacoCompletionItem {
  label: string;
  kind: 'variable' | 'property' | 'method';
  detail: string;
  documentation: string;
  insertText: string;
  /** 变量可用模式（用于过滤） */
  modes: VariableMode[];
}

/** 跨应用变量来源信息 */
interface CrossAppSource {
  /** 应用 ID（8位hex） */
  appId: string;
  /** 应用名称（仅用于展示） */
  appName: string;
  resourceType: 'table' | 'computation' | 'workflow';
  resourceId: string;
  resourceName: string;
}

/**
 * 环境变量注册表实现
 */
class EnvironmentRegistryImpl {
  /** 变量定义映射 */
  private definitions = new Map<string, VariableDefinition>();

  /** 跨应用变量来源 */
  private crossAppSources = new Map<string, CrossAppSource>();

  constructor() {
    this.registerBuiltinVariables();
  }

  /**
   * 注册内建环境变量
   */
  private registerBuiltinVariables(): void {
    // $user — 当前用户
    this.register({
      name: '$user',
      description: '当前登录用户信息，包含用户 ID、姓名、角色、部门、岗位等，字段动态读取自用户表',
      modes: ['variable', 'expression'],
      properties: [
        { name: 'id', type: 'string', description: '用户唯一标识（8位hex）' },
        { name: 'name', type: 'string', description: '用户姓名' },
        { name: 'roles', type: 'string[]', description: '用户角色列表（如 admin、editor）' },
        { name: 'department', type: 'string', description: '所属部门 ID' },
        { name: 'departmentName', type: 'string', description: '所属部门名称' },
        { name: 'position', type: 'string', description: '岗位名称' },
      ],
    });

    // $platform — 平台标识
    this.register({
      name: '$platform',
      description: '当前运行平台标识，用于判断用户访问的终端类型，实现多端适配',
      modes: ['variable', 'expression'],
      properties: [
        { name: 'web', type: 'boolean', description: '是否为 Web 端（PC 浏览器）' },
        { name: 'mobile', type: 'boolean', description: '是否为移动端（H5/APP）' },
        { name: 'miniApp', type: 'boolean', description: '是否为小程序（微信/支付宝等）' },
      ],
    });

    // $route — 路由参数
    this.register({
      name: '$route',
      description: '当前路由信息，包含路径参数和查询参数，用于获取页面上下文（租户、应用、页面 ID 等）',
      modes: ['variable', 'expression'],
      properties: [
        { name: 'params', type: 'Record<string, string>', description: '路由路径参数（含 tenantId/appId/pageId）' },
        { name: 'query', type: 'Record<string, string>', description: 'URL 查询参数（?key=value）' },
        { name: 'path', type: 'string', description: '当前页面路径' },
      ],
    });

    // $component — 页面组件变量
    this.register({
      name: '$component',
      description: '页面组件实例状态，通过组件 ID 引用，可获取组件的值、可见性、禁用状态等',
      modes: ['variable', 'expression'],
      properties: [], // 动态生成，取决于页面组件
    });

    // $data — 页面级数据源聚合
    this.register({
      name: '$data',
      description: '页面级数据源聚合，包含页面配置的所有 API/静态/服务端变量的返回值',
      modes: ['variable', 'expression'],
      properties: [], // 动态生成，取决于页面配置的数据源
    });

    // $table — 服务端表查询（仅表达式）
    this.register({
      name: '$table',
      description: '服务端表查询，支持链式调用构建查询条件，惰性求值，运行时转换为 HTTP 请求',
      modes: ['expression'],
      properties: [], // 动态生成，取决于暴露的数据表
    });

    // $computation — 运算引擎（仅表达式）
    this.register({
      name: '$computation',
      description: '运算引擎，执行服务端预定义的运算逻辑，支持复杂业务计算',
      modes: ['expression'],
      properties: [
        { name: 'evaluate', type: 'function', description: '执行运算表达式（如 $computation.evaluate("orderTotal", {items})）' },
      ],
    });

    // $fetch — 第三方请求（仅表达式）
    this.register({
      name: '$fetch',
      description: '第三方 HTTP 请求，用于调用外部 API 接口',
      modes: ['expression'],
      properties: [
        { name: 'get', type: 'function', description: '发送 GET 请求（如 $fetch.get("/api/data")）' },
        { name: 'post', type: 'function', description: '发送 POST 请求' },
        { name: 'put', type: 'function', description: '发送 PUT 请求' },
        { name: 'delete', type: 'function', description: '发送 DELETE 请求' },
      ],
    });

    // $workflow — 流程上下文（仅表达式）
    this.register({
      name: '$workflow',
      description: '流程上下文，仅在流程审批页面内有效，包含流程实例、节点、变量、快照等信息',
      modes: ['expression'],
      properties: [
        { name: 'instanceId', type: 'string', description: '当前流程实例 ID' },
        { name: 'nodeId', type: 'string', description: '当前审批节点 ID' },
        { name: 'variables', type: 'Record<string, any>', description: '流程变量（跨节点传递的数据）' },
        { name: 'snapshots', type: 'Record<string, any>', description: '流程快照数据（各节点的历史数据）' },
      ],
    });

    // $event — 事件对象（仅表达式，事件处理上下文）
    this.register({
      name: '$event',
      description: '事件对象，仅在事件处理动作链中有效，包含触发事件的原生事件对象和组件状态',
      modes: ['expression'],
      properties: [
        { name: 'type', type: 'string', description: '事件类型（如 click、change、submit）' },
        { name: 'target', type: 'object', description: '触发事件的 DOM 元素或组件实例' },
        { name: 'value', type: 'any', description: '事件携带的值（如 input 的输入值、select 的选中值）' },
        { name: 'stopPropagation', type: 'function', description: '阻止事件冒泡' },
        { name: 'preventDefault', type: 'function', description: '阻止默认行为' },
        { name: 'nativeEvent', type: 'Event', description: '原生 DOM 事件对象' },
        { name: 'componentId', type: 'string', description: '触发事件的组件 ID' },
        { name: 'componentType', type: 'string', description: '触发事件的组件类型' },
      ],
    });

    // $result — 上一个动作的返回值（仅表达式，动作链上下文）
    this.register({
      name: '$result',
      description: '上一个动作的返回值，仅在动作链中有效，用于获取前一个动作的执行结果',
      modes: ['expression'],
      properties: [
        { name: 'success', type: 'boolean', description: '动作是否执行成功' },
        { name: 'data', type: 'any', description: '动作返回的数据' },
        { name: 'error', type: 'string | null', description: '错误信息（如果失败）' },
      ],
    });
  }

  /**
   * 注册环境变量
   */
  register(definition: VariableDefinition): void {
    this.definitions.set(definition.name, definition);
  }

  /**
   * 注册跨应用变量来源
   */
  registerCrossAppSource(key: string, source: CrossAppSource): void {
    this.crossAppSources.set(key, source);
  }

  /**
   * 从组件类型和 propsSchema 中提取 value 属性的类型
   *
   * @param componentType 组件类型（如 'input'、'select'、'rate'）
   * @param propsSchema 组件的 props JSON Schema
   * @returns value 属性的类型字符串
   */
  private extractValueType(componentType: string, propsSchema?: Record<string, any>): string {
    // 1. 从 propsSchema 中提取 value/children 的类型
    if (propsSchema?.properties) {
      // 优先查找 value 字段
      const valueField = propsSchema.properties.value;
      if (valueField?.type) {
        return String(valueField.type);
      }

      // 部分组件用 children 作为值（如 button、text）
      const childrenField = propsSchema.properties.children;
      if (childrenField?.type) {
        return String(childrenField.type);
      }
    }

    // 2. 根据组件类型推断常见的 value 类型
    const valueTypeMap: Record<string, string> = {
      input: 'string',
      textarea: 'string',
      text: 'string',
      number: 'number',
      rate: 'number',
      slider: 'number',
      switch: 'boolean',
      checkbox: 'boolean',
      select: 'string | string[]',
      radio: 'string',
      datepicker: 'string',
      timepicker: 'string',
      cascader: 'string[]',
      treeselect: 'string | string[]',
      upload: 'object',
      colorpicker: 'string',
    };

    return valueTypeMap[componentType] || 'any';
  }

  /**
   * 动态注册页面组件到 $component
   *
   * @param components 组件列表，格式：{ componentId: { type, label, propsSchema?, ... } }
   */
  registerPageComponents(components: Record<string, {
    type: string;
    label?: string;
    /** 组件 props 的 JSON Schema（用于提取 value 类型） */
    propsSchema?: Record<string, any>;
  }>): void {
    const componentDef = this.definitions.get('$component');
    if (!componentDef) return;

    // 将组件列表转换为属性定义
    const properties: VariableProperty[] = Object.entries(components).map(([id, info]) => {
      // 从 propsSchema 中提取 value 属性的类型
      const valueType = this.extractValueType(info.type, info.propsSchema);

      const subProps: VariableProperty[] = [
        { name: 'value', type: valueType, description: '组件当前值' },
        { name: 'visible', type: 'boolean', description: '是否可见' },
        { name: 'disabled', type: 'boolean', description: '是否禁用' },
        { name: 'loading', type: 'boolean', description: '是否加载中' },
      ];

      // Form 组件额外暴露 $form 子属性（表单上下文）
      if (info.type === 'form') {
        subProps.push({
          name: '$form',
          type: 'FormContext',
          description: '表单上下文（通过 $component.formId.$form.values.fieldName 访问字段值，$component.formId.$form.errors 获取校验错误等）',
          properties: [
            { name: 'values', type: 'Record<string, any>', description: '表单所有字段的当前值' },
            { name: 'initialValues', type: 'Record<string, any>', description: '表单初始值' },
            { name: 'errors', type: 'Record<string, string>', description: '表单校验错误信息' },
            { name: 'touched', type: 'Record<string, boolean>', description: '字段是否被触碰过' },
            { name: 'dirty', type: 'boolean', description: '表单是否有修改' },
            { name: 'valid', type: 'boolean', description: '表单是否校验通过' },
            { name: 'submitting', type: 'boolean', description: '表单是否正在提交' },
          ],
        });
      }

      return {
        name: id,
        type: 'ComponentState',
        description: `${info.label || info.type} (${id})`,
        properties: subProps,
      };
    });

    // 更新 $component 的属性定义
    this.definitions.set('$component', {
      ...componentDef,
      properties,
    });
  }

  /**
   * 动态注册页面数据源到 $data
   *
   * @param dataSources 数据源列表，格式：{ dataSourceKey: { type, description } }
   */
  registerPageDataSources(dataSources: Record<string, { type: string; description?: string }>): void {
    const dataDef = this.definitions.get('$data');
    if (!dataDef) return;

    // 将数据源列表转换为属性定义
    const properties: VariableProperty[] = Object.entries(dataSources).map(([key, info]) => ({
      name: key,
      type: 'DataSourceItem',
      description: info.description || `${info.type} 数据源`,
      properties: [
        { name: 'data', type: 'any', description: '数据源返回数据' },
        { name: 'loading', type: 'boolean', description: '是否加载中' },
        { name: 'error', type: 'Error | null', description: '加载错误信息' },
      ],
    }));

    // 更新 $data 的属性定义
    this.definitions.set('$data', {
      ...dataDef,
      properties,
    });
  }

  /**
   * 动态注册可用数据表到 $table
   *
   * @param tables 数据表列表，格式：{ tableName: { description } }
   */
  registerAvailableTables(tables: Record<string, { description?: string }>): void {
    const tableDef = this.definitions.get('$table');
    if (!tableDef) return;

    // 将数据表列表转换为属性定义
    const properties: VariableProperty[] = Object.entries(tables).map(([name, info]) => ({
      name,
      type: 'TableQuery',
      description: info.description || `${name} 数据表`,
      properties: [
        { name: 'filter', type: 'function', description: '过滤条件' },
        { name: 'select', type: 'function', description: '选择字段' },
        { name: 'sort', type: 'function', description: '排序' },
        { name: 'limit', type: 'function', description: '限制数量' },
        { name: 'first', type: 'function', description: '取第一条' },
        { name: 'count', type: 'function', description: '统计数量' },
        { name: 'sum', type: 'function', description: '求和' },
        { name: 'avg', type: 'function', description: '平均值' },
        { name: 'execute', type: 'function', description: '执行查询' },
      ],
    }));

    // 更新 $table 的属性定义
    this.definitions.set('$table', {
      ...tableDef,
      properties,
    });
  }

  /**
   * 获取变量定义
   */
  getDefinition(name: string): VariableDefinition | undefined {
    return this.definitions.get(name);
  }

  /**
   * 获取所有变量定义（按模式过滤）
   */
  getAllDefinitions(mode?: VariableMode): VariableDefinition[] {
    const defs = Array.from(this.definitions.values());
    if (!mode) return defs;
    return defs.filter((d) => d.modes.includes(mode));
  }

  /**
   * 生成变量树数据（用于 VariablePicker 的变量树）
   */
  generateVariableTree(mode: VariableMode): VariableTreeNode[] {
    const defs = this.getAllDefinitions(mode);
    return defs.map((def) => ({
      key: def.name,
      label: def.name,
      description: def.description,
      children: def.properties.map((prop) => this.propertyToTreeNode(def.name, prop)),
      isCrossApp: def.isCrossApp,
      appName: def.appName,
    }));
  }

  /**
   * 将属性转换为树节点
   */
  private propertyToTreeNode(parentKey: string, prop: VariableProperty): VariableTreeNode {
    const key = `${parentKey}.${prop.name}`;
    return {
      key,
      label: prop.name,
      description: `${prop.type} — ${prop.description}`,
      children: (prop.properties || []).map((p) => this.propertyToTreeNode(key, p)),
    };
  }

  /**
   * 生成 Monaco 代码提示数据
   */
  generateMonacoCompletions(mode: VariableMode): MonacoCompletionItem[] {
    const defs = this.getAllDefinitions(mode);
    const items: MonacoCompletionItem[] = [];

    for (const def of defs) {
      // 顶级变量提示
      const isCrossApp = def.isCrossApp;
      const crossAppLabel = isCrossApp ? `[${def.appName}] ` : '';
      items.push({
        label: def.name,
        kind: 'variable',
        detail: `${crossAppLabel}${def.description}`,
        documentation: def.description,
        insertText: def.name,
        modes: def.modes,
      });

      // 子属性提示
      for (const prop of def.properties) {
        items.push(...this.propertyToCompletionItems(def, prop));
      }
    }

    // 添加跨应用变量提示（使用 appId 标识应用，appName 仅用于展示）
    for (const [, source] of this.crossAppSources) {
      items.push({
        label: `$${source.resourceType}.${source.appId}.${source.resourceName}`,
        kind: 'variable',
        detail: `[${source.appName}] ${source.resourceName}`,
        documentation: `跨应用引用: ${source.appName} (${source.appId}) / ${source.resourceName}`,
        insertText: `$${source.resourceType}.${source.appId}.${source.resourceName}`,
        modes: ['expression'],
      });
    }

    return items;
  }

  /**
   * 将属性转换为 Monaco 提示项
   */
  private propertyToCompletionItems(
    def: VariableDefinition,
    prop: VariableProperty,
    parentKey?: string,
  ): MonacoCompletionItem[] {
    const key = parentKey ? `${parentKey}.${prop.name}` : `${def.name}.${prop.name}`;
    const items: MonacoCompletionItem[] = [];

    // 构建 detail 显示：类型 — 中文说明
    const typeInfo = prop.type || 'any';
    const detail = `[${typeInfo}] ${prop.description}`;

    items.push({
      label: key,
      kind: prop.type === 'function' ? 'method' : 'property',
      detail,
      documentation: prop.description,
      insertText: key,
      modes: def.modes,
    });

    // 递归处理子属性
    if (prop.properties) {
      for (const child of prop.properties) {
        items.push(...this.propertyToCompletionItems(def, child, key));
      }
    }

    return items;
  }

  /**
   * 获取跨应用变量来源
   */
  getCrossAppSource(key: string): CrossAppSource | undefined {
    return this.crossAppSources.get(key);
  }

  /**
   * 获取所有跨应用变量来源
   */
  getAllCrossAppSources(): CrossAppSource[] {
    return Array.from(this.crossAppSources.values());
  }

  /**
   * 解析变量路径，区分当前应用和跨应用
   *
   * @returns 解析结果，包含是否跨应用、应用名、资源名等信息
   */
  parseVariablePath(
    variablePath: string,
    _currentAppId: string,
  ): VariablePathParseResult {
    // 移除 $ 前缀，按 . 分割
    const parts = variablePath.replace(/^\$/, '').split('.');

    if (parts.length < 2) {
      return { valid: false, error: `无效的变量路径: ${variablePath}` };
    }

    const varName = `$${parts[0]}`;
    const restParts = parts.slice(1);

    // 检查是否为需要校验的变量类型（$table, $computation, $workflow）
    const needsExposeCheck = ['$table', '$computation', '$workflow'].includes(varName);

    if (!needsExposeCheck) {
      // 非跨应用校验变量，直接返回
      return {
        valid: true,
        varName,
        isCrossApp: false,
        resourcePath: restParts.join('.'),
      };
    }

    // 判断是当前应用还是跨应用
    // 当前应用：$table.user（只有 1 段）
    // 跨应用：$table.山水OA.user（有 2 段以上）
    if (restParts.length === 1) {
      // 当前应用资源
      return {
        valid: true,
        varName,
        isCrossApp: false,
        resourceName: restParts[0],
        resourcePath: restParts[0],
      };
    }

    // 跨应用资源：第一段为应用名，后续为资源名
    const appName = restParts[0];
    const resourceName = restParts.slice(1).join('.');

    return {
      valid: true,
      varName,
      isCrossApp: true,
      appName,
      resourceName,
      resourcePath: `${appName}.${resourceName}`,
    };
  }

  /**
   * 校验跨应用资源是否已暴露
   *
   * @param variablePath 变量路径（如 $table.山水OA.user）
   * @param currentAppId 当前应用 ID
   * @param exposeConfig 目标应用的 expose 配置
   * @returns 校验结果
   */
  validateCrossAppResource(
    variablePath: string,
    currentAppId: string,
    exposeConfig: Record<string, string[]>,
  ): CrossAppValidationResult {
    const parsed = this.parseVariablePath(variablePath, currentAppId);

    if (!parsed.valid) {
      return { valid: false, error: parsed.error };
    }

    if (!parsed.isCrossApp) {
      // 当前应用资源，无需校验
      return { valid: true };
    }

    // 跨应用资源，校验 expose 配置
    if (!parsed.varName) {
      return { valid: false, error: `无法解析变量名: ${variablePath}` };
    }
    const resourceType = this.getResourceTypeFromVarName(parsed.varName);
    if (!resourceType) {
      return { valid: false, error: `不支持跨应用引用的变量类型: ${parsed.varName}` };
    }

    const exposedResources = exposeConfig[resourceType] || [];
    if (!exposedResources.includes(parsed.resourceName!)) {
      return {
        valid: false,
        error: `应用"${parsed.appName}"未暴露${resourceType}类型的资源"${parsed.resourceName}"`,
      };
    }

    return {
      valid: true,
      isCrossApp: true,
      appName: parsed.appName,
      resourceName: parsed.resourceName,
    };
  }

  /**
   * 根据变量名获取资源类型（用于 expose 校验）
   */
  private getResourceTypeFromVarName(varName: string): string | null {
    const mapping: Record<string, string> = {
      '$table': 'tables',
      '$computation': 'computations',
      '$workflow': 'workflows',
    };
    return mapping[varName] || null;
  }

  /**
   * 从变量路径中提取依赖的变量路径列表
   *
   * @param value 变量引用或表达式的值
   * @param mode 模式
   * @returns 依赖的变量路径列表
   */
  collectDependencies(value: string, mode: VariableMode): string[] {
    if (!value || typeof value !== 'string') return [];

    const deps: string[] = [];

    if (mode === 'variable') {
      // 变量引用：直接提取路径
      // $user.name → ["$user.name"]
      if (value.startsWith('$')) {
        deps.push(value);
      }
    } else {
      // 表达式：提取所有 $xxx.xxx 形式的变量引用
      // $user.name + $platform.web → ["$user.name", "$platform.web"]
      const regex = /\$[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*/g;
      const matches = value.match(regex);
      if (matches) {
        deps.push(...matches);
      }
    }

    return [...new Set(deps)]; // 去重
  }
}

/**
 * 依赖图管理器
 *
 * 管理变量依赖关系，支持：
 * - 依赖注册
 * - 拓扑排序（确定求值顺序）
 * - 循环检测（避免死循环）
 * - 变更传播（变量变更时通知依赖组件）
 */
class DependencyGraphImpl {
  /**
   * 正向依赖：variablePath → Set<dependentKey>
   * 例如："$user.name" → Set<"component_a.props.label", "component_b.props.value">
   */
  private forwardDeps = new Map<string, Set<string>>();

  /**
   * 反向依赖：dependentKey → Set<variablePath>
   * 例如："component_a.props.label" → Set<"$user.name">
   */
  private reverseDeps = new Map<string, Set<string>>();

  /**
   * 注册依赖关系
   *
   * @param dependentKey 依赖方标识（如 "component_a.props.label"）
   * @param variablePaths 被依赖的变量路径列表
   */
  register(dependentKey: string, variablePaths: string[]): void {
    // 清除旧的反向依赖
    const oldDeps = this.reverseDeps.get(dependentKey);
    if (oldDeps) {
      for (const oldPath of oldDeps) {
        this.forwardDeps.get(oldPath)?.delete(dependentKey);
      }
    }

    // 注册新的依赖关系
    this.reverseDeps.set(dependentKey, new Set(variablePaths));
    for (const path of variablePaths) {
      if (!this.forwardDeps.has(path)) {
        this.forwardDeps.set(path, new Set());
      }
      this.forwardDeps.get(path)!.add(dependentKey);
    }
  }

  /**
   * 获取依赖指定变量的所有组件/字段
   *
   * @param variablePath 变量路径
   * @returns 依赖该变量的组件/字段列表
   */
  getDependents(variablePath: string): string[] {
    return Array.from(this.forwardDeps.get(variablePath) || []);
  }

  /**
   * 获取指定组件/字段依赖的所有变量
   *
   * @param dependentKey 依赖方标识
   * @returns 依赖的变量路径列表
   */
  getDependencies(dependentKey: string): string[] {
    return Array.from(this.reverseDeps.get(dependentKey) || []);
  }

  /**
   * 拓扑排序 — 确定求值顺序
   *
   * @param affectedPaths 受影响的变量路径列表
   * @returns 按依赖顺序排列的组件/字段列表
   */
  topologicalSort(affectedPaths: string[]): string[] {
    // 收集所有受影响的依赖方
    const affected = new Set<string>();
    const queue = [...affectedPaths];

    while (queue.length > 0) {
      const path = queue.shift()!;
      const dependents = this.forwardDeps.get(path);
      if (dependents) {
        for (const dep of dependents) {
          if (!affected.has(dep)) {
            affected.add(dep);
            // 递归收集间接依赖
            const indirectDeps = this.getIndirectDependents(dep);
            for (const indirect of indirectDeps) {
              if (!affected.has(indirect)) {
                affected.add(indirect);
                queue.push(...this.getDependencies(indirect));
              }
            }
          }
        }
      }
    }

    // 构建子图并进行拓扑排序
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, Set<string>>();

    for (const key of affected) {
      inDegree.set(key, 0);
      adjacency.set(key, new Set());
    }

    // 计算入度
    for (const key of affected) {
      const deps = this.getDependencies(key);
      for (const dep of deps) {
        const dependents = this.forwardDeps.get(dep);
        if (dependents) {
          for (const dependent of dependents) {
            if (affected.has(dependent) && dependent !== key) {
              adjacency.get(key)!.add(dependent);
              inDegree.set(dependent, (inDegree.get(dependent) || 0) + 1);
            }
          }
        }
      }
    }

    // Kahn 算法
    const queue2: string[] = [];
    for (const [key, degree] of inDegree) {
      if (degree === 0) queue2.push(key);
    }

    const result: string[] = [];
    while (queue2.length > 0) {
      const node = queue2.shift()!;
      result.push(node);
      for (const neighbor of adjacency.get(node) || []) {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue2.push(neighbor);
      }
    }

    return result;
  }

  /**
   * 检测循环依赖
   *
   * @returns 循环依赖的路径列表，如果没有循环则返回空数组
   */
  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const deps = this.getDependencies(node);
      for (const dep of deps) {
        const dependents = this.forwardDeps.get(dep);
        if (dependents) {
          for (const dependent of dependents) {
            if (!visited.has(dependent)) {
              if (dfs(dependent, [...path])) return true;
            } else if (recursionStack.has(dependent)) {
              // 找到循环
              const cycleStart = path.indexOf(dependent);
              cycles.push(path.slice(cycleStart));
              return true;
            }
          }
        }
      }

      recursionStack.delete(node);
      return false;
    };

    // 遍历所有节点
    for (const key of this.reverseDeps.keys()) {
      if (!visited.has(key)) {
        dfs(key, []);
      }
    }

    return cycles;
  }

  /**
   * 获取间接依赖方（递归）
   */
  private getIndirectDependents(dependentKey: string): string[] {
    const result: string[] = [];
    const visited = new Set<string>();

    const traverse = (key: string) => {
      if (visited.has(key)) return;
      visited.add(key);

      const deps = this.getDependencies(key);
      for (const dep of deps) {
        const dependents = this.forwardDeps.get(dep);
        if (dependents) {
          for (const dependent of dependents) {
            if (dependent !== key && !visited.has(dependent)) {
              result.push(dependent);
              traverse(dependent);
            }
          }
        }
      }
    };

    traverse(dependentKey);
    return result;
  }

  /**
   * 清除所有依赖关系
   */
  clear(): void {
    this.forwardDeps.clear();
    this.reverseDeps.clear();
  }
}

/** 依赖图单例 */
export const dependencyGraph = new DependencyGraphImpl();

/** 变量路径解析结果 */
interface VariablePathParseResult {
  valid: boolean;
  error?: string;
  varName?: string;
  isCrossApp?: boolean;
  appName?: string;
  resourceName?: string;
  resourcePath?: string;
}

/** 跨应用资源校验结果 */
interface CrossAppValidationResult {
  valid: boolean;
  error?: string;
  isCrossApp?: boolean;
  appName?: string;
  resourceName?: string;
}

/** 变量树节点 */
export interface VariableTreeNode {
  key: string;
  label: string;
  description: string;
  children: VariableTreeNode[];
  isCrossApp?: boolean;
  appName?: string;
}

/** 环境变量注册表单例 */
export const environmentRegistry = new EnvironmentRegistryImpl();

export type {
  MonacoCompletionItem,
  CrossAppSource,
  VariablePathParseResult,
  CrossAppValidationResult,
};

export { EnvironmentRegistryImpl };
