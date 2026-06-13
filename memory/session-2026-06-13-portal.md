---
name: session-2026-06-13-portal
description: 2026-06-13 会话：门户应用、认证系统、设计器合并、server 分层
metadata:
  type: project
---

## 本次会话完成的工作

### 1. 前端门户应用（apps/frontend/）
- 现代登录页（毛玻璃卡片 + 渐变背景 + 粒子动画）
- 统一主布局（侧边栏 + 顶栏），管理员和员工共用
- 工作台（待办/通知/快捷入口/个人信息）
- 应用中心（应用列表，管理员可新建/编辑/删除）
- 流程中心（发起/审批/查看）
- 配置中心（用户管理/角色管理/授权管理/租户设置，仅管理员可见）
- 设计器页面（/designer/:appId，全屏，从应用中心"编辑"按钮进入）

### 2. 后端 API 服务（apps/server/）
- Koa 框架，端口 3001
- 认证接口 POST /api/auth/login（scrypt 密码哈希验证）
- 目录结构：config/ middlewares/ routes/ services/

### 3. 种子数据（山水集团）
- 租户 ID: shansui，enterprise 套餐
- 5 名用户：1 管理员 + 4 员工
- 6 个部门，scrypt 密码哈希
- 脚本：packages/data/scripts/seed-shansui.ts

### 4. 关键 Bug 修复
- **koffi sqlite3_bind_text 数据损坏**：第 5 个参数从 null 改为 -1（SQLITE_TRANSIENT），修复字符串指针提前释放
- **种子脚本租户删除**：改为 DELETE 物理删除 + 删文件，避免 soft-delete 后 createTenant 冲突

### 5. 架构调整
- 设计器从 packages/designer/ 合并到 packages/renderer/src/designer/（渲染引擎的一部分）
- apps/frontend 通过 `import { Designer } from '@low-code/renderer'` 引用
- 删除了 packages/designer/ 目录

**Why:** 门户应用是平台的运行时入口，认证系统连接前端和数据库，设计器归属渲染引擎是架构一致性要求。

**How to apply:**
- 启动：`yarn start:all`（同时启动 server:3001 + frontend:5173）
- 演示账号：admin@shansui.com / shansui123（管理员），zhangsan@shansui.com / shansui123（员工）
- 设计器：登录后应用中心 → 点击"编辑"进入
