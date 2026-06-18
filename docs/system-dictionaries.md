# 系统级字典表

低代码平台运行所依赖的系统级枚举/字典数据，由平台统一维护，供各引擎引用。

---

## 📊 数据引擎相关

### 字段类型字典 (field_types)

| code | name | 说明 |
|------|------|------|
| string | 字符串 | 基础文本 |
| number | 数字 | 整数/浮点 |
| boolean | 布尔 | true/false |
| date | 日期 | 日期 |
| datetime | 日期时间 | 日期+时间 |
| json | JSON | 结构化数据 |
| text | 长文本 | 富文本/大段文字 |
| enum | 枚举 | 单选/多选值 |

### 格式化字段类型字典 (format_field_types)

| code | name | base_type | 说明 |
|------|------|-----------|------|
| email | 邮箱 | string | 自动格式校验 |
| phone | 手机号 | string | 支持国际号码 |
| idcard | 身份证 | string | 格式校验 + 脱敏 |
| address | 地址 | json | 省/市/区/街道 |
| daterange | 日期区间 | json | 起止日期 |
| currency | 金额 | decimal | 精度控制 |
| percentage | 百分比 | number | 0-100 |
| url | 链接 | string | URL 格式 |
| color | 颜色 | string | HEX/RGB |
| image | 图片 | string | 图片地址 |
| file | 文件 | string | 文件地址 |
| richtext | 富文本 | text | HTML 内容 |

---

## 🎨 渲染引擎相关

### 组件类型字典 (component_types)

| code | name | category | 说明 |
|------|------|----------|------|
| input | 输入框 | basic | 单行文本 |
| textarea | 文本域 | basic | 多行文本 |
| number | 数字输入 | basic | 数值输入 |
| select | 选择器 | basic | 下拉选择 |
| radio | 单选 | basic | 单选按钮 |
| checkbox | 多选 | basic | 复选框 |
| switch | 开关 | basic | 布尔切换 |
| datepicker | 日期选择 | basic | 日期/日期时间 |
| timepicker | 时间选择 | basic | 时间 |
| upload | 上传 | basic | 文件/图片上传 |
| button | 按钮 | basic | 操作按钮 |
| table | 表格 | advanced | 数据列表 |
| form | 表单 | advanced | 表单容器 |
| chart | 图表 | advanced | 数据可视化 |
| calendar | 日历 | advanced | 日程管理 |
| richtext | 富文本编辑 | advanced | 内容编辑 |
| tree | 树形控件 | advanced | 层级数据 |
| tabs | 标签页 | layout | 内容分区 |
| card | 卡片 | layout | 信息容器 |
| divider | 分割线 | layout | 视觉分隔 |
| grid | 栅格 | layout | 网格布局 |
| flex | 弹性布局 | layout | Flex 容器 |
| card:{{cardId}} | 自定义卡片 | custom | 用户创建的组合业务组件，动态注册 |

### 组件库字典 (component_libraries)

| code | name | version | 说明 |
|------|------|---------|------|
| antd | Ant Design | 6.x | 默认组件库 |
| element-plus | Element Plus | 2.x | Vue 生态组件库 |
| custom | 自定义 | - | 用户自定义组件库 |

### 布局类型字典 (layout_types)

| code | name | 说明 |
|------|------|------|
| flex | Flex 弹性布局 | 基于 CSS Flexbox |
| grid | Grid 网格布局 | 基于 CSS Grid |

### 设备类型字典 (device_types)

| code | name | 说明 |
|------|------|------|
| web | Web 端 | 桌面浏览器 |
| mobile | Mobile 端 | 移动端 H5 |
| miniapp | 小程序 | 微信/支付宝小程序 |

> 设计器预览仅支持 Web / Mobile 切换。小程序通过渲染引擎 `PlatformAdapter` 接口支持运行时渲染，但设计器中不提供小程序预览。

---

## 🖼️ 自动渲染引擎相关

### 表单布局模式字典 (form_layout_modes)

