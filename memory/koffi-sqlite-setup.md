---
name: koffi-sqlite-setup
description: koffi FFI 调用 SQLite DLL 的正确配置方式，避免 better-sqlite3 原生编译
metadata: 
  node_type: memory
  type: reference
  originSessionId: c29f5246-87ac-401b-aab7-2ba9abc7bc93
---

## koffi + SQLite 配置指南

项目使用 koffi FFI 直接调用 sqlite3.dll，无需编译原生模块（better-sqlite3）。

### 关键 API 用法

```typescript
import koffi from 'koffi';

// 1. 定义不透明类型
const sqlite3 = koffi.opaque('sqlite3');
const sqlite3_stmt = koffi.opaque('sqlite3_stmt');

// 2. 定义指针类型
const sqlite3_ptr = koffi.pointer(sqlite3);           // sqlite3*
const sqlite3_ptr_ptr = koffi.pointer(sqlite3_ptr);    // sqlite3**
const sqlite3_stmt_ptr = koffi.pointer(sqlite3_stmt);  // sqlite3_stmt*
const sqlite3_stmt_ptr_ptr = koffi.pointer(sqlite3_stmt_ptr); // sqlite3_stmt**

// 3. 函数签名 - 输出参数使用 koffi.out()
const sqlite3_open = lib.func('sqlite3_open', 'int', ['str', koffi.out(sqlite3_ptr_ptr)]);
const sqlite3_prepare_v2 = lib.func('sqlite3_prepare_v2', 'int', [
  sqlite3_ptr, 'str', 'int', koffi.out(sqlite3_stmt_ptr_ptr), 'void *'
]);

// 4. 调用 - 输出参数用数组接收
const outDb = [null];
sqlite3_open('test.db', outDb);
const db = outDb[0]; // sqlite3* 指针
```

### 常见错误及解决

| 错误 | 原因 | 解决 |
|------|------|------|
| `Unknown or invalid type name 'pointer'` | koffi 不支持 `'pointer'` | 使用 `koffi.opaque()` + `koffi.pointer()` |
| `Type sqlite3_ptr cannot be used as a parameter` | opaque 类型不能直接用作参数 | 用 `koffi.pointer()` 创建指针类型 |
| `Cannot pass ambiguous value to void *` | 输出参数类型不明确 | 使用 `koffi.out()` 标记输出参数 |
| `Invalid argument` | `koffi.as(null, 'void *')` 用法错误 | 用 `[null]` + `koffi.out()` 组合 |

### 文件结构

```
packages/data/
├── lib/
│   └── sqlite3.dll          ← 需手动下载
├── src/
│   ├── sqlite-koffi.ts      ← koffi FFI 封装
│   ├── database.ts          ← DatabaseManager
│   ├── pool.ts              ← 连接池
│   └── types.ts             ← 类型定义
└── package.json             ← 依赖: koffi
```

### DLL 下载

- 地址: https://www.sqlite.org/download.html
- 选择: Precompiled Binaries for Windows → sqlite-dll-win-x64-*.zip
- 放置: `packages/data/lib/sqlite3.dll`

**Why:** better-sqlite3 需要 Python + Visual Studio Build Tools 编译原生模块，koffi 直接调用 DLL 避免了这个复杂性。

**How to apply:** 所有需要使用 SQLite 的地方都通过 `@low-code/data` 包访问，不要直接使用 better-sqlite3。
