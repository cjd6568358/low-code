# 开发者扩展与集成 (Developer Extension)

提供插件系统、事件总线、Webhook、SDK 和 API 文档规范，支持平台的二次开发和外部系统集成。

## 扩展体系总览

```
┌─────────────────────────────────────────────────────────────────┐
│                      开发者扩展体系                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────── 扩展点 ──────────────────────────┐    │
│  │                                                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │    │
│  │  │ 组件插件  │  │ 流程节点  │  │ 数据源    │  │ 函数   │  │    │
│  │  │ Plugin   │  │ Plugin   │  │ Plugin   │  │ Plugin │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────── 集成方式 ────────────────────────┐    │
│  │                                                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │    │
│  │  │ REST API │  │ Webhook  │  │ 事件总线  │  │ SDK    │  │    │
│  │  │          │  │ (出站)   │  │ (内部)   │  │        │  │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## 插件系统

### 插件类型

| 插件类型 | 说明 | 扩展能力 |
|---------|------|---------|
| **组件插件** | 自定义渲染组件 | 新增设计器组件，扩展组件面板 |
| **流程节点插件** | 自定义流程节点 | 新增流程执行节点类型 |
| **数据源插件** | 自定义数据源连接器 | 接入新的数据库/API 数据源 |
| **函数插件** | 自定义运算函数 | 扩展运算引擎的函数库 |
| **主题插件** | 自定义主题包 | 扩展平台主题风格 |

### 插件清单 (Plugin Manifest)

```jsonc
// plugin.json — 插件描述文件
{
  "id": "com.example.custom-chart",
  "name": "自定义图表组件",
  "version": "1.0.0",
  "description": "提供 ECharts 图表组件，支持折线图、柱状图、饼图等",
  "author": "张三",
  "license": "MIT",
  "type": "component",                // component | workflow-node | datasource | function | theme
  "entry": "./dist/index.js",         // 插件入口文件
  "styles": ["./dist/style.css"],     // 插件样式
  "dependencies": {
    "echarts": "^5.4.0"               // npm 依赖
  },
  "peerDependencies": {
    "@low-code/platform": ">=2.0.0"   // 平台版本要求
  },
  "config": {                         // 插件配置项（管理员配置）
    "apiKey": {
      "type": "string",
      "label": "ECharts License Key",
      "required": false
    }
  },
  "extensions": [                     // 声明扩展点
    {
      "type": "component",
      "code": "echarts-chart",
      "name": "ECharts 图表",
      "category": "advanced",
      "icon": "./icons/chart.svg",
      "props": "./types/ChartProps.ts"  // TS 类型定义（自动生成属性面板）
    }
  ]
}
```

### 组件插件开发

```typescript
// plugins/custom-chart/src/index.tsx
import { definePlugin, ComponentExtension } from '@low-code/plugin-sdk';
import { ChartProps } from './types/ChartProps';
import { ChartComponent } from './components/Chart';
import { ChartConfigPanel } from './components/ChartConfigPanel';

export default definePlugin({
  extensions: [
    // 组件扩展
    ComponentExtension.create<ChartProps>({
      code: 'echarts-chart',
      name: 'ECharts 图表',
      category: 'advanced',
      component: ChartComponent,

      // 属性面板配置（也可从 TS 类型自动生成）
      configPanel: ChartConfigPanel,

      // 默认属性
      defaultProps: {
        chartType: 'line',
        width: '100%',
        height: 300,
      },

      // 属性 Schema（TS → JSON Schema 自动生成，或手动定义）
      propsSchema: {
        type: 'object',
        properties: {
          chartType: {
            type: 'string',
            enum: ['line', 'bar', 'pie', 'scatter', 'radar'],
            title: '图表类型',
            'x-group': '基础属性',
            'x-priority': 1,
          },
          dataSource: {
            type: 'object',
            title: '数据源',
            'x-group': '数据配置',
            'x-priority': 10,
          },
        },
      },
    }),
  ],
});
```

### 流程节点插件开发

```typescript
// plugins/custom-workflow-node/src/index.ts
import { definePlugin, WorkflowNodeExtension } from '@low-code/plugin-sdk';