| code | name | 说明 |
|------|------|------|
| groups | 折叠分组 | 按 x-group 分折叠面板（默认） |
| tabs | 标签页 | 按 x-group 分 Tab 页签 |
| steps | 分步表单 | 每组为一步，分步填写 |
| sections | 平铺区块 | 无折叠，平铺展示 |

### 字段权限类型字典 (field_permission_types)

| code | name | 说明 |
|------|------|------|
| editable | 可编辑 | 正常读写 |
| readonly | 只读 | 可见但不可编辑 |
| hidden | 隐藏 | 不可见 |

### 变量绑定模式字典 (variable_binding_modes)

| code | name | 说明 |
|------|------|------|
| static | 静态值 | 直接输入固定值 |
| variable | 变量引用 | 从变量树中选择变量 |
| expression | 表达式 | 使用表达式编辑器编写 |

### 自动化触发类型字典 (automation_trigger_types)

| code | name | 说明 |
|------|------|------|
| data_change | 数据变更 | 实体记录增删改触发 |
| schedule | 定时任务 | Cron 调度触发 |
| form_event | 表单事件 | 表单提交/修改等事件触发 |
| workflow_event | 流程事件 | 流程完成/拒绝等事件触发 |
| custom_event | 自定义事件 | 代码主动触发 |

### 自动化动作类型字典 (automation_action_types)

| code | name | 说明 |
|------|------|------|
| trigger_workflow | 触发流程 | 启动指定流程实例 |
| send_notification | 发送通知 | 多渠道消息推送 |
| data_operation | 数据操作 | CRUD 数据操作 |
| api_call | API 调用 | 调用外部 API |
| webhook | Webhook | 推送事件到外部 URL |

### 条件运算符字典 (condition_operators)

| code | name | 适用类型 | 说明 |
|------|------|---------|------|
| eq | 等于 | all | 值相等 |
| neq | 不等于 | all | 值不相等 |
| gt | 大于 | number/date | 数值/日期比较 |
| gte | 大于等于 | number/date | 数值/日期比较 |
| lt | 小于 | number/date | 数值/日期比较 |
| lte | 小于等于 | number/date | 数值/日期比较 |
| contains | 包含 | string | 字符串包含 |
| not_contains | 不包含 | string | 字符串不包含 |
| starts_with | 开头是 | string | 字符串前缀 |
| ends_with | 结尾是 | string | 字符串后缀 |
| in | 在范围内 | array | 值在列表中 |
| not_in | 不在范围内 | array | 值不在列表中 |
| is_empty | 为空 | all | 值为 null/undefined/空 |
| is_not_empty | 不为空 | all | 值非空 |
| between | 区间 | number/date | 值在范围内 |
| regex | 正则匹配 | string | 正则表达式匹配 |

---

## ⚙️ 流程引擎相关

### 流程节点类型字典 (workflow_node_types)

| code | name | category | 说明 |
|------|------|----------|------|
| trigger | 触发器 | trigger | 流程起点 |
| condition | 条件判断 | gateway | 分支条件 |
| parallel | 并行网关 | gateway | 并行执行 |
| exclusive | 排他网关 | gateway | 唯一分支 |
| approval | 人工审批 | task | 审批节点 |
| countersign | 会签 | task | 多人审批 |
| api-call | API 调用 | task | 外部接口 |
| db-operation | 数据库操作 | task | 数据读写 |
| script | 脚本执行 | task | 自定义脚本 |
| notification | 通知 | task | 消息推送 |
| delay | 延时等待 | control | 定时等待 |
| end | 结束 | end | 流程终点 |

### 流程状态字典 (workflow_statuses)

| code | name | 说明 |
|------|------|------|
| draft | 草稿 | 未发布 |
| active | 已激活 | 运行中 |
| suspended | 已暂停 | 暂停运行 |
| archived | 已归档 | 已停用 |

### 流程实例状态字典 (workflow_instance_statuses)

