import { NextResponse } from 'next/server';
import { isKeyOf, } from '@compliance-theater/typescript';
import { extractParams } from '@/lib/nextjs-util/server/utils';
import { isRequestOrApiRequest, isNextResponse, } from '@/lib/nextjs-util/guards';
import { LoggedError } from '@compliance-theater/logger';
import { isPaginationStats } from '@/data-models/_utilities';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
export class RepositoryCrudController {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async list(ops) {
        let pagination;
        if (isRequestOrApiRequest(ops)) {
            const thisUrl = new URL(ops.url);
            pagination = ops.url
                ? parsePaginationStats(thisUrl)
                : { page: 1, num: 10, total: 0 };
        }
        else if (ops) {
            pagination = {
                page: ops.page ?? 1,
                num: ops.num ?? 10,
                filter: ops.filter,
                sort: ops.sort,
                total: 0,
                offset: undefined,
            };
        }
        else {
            pagination = {
                page: 1,
                num: 10,
                total: 0,
                offset: undefined,
            };
        }
        if (!pagination) {
            return NextResponse.json({ error: `Invalid pagination parameters` }, { status: 400 });
        }
        pagination.offset =
            pagination.offset ?? (pagination.page - 1) * pagination.num;
        return this.listFromRepository(pagination);
    }
    async listFromRepository(...pageStats) {
        try {
            if (!pageStats || pageStats.length === 0) {
                return NextResponse.json({ error: `Invalid pagination parameters` }, { status: 400 });
            }
            if (typeof pageStats[0] === 'function') {
                const result = await pageStats[0](this.repository);
                if (!result) {
                    return NextResponse.json({ error: `Request failed` }, { status: 400 });
                }
                return NextResponse.json(result, { status: 200 });
            }
            else if (!pageStats.length ||
                (pageStats.length === 1 &&
                    (!pageStats[0] || isPaginationStats(pageStats[0])))) {
                const result = await this.repository.list(pageStats[0]);
                if (!result) {
                    return NextResponse.json({ error: `Request failed` }, { status: 400 });
                }
                return NextResponse.json(result, { status: 200 });
            }
            const res = await this.repository.list(...pageStats);
            return !!res
                ? NextResponse.json(res, { status: 200 })
                : NextResponse.json({ error: `Request failed` }, { status: 400 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
            return NextResponse.json({
                error: `Internal Server Error`,
            }, { status: 500 });
        }
    }
    async get(req, withParams) {
        const id = await this.extractKeyFromParams(req, withParams);
        return isNextResponse(id)
            ? id
            : await this.getFromRepository(id);
    }
    async getFromRepository(...args) {
        try {
            const theCallback = args?.length === 1 && typeof args[0] === 'function'
                ? args[0]
                : (r) => r.get.bind(r)(args);
            const result = await theCallback(this.repository);
            if (!result) {
                return NextResponse.json({ error: `Record not found` }, { status: 404 });
            }
            return NextResponse.json(result, { status: 200 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
            return NextResponse.json({
                error: `Internal Server Error`,
            }, { status: 500 });
        }
    }
    async extractParams(withParams) {
        if (!withParams) {
            return undefined;
        }
        try {
            return await extractParams(withParams);
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
            return NextResponse.json({
                error: `Invalid request detected.`,
            }, { status: 400 });
        }
    }
    async extractKeyFromParams(req, withParams) {
        let id;
        if (isRequestOrApiRequest(req) && withParams) {
            try {
                const params = await extractParams(withParams);
                if (!isKeyOf(this.repository.objectId, params)) {
                    return NextResponse.json({
                        error: `Invalid parameter: ${String(this.repository.objectId)} is required.`,
                    }, { status: 400 });
                }
                id = params[this.repository.objectId];
            }
            catch (error) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
                return NextResponse.json({
                    error: `Invalid request detected.`,
                }, { status: 400 });
            }
        }
        else {
            id = req;
        }
        return id;
    }
    async create(req, params) {
        let data;
        try {
            const fromBody = await req.json();
            const fromParams = params
                ? await this.extractKeyFromParams(req, params)
                : {};
            if (isNextResponse(fromParams)) {
                return fromParams;
            }
            data = {
                ...fromBody,
                ...fromParams,
            };
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RepositoryController::create',
            });
            return NextResponse.json({ error: `Bad request` }, { status: 400 });
        }
        return await this.createFromRepository(data);
    }
    async createFromRepository(...args) {
        if (!args?.length || !args[0]) {
            return NextResponse.json({ success: false, error: `Invalid request` }, { status: 400 });
        }
        try {
            let createdRecord;
            if (args.length === 1) {
                createdRecord =
                    typeof args[0] === 'function'
                        ? await args[0](this.repository)
                        : await this.repository.create(args[0]);
                return createdRecord
                    ? NextResponse.json(createdRecord, { status: 200 })
                    : NextResponse.json({ success: false, error: `Record not found` }, { status: 404 });
            }
            else {
                createdRecord = await this.repository.create.bind(this.repository)(args);
            }
            return createdRecord
                ? NextResponse.json(createdRecord, { status: 200 })
                : NextResponse.json({ success: false, error: `Record not found` }, { status: 404 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RepositoryController::create',
            });
            return NextResponse.json({
                success: false,
                error: `Internal Server Error`,
            }, { status: 500 });
        }
    }
    async update(req, params) {
        const fromBody = await req.json();
        const fromParams = params
            ? await this.extractParams(params)
            : {};
        if (isNextResponse(fromParams)) {
            return fromParams;
        }
        const data = {
            ...fromBody,
            ...fromParams,
        };
        return await this.updateFromRepository(data);
    }
    async updateFromRepository(...args) {
        if (!args?.length || !args[0]) {
            return NextResponse.json({ success: false, error: `Invalid request` }, { status: 400 });
        }
        try {
            let updatedRecord;
            if (args.length === 1) {
                updatedRecord =
                    typeof args[0] === 'function'
                        ? await args[0](this.repository)
                        : await this.repository.update(args[0]);
                return updatedRecord
                    ? NextResponse.json(updatedRecord, { status: 200 })
                    : NextResponse.json({ success: false, error: `Record not found` }, { status: 404 });
            }
            else {
                updatedRecord = await this.repository.update.bind(this.repository)(args);
            }
            return updatedRecord
                ? NextResponse.json(updatedRecord, { status: 200 })
                : NextResponse.json({ success: false, error: `Record not found` }, { status: 404 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RepositoryController::update',
            });
            return NextResponse.json({
                success: false,
                error: `Internal Server Error`,
            }, { status: 500 });
        }
    }
    async deleteFromRepository(...args) {
        if (!args?.length || !args[0]) {
            return NextResponse.json({ success: false, error: `Invalid request` }, { status: 400 });
        }
        try {
            let wasDeleted;
            if (args.length === 1) {
                wasDeleted =
                    typeof args[0] === 'function'
                        ? await args[0](this.repository)
                        : await this.repository.delete(args[0]);
                return wasDeleted
                    ? NextResponse.json({ success: true }, { status: 200 })
                    : NextResponse.json({ success: false, error: `Record not found` }, { status: 404 });
            }
            else {
                wasDeleted = await this.repository.delete.bind(this.repository)(args);
            }
            return wasDeleted
                ? NextResponse.json({ success: true }, { status: 200 })
                : NextResponse.json({ success: false, error: `Record not found` }, { status: 404 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'RepositoryController::delete',
            });
            return NextResponse.json({
                success: false,
                error: `Internal Server Error`,
            }, { status: 500 });
        }
    }
    async delete(req, params) {
        const fromParams = params
            ? await this.extractKeyFromParams(req, params)
            : {};
        if (isNextResponse(fromParams)) {
            return fromParams;
        }
        return await this.deleteFromRepository(fromParams);
    }
}
//# sourceMappingURL=repository-crud-controller.js.map