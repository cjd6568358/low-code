# PROGRESS — 工作进度台账

> **用法**：每完成一项**立即**改 `[ ]` → `[x]` 并保存，不要攒着最后一起更新。
> 新增任务直接追加到对应阶段，不要重排已有编号。

- **路线图**（稳定、少改）：[TODO.md](TODO.md)
- **进度台账**（实时、频繁改）：本文件

**图例**：`[x]` 已完成 · `[~]` 进行中 · `[ ]` 待开始 · `[!]` 阻塞

---

## 会话 2026-10-09 · 类型系统与契约修复

### 阶段 1：基线审计

- [x] 读取 `memory/` 全部记忆文件并加载上下文
- [x] 记录基线：`yarn build` 失败、`tsc --noEmit` 60+ 错误、测试 1 失败
- [x] 产出「文档 vs 实现」不一致清单

### 阶段 2：构建链与类型系统修复

- [x] `packages/{shared,data,computation,auto-rendering,renderer}` 补 `typescript`/`vitest` 依赖
- [x] `packages/automation` 补 `build` 脚本
- [x] `packages/data` 补 `tsconfig.json`（此前有 build 脚本却无配置）
- [x] `packages/build-tools` 补 `vitest`/`tsx` 依赖
- [x] 根 `package.json` 补 `react`/`react-dom`（`react-flow-builder` peer）
- [x] 根 `package.json` 新增 `typecheck` 脚本
- [x] 全部包 tsconfig 统一：关闭 `composite`、`rootDir: src`、移除 `references`
- [x] 修复根 `foreach` 包含根 workspace 导致任务跑两遍（`--exclude .`）

### 阶段 3：清理编译错误（按模块）

- [x] workflow 包：`nodes.ts` 错误导入路径（`../schema/*` → `../*`）
- [x] workflow 包：`ExecutionContext.getDatabase` + `WorkflowDataSource` 类型补全
- [x] workflow 包：`TaskRecord.claimedAt` 类型与持久化
- [x] workflow 包：`UpdateTaskExecutor`/`mergeVariables` 由私有改公开（移除 `engine['x']` 反射调用）
- [x] workflow 包：`DataOperationExecutor` 全量去 `any`（类型守卫替代断言）
- [x] workflow 包：`StateMachineEvent` 补 `'timeout'`
- [x] shared 包：`EnvironmentContext` 改造（已知变量精确类型 + `$${string}` 索引签名）
- [x] shared 包：新增 `ExpressionScope` 作为表达式边界契约
- [x] shared 包：`PropValue` 字面量分支 `any` → `unknown`，补类型守卫函数
- [x] shared 包：`PlatformComponentProps`/`ApiResponse.data: unknown`/`ComponentCategory` 等具体类型
- [x] server 包：`AutomationEngine._deleted`、`CronScheduler.timer`、`EmailNotifyService` 类型
- [x] server 包：`nodemailer` 最小类型声明（可选依赖，不引入完整包）
- [x] data 包：`SqliteValue`/`SqliteRow` 替代全部 `any`
- [x] data 包：`koffi.copy`（不存在）→ `koffi.decode`
- [x] renderer 包：`ComponentRegistry` 全量去 `any`
- [x] renderer 包：适配器参数序列化统一到 `http-utils.ts`
- [x] renderer 包：`Renderer.showMessage` 联合类型不可索引调用 → 显式 switch
- [x] renderer 包：`VariableTreeSelector` 改判别联合（多选模式收窄 `onChange`）
- [x] frontend：`PageRuntime.tsx` 重写（去全部 `any`，修正 `$data`/`$computation` 语义）
- [x] frontend：`@low-code/automation` 接入 vite alias + tsconfig paths
- [x] frontend：删除自动化设计器中 4 处重复类型定义，改用规范类型
- [x] 修正 2 处错误的相对导入路径（`../../../utils` → `../../utils`）
- [x] 清理孤儿文件：`server/src/routes/users.ts`（空文件）、`packages/data/src/better-sqlite3.d.ts`（死代码）

### 阶段 4：修复逻辑不一致（核心价值）