| code | name | 说明 |
|------|------|------|
| running | 运行中 | 流程执行中 |
| pending | 待处理 | 等待审批/操作 |
| completed | 已完成 | 正常结束 |
| rejected | 已拒绝 | 审批拒绝 |
| cancelled | 已取消 | 手动终止 |
| failed | 执行失败 | 异常终止 |

---

## 🔐 权限引擎相关

### 权限类型字典 (permission_types)

| code | name | 说明 |
|------|------|------|
| menu | 菜单权限 | 页面/菜单可见性 |
| button | 按钮权限 | 操作按钮可用性 |
| data | 数据权限 | 行级数据可见性 |
| field | 字段权限 | 字段读写可见性 |
| api | 接口权限 | API 访问权限 |

### 数据权限范围字典 (data_scope_types)

| code | name | 说明 |
|------|------|------|
| all | 全部数据 | 所有数据可见 |
| department | 本部门 | 当前部门数据 |
| department-and-child | 本部门及下级 | 含子部门数据 |
| self | 仅本人 | 仅自己创建的数据 |
| custom | 自定义 | 自定义规则 |

---

## 🏢 多租户相关

### 租户套餐字典 (tenant_plans)

| code | name | 说明 |
|------|------|------|
| free | 免费版 | 基础功能 |
| pro | 专业版 | 高级功能 |
| enterprise | 企业版 | 全功能 + 定制 |

### 租户状态字典 (tenant_statuses)

| code | name | 说明 |
|------|------|------|
| active | 正常 | 正常使用 |
| suspended | 已冻结 | 欠费/违规冻结 |
| cancelled | 已注销 | 已注销 |

---

## 📦 应用管理相关

### 应用状态字典 (app_statuses)

| code | name | 说明 |
|------|------|------|
| draft | 草稿 | 开发中 |
| published | 已发布 | 已上线运行 |
| archived | 已归档 | 已下线 |

### 页面类型字典 (page_types)

| code | name | 说明 |
|------|------|------|
| list | 列表页 | 数据列表展示 |
| form | 表单页 | 数据录入/编辑 |
| detail | 详情页 | 数据详情展示 |
| dashboard | 仪表盘 | 数据统计看板 |
| custom | 自定义 | 自由布局 |

---

## 👤 用户相关

### 用户状态字典 (user_statuses)

| code | name | 说明 |
|------|------|------|
| active | 正常 | 正常使用 |
| disabled | 已禁用 | 管理员禁用 |
| locked | 已锁定 | 登录失败锁定 |
| pending | 待激活 | 未完成激活 |

### 认证方式字典 (auth_methods)

| code | name | 说明 |
|------|------|------|
| password | 密码登录 | 账号密码 |
| sms | 短信验证码 | 手机号登录 |
| oauth | OAuth | 第三方登录 |
| ldap | LDAP | 企业目录 |
| saml | SAML | SSO 单点登录 |

---

## 📋 审计日志相关

### 审计事件分类字典 (audit_event_categories)

| code | name | 级别 | 说明 |
|------|------|------|------|
| auth | 认证事件 | 平台级 | 登录/登出/密码变更 |
| permission | 授权事件 | 平台级 | 角色/权限变更 |
| tenant | 租户事件 | 平台级 | 租户管理操作 |
| system | 系统事件 | 平台级 | 系统配置/备份/恢复 |
| data | 数据事件 | 应用级 | 数据 CRUD/导入/导出 |
| workflow | 流程事件 | 应用级 | 流程提交/审批/撤销 |
| app | 应用事件 | 应用级 | 应用发布/回滚/配置 |

### 审计操作类型字典 (audit_action_types)