export default definePlugin({
  extensions: [
    WorkflowNodeExtension.create({
      code: 'send-email',
      name: '发送邮件',
      category: 'task',
      icon: './icons/email.svg',

      // 节点配置面板
      configSchema: {
        type: 'object',
        properties: {
          to: { type: 'string', title: '收件人', 'x-component': 'expression-input' },
          subject: { type: 'string', title: '主题' },
          body: { type: 'string', title: '正文', 'x-component': 'richtext' },
          templateId: { type: 'string', title: '消息模板', 'x-component': 'template-select' },
        },
        required: ['to', 'subject'],
      },

      // 节点执行逻辑
      async execute(context) {
        const { to, subject, body, templateId } = context.nodeConfig;
        const recipients = await context.resolveExpression(to);

        if (templateId) {
          await context.services.message.sendByTemplate(templateId, recipients, context.variables);
        } else {
          await context.services.message.send({
            to: recipients,
            subject,
            content: body,
            channel: 'email',
          });
        }

        return { success: true };
      },
    }),
  ],
});
```

### 插件安全沙箱

```
┌─────────────────────────────────────────────────────────────────┐
│                       插件安全模型                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    平台宿主环境                             │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                 插件沙箱 (Sandbox)                    │  │  │
│  │  │                                                     │  │  │
│  │  │  · 限制 DOM 访问（仅允许操作插件自身 DOM）              │  │  │
│  │  │  · 限制网络请求（仅允许白名单域名）                     │  │  │
│  │  │  · 禁止 eval() / new Function()                     │  │  │
│  │  │  · 禁止访问 localStorage / cookies（使用平台 API）     │  │  │
│  │  │  · 限制内存使用（最大 50MB）                          │  │  │
│  │  │  · 超时保护（单次执行最大 30s）                        │  │  │
│  │  │                                                     │  │  │
│  │  │  通过 Plugin SDK API 与平台交互                       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  插件审核：                                                      │
│  · 代码静态扫描（无危险 API 调用）                                │
│  · 自动化测试（安装/运行/卸载）                                   │
│  · 人工审核（安全团队 review）                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 插件生命周期

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  开发     │───▶│  审核     │───▶│  安装     │───▶│  运行     │
│          │    │          │    │          │    │          │
│ 本地调试  │    │ 代码扫描  │    │ 下载依赖  │    │ 沙箱加载  │
│ 单元测试  │    │ 人工审核  │    │ 注册扩展  │    │ 扩展生效  │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                      │
                                               ┌──────▼──────┐
                                               │  更新 / 卸载  │
                                               │              │
                                               │ 版本升级      │
                                               │ 清理资源      │
                                               └──────────────┘
```

## 事件总线 (Event Bus)

平台内部事件总线，用于模块间解耦通信。

### 事件模型

```typescript
// 事件定义
interface PlatformEvent {
  id: string;                    // 事件唯一 ID
  type: string;                  // 事件类型
  source: string;                // 事件来源模块
  timestamp: number;             // 事件时间戳
  tenantId?: string;             // 租户 ID
  data: Record<string, any>;     // 事件数据
  metadata?: Record<string, any>; // 元数据
}
```

### 内置事件类型

| 事件类型 | 来源 | 触发时机 |
|---------|------|---------|
| `entity.created` | 数据引擎 | 实体记录创建 |
| `entity.updated` | 数据引擎 | 实体记录更新 |
| `entity.deleted` | 数据引擎 | 实体记录删除 |
| `workflow.started` | 流程引擎 | 流程实例启动 |
| `workflow.completed` | 流程引擎 | 流程实例完成 |
| `workflow.node_executed` | 流程引擎 | 流程节点执行完成 |
| `app.published` | 应用管理 | 应用发布 |
| `user.login` | 认证 | 用户登录 |
| `user.logout` | 认证 | 用户登出 |
| `permission.changed` | 权限引擎 | 权限变更 |
| `org.synced` | 组织架构 | 组织架构同步完成 |
| `data.imported` | 数据引擎 | 数据导入完成 |
| `data.exported` | 数据引擎 | 数据导出完成 |

### 事件订阅 API

```typescript
// 插件中订阅事件
import { useEventBus } from '@low-code/plugin-sdk';

// 订单创建后自动发送通知
eventBus.on('entity.created', async (event) => {
  if (event.data.entityCode === 'order') {
    await eventBus.emit({
      type: 'notification.send',
      source: 'my-plugin',
      data: {
        templateId: 'tpl_new_order',
        recipients: [event.data.record.salespersonId],
        variables: {
          orderNo: event.data.record.orderNo,
          customerName: event.data.record.customerName,
        },
      },
    });
  }
});
```

## Webhook（出站）

平台主动向外部系统推送事件通知。

### Webhook 配置

```jsonc
{
  "webhookId": "wh_001",
  "name": "订单同步到 ERP",
  "url": "https://erp.example.com/api/webhooks/order",
  "events": [
    "entity.created:order",
    "entity.updated:order",
    "entity.deleted:order"
  ],
  "filters": [
    { "field": "data.record.status", "operator": "in", "value": ["confirmed", "shipped"] }
  ],
  "headers": {
    "X-Webhook-Secret": "whsec_xxxxxxxx",
    "Content-Type": "application/json"
  },
  "retryPolicy": {
    "maxRetries": 3,
    "backoffMs": [1000, 5000, 30000]     // 退避策略
  },
  "status": "active",
  "createdAt": "2024-01-15T08:00:00Z"
}
```

### Webhook 请求格式

```jsonc
// POST https://erp.example.com/api/webhooks/order
// Headers:
//   X-Webhook-Secret: whsec_xxxxxxxx
//   X-Webhook-ID: del_xxxxxxxx
//   X-Webhook-Timestamp: 1705305600

