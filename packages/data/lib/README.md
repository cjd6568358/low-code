# SQLite DLL 配置

## 下载 SQLite DLL

1. 访问 https://www.sqlite.org/download.html
2. 下载 **Precompiled Binaries for Windows** 中的 `sqlite-dll-win-x64-*.zip`
3. 解压后将以下文件复制到此目录：
   - `sqlite3.dll`
   - `sqlite3.def`（可选）

## 文件结构

```
packages/data/lib/
├── README.md
├── sqlite3.dll      ← 放在这里
└── sqlite3.def      ← 可选
```