| code | name | category | 默认记录级别 |
|------|------|----------|-------------|
| auth.login | 登录成功 | auth | 平台级 |
| auth.login_failed | 登录失败 | auth | 平台级 |
| auth.logout | 登出 | auth | 平台级 |
| auth.password_change | 密码修改 | auth | 平台级 |
| auth.mfa_enable | 开启多因素认证 | auth | 平台级 |
| auth.mfa_disable | 关闭多因素认证 | auth | 平台级 |
| permission.role_create | 创建角色 | permission | 平台级 |
| permission.role_update | 修改角色权限 | permission | 平台级 |
| permission.role_delete | 删除角色 | permission | 平台级 |
| permission.assign | 分配角色 | permission | 平台级 |
| permission.revoke | 撤销角色 | permission | 平台级 |
| tenant.create | 创建租户 | tenant | 平台级 |
| tenant.update | 修改租户配置 | tenant | 平台级 |
| tenant.suspend | 冻结租户 | tenant | 平台级 |
| tenant.activate | 激活租户 | tenant | 平台级 |
| tenant.quota_change | 修改配额 | tenant | 平台级 |
| system.config_change | 系统配置变更 | system | 平台级 |
| system.dict_change | 字典变更 | system | 平台级 |
| system.data_export | 数据导出 | system | 平台级 |
| system.backup | 系统备份 | system | 平台级 |
| system.restore | 系统恢复 | system | 平台级 |
| data.create | 新增数据 | data | 关键 |
| data.update | 修改数据 | data | 全量 |
| data.delete | 删除数据 | data | 关键 |
| data.batch_delete | 批量删除 | data | 关键 |
| data.import | 数据导入 | data | 关键 |
| data.export | 数据导出 | data | 关键 |
| workflow.submit | 提交审批 | workflow | 关键 |
| workflow.approve | 审批通过 | workflow | 关键 |
| workflow.reject | 审批拒绝 | workflow | 关键 |
| workflow.cancel | 撤销流程 | workflow | 关键 |
| app.publish | 发布应用 | app | 关键 |
| app.rollback | 回滚版本 | app | 关键 |
| app.config_change | 应用配置变更 | app | 关键 |
| app.page_save | 保存页面 | app | 全量 |

### 审计记录级别字典 (audit_log_levels)

| code | name | 说明 |
|------|------|------|
| off | 关闭 | 不记录 |
| critical | 仅关键 | 仅记录删除、导出、权限相关等高风险操作 |
| full | 全量 | 记录所有操作 |

### 审计操作结果字典 (audit_results)

| code | name | 说明 |
|------|------|------|
| success | 成功 | 操作执行成功 |
| failure | 失败 | 操作执行失败 |

---

## 🔗 组织架构集成相关

### 适配器类型字典 (org_adapter_types)

| code | name | 说明 |
|------|------|------|
| wecom | 企业微信 | 企业微信通讯录同步 |
| dingtalk | 钉钉 | 钉钉通讯录同步 |
| feishu | 飞书 | 飞书通讯录同步 |
| hr-api | HR 系统 API | 标准 REST API 对接 |
| ldap | LDAP / AD | LDAP / Active Directory 同步 |
| custom | 自定义 | 用户自定义适配器 |

### 同步状态字典 (sync_statuses)

| code | name | 说明 |
|------|------|------|
| idle | 空闲 | 未在同步 |
| running | 同步中 | 正在执行同步 |
| success | 成功 | 最近一次同步成功 |
| partial | 部分成功 | 最近一次同步部分记录失败 |
| failed | 失败 | 最近一次同步失败 |

### 员工状态字典 (employee_external_statuses)

| code | name | 说明 |
|------|------|------|
| active | 在职 | 正常在职 |
| inactive | 已禁用 | 账号禁用 |
| dimission | 已离职 | 已办理离职 |

---

## 📬 消息中心相关

### 消息渠道字典 (message_channels)

| code | name | 说明 |
|------|------|------|
| site | 站内消息 | 平台内消息中心 |
| email | 邮件 | SMTP 外发邮件 |
| sms | 短信 | 短信网关 |
| wecom | 企业微信 | 企业微信应用消息 |
| dingtalk | 钉钉 | 钉钉工作通知 |
| feishu | 飞书 | 飞书应用消息 |

### 消息状态字典 (message_statuses)

| code | name | 说明 |
|------|------|------|
| pending | 待发送 | 消息已创建，等待发送 |
| sent | 已发送 | 已发送到渠道 |
| delivered | 已送达 | 渠道确认送达 |
| failed | 发送失败 | 发送失败 |

### 消息分类字典 (message_categories)

| code | name | 说明 |
|------|------|------|
| workflow | 流程通知 | 审批提醒、流程状态变更 |
| system | 系统通知 | 系统公告、安全告警 |
| data | 数据通知 | 导入导出完成、数据同步 |
| security | 安全通知 | 异常登录、密码变更 |
| marketing | 营销通知 | 活动推广（可选） |

### 公告级别字典 (announcement_levels)

| code | name | 说明 |
|------|------|------|
| info | 通知 | 普通通知 |
| warning | 重要 | 重要提醒 |
| urgent | 紧急 | 紧急公告，需确认 |

---

## 🌐 国际化相关

### 语言代码字典 (locale_codes)

| code | name | direction | 说明 |
|------|------|-----------|------|
| zh-CN | 简体中文 | LTR | 默认语言 |
| zh-TW | 繁体中文 | LTR | |
| en-US | English | LTR | |
| ja-JP | 日本語 | LTR | |
| ko-KR | 한국어 | LTR | |
| ar-SA | العربية | RTL | 阿拉伯语 |
| he-IL | עברית | RTL | 希伯来语 |

### 布局方向字典 (layout_directions)

| code | name | 说明 |
|------|------|------|
| ltr | 从左到右 | 默认布局方向 |
| rtl | 从右到左 | 阿拉伯语等语言 |

---

## 📝 表单引擎相关

### 表单控件类型字典 (form_control_types)

| code | name | category | 说明 |
|------|------|----------|------|
| input | 输入框 | basic | 单行文本 |
| textarea | 文本域 | basic | 多行文本 |
| number | 数字输入 | basic | 数值 |
| select | 选择器 | basic | 下拉选择 |
| radio | 单选 | basic | 单选按钮 |
| checkbox | 多选 | basic | 复选框 |
| switch | 开关 | basic | 布尔切换 |
| datepicker | 日期选择 | basic | 日期/日期时间 |
| timepicker | 时间选择 | basic | 时间 |
| upload | 上传 | basic | 文件上传 |
| cascader | 级联选择 | advanced | 省市区等层级 |
| transfer | 穿梭框 | advanced | 双向选择 |
| slider | 滑块 | advanced | 范围选择 |
| rate | 评分 | advanced | 星级评分 |
| color | 颜色 | advanced | 颜色选择 |
| signature | 签名 | special | 手写签名 |
| location | 地理位置 | special | 经纬度+地址 |
| barcode | 扫码 | special | 条形码/二维码 |
| subform | 子表单 | special | 一对多明细表 |
| relation | 关联记录 | special | 引用其他实体 |

### 联动类型字典 (linkage_types)

| code | name | 说明 |
|------|------|------|
| value | 值联动 | 更新目标字段值 |
| options | 选项联动 | 更新目标字段选项列表 |
| visible | 显隐联动 | 控制目标字段显示/隐藏 |
| disabled | 禁用联动 | 控制目标字段启用/禁用 |
| required | 必填联动 | 控制目标字段必填状态 |
| attribute | 属性联动 | 修改目标字段其他属性 |

### 校验触发时机字典 (validation_triggers)

| code | name | 说明 |
|------|------|------|
| onChange | 值变化时 | 字段值改变立即校验 |
| onBlur | 失焦时 | 字段失去焦点时校验 |
| onSubmit | 提交时 | 表单提交时校验 |
| manual | 手动触发 | 代码主动触发校验 |

---

## 📡 可观测性相关

### 告警级别字典 (alert_severity_levels)

