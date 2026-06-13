/**
 * better-sqlite3 类型声明（本地副本）
 *
 * 当无法安装原生模块时使用此声明使 TypeScript 编译通过。
 * 实际部署时安装 better-sqlite3 和 @types/better-sqlite3。
 */

declare module 'better-sqlite3' {
  namespace Database {
    interface Database {
      prepare<BindParameters extends any[] | {} = any[]>(source: string): Statement<BindParameters>;
      exec(source: string): Database;
      transaction<F extends (...args: any[]) => any>(fn: F): F;
      pragma(source: string, options?: { simple?: boolean }): any;
      backup(destination: string, options?: { attached?: string }): Promise<void>;
      close(): Database;
      readonly name: string;
      readonly open: boolean;
      readonly inTransaction: boolean;
      readonly readonly: boolean;
      readonly memory: boolean;
    }

    interface Statement<BindParameters extends any[] | {} = any[]> {
      run(...params: BindParameters extends any[] ? BindParameters : [BindParameters]): RunResult;
      get(...params: BindParameters extends any[] ? BindParameters : [BindParameters]): any;
      all(...params: BindParameters extends any[] ? BindParameters : [BindParameters]): any[];
      iterate(...params: BindParameters extends any[] ? BindParameters : [BindParameters]): IterableIterator<any>;
      pluck(toggleState?: boolean): Statement<BindParameters>;
      expand(toggleState?: boolean): Statement<BindParameters>;
      raw(toggleState?: boolean): Statement<BindParameters>;
      columns(): ColumnDefinition[];
      bind(...params: BindParameters extends any[] ? BindParameters : [BindParameters]): Statement<BindParameters>;
      readonly database: Database;
      readonly source: string;
      readonly reader: boolean;
      readonly readonly: boolean;
    }

    interface RunResult {
      changes: number;
      lastInsertRowid: number | bigint;
    }

    interface ColumnDefinition {
      name: string;
      column: string | null;
      table: string | null;
      database: string | null;
      type: string | null;
    }

    interface Options {
      readonly?: boolean;
      fileMustExist?: boolean;
      timeout?: number;
      verbose?: (message?: any, ...additionalArgs: any[]) => void;
    }
  }

  interface DatabaseConstructor {
    new(filename: string | Buffer, options?: Database.Options): Database.Database;
    (filename: string | Buffer, options?: Database.Options): Database.Database;
  }

  const Database: DatabaseConstructor;

  export = Database;
}