{
  "id": "del_xxxxxxxx",
  "type": "entity.created:order",
  "timestamp": 1705305600,
  "tenantId": "tenant_001",
  "data": {
    "entityCode": "order",
    "recordId": "order_001",
    "record": {
      "orderNo": "ORD-20240115-001",
      "customerName": "ABC 公司",
      "amount": 15000.00,
      "status": "confirmed"
    },
    "operation": "create",
    "operatorId": "user_001"
  }
}
```

### Webhook 签名验证

```typescript
// 外部系统验证 Webhook 签名
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: string
): boolean {
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Webhook 管理界面

```
┌─────────────────────────────────────────────────────────────────┐
│  Webhook 管理                                    [+ 新建]        │
├─────────────────────────────────────────────────────────────────┤
│  名称              URL                          状态    操作      │
│  ─────────────────────────────────────────────────────────────  │
│  订单同步到 ERP     https://erp.example.com/...  启用   编辑│日志  │
│  审批通知到钉钉     https://oapi.dingtalk.com/... 启用   编辑│日志  │
│  数据备份           https://backup.internal/...  禁用   编辑│日志  │
├─────────────────────────────────────────────────────────────────┤
│  最近投递记录                                                   │
│  ─────────────────────────────────────────────────────────────  │
│  01-15 10:30  entity.created:order  → erp.example.com  ✅ 200  │
│  01-15 10:28  workflow.completed    → dingtalk          ✅ 200  │
│  01-15 10:25  entity.updated:order  → erp.example.com  ❌ 500  │
│  01-15 10:25  entity.updated:order  → erp.example.com  ✅ 200  │ (重试)
└─────────────────────────────────────────────────────────────────┘
```

## REST API 规范

### API 设计原则

| 原则 | 说明 |
|------|------|
| RESTful | 遵循 REST 语义，GET/POST/PUT/DELETE |
| 版本化 | URL 路径版本 `/api/v1/...` |
| 统一响应 | 统一响应格式和错误码 |
| 分页 | 列表接口统一 `page` / `pageSize` / `total` |
| 过滤 | 支持 `filter` 参数组合查询 |
| 排序 | 支持 `sort` / `order` 参数 |

### 统一响应格式

```jsonc
// 成功响应
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "order_001",
    "orderNo": "ORD-20240115-001"
    // ...
  }
}

// 列表响应
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [ /* ... */ ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}

// 错误响应
{
  "code": 40001,
  "message": "参数校验失败",
  "errors": [
    { "field": "email", "message": "邮箱格式不正确" }
  ]
}
```

### 错误码规范

| 范围 | 分类 | 示例 |
|------|------|------|
| 0 | 成功 | `0` — 成功 |
| 10000-19999 | 认证/授权错误 | `10001` — 未登录；`10002` — 无权限 |
| 20000-29999 | 参数/业务错误 | `20001` — 参数校验失败；`20002` — 数据不存在 |
| 30000-39999 | 资源限制 | `30001` — 配额超限；`30002` — 操作过于频繁 |
| 50000-59999 | 系统错误 | `50001` — 内部服务器错误；`50002` — 数据库错误 |

### 认证方式

| 方式 | 说明 | 适用场景 |
|------|------|---------|
| JWT Bearer Token | `Authorization: Bearer <token>` | 用户会话 |
| API Key | `X-API-Key: <key>` | 服务间调用、Webhook |
| OAuth 2.0 | 标准 OAuth2 流程 | 第三方应用授权 |

### API 文档

基于 OpenAPI 3.0 规范，自动生成交互式 API 文档：

```
┌─────────────────────────────────────────────────────────────────┐
│  API 文档                              [Swagger UI] [ReDoc]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📁 认证 (Auth)                                                  │
│    POST /api/v1/auth/login          用户登录                     │
│    POST /api/v1/auth/logout         用户登出                     │
│    POST /api/v1/auth/refresh        刷新 Token                   │
│                                                                 │
│  📁 应用 (Apps)                                                  │
│    GET    /api/v1/apps              获取应用列表                  │
│    POST   /api/v1/apps              创建应用                     │
│    GET    /api/v1/apps/:id          获取应用详情                  │
│    PUT    /api/v1/apps/:id          更新应用                     │
│    DELETE /api/v1/apps/:id          删除应用                     │
│    POST   /api/v1/apps/:id/publish  发布应用                     │
│    POST   /api/v1/apps/:id/export   导出应用                     │
│                                                                 │
│  📁 实体数据 (Entities)                                          │
│    GET    /api/v1/entities/:code/records         查询记录        │
│    POST   /api/v1/entities/:code/records         创建记录        │
│    PUT    /api/v1/entities/:code/records/:id     更新记录        │
│    DELETE /api/v1/entities/:code/records/:id     删除记录        │
│    POST   /api/v1/entities/:code/records/import  批量导入        │
│    POST   /api/v1/entities/:code/records/export  批量导出        │
│                                                                 │
│  📁 流程 (Workflows)                                             │
│    POST   /api/v1/workflows/:id/start            启动流程        │
│    POST   /api/v1/workflows/instances/:id/approve 审批通过       │
│    POST   /api/v1/workflows/instances/:id/reject  审批拒绝       │
│                                                                 │
│  ...更多接口                                                     │
└─────────────────────────────────────────────────────────────────┘
```

## SDK 提供

### JavaScript/TypeScript SDK

```bash
npm install @low-code/sdk
```

```typescript
import { LowCodeClient } from '@low-code/sdk';

const client = new LowCodeClient({
  baseUrl: 'https://platform.example.com',
  apiKey: 'ak_xxxxxxxx',
  tenantId: 'tenant_001',
});

// 查询实体数据
const customers = await client.entities('customer').list({
  filter: { status: 'active' },
  sort: { createdAt: 'desc' },
  page: 1,
  pageSize: 20,
});

// 创建记录
const order = await client.entities('order').create({
  orderNo: 'ORD-001',
  customerId: 'cust_001',
  amount: 15000,
});

// 启动流程
const instance = await client.workflows('approval').start({
  variables: { orderId: order.id },
  initiator: 'user_001',
});

// 查询流程状态
const status = await client.workflows.instances(instance.id).get();
```

### Webhook 验证 SDK

```typescript
import { WebhookValidator } from '@low-code/sdk';

const validator = new WebhookValidator('whsec_xxxxxxxx');

app.post('/webhooks/order', (req, res) => {
  const isValid = validator.verify({
    payload: req.rawBody,
    signature: req.headers['x-webhook-signature'],
    timestamp: req.headers['x-webhook-timestamp'],
  });

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  // 处理事件...
  res.status(200).json({ received: true });
});
```

## 二次开发指南

### 开发流程

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 环境准备  │───▶│ 了解架构  │───▶│ 选择扩展  │───▶│ 开发调试  │───▶│ 发布部署  │
│          │    │          │    │ 方式      │    │          │    │          │
│ 安装 SDK │    │ 阅读文档  │    │          │    │ 本地测试  │    │ 审核上架  │
│ 脚手架   │    │ API 概览  │    │          │    │ 集成测试  │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 脚手架命令

```bash
# 创建插件项目
npx @low-code/create-plugin my-plugin

# 选择插件类型
? 选择插件类型:
  ❯ 组件插件 (Component)
    流程节点插件 (Workflow Node)
    数据源插件 (Datasource)
    函数插件 (Function)
    主题插件 (Theme)

# 本地开发
cd my-plugin
pnpm install
pnpm dev          # 启动本地开发环境，连接本地平台实例

# 构建与测试
pnpm build        # 构建生产版本
pnpm test         # 运行单元测试
pnpm lint         # 代码检查

# 发布
pnpm publish      # 发布到插件市场
```

## 与现有模块的关系

| 模块 | 关系 |
|------|------|
| **渲染引擎** | 组件插件扩展设计器组件面板，运行时渲染器加载插件组件 |
| **流程引擎** | 流程节点插件扩展流程节点类型，事件总线承载流程事件 |
| **数据引擎** | 数据源插件扩展外部数据源连接 |
| **运算引擎** | 函数插件扩展运算函数库 |
| **应用市场** | 插件可作为独立商品在应用市场上架 |
| **审计日志** | 插件安装/卸载/配置变更记录审计日志 |
| **权限引擎** | 插件管理独立权限控制 |
| **Webhook** | 出站 Webhook 用于外部系统集成 |