| code | name | 说明 | 通知方式 |
|------|------|------|---------|
| p0 | 致命 | 服务不可用、数据丢失 | 电话+短信+IM |
| p1 | 严重 | 核心功能受损 | 短信+IM |
| p2 | 警告 | 性能下降 | IM |
| p3 | 提示 | 非核心异常 | 邮件 |

### 告警状态字典 (alert_statuses)

| code | name | 说明 |
|------|------|------|
| firing | 触发中 | 告警条件持续满足 |
| resolved | 已恢复 | 告警条件不再满足 |
| silenced | 已静默 | 手动静默 |
| acknowledged | 已确认 | 已有人认领处理 |

### Web Vitals 评级字典 (web_vitals_ratings)

| code | name | LCP 阈值 | FID 阈值 | CLS 阈值 |
|------|------|---------|---------|---------|
| good | 良好 | < 2.5s | < 100ms | < 0.1 |
| needs-improvement | 需改进 | 2.5s-4s | 100ms-300ms | 0.1-0.25 |
| poor | 差 | > 4s | > 300ms | > 0.25 |

---

## 🏪 应用市场相关

### 模板状态字典 (template_statuses)

| code | name | 说明 |
|------|------|------|
| draft | 草稿 | 编辑中 |
| pending | 待审核 | 已提交审核 |
| reviewing | 审核中 | 审核人员审核中 |
| published | 已上架 | 审核通过，已上架 |
| rejected | 已拒绝 | 审核未通过 |
| archived | 已下架 | 已下架 |

### 模板分类字典 (template_categories)

| code | name | 说明 |
|------|------|------|
| sales | 销售管理 | CRM、销售漏斗 |
| hr | 人力资源 | 人事、招聘、考勤 |
| finance | 财务管理 | 报销、预算、合同 |
| project | 项目管理 | 任务、甘特图 |
| inventory | 进销存 | 采购、库存、出库 |
| office | 办公协作 | 审批、公告、预约 |
| education | 教育培训 | 课程、学员、考试 |
| healthcare | 医疗健康 | 患者、预约、病历 |
| iot | 物联网 | 设备、采集、告警 |
| other | 其他 | 未归类 |

### 模板定价类型字典 (template_pricing_types)

| code | name | 说明 |
|------|------|------|
| free | 免费 | 完全免费 |
| paid | 付费 | 付费购买 |
| freemium | 免费增值 | 基础免费，高级功能付费 |

### 发布者类型字典 (publisher_types)

| code | name | 说明 |
|------|------|------|
| user | 普通用户 | 平台用户 |
| isv | ISV 厂商 | 独立软件供应商 |
| official | 官方 | 平台官方发布 |

---

## 🔌 开发者扩展相关

### 插件类型字典 (plugin_types)

| code | name | 说明 |
|------|------|------|
| component | 组件插件 | 自定义渲染组件 |
| workflow-node | 流程节点插件 | 自定义流程执行节点 |
| datasource | 数据源插件 | 自定义数据源连接器 |
| function | 函数插件 | 自定义运算函数 |
| theme | 主题插件 | 自定义主题风格 |

### 插件状态字典 (plugin_statuses)

| code | name | 说明 |
|------|------|------|
| draft | 草稿 | 开发中 |
| pending | 待审核 | 已提交审核 |
| approved | 已通过 | 审核通过 |
| published | 已发布 | 已上架 |
| rejected | 已拒绝 | 审核未通过 |
| disabled | 已禁用 | 管理员禁用 |

### Webhook 事件类型字典 (webhook_event_types)

| code | name | 说明 |
|------|------|------|
| entity.created | 记录创建 | 实体记录新增 |
| entity.updated | 记录更新 | 实体记录修改 |
| entity.deleted | 记录删除 | 实体记录删除 |
| workflow.started | 流程启动 | 流程实例启动 |
| workflow.completed | 流程完成 | 流程实例完成 |
| app.published | 应用发布 | 应用发布上线 |
| org.synced | 组织同步 | 组织架构同步完成 |

### Webhook 状态字典 (webhook_statuses)

