/**
 * @deprecated 此文件已废弃 — ServerVariableResolver 类不再使用
 *
 * $table 的唯一执行路径：schema.dataSource 函数体 → expressionEngine → $table Proxy 链（QueryProxy.ts）
 * 如需解析 $table 表达式字符串，请使用 QueryProxy.parseFilterToCondition()
 */

export {};
