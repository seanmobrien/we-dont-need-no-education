import { mockDeep } from 'jest-mock-extended';
import { schema } from '@compliance-theater/database/orm';
import { withJestTestExtensions } from '../jest.test-extensions';
import { isKeyOf, isPromise, } from '@compliance-theater/typescript';
export class MockQueryBuilder {
    from;
    select;
    where;
    orderBy;
    limit;
    offset;
    execute;
    innerJoin;
    fullJoin;
    leftJoin;
    as;
    groupBy;
    insert;
    __queryMock = new Map();
    #records = [];
    #matchers = new Map();
    constructor() {
        this.groupBy = jest.fn().bind(this).mockReturnThis();
        this.from = jest.fn().bind(this).mockReturnThis();
        this.select = jest.fn().bind(this).mockReturnThis();
        this.where = jest.fn().bind(this).mockReturnThis();
        this.orderBy = jest.fn().bind(this).mockReturnThis();
        this.limit = jest.fn().bind(this).mockReturnThis();
        this.offset = jest.fn().bind(this).mockReturnThis();
        this.execute = jest.fn(() => Promise.resolve(this.#records)).bind(this);
        this.innerJoin = jest.fn().bind(this).mockReturnThis();
        this.fullJoin = jest.fn().bind(this).mockReturnThis();
        this.leftJoin = jest.fn().bind(this).mockReturnThis();
        this.as = jest.fn().bind(this).mockReturnThis();
        this.insert = jest.fn();
    }
    __setRecords(v, rows, state) {
        if (!v || Array.isArray(v)) {
            this.#records = v ?? [];
            return;
        }
        if (typeof v === 'function') {
            if (rows === null) {
                this.#matchers.delete(v);
                return;
            }
            this.#matchers.set(v, { rows: rows ?? [], state });
        }
    }
    __getRecords() {
        return this.#records;
    }
    __resetMocks() {
        this.#records = [];
        this.#matchers.clear();
    }
}
const mockDbFactory = () => {
    const db = mockDeep();
    const qb = db;
    let theRows = [];
    const theMatchers = new Map();
    const qbMethodValues = [
        'from',
        'select',
        'where',
        'orderBy',
        'limit',
        'offset',
        'execute',
        'innerJoin',
        'fullJoin',
        'groupBy',
        'as',
        'leftJoin',
        'insert',
    ];
    const CurrentTable = Symbol('CurrentTable');
    const rowMap = new Map();
    const insertBuilder = {
        values: jest.fn(),
        execute: jest.fn(() => qb.execute()),
        onConflictDoUpdate: jest.fn(),
        returning: jest.fn(() => Promise.resolve(qb.__getRecords())),
        __setCurrentTable: (table) => {
            qb[CurrentTable] = table;
            return insertBuilder;
        },
        __getCurrentTable: () => qb[CurrentTable],
        __setRecords: (v, rows, state) => {
            rowMap.set(qb[CurrentTable], [
                ...(rowMap.get(qb[CurrentTable]) ?? []),
                ...(rows ?? []),
            ]);
            qb.__setRecords(v, rows, state);
            return insertBuilder;
        },
        __getRecords: (arg) => {
            if (arg) {
                return (rowMap.get(arg) ?? []);
            }
            return qb.__getRecords();
        },
        __resetMocks: () => {
            qb.__resetMocks();
            return insertBuilder;
        },
    };
    insertBuilder.values.mockImplementation((v) => {
        qb.__getRecords().push(v);
        return insertBuilder;
    });
    insertBuilder.onConflictDoUpdate.mockReturnValue(insertBuilder);
    const INITIALIZED = Symbol.for('____initialized_query_builder____');
    const initMocks = () => {
        qbMethodValues.forEach((key) => {
            if (key === '__setRecords' ||
                key === '__getRecords' ||
                key === '__resetMocks') {
                return;
            }
            const current = qb[key];
            if (key === 'execute') {
                qb[key].mockImplementation(async () => {
                    db[INITIALIZED] = false;
                    const executeMock = qb[key].mock;
                    const count = executeMock.calls.length;
                    const thisIndex = count - 1;
                    const from = qb['from']?.mock.lastCall?.[0];
                    const isFrom = (table) => {
                        if (typeof table === 'string') {
                            const tables = from.getSQL().usedTables ?? [];
                            if (tables.includes(table)) {
                                return true;
                            }
                        }
                        return Object.is(from, table);
                    };
                    const baseContext = {
                        db: qb,
                        context: {
                            current: executeMock.contexts[thisIndex],
                            last: thisIndex > 0 ? executeMock.contexts[thisIndex - 1] : undefined,
                        },
                        call: {
                            current: executeMock.calls[thisIndex],
                            last: executeMock.lastCall,
                        },
                        count,
                        from,
                        isFrom: isFrom,
                        result: [],
                        returned: {
                            last: executeMock.results[thisIndex],
                        },
                        state: undefined,
                        query: qb['select']?.mock.lastCall?.[0],
                    };
                    const entries = await Promise.all(Array.from(theMatchers.entries()).map(([cb, record]) => new Promise(async (resolve) => {
                        try {
                            const thisContext = {
                                ...baseContext,
                                state: record.state,
                                result: record.rows,
                            };
                            const check = await cb(thisContext);
                            resolve({ hit: cb, result: check, record });
                        }
                        catch {
                            resolve({ hit: cb, result: undefined });
                        }
                    })));
                    const match = entries.find((check) => !!check.result);
                    if (match) {
                        if (!match.record) {
                            throw new Error('Matcher hit but no record found - something is fishy with our fancy db mock');
                        }
                        if (typeof match.result === 'boolean') {
                            if (!match.result) {
                                throw new Error('Matcher hit but result is not true - something is fishy with our fancy db mock');
                            }
                            return match.record.rows;
                        }
                        if (typeof match.result === 'object') {
                            if (Array.isArray(match.result)) {
                                return match.result;
                            }
                            if (match.result?.state !== undefined) {
                                match.record.state = match.result.state;
                            }
                            return match.result?.rows ?? match.record.rows;
                        }
                        throw new Error('Matcher hit but result is not a boolean or an object - investigate fancy db mock.');
                    }
                    return theRows;
                });
            }
            else if (!current) {
                qb[key] = jest.fn(['insert', 'values'].includes(String(key))
                    ? () => insertBuilder
                    : () => db);
            }
            else {
                qb[key].mockImplementation(['insert', 'values'].includes(String(key))
                    ? () => insertBuilder
                    : () => db);
            }
        });
        Array.from(Object.keys(schema)).forEach((sc) => {
            if (!isKeyOf(sc, schema) ||
                (typeof schema[sc] !== 'object' || !schema[sc])) {
                return;
            }
            const schemaEntry = schema[sc];
            if (typeof schemaEntry !== 'object' || !schemaEntry || !('modelName' in schemaEntry)) {
                return;
            }
            if (!schemaEntry.modelName) {
                return;
            }
            const tableKey = sc;
            let tbl = db.query[tableKey];
            if (!tbl) {
                tbl = {
                    findMany: jest.fn(() => Promise.resolve([])),
                    findFirst: jest.fn(() => Promise.resolve(null)),
                };
                db.query[tableKey] = tbl;
            }
            if (!jest.isMockFunction(tbl.findMany)) {
                tbl.findMany = jest.fn();
            }
            if (!jest.isMockFunction(tbl.findFirst)) {
                tbl.findFirst = jest.fn();
            }
            tbl.findMany.mockImplementation(() => Promise.resolve([]));
            tbl.findFirst.mockImplementation(() => Promise.resolve(null));
        });
    };
    initMocks();
    qb.__setRecords = (v, rows, state) => {
        if (!v || Array.isArray(v)) {
            theRows = v ?? [];
            return;
        }
        if (typeof v === 'function') {
            if (rows === null) {
                theMatchers.delete(v);
                return;
            }
            theMatchers.set(v, { rows: rows ?? [], state });
        }
    };
    qb.__getRecords = () => theRows;
    qb.__resetMocks = () => {
        theRows = [];
        theMatchers.clear();
        qbMethodValues.forEach((key) => {
            if (key === 'insert' ||
                key === '__getRecords' ||
                key === '__setRecords' ||
                key === '__resetMocks') {
                return;
            }
            const current = qb[key];
            if (current && current.mock) {
                current.mockReset();
            }
            initMocks();
        });
    };
    db.transaction = jest.fn(async (callback) => {
        const txRawRet = callback(mockDb);
        const txRet = isPromise(txRawRet) ? await txRawRet : txRawRet;
        return txRet;
    });
    const proxy = new Proxy(db, {
        get(target, prop, receiver) {
            if (prop === 'from' || prop === 'select' || prop === 'where') {
                target[INITIALIZED] = true;
            }
            else if (prop === 'then') {
                if (target[INITIALIZED] === true) {
                    return jest.fn((onOk, onError) => {
                        let p = qb.execute().then((result) => {
                            target[INITIALIZED] = false;
                            return result;
                        });
                        if (onOk) {
                            p = p.then(onOk);
                        }
                        if (onError) {
                            p = p.catch(onError);
                        }
                        return p;
                    });
                }
                return undefined;
            }
            else if (prop === 'innerMock') {
                return qb;
            }
            const asProxied = Reflect.get(target, prop, receiver);
            if (!asProxied || typeof asProxied !== 'function') {
                return asProxied;
            }
            return new Proxy(asProxied, {
                apply(target, thisArg, args) {
                    const ret = asProxied.apply(target, args);
                    if (isPromise(ret)) {
                        return ret.then((r) => (r === qb ? proxy : r));
                    }
                    else if (ret === qb) {
                        return proxy;
                    }
                    return ret;
                },
            });
        },
    });
    return proxy;
};
let mockDb = mockDbFactory();
export const makeMockDb = () => {
    if (mockDb.query && mockDb.query.documentUnits) {
        if (!mockDb.$count.getMockImplementation()) {
            mockDb.$count.mockResolvedValue(1);
        }
    }
    return mockDb;
};
const makeRecursiveMock = jest
    .fn()
    .mockImplementation(() => jest.fn(() => jest.fn(makeRecursiveMock)));
jest.mock('@compliance-theater/database/orm', () => {
    let actualSchema = {};
    try {
        actualSchema = jest.requireActual('@compliance-theater/database/orm');
    }
    catch {
        actualSchema = {};
    }
    return {
        ...actualSchema,
        schema: actualSchema.schema ?? {},
        drizDb: jest.fn((fn) => {
            const mockDbInstance = makeMockDb();
            if (fn) {
                const result = fn(mockDbInstance);
                return Promise.resolve(result);
            }
            return mockDbInstance;
        }),
        drizDbWithInit: jest.fn((cb) => {
            const db = makeMockDb();
            const normalCallback = cb ?? ((x) => x);
            return Promise.resolve(normalCallback(db));
        }),
    };
});
jest.mock('@compliance-theater/database', () => {
    let actualModule = {};
    try {
        actualModule = jest.requireActual('@compliance-theater/database');
    }
    catch {
        actualModule = {};
    }
    return {
        ...actualModule,
        drizDb: jest.fn((fn) => {
            const mockDbInstance = makeMockDb();
            if (fn) {
                const result = fn(mockDbInstance);
                return Promise.resolve(result);
            }
            return mockDbInstance;
        }),
        drizDbWithInit: jest.fn((cb) => {
            const db = makeMockDb();
            const normalCallback = cb ?? ((x) => x);
            return Promise.resolve(normalCallback(db));
        }),
        sql: jest.fn(() => makeRecursiveMock()),
    };
});
beforeAll(() => {
    withJestTestExtensions().makeMockDb = makeMockDb;
});
beforeEach(() => {
    withJestTestExtensions().makeMockDb = makeMockDb;
});
afterEach(() => {
    mockDb = mockDbFactory();
});
//# sourceMappingURL=jest.mock-drizzledb.js.map