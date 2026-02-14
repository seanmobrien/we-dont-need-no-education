import { NextResponse } from 'next/server';
import { isRequestOrApiRequest } from '@/lib/nextjs-util/guards';
import { LoggedError } from '@compliance-theater/logger';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
export class DrizzleCrudRepositoryController {
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
                total: ops.total ?? 0,
            };
        }
        else {
            pagination = { page: 1, num: 10, total: 0 };
        }
        try {
            const result = await this.repository.list(pagination);
            return NextResponse.json(result, { status: 200 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'DrizzleCrudRepositoryController::list',
            });
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
    async get(req, args) {
        try {
            const params = await args.params;
            const keys = Object.keys(params);
            if (keys.length !== 1) {
                return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
            }
            const idValue = params[keys[0]];
            const record = await this.repository.get(idValue);
            if (!record) {
                return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
            }
            return NextResponse.json(record, { status: 200 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'DrizzleCrudRepositoryController::get',
            });
            return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
        }
    }
    async create(req) {
        try {
            const body = await req.json();
            const newRecord = await this.repository.create(body);
            return NextResponse.json(newRecord, { status: 201 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'DrizzleCrudRepositoryController::create',
            });
            return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
        }
    }
    async update(req, args) {
        try {
            const params = await args.params;
            const body = await req.json();
            const keys = Object.keys(params);
            if (keys.length !== 1) {
                return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
            }
            const idKey = keys[0];
            const idValue = params[idKey];
            const updateData = { ...body, [idKey]: idValue };
            const updatedRecord = await this.repository.update(updateData);
            return NextResponse.json(updatedRecord, { status: 200 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'DrizzleCrudRepositoryController::update',
            });
            return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
        }
    }
    async delete(req, args) {
        try {
            const params = await args.params;
            const keys = Object.keys(params);
            if (keys.length !== 1) {
                return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
            }
            const idValue = params[keys[0]];
            const deleted = await this.repository.delete(idValue);
            if (!deleted) {
                return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
            }
            return NextResponse.json({ success: true }, { status: 200 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'DrizzleCrudRepositoryController::delete',
            });
            return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
        }
    }
    async updateFromRepository(callback) {
        try {
            const result = await callback(this.repository);
            return NextResponse.json(result, { status: 200 });
        }
        catch (error) {
            LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'DrizzleCrudRepositoryController::updateFromRepository',
            });
            return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
        }
    }
}
//# sourceMappingURL=drizzle-crud-controller.js.map