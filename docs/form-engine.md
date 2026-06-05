# 表单引擎 (Form Engine)

企业级表单能力，支持复杂表单联动、校验引擎、子表单、特殊控件、数据暂存等高级场景。

## 表单引擎定位

```
┌─────────────────────────────────────────────────────────────────┐
│                        渲染引擎                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    页面设计器                               │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐  │  │
│  │  │基础组件  │  │高级组件  │  │布局组件  │  │  表单容器    │  │  │
│  │  │Input    │  │Table    │  │Grid     │  │  (Form)     │  │  │
│  │  │Select   │  │Chart    │  │Flex     │  │             │  │  │
│  │  │Button   │  │Calendar │  │Tabs     │  │  ┌────────┐ │  │  │
│  │  │...      │  │...      │  │...      │  │  │ 表单引擎 │ │  │  │
│  │  └─────────┘  └─────────┘  └─────────┘  │  └────────┘ │  │  │
│  │                                          └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

表单引擎负责：
· 字段联动与条件渲染
· 数据校验（同步/异步/自定义）
· 子表单（一对多数据录入）
· 特殊控件（签名、地理位置等）
· 数据暂存与草稿
· 表单提交与数据流转
```

## 表单联动

### 联动类型

| 联动类型 | 说明 | 示例 |
|---------|------|------|
| **值联动** | 字段 A 变化 → 更新字段 B 的值 | 选择省份 → 自动填充区号 |
| **条件赋值** | 多条件分支 → 赋值（类似 Vue computed） | 客户等级+金额 → 折扣率 |
| **选项联动** | 字段 A 变化 → 更新字段 B 的选项 | 选择城市 → 更新门店列表 |
| **显隐联动** | 字段 A 变化 → 控制字段 B 的显隐 | 选择"其他" → 显示备注输入框 |
| **属性联动** | 字段 A 变化 → 修改字段 B 的属性 | 选择"VIP" → 启用折扣字段 |
| **跨表单联动** | 当前表单字段引用其他表单数据 | 关联客户表单 → 自动填充客户信息 |

### 联动规则定义

```jsonc
{
  "formId": "form_order",
  "linkages": [
    {
      "id": "linkage_001",
      "type": "value",
      "trigger": { "field": "province" },
      "target": { "field": "areaCode" },
      "rule": {
        "type": "map",
        "mapping": {
          "北京": "010",
          "上海": "021",
          "广州": "020",
          "深圳": "0755"
        }
      }
    },
    {
      "id": "linkage_002",
      "type": "options",
      "trigger": { "field": "city" },
      "target": { "field": "store" },
      "rule": {
        "type": "query",
        "dataSource": "entity_store",
        "filter": "store.city_id = {{city}}",
        "labelField": "store_name",
        "valueField": "store_id"
      }
    },
    {
      "id": "linkage_003",
      "type": "visible",
      "trigger": { "field": "hasRemark" },
      "target": { "field": "remark" },
      "rule": {
        "condition": "hasRemark === true"
      }
    },
    {
      "id": "linkage_004",
      "type": "value",
      "trigger": { "field": "quantity", "field2": "unitPrice" },
      "target": { "field": "totalAmount" },
      "rule": {
        "type": "expression",
        "expression": "quantity * unitPrice"
      }
    },
    {
      "id": "linkage_005",
      "type": "value",
      "trigger": { "field": "customerLevel" },
      "target": { "field": "discount" },
      "rule": {
        "type": "conditional",
        "branches": [
          {
            "condition": "customerLevel === 'svip' && orderAmount > 10000",
            "value": 0.7
          },
          {
            "condition": "customerLevel === 'vip' && orderAmount > 5000",
            "value": 0.85
          },
          {
            "condition": "orderAmount > 1000",
            "value": 0.95
          }
        ],
        "default": 1.0
      }
    },
    {
      "id": "linkage_006",
      "type": "value",
      "trigger": { "field": "region" },
      "target": { "field": "manager" },
      "rule": {
        "type": "conditional",
        "branches": [
          {
            "condition": "region === 'east'",
            "value": "currentUser.department.managerEast",
            "valueType": "variable"
          },
          {
            "condition": "region === 'west'",
            "value": "currentUser.department.managerWest",
            "valueType": "variable"
          }
        ],
        "default": "currentUser.department.managerDefault"
      }
    }
  ]
}
```

