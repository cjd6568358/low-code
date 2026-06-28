/**
 * antd 内置组件方法元数据
 *
 * 声明每个组件可被 invokeMethod 调用的方法。
 * 设计时用于 availableMethods 列表，运行时通过 useComponentMethods 注册实际处理器。
 *
 * 随组件能力扩展逐步补充。
 */
import type { ComponentMethodDef } from '@low-code/shared';

/** antd 组件方法声明（type → 方法定义列表） */
export const antdComponentMethods: Record<string, ComponentMethodDef[]> = {
  table: [
    {
      name: 'refresh',
      title: '刷新数据',
      description: '重新加载表格数据',
      group: '数据操作',
    },
    {
      name: 'clearSelection',
      title: '清除选择',
      description: '清除所有选中行',
      group: '选择操作',
    },
    {
      name: 'scrollToRow',
      title: '滚动到行',
      description: '滚动到指定行',
      group: '滚动操作',
      params: [
        { name: 'rowKey', type: 'string', title: '行标识', required: true, description: '目标行的 rowKey' },
      ],
    },
    {
      name: 'setPage',
      title: '跳转页码',
      description: '跳转到指定页码',
      group: '分页操作',
      params: [
        { name: 'page', type: 'number', title: '页码', required: true },
        { name: 'pageSize', type: 'number', title: '每页条数', description: '不传则保持当前每页条数' },
      ],
    },
  ],

  form: [
    {
      name: 'validate',
      title: '校验表单',
      description: '触发表单校验',
      group: '表单操作',
      returnType: 'Promise<{ valid: boolean; errors: Record<string, string[]> }>',
    },
    {
      name: 'reset',
      title: '重置表单',
      description: '重置表单到初始值',
      group: '表单操作',
    },
    {
      name: 'submit',
      title: '提交表单',
      description: '触发表单提交',
      group: '表单操作',
      returnType: 'Promise<Record<string, any>>',
    },
    {
      name: 'getValues',
      title: '获取表单值',
      description: '获取当前表单所有字段值',
      group: '表单操作',
      returnType: 'Record<string, any>',
    },
  ],

  drawer: [
    {
      name: 'open',
      title: '打开抽屉',
      description: '打开抽屉面板',
      group: '状态控制',
    },
    {
      name: 'close',
      title: '关闭抽屉',
      description: '关闭抽屉面板',
      group: '状态控制',
    },
    {
      name: 'toggle',
      title: '切换抽屉',
      description: '切换抽屉开关状态',
      group: '状态控制',
    },
  ],

  modal: [
    {
      name: 'open',
      title: '打开弹窗',
      description: '打开对话框',
      group: '状态控制',
    },
    {
      name: 'close',
      title: '关闭弹窗',
      description: '关闭对话框',
      group: '状态控制',
    },
    {
      name: 'toggle',
      title: '切换弹窗',
      description: '切换对话框开关状态',
      group: '状态控制',
    },
  ],

  pagination: [
    {
      name: 'setPage',
      title: '跳转页码',
      description: '跳转到指定页码',
      group: '分页操作',
      params: [
        { name: 'page', type: 'number', title: '页码', required: true },
        { name: 'pageSize', type: 'number', title: '每页条数', description: '不传则保持当前值' },
      ],
    },
  ],

  tabs: [
    {
      name: 'switchTab',
      title: '切换标签',
      description: '切换到指定标签页',
      group: '导航操作',
      params: [
        { name: 'key', type: 'string', title: '标签页标识', required: true, description: '目标标签页的 key' },
      ],
    },
  ],

  collapse: [
    {
      name: 'expandAll',
      title: '全部展开',
      description: '展开所有折叠面板',
      group: '状态控制',
    },
    {
      name: 'collapseAll',
      title: '全部收起',
      description: '收起所有折叠面板',
      group: '状态控制',
    },
  ],
};