| code | name | 说明 |
|------|------|------|
| active | 启用 | 正常接收事件 |
| disabled | 禁用 | 暂停事件推送 |
| failed | 异常 | 连续失败超过阈值 |

### API 错误码分类字典 (api_error_code_ranges)

| 范围 | 分类 | 说明 |
|------|------|------|
| 0 | 成功 | 操作成功 |
| 10000-19999 | 认证授权 | 登录/权限相关错误 |
| 20000-29999 | 参数业务 | 参数校验/业务规则错误 |
| 30000-39999 | 资源限制 | 配额/限流相关 |
| 50000-59999 | 系统错误 | 服务器内部错误 |

---

## 📝 系统通用

### 动作类型字典 (action_types)

平台统一的动作类型注册表，供渲染引擎事件系统、表单引擎动作链、自动化引擎动作、流程引擎节点动作共用。所有动作完全可序列化为 JSON。

| code | name | category | 适用引擎 | 参数 | 说明 |
|------|------|----------|---------|------|------|
| navigate | 页面跳转 | navigation | 渲染/表单 | `url`, `params`, `target` | 跳转到指定页面 |
| openPage | 打开新页面 | navigation | 渲染/表单 | `url`, `params` | 新窗口/Tab 打开 |
| goBack | 返回上一页 | navigation | 渲染/表单 | 无 | 浏览器后退 |
| refresh | 刷新页面 | navigation | 渲染/表单 | 无 | 刷新当前页面 |
| setValue | 设置值 | data | 渲染/表单/自动化 | `target`, `value` | 设置组件/字段值 |
| setValues | 批量设值 | data | 渲染/表单/自动化 | `values: Record<string, any>` | 批量设置多个值 |
| resetValue | 重置值 | data | 表单 | `target` | 重置为默认值 |
| submit | 提交表单 | data | 表单 | `api`, `redirectUrl` | 提交并跳转 |
| apiCall | 调用 API | data | 渲染/表单/自动化/流程 | `api`, `method`, `data`, `headers` | 调用后端 API |
| invokeMethod | 调用组件方法 | data | 渲染/表单 | `target`, `method`, `params` | 调用卡片/组件暴露的方法 |
| showModal | 打开弹窗 | ui | 渲染/表单 | `modalId`, `data` | 打开模态弹窗 |
| closeModal | 关闭弹窗 | ui | 渲染/表单 | `modalId` | 关闭模态弹窗 |
| message | 消息提示 | ui | 渲染/表单/自动化/流程 | `type`, `content`, `duration` | 显示提示消息 |
| notification | 通知提醒 | ui | 渲染/表单/自动化 | `title`, `content`, `type` | 显示通知 |
| refreshComponent | 刷新组件 | ui | 渲染/表单 | `target` | 重新加载组件数据 |
| showLoading | 显示加载 | ui | 渲染/表单 | `target`, `text` | 显示加载状态 |
| hideLoading | 隐藏加载 | ui | 渲染/表单 | `target` | 隐藏加载状态 |
| copyToClipboard | 复制到剪贴板 | utility | 渲染/表单 | `text` | 复制文本到系统剪贴板 |
| triggerWorkflow | 触发流程 | workflow | 自动化/流程 | `workflowId`, `inputData` | 启动流程实例 |
| sendNotification | 发送通知 | notification | 自动化/流程 | `channels`, `templateId`, `recipients` | 多渠道消息推送 |
| executeScript | 执行脚本 | script | 自动化/流程 | `script`, `language` | 执行自定义脚本 |
| webhook | 调用 Webhook | integration | 自动化 | `url`, `method`, `data`, `headers` | 推送事件到外部 |
| condition | 条件分支 | control | 渲染/表单/自动化/流程 | `condition`, `then`, `else` | 条件判断分支 |
| loop | 循环 | control | 自动化/流程 | `items`, `actions` | 遍历执行动作链 |
| delay | 延时 | control | 自动化/流程 | `duration` | 延时后继续执行 |
| parallel | 并行执行 | control | 自动化/流程 | `actions[]` | 并行执行多个动作 |