### 联动执行引擎

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 字段值变更    │────▶│ 联动规则匹配  │────▶│ 依赖图分析    │
│ (onChange)   │     │              │     │ (DAG)        │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │ 拓扑排序执行   │
                                          │ (避免循环依赖) │
                                          └──────┬───────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    ▼                             ▼                             ▼
            ┌──────────────┐            ┌──────────────┐            ┌──────────────┐
            │ 值联动执行    │            │ 选项联动执行  │            │ 显隐/属性联动 │
            └──────────────┘            └──────────────┘            └──────────────┘
```

**循环依赖检测**：联动规则构建有向无环图 (DAG)，执行前进行拓扑排序，检测到循环依赖时给出明确错误提示。

## 表单校验引擎

### 校验层次

```
┌─────────────────────────────────────────────────────────────────┐
│                       校验层次模型                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Level 1: 基础校验（同步，即时反馈）                               │
│  · required — 必填校验                                          │
│  · type — 类型校验（string/number/email/phone/url）              │
│  · range — 范围校验（min/max/minLength/maxLength）               │
│  · pattern — 正则校验                                           │
│  · enum — 枚举值校验                                            │
│                                                                 │
│  Level 2: 自定义校验（同步/异步）                                  │
│  · validator — 自定义校验函数                                    │
│  · asyncValidator — 异步校验（如：用户名是否已存在）                │
│                                                                 │
│  Level 3: 跨字段校验（异步）                                      │
│  · 日期区间：结束日期 ≥ 开始日期                                   │
│  · 金额校验：明细金额合计 = 总金额                                 │
│  · 唯一性组合：多个字段组合唯一                                    │
│                                                                 │
│  Level 4: 服务端校验（提交时）                                     │
│  · 后端业务规则校验                                               │
│  · 唯一约束校验                                                  │
│  · 权限校验（是否有权操作该数据）                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 校验规则定义

```jsonc
{
  "field": "email",
  "validation": {
    "required": true,
    "type": "email",
    "maxLength": 100,
    "asyncValidator": {
      "type": "api",
      "url": "/api/check-email",
      "params": { "excludeId": "{{currentId}}" },
      "message": "该邮箱已被使用"
    }
  }
}
```

```jsonc
{
  "formId": "form_order",
  "crossFieldValidation": [
    {
      "name": "日期区间校验",
      "fields": ["startDate", "endDate"],
      "rule": "endDate >= startDate",
      "message": "结束日期不能早于开始日期",
      "targetField": "endDate"
    },
    {
      "name": "金额一致性",
      "fields": ["items", "totalAmount"],
      "rule": "SUM(items, 'amount') === totalAmount",
      "message": "明细金额合计与总金额不一致",
      "targetField": "totalAmount"
    }
  ]
}
```

### 校验触发时机

| 时机 | 说明 | 适用级别 |
|------|------|---------|
| `onChange` | 字段值变化时立即校验 | Level 1 基础校验 |
| `onBlur` | 字段失焦时校验 | Level 1 + Level 2 |
| `onSubmit` | 表单提交时全量校验 | Level 1 ~ 4 |
| `manual` | 手动触发校验 | 全部 |

## 子表单（明细表）

### 使用场景

- 订单明细（一个订单包含多个商品）
- 教育经历（一个人有多段教育经历）
- 费用报销明细（一张报销单包含多个费用条目）

### 子表单 Schema

```jsonc
{
  "field": "orderItems",
  "type": "subform",
  "label": "订单明细",
  "config": {
    "minRows": 1,
    "maxRows": 50,
    "addable": true,
    "removable": true,
    "sortable": true,
    "copyable": true
  },
  "columns": [
    {
      "field": "productName",
      "type": "select",
      "label": "产品名称",
      "dataSource": "entity_product",
      "required": true
    },
    {
      "field": "quantity",
      "type": "number",
      "label": "数量",
      "validation": { "min": 1, "max": 9999 }
    },
    {
      "field": "unitPrice",
      "type": "currency",
      "label": "单价",
      "readonly": true,
      "linkage": {
        "trigger": "productName",
        "rule": "query_product_price(productName)"
      }
    },
    {
      "field": "amount",
      "type": "currency",
      "label": "金额",
      "readonly": true,
      "expression": "quantity * unitPrice"
    }
  ],
  "summary": {
    "totalAmount": "SUM(amount)",
    "totalCount": "COUNT()"
  }
}
```

