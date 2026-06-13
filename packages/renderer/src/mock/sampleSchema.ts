import type { PageSchema } from '@low-code/shared';

/**
 * 示例页面 Schema — 用户信息表单页
 */
export const sampleFormSchema: PageSchema = {
  pageId: 'page_user_form',
  title: '用户信息',
  route: '/user/form',
  layout: {
    type: 'flex',
    direction: 'column',
    gap: 16,
  },
  theme: {
    primaryColor: '#1890ff',
    borderRadius: 6,
    fontSize: 14,
    spacing: 8,
    componentLibrary: 'antd',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorBgContainer: '#ffffff',
    colorTextPrimary: '#000000d9',
  },
  dataSource: [
    {
      id: 'ds_user',
      name: '用户数据',
      type: 'api',
      config: {
        url: '/api/users/current',
        method: 'GET',
      },
      autoLoad: true,
    },
  ],
  components: [
    {
      id: 'form_container',
      type: 'form',
      props: {
        title: '用户信息表单',
      },
      children: ['name_input', 'email_input', 'role_select', 'status_switch', 'submit_btn'],
    },
    {
      id: 'name_input',
      type: 'input',
      parentId: 'form_container',
      props: {
        placeholder: '请输入姓名',
        required: true,
        label: '姓名',
        value: '$context.currentRecord.name',
      },
      events: {
        onChange: [
          [
            {
              action: 'setValue',
              params: {
                target: 'greeting',
                value: '你好，{{name_input.value}}！',
              },
            },
          ],
        ],
      },
    },
    {
      id: 'email_input',
      type: 'input',
      parentId: 'form_container',
      props: {
        placeholder: '请输入邮箱',
        label: '邮箱',
        value: '$context.currentRecord.email',
      },
    },
    {
      id: 'role_select',
      type: 'select',
      parentId: 'form_container',
      props: {
        placeholder: '请选择角色',
        label: '角色',
        options: [
          { label: '管理员', value: 'admin' },
          { label: '编辑', value: 'editor' },
          { label: '访客', value: 'viewer' },
        ],
        value: '$context.currentRecord.role',
      },
      visible: '$context.currentUser.roles.includes("admin")',
    },
    {
      id: 'status_switch',
      type: 'switch',
      parentId: 'form_container',
      props: {
        label: '启用状态',
        value: true,
      },
    },
    {
      id: 'submit_btn',
      type: 'button',
      parentId: 'form_container',
      props: {
        children: '提交',
        type: 'primary',
      },
      events: {
        onClick: [
          [
            {
              action: 'apiCall',
              params: {
                url: '/api/users',
                method: 'POST',
                data: '$form',
              },
            },
            {
              action: 'message',
              params: {
                type: 'success',
                content: '提交成功！',
              },
            },
            {
              action: 'navigate',
              params: {
                url: '/user/list',
              },
              condition: '$result.code === 200',
            },
          ],
        ],
      },
    },
  ],
  rules: [
    {
      id: 'rule_email_required',
      targetId: 'email_input',
      condition: "$context.currentRecord.role === 'admin'",
      action: 'setProp',
      value: { required: true },
      priority: 1,
    },
  ],
};

/**
 * 示例页面 Schema — 仪表盘
 */
export const sampleDashboardSchema: PageSchema = {
  pageId: 'page_dashboard',
  title: '仪表盘',
  route: '/dashboard',
  layout: {
    type: 'grid',
    columns: 24,
    gap: 16,
  },
  components: [
    {
      id: 'card_stats',
      type: 'card',
      props: {
        title: '数据统计',
        bordered: true,
      },
      layout: { col: 1, colSpan: 12 },
      children: ['stat_text'],
    },
    {
      id: 'stat_text',
      type: 'text',
      parentId: 'card_stats',
      props: {
        children: '总用户数: 1,234',
      },
    },
    {
      id: 'card_recent',
      type: 'card',
      props: {
        title: '最近操作',
        bordered: true,
      },
      layout: { col: 13, colSpan: 12 },
      children: ['recent_table'],
    },
    {
      id: 'recent_table',
      type: 'table',
      parentId: 'card_recent',
      props: {
        columns: [
          { title: '操作', key: 'action' },
          { title: '时间', key: 'time' },
          { title: '用户', key: 'user' },
        ],
        dataSource: [
          { action: '创建应用', time: '2024-01-15 10:30', user: '张三' },
          { action: '发布页面', time: '2024-01-15 09:15', user: '李四' },
          { action: '修改配置', time: '2024-01-14 16:45', user: '王五' },
        ],
      },
    },
  ],
};