> 动作类型注册表可扩展，各引擎可通过 `registerAction(code, handler)` 注册自定义动作类型。

### 操作类型字典 (operation_types)

| code | name | 说明 |
|------|------|------|
| create | 新增 | 创建数据 |
| update | 修改 | 更新数据 |
| delete | 删除 | 删除数据 |
| query | 查询 | 查询数据 |
| export | 导出 | 导出数据 |
| import | 导入 | 导入数据 |
| publish | 发布 | 发布应用 |
| deploy | 部署 | 部署应用 |

### 数据源类型字典 (datasource_types)

| code | name | 说明 |
|------|------|------|
| mysql | MySQL | MySQL 数据库 |
| postgresql | PostgreSQL | PostgreSQL 数据库 |
| mongodb | MongoDB | MongoDB 文档库 |
| api | 外部 API | RESTful API |
| redis | Redis | 缓存数据源 |

### 主题模式字典 (theme_modes)

| code | name | 说明 |
|------|------|------|
| light | 浅色模式 | 默认主题 |
| dark | 深色模式 | 暗色主题 |
| auto | 跟随系统 | 自动切换 |

---

## 🏢 租户管理后台相关

### OpenKey 状态字典 (openkey_statuses)

| code | name | 说明 |
|------|------|------|
| active | 启用 | 正常使用 |
| disabled | 停用 | 手动停用 |
| expired | 已过期 | 超过有效期 |

### OpenKey 资源类型字典 (openkey_resource_types)

| code | name | 说明 |
|------|------|------|
| entity | 实体 | 实体数据读写 |
| table | 数据表 | 数据表数据读写 |
| workflow | 流程 | 流程触发/查询 |
| api | API | 自定义 API 调用 |

### OpenKey 操作类型字典 (openkey_actions)

| code | name | 说明 |
|------|------|------|
| read | 读取 | 查询/读取数据 |
| write | 写入 | 新增/修改数据 |
| delete | 删除 | 删除数据 |

### 协作任务状态字典 (collaboration_task_statuses)

| code | name | 说明 |
|------|------|------|
| pending | 待处理 | 已创建未开始 |
| in_progress | 进行中 | 处理中 |
| completed | 已完成 | 处理完成 |
| closed | 已关闭 | 手动关闭 |

### 审批超时动作字典 (approval_timeout_actions)

| code | name | 说明 |
|------|------|------|
| auto_approve | 自动通过 | 超时后自动审批通过 |
| auto_reject | 自动拒绝 | 超时后自动审批拒绝 |
| escalate | 升级处理 | 超时后转交上级处理 |

### 审批回退目标字典 (approval_rollback_targets)

| code | name | 说明 |
|------|------|------|
| previous | 上一步 | 回退到上一个审批节点 |
| initiator | 发起人 | 回退到流程发起人 |
| specific | 指定节点 | 回退到指定的审批节点 |

### 部门来源字典 (department_sources)

| code | name | 说明 |
|------|------|------|
| native | 平台创建 | 管理员手动创建 |
| synced | 第三方同步 | 从企业微信/钉钉/飞书等同步 |

### 岗位分类字典 (position_categories)

| code | name | 说明 |
|------|------|------|
| management | 管理类 | 管理岗位 |
| technical | 技术类 | 技术岗位 |
| business | 业务类 | 业务岗位 |
| support | 支持类 | 支持岗位 |

### 应用可见性字典 (app_visibility)

| code | name | 说明 |
|------|------|------|
| private | 私有 | 仅应用管理员可访问 |
| internal | 内部 | 租户内指定角色可访问 |
| public | 公开 | 租户内所有用户可访问 |

### 字典作用域字典 (dictionary_scopes)

| code | name | 说明 |
|------|------|------|
| tenant | 租户级 | 租户内所有应用可引用 |
| app | 应用级 | 仅所属应用可引用 |