- [x] **审批人字段契约**：`NodeConfigComponent` 改用 `AssigneeSelector`
- [x] **审批人字段契约**：`UserTask` 补 `candidateUsers`/`candidateGroups`
- [x] **自动化限流/生效时间**：服务层改用规范字段名 + 接入 `Throttler`/`EffectiveTimeChecker`
- [x] **自动化限流**：`AutomationLogService` 实现 `LogStore`（`getLastExecutionTime`/`getTodayExecutionCount`）
- [x] **自动化限流**：执行后 `recordTrigger()` 记录冷却基准
- [x] **表达式沙箱超时**：改为显式 `Promise.race` + `disposePool()` 硬杀线程
- [x] **表达式沙箱**：新增 `dispose()` 供进程退出/测试收尾释放 worker
- [x] **workerpool 版本漂移**：统一为 `^10.0.3`（`packages/shared` 原来声明 `^9.2.0`）
- [x] **驳回状态转换**：`handleReject` 重新读取实例最新状态再校验
- [x] **驳回返回值**：`reject()` 返回刷新后的实例（原来返回过期对象）
- [x] **数据表类型**：`TableFieldType` 补 `'enum' | 'json'`
- [x] **数据表类型**：`date` → `TEXT`（原 `INTEGER` 与 TEXT/ISO8601 规范冲突）
- [x] **数据表类型**：enum 生成 `CHECK` 约束（可 `enforceInDb: false` 关闭）
- [x] **数据表类型**：`executeTableSchema` 增加系统保留字段名校验
- [x] **数据表类型**：重建表时补齐 `_updated_at` 数据复制（原来丢失）
- [x] **联动产出污染**：选项/状态/属性移出 `context.values` → `linkageOutput`
- [x] **通知动作**：修复未 `await` 的异步模板插值 + 移除不存在的 `priority` 列

### 阶段 5：新能力接线

- [x] **流程数据操作节点**：`DataSourceResolver` 注入链（配置 → 上下文 → 执行器）
- [x] **流程数据操作节点**：服务层 `TenantWorkflowDataSource` / `TenantDataSourceResolver`
- [x] **数据层**：`updateRecordsWhere` / `softDeleteRecordsWhere`（空条件抛错）
- [x] **流程服务**：`transfer`/`addSign` 委托引擎并透传返回值
- [x] **表单草稿**：`draftEnabled`/`draftDebounceMs`/`draftRestoreOnInit` 三个 Schema 属性
- [x] **表单草稿**：落盘 + 卸载兜底 `flushDraftSave()` + `dispose()` 清理定时器
- [x] **表单草稿**：安全约束 —— 有业务数据/快照数据时不恢复草稿
- [x] **表单草稿**：修复恢复逻辑（此前合并的是整个草稿对象而非 `.values`）
- [x] **表单草稿**：`exportDraft` 过滤 `undefined`（区分"未出现"与"显式为空"）

### 阶段 6：测试

- [x] 修复 `packages/data` 2 个失败测试（迁移断言过期、`_created_at` 类型）
- [x] 修复 `WorkflowEngine.e2e` 驳回测试
- [x] 修正测试夹具：`ActionChain[]` 嵌套结构、`AssigneeStrategy` 形状、`Role` 时间字段
- [x] 新增 `FormDataContext.test.ts`（9 个草稿生命周期用例）

### 阶段 7：验证与文档

- [x] `yarn build` 全绿（9 workspace）
- [x] `yarn typecheck` 全绿
- [x] `yarn test` 全绿（816 passed / 19 skipped）
- [x] server 启动冒烟测试通过
- [x] 同步 `README.md`、`CLAUDE.md`、`TODO.md`
- [x] 同步 `docs/bug-fixes.md`（归档 8 条）、`data-layer.md`、`workflow-engine.md`、`automation-engine.md`、`form-engine.md`、`permission-engine.md`
- [x] 同步 `memory/MEMORY.md`、`development-conventions.md`、新增 `session-2026-10-09-hardening.md`
- [x] 新增 `PROGRESS.md` 进度台账，并在 `CLAUDE.md` 加入「每完成一项立即打勾」会话规范
- [x] `CLAUDE.md` 会话启动指令补充「读取 PROGRESS.md + TODO.md」

---

## 会话 2026-10-09（续）· 校验引擎落地 + 方向梳理

### 阶段 1：跨字段校验（Level 3）端到端打通

