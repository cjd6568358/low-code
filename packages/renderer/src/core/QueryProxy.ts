/**
 * $table 查询代理 — 统一实现
 *
 * 为 $table.xxx.filter().select().execute() 链式调用提供运行时代理。
 * 所有 Proxy 链式调用最终组装为 ServerVariableQuery 发送到后端。
 */

/** 结构化 filter 条件 */
interface StructuredCondition {
  field: string;
  op: string;
  value: any;
}

/** 查询链状态 */
interface QueryChain {
  table: string;
  whereConditions: StructuredCondition[];
  memoryFilters: string[];
  selects: string[];
  sorts: Array<{ field: string; order: 'asc' | 'desc' }>;
  limitCount: number | null;
  aggregateType: 'count' | 'sum' | 'avg' | 'min' | 'max' | null;
  aggregateField: string | null;
}

/** API 请求函数类型 */
type ApiRequestFn = (config: { url: string; method: string; data?: any }) => Promise<any>;

/**
 * 从 filter 函数的 toString() 中提取结构化条件
 *
 * 支持的模式：
 * - record => record.field == 'value'
 * - record => record.field === 'value'
 * - record => record.field > 18
 * - record => record.field != null
 * - item => item.status == 'active'
 * - r => r.name == 'test'
 */
export function parseFilterToCondition(fnStr: string): StructuredCondition | null {
  const s = fnStr.trim();

  // 匹配 (record|item|r) => (record|item|r).field op value
  const match = s.match(
    /^(?:record|item|r)\s*=>\s*(?:record|item|r)\.(\w+)\s*(===?|!==?|>=|<=|>|<)\s*(.+)$/,
  );
  if (!match) return null;

  const field = match[1];
  const op = match[2];
  let rawValue = match[3].trim();

  let value: any;
  if (rawValue === 'null') {
    value = null;
  } else if (rawValue === 'undefined') {
    value = undefined;
  } else if (rawValue === 'true') {
    value = true;
  } else if (rawValue === 'false') {
    value = false;
  } else if ((rawValue.startsWith("'") && rawValue.endsWith("'")) ||
             (rawValue.startsWith('"') && rawValue.endsWith('"'))) {
    value = rawValue.slice(1, -1);
  } else if (!isNaN(Number(rawValue))) {
    value = Number(rawValue);
  } else {
    // 无法解析的值（如变量引用），返回 null 降级为 memory filter
    return null;
  }

  // 标准化操作符
  const normalizedOp = op === '===' ? '==' : op === '!==' ? '!=' : op;

  return { field, op: normalizedOp, value };
}

/**
 * 将结构化条件数组转换为 MongoDB 风格 where 对象
 */
function conditionsToWhere(conditions: StructuredCondition[]): Record<string, any> {
  const where: Record<string, any> = {};

  for (const { field, op, value } of conditions) {
    if (op === '==') {
      where[field] = value;
    } else {
      const mongoOp: string | undefined = {
        '!=': '$ne',
        '>': '$gt',
        '<': '$lt',
        '>=': '$gte',
        '<=': '$lte',
      }[op];
      if (mongoOp) {
        if (!where[field] || typeof where[field] !== 'object') {
          where[field] = {};
        }
        where[field][mongoOp] = value;
      }
    }
  }

  return where;
}

/**
 * 将 QueryChain 组装为请求体
 */
function chainToRequestBody(chain: QueryChain): Record<string, any> {
  const body: Record<string, any> = {
    table: chain.table,
  };

  if (chain.selects.length > 0) {
    body.select = chain.selects;
  }

  if (chain.whereConditions.length > 0) {
    body.where = conditionsToWhere(chain.whereConditions);
  }

  if (chain.sorts.length > 0) {
    body.orderBy = {};
    for (const sort of chain.sorts) {
      body.orderBy[sort.field] = sort.order;
    }
  }

  if (chain.limitCount !== null) {
    body.limit = chain.limitCount;
  }

  if (chain.aggregateType) {
    body.aggregate = {
      type: chain.aggregateType,
      field: chain.aggregateField,
    };
  }

  if (chain.memoryFilters.length > 0) {
    body.memoryFilter = chain.memoryFilters.join(' && ');
  }

  return body;
}

/**
 * 创建 $table.xxx 链式查询代理
 *
 * @param tableName 表名
 * @param apiRequest API 请求函数
 * @param appId 应用 ID（用于构建查询 URL）
 */
export function createQueryProxy(
  tableName: string,
  apiRequest: ApiRequestFn,
  appId?: string,
): any {
  const chain: QueryChain = {
    table: tableName,
    whereConditions: [],
    memoryFilters: [],
    selects: [],
    sorts: [],
    limitCount: null,
    aggregateType: null,
    aggregateField: null,
  };

  const execute = async (): Promise<any> => {
    const url = appId ? `/api/apps/${appId}/query` : '/api/query';
    const body = chainToRequestBody(chain);
    const response = await apiRequest({ url, method: 'POST', data: body });
    return response?.data ?? response;
  };

  const proxy: any = {
    filter(predicate: (record: any) => boolean) {
      const condition = parseFilterToCondition(predicate.toString());
      if (condition) {
        chain.whereConditions.push(condition);
      } else {
        chain.memoryFilters.push(predicate.toString());
      }
      return proxy;
    },
    select(...fields: string[]) {
      chain.selects.push(...fields);
      return proxy;
    },
    sort(field: string, order: 'asc' | 'desc' = 'asc') {
      chain.sorts.push({ field, order });
      return proxy;
    },
    limit(count: number) {
      chain.limitCount = count;
      return proxy;
    },
    first() {
      chain.limitCount = 1;
      return execute();
    },
    count() {
      chain.aggregateType = 'count';
      return execute();
    },
    sum(field: string) {
      chain.aggregateType = 'sum';
      chain.aggregateField = field;
      return execute();
    },
    avg(field: string) {
      chain.aggregateType = 'avg';
      chain.aggregateField = field;
      return execute();
    },
    execute() {
      return execute();
    },
  };

  return proxy;
}

/**
 * 创建 $table 顶层代理
 *
 * @param apiRequest API 请求函数
 * @param appId 应用 ID
 */
export function createTableProxy(apiRequest: ApiRequestFn, appId?: string): Record<string, any> {
  return new Proxy({} as Record<string, any>, {
    get(_target, prop: string) {
      return createQueryProxy(prop, apiRequest, appId);
    },
  });
}