### 子表单渲染效果

```
┌─────────────────────────────────────────────────────────────────┐
│  订单明细                              [+ 添加行] [从模板导入]     │
├──────┬──────────────┬──────────┬──────────┬──────────┬──────────┤
│ 序号  │ 产品名称      │ 数量      │ 单价      │ 金额      │ 操作     │
├──────┼──────────────┼──────────┼──────────┼──────────┼──────────┤
│  1   │ [产品A    ▼] │ [10]     │ ¥100.00  │ ¥1,000.00│ 复制│删除 │
├──────┼──────────────┼──────────┼──────────┼──────────┼──────────┤
│  2   │ [产品B    ▼] │ [5]      │ ¥200.00  │ ¥1,000.00│ 复制│删除 │
├──────┼──────────────┼──────────┼──────────┼──────────┼──────────┤
│  3   │ [          ▼]│ [  ]     │ ¥  0.00  │ ¥    0.00│ 复制│删除 │
├──────┴──────────────┴──────────┼──────────┼──────────┼──────────┤
│  合计                           │ 15       │          │ ¥2,000.00│
└────────────────────────────────┴──────────┴──────────┴──────────┘
```

## 特殊控件

### 控件清单

| 控件类型 | 说明 | 存储格式 |
|---------|------|---------|
| **签名 (Signature)** | 手写签名/电子签名 | Base64 图片 / 签名服务URL |
| **地理位置 (Location)** | 经纬度 + 详细地址 | `{lat, lng, address}` |
| **扫码 (Barcode)** | 扫描条形码/二维码 | 字符串 |
| **手写审批意见 (Handwriting)** | 审批意见手写输入 | Base64 图片 |
| **关联记录 (Relation)** | 引用其他数据表记录 | 关联记录 ID 数组 |
| **附件 (Attachment)** | 多文件上传 | 文件对象数组 |
| **评分 (Rating)** | 星级评分 | 数字 (1-5) |
| **颜色 (Color)** | 颜色选择器 | HEX/RGB 字符串 |
| **级联选择 (Cascade)** | 省市区等层级选择 | 值数组 `["province", "city", "district"]` |

### 签名控件配置

```jsonc
{
  "field": "approvalSignature",
  "type": "signature",
  "label": "审批签名",
  "config": {
    "mode": "handwrite",           // handwrite | esignature | both
    "penColor": "#000000",
    "penWidth": 3,
    "canvasWidth": 400,
    "canvasHeight": 200,
    "backgroundColor": "#ffffff",
    "required": true,
    "storageType": "base64",       // base64 | oss
    "watermark": {
      "text": "{{currentUser}} {{currentDate}}",
      "color": "#cccccc"
    }
  }
}
```

### 地理位置控件配置

```jsonc
{
  "field": "visitLocation",
  "type": "location",
  "label": "拜访地点",
  "config": {
    "autoLocate": true,            // 自动获取当前位置
    "mapProvider": "amap",         // amap | bmap | google
    "precision": 6,                // 经纬度精度
    "showMap": true,               // 显示地图选择
    "fields": {
      "latitude": "lat",
      "longitude": "lng",
      "address": "formatted_address",
      "province": "addressComponent.province",
      "city": "addressComponent.city"
    }
  }
}
```

## 数据暂存与草稿

### 暂存策略

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 用户填写表单  │────▶│ 自动暂存      │────▶│ 草稿保存      │
│              │     │ (防丢失)      │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                     ┌──────▼──────┐       ┌──────▼──────┐
                     │ localStorage │       │  服务端草稿   │
                     │ (浏览器本地)  │       │  (跨设备)    │
                     └─────────────┘       └─────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ 用户再次打开  │────▶│ 检测到草稿    │────▶│ 恢复/丢弃选择 │
│ 同一表单     │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 自动暂存配置