- [x] 发现并确认：`ValidationEngine` 的 Level 3/4 **在运行时从未被调用**（`validate` 动作只走 antd `validateFields`）
- [x] 发现并确认：Level 3 依赖的「内置跨字段校验器」**一个都不存在**（`required/type/range/length/pattern/enum/email/phone/url/idcard` 全是单字段）
- [x] `packages/shared` 新增 `CrossFieldRule` / `CrossFieldParams` / `CrossFieldValidatorType` / `CrossFieldValidationResult` 类型
- [x] 实现 7 类内置跨字段校验器：`dateRange` / `numberRange` / `sumEquals` / `notEqual` / `requiredAll` / `requiredAny` / `expression`
- [x] `validateLevel3` 重写：支持内置校验器、自定义表达式、注册表校验器三条路径
- [x] 表达式作用域构建：过滤非法标识符 key（表达式编译为函数形参）+ `fields`/`f` 别名兜底
- [x] 配置类诊断消息（未注册校验器/未注入引擎/表达式异常）优先于用户通用文案，避免掩盖配置错误
- [x] `ValidationEngine.validateLevel4` 接通 `validationApi` + `apiRequest`
- [x] `FormDataContextManager` 新增 `setValidationConfig` / `validateCrossFields` / `validateOnServer`
- [x] `FormRegistry.validateForm` 改为两段式：antd 字段级 → 引擎 Level 3/4，错误 `setFields` 回写 antd
- [x] Form 组件 Schema 新增 `crossFieldRules` / `validationApi` 两个设计器可配置属性
- [x] `Renderer` 注入 `_adapter` 供服务端校验发起请求（多端一致，走适配器）
- [x] 新增 `CrossFieldRulesEditor` 设计器面板（类型选择/字段多选/参数配置/表达式/错误字段/提示文案）
- [x] `PropertyPanel` 在 Form 节点下挂载跨字段校验面板；新增 `collectDescendants` 收集表单内字段
- [x] 窄接口 `SyncExpressionEvaluator` 替代对 `DefaultExpressionEngine` 具体类的耦合
- [x] `ExpressionEngine` 接口补 `safeEvaluateSync`（此前只在具体类上，接口契约不完整）
- [x] 新增 `ValidationEngine.test.ts`：36 个用例（含浮点容差、非法标识符字段名、表达式异常、L1+L3+L4 合并）
- [x] 补 `FormRegistry` 跨字段/服务端校验的 3 个集成用例
- [x] `yarn build` + `yarn test` 全绿（renderer 238 passed）

### 阶段 2：方向梳理与一致性审查

- [x] 新增 `docs/roadmap.md`（战略方向 + 优先级 + 依赖关系 + 风险）
- [x] 新增 `docs/doc-code-audit.md`（文档 vs 实现一致性审查报告）
- [x] 修正审查中发现的文档偏差

---

## 待办

### P0（下一步优先）

- [!] **确认 `any` 例外是否保留** — `withPlatform` 的 `ComponentType<any>`（React Props 逆变位置，无 `any` 无法覆盖 65 个注册点；已注释标注）。**阻塞：等用户裁决**
- [~] 设计器补齐「异步校验」配置 UI + loading 反馈（引擎 `validateLevel4` 已实现，缺入口）

### P1

- [ ] 服务端草稿（`storage: server` 跨设备）—— 需新增草稿接口与表
- [ ] 子表单（明细表）：动态行增删 + 汇总
- [ ] 特殊控件：签名 / 地理位置 / 扫码 / 附件 / 评分 / 级联选择
- [ ] 配置中心：部门下拉改动态加载；用户编辑弹窗逻辑
- [ ] 配置中心：租户安全设置持久化（密码长度/锁定次数/会话超时，目前硬编码演示数据）
- [ ] 组织架构管理页（部门/岗位树形 + 拖拽，后端树接口已有）
- [ ] 字典管理页（租户级字典 CRUD）
- [ ] OpenKey 管理页（表结构已就绪）
- [ ] 应用管理员分配 UI（后端 app 级角色已支持）
- [ ] 审批人表达式指派 + 发起人自选（`AssigneeStrategy` 增加 `expression` 分支）

### P2

- [ ] 版本管理（快照 / 回滚 / Diff）
- [ ] 数据运维（导出 CSV/Excel/SQL、备份恢复、跨环境迁移）
- [ ] 应用市场（模板导入导出 / 浏览搜索）
- [ ] 审计日志查询页 + 保留策略 + 按月归档
- [ ] 通知系统：邮件/企微/钉钉/飞书实际投递（需装 `nodemailer`）+ 模板管理 + 免打扰时段
- [ ] 国际化（i18n）

---

## 验证命令速查

```bash
yarn typecheck   # server + frontend + data 类型检查（快，约 40s）
yarn build       # 9 个 workspace 构建（含测试文件类型检查，约 2m）
yarn test        # 9 个 workspace 测试（约 42s）
```

> **铁律**：`vitest` 用 esbuild 转译，**不做类型检查**。只跑 `yarn test` 发现不了类型错误 ——
> 历史上项目因此累积了 60+ 错误而不自知。改动后**必须**跑 `yarn build` 或 `yarn typecheck`。