```jsonc
{
  "formId": "form_order",
  "draft": {
    "enabled": true,
    "autoSave": true,
    "autoSaveInterval": 30,        // 自动暂存间隔（秒）
    "storage": "local",            // local | server | both
    "expireDays": 7,               // 草稿保留天数
    "maxDrafts": 10                // 最大草稿数
  }
}
```

### 草稿数据模型

```jsonc
{
  "draftId": "draft_001",
  "formId": "form_order",
  "entityId": "entity_order",
  "userId": "user_001",
  "recordId": null,                // null = 新建草稿，有值 = 编辑草稿
  "data": {
    "customer": "cust_001",
    "orderDate": "2024-01-15",
    "items": [...],
    "_meta": {
      "lastSavedAt": "2024-01-15T10:30:00Z",
      "completedFields": 12,
      "totalFields": 20
    }
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "expiresAt": "2024-01-22T10:30:00Z"
}
```

## 表单提交流程

```
┌──────────────┐
│ 用户点击提交  │
└──────┬───────┘
       ▼
┌──────────────┐     ┌──────────────┐
│ Level 1-3    │────▶│ 校验失败？    │──── 是 ──▶ 显示错误信息
│ 客户端校验   │     │              │           定位到错误字段
└──────────────┘     └──────┬───────┘
                            │ 否
                            ▼
                    ┌──────────────┐
                    │ 提交到服务端   │
                    └──────┬───────┘
                           ▼
                    ┌──────────────┐     ┌──────────────┐
                    │ Level 4      │────▶│ 校验失败？    │──── 是 ──▶ 返回错误
                    │ 服务端校验    │     │              │
                    └──────────────┘     └──────┬───────┘
                                                │ 否
                                                ▼
                                        ┌──────────────┐
                                        │ 数据落库       │
                                        └──────┬───────┘
                                               ▼
                                        ┌──────────────┐
                                        │ 触发后续流程   │
                                        │ · 工作流触发   │
                                        │ · 运算引擎    │
                                        │ · 消息通知    │
                                        │ · 审计日志    │
                                        └──────────────┘
```

### 按钮触发与流程快照

表单提交按钮可配置触发流程，提交时业务表写草稿占位、初始数据写入快照表：

```jsonc
{
  "type": "submit",
  "label": "提交审批",
  "actions": [
    { "type": "saveRecord", "tableId": "orders" },
    {
      "type": "triggerWorkflow",
      "workflowId": "wf_order_approval",
      "snapshotOptions": {
        "fields": ["orderNo", "amount", "items", "applicant"],
        "includeComputedFields": true
      }
    }
  ]
}
```

执行时序：表单校验 → 业务表写草稿(status=pending) → 服务端校验 → 初始快照写入快照表 → 启动流程实例

> 📄 流程快照的完整机制详见 [流程引擎文档 - 快照机制](workflow-engine.md#快照机制)

### 流程节点中的表单

流程审批节点可嵌入表单，数据从快照表加载而非业务表：

```
┌─────────────────────────────────────────────────────────────┐
│  审批节点表单                                                │
│                                                             │
│  数据来源：从快照表加载上一节点的流出快照                       │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ 只读区域          │  │ 可编辑区域        │                │
│  │ · 订单号          │  │ · 审批意见        │                │
│  │ · 金额            │  │ · 预算编码        │                │
│  │ · 商品明细        │  │ · 附加备注        │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  提交时：合并只读+可编辑数据 → 写入流出快照（快照表）           │
│  业务表全程不动，审批结束后终态数据才回写业务表                  │
└─────────────────────────────────────────────────────────────┘
```

## 与现有模块的关系

| 模块 | 关系 |
|------|------|
| **渲染引擎** | 表单作为渲染引擎的核心容器组件，表单引擎提供表单内部的高级能力 |
| **数据引擎** | 表单字段与实体字段映射，格式化字段类型自动关联对应表单控件 |
| **流程引擎** | 表单提交可触发流程，审批节点嵌入表单进行数据填写/审批 |
| **运算引擎** | 字段联动和子表单汇总通过运算引擎计算 |
| **权限引擎** | 表单级别的字段权限（可见/可编辑）由权限引擎控制 |
| **国际化** | 表单标签、校验信息、占位提示支持多语言 |

> 📄 表单运行时的初始值注入、联动执行引擎、组件事件桥接等实现方案详见 [表单运行时架构](form-runtime-architecture.md)
