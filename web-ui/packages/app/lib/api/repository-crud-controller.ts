import { NextRequest, NextResponse } from 'next/server';
import { BaseObjectRepository } from './_baseObjectRepository';
import {
  FunctionArguments,
  isKeyOf,
  PartialExceptFor,
  PickField,
} from '@compliance-theater/typescript';
import { LikeNextRequest } from '@compliance-theater/nextjs/types';
import { extractParams } from '@compliance-theater/nextjs/server/utils';
import {
  isRequestOrApiRequest,
  isNextResponse,
} from '@compliance-theater/nextjs/guards';
import { LoggedError } from '@compliance-theater/logger';
import { ObjectRepository } from './_types';
import { isPaginationStats } from '@/data-models/_utilities';
import { PaginatedResultset } from '@/data-models/_types';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
import type { PaginationStats } from '@/data-models/_types';
import { GridSortModel, GridFilterModel } from '@mui/x-data-grid-pro';
import { PaginatedGridListRequest } from '../components/mui/data-grid';

type KeysFromModel<
  TRepositoryModel,
  TRepositoryKey extends keyof TRepositoryModel
> = {
  [key in TRepositoryKey]: PickField<TRepositoryModel, key>;
};

export class RepositoryCrudController<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TRepository extends BaseObjectRepository<any, keyof any>,
  TRepositoryModel extends TRepository extends BaseObjectRepository<
    infer TInferModel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >
    ? TInferModel
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any = TRepository extends BaseObjectRepository<infer TInferModel, any>
    ? TInferModel
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
  TRepositoryKey extends TRepository extends BaseObjectRepository<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    infer TInferKey
  >
    ? TInferKey
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any = TRepository extends BaseObjectRepository<any, infer TInferKey>
    ? TInferKey
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any
> {
  constructor(private repository: TRepository) {}

  async list(): Promise<
    NextResponse<
      PaginatedResultset<Partial<TRepositoryModel>> | { error: string }
    >
  >;
  async list(
    ops: PaginationStats,
    sort?: GridSortModel,
    filter?: GridFilterModel
  ): Promise<
    NextResponse<
      PaginatedResultset<Partial<TRepositoryModel>> | { error: string }
    >
  >;
  async list(
    req: LikeNextRequest
  ): Promise<
    NextResponse<
      PaginatedResultset<Partial<TRepositoryModel>> | { error: string }
    >
  >;

  async list(
    ops?: LikeNextRequest | PaginatedGridListRequest
  ): Promise<
    NextResponse<
      PaginatedResultset<Partial<TRepositoryModel>> | { error: string }
    >
  > {
    let pagination: PaginatedGridListRequest & { offset?: number };
    if (isRequestOrApiRequest(ops)) {
      const thisUrl = new URL(ops.url!);
      pagination = ops.url
        ? parsePaginationStats(thisUrl)
        : { page: 1, num: 10, total: 0 };
    } else if (ops) {
      pagination = {
        page: ops.page ?? 1,
        num: ops.num ?? 10,
        filter: ops.filter,
        sort: ops.sort,
        total: 0,
        offset: undefined,
      };
    } else {
      pagination = {
        page: 1,
        num: 10,
        total: 0,
        offset: undefined,
      };
    }
    if (!pagination) {
      return NextResponse.json(
        { error: `Invalid pagination parameters` },
        { status: 400 }
      );
    }
    pagination.offset =
      pagination.offset ?? (pagination.page - 1) * pagination.num;
    return this.listFromRepository(pagination);
  }

  async listFromRepository(
    callback: (
      r: TRepository
    ) => Promise<PaginatedResultset<Partial<TRepositoryModel>>>
  ): Promise<
    NextResponse<
      PaginatedResultset<Partial<TRepositoryModel>> | { error: string }
    >
  >;
  async listFromRepository(
    ...args: FunctionArguments<
      ObjectRepository<TRepositoryModel, TRepositoryKey>['list']
    >
  ): Promise<
    NextResponse<
      PaginatedResultset<Partial<TRepositoryModel>> | { error: string }
    >
  >;

  async listFromRepository(
    ...pageStats:
      | [
          (
            r: TRepository
          ) => Promise<PaginatedResultset<Partial<TRepositoryModel>>>
        ]
      | FunctionArguments<
          ObjectRepository<TRepositoryModel, TRepositoryKey>['list']
        >
      | FunctionArguments<TRepository['list']>
  ): Promise<
    NextResponse<
      PaginatedResultset<Partial<TRepositoryModel>> | { error: string }
    >
  > {
    try {
      if (!pageStats || pageStats.length === 0) {
        return NextResponse.json(
          { error: `Invalid pagination parameters` },
          { status: 400 }
        );
      }
      if (typeof pageStats[0] === 'function') {
        const result = await pageStats[0](this.repository);
        if (!result) {
          return NextResponse.json(
            { error: `Request failed` },
            { status: 400 }
          );
        }
        return NextResponse.json(result, { status: 200 });
      } else if (
        !pageStats.length ||
        (pageStats.length === 1 &&
          (!pageStats[0] || isPaginationStats(pageStats[0])))
      ) {
        const result = await this.repository.list(pageStats[0]);
        if (!result) {
          return NextResponse.json(
            { error: `Request failed` },
            { status: 400 }
          );
        }
        return NextResponse.json(result, { status: 200 });
      }
      const res = await this.repository.list(
        ...(pageStats as FunctionArguments<TRepository['list']>)
      );
      return !!res
        ? NextResponse.json(res, { status: 200 })
        : NextResponse.json({ error: `Request failed` }, { status: 400 });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
      return NextResponse.json(
        {
          error: `Internal Server Error`,
        },
        { status: 500 }
      );
    }
  }

  async get<
    TReqParams extends {
      [key in TRepositoryKey]: PickField<TRepositoryModel, TRepositoryKey>;
    }
  >(
    req: LikeNextRequest,
    withParams: { params: Promise<TReqParams> }
  ): Promise<NextResponse<TRepositoryModel>>;
  async get(id: TRepositoryKey): Promise<NextResponse<TRepositoryModel>>;

  async get<
    TReqParams extends {
      [key in TRepositoryKey]: PickField<TRepositoryModel, TRepositoryKey>;
    }
  >(
    req: LikeNextRequest | TRepositoryKey,
    withParams?: { params: Promise<TReqParams> }
  ) {
    const id = await this.extractKeyFromParams<TReqParams>(req, withParams);
    return isNextResponse<{ error: string }>(id)
      ? id
      : await this.getFromRepository(id);
  }

  async getFromRepository(
    ...args: FunctionArguments<
      ObjectRepository<TRepositoryModel, TRepositoryKey>['get']
    >
  ): Promise<NextResponse<TRepositoryModel | { error: string }>>;
  async getFromRepository(
    ...args: FunctionArguments<TRepository['get']>
  ): Promise<NextResponse<TRepositoryModel | { error: string }>>;
  async getFromRepository(
    callback: (repository: TRepository) => Promise<TRepositoryModel>
  ): Promise<NextResponse<TRepositoryModel | { error: string }>>;
  async getFromRepository(
    ...args:
      | FunctionArguments<
          | TRepository['get']
          | ObjectRepository<TRepositoryModel, TRepositoryKey>['get']
        >
      | [(repository: TRepository) => Promise<TRepositoryModel>]
  ): Promise<NextResponse<TRepositoryModel | { error: string }>> {
    try {
      const theCallback =
        args?.length === 1 && typeof args[0] === 'function'
          ? args[0]
          : (r: TRepository) =>
              r.get.bind(r)(args as FunctionArguments<TRepository['get']>);
      const result = await theCallback(this.repository);
      if (!result) {
        return NextResponse.json(
          { error: `Record not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
      return NextResponse.json(
        {
          error: `Internal Server Error`,
        },
        { status: 500 }
      );
    }
  }

  async extractParams<TReqParams extends object>(withParams?: {
    params: TReqParams | Promise<TReqParams>;
  }) {
    if (!withParams) {
      return undefined;
    }
    try {
      return await extractParams<TReqParams>(withParams);
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
      return NextResponse.json(
        {
          error: `Invalid request detected.`,
        },
        { status: 400 }
      );
    }
  }

  async extractKeyFromParams<
    TReqParams extends
      | KeysFromModel<TRepositoryModel, TRepositoryKey>
      | Partial<TRepositoryModel>
  >(
    req: LikeNextRequest | TRepositoryKey,
    withParams?: { params: TReqParams | Promise<TReqParams> }
  ): Promise<TRepositoryKey | NextResponse<{ error: string }>> {
    let id: TRepositoryKey;
    if (isRequestOrApiRequest(req) && withParams) {
      try {
        const params = await extractParams<
          KeysFromModel<TRepositoryModel, TRepositoryKey>
        >(
          withParams as {
            params: KeysFromModel<TRepositoryModel, TRepositoryKey>;
          }
        );
        if (!isKeyOf(this.repository.objectId, params)) {
          return NextResponse.json(
            {
              error: `Invalid parameter: ${String(
                this.repository.objectId
              )} is required.`,
            },
            { status: 400 }
          );
        }
        id = params[this.repository.objectId];
      } catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, { log: true });
        return NextResponse.json(
          {
            error: `Invalid request detected.`,
          },
          { status: 400 }
        );
      }
    } else {
      id = req as TRepositoryKey;
    }
    return id;
  }

  async create<
    TReqParams extends {
      [key in TRepositoryKey]: PickField<TRepositoryModel, key>;
    }
  >(
    req: NextRequest,
    params: { params: TReqParams | Promise<TReqParams> }
  ): Promise<NextResponse<{ error: string } | TRepositoryModel>> {
    let data: Omit<TRepositoryModel, TRepositoryKey>;
    try {
      const fromBody = await req.json();
      const fromParams = params
        ? await this.extractKeyFromParams<TReqParams>(req, params)
        : {};
      if (isNextResponse<{ error: string }>(fromParams)) {
        return fromParams;
      }
      data = {
        ...fromBody,
        ...fromParams,
      };
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RepositoryController::create',
      });
      return NextResponse.json({ error: `Bad request` }, { status: 400 });
    }
    return await this.createFromRepository(data);
  }

  async createFromRepository(
    ...data: FunctionArguments<TRepository['create']>
  ): Promise<NextResponse<TRepositoryModel | { error: string }>>;
  async createFromRepository(
    ...data: FunctionArguments<
      ObjectRepository<TRepositoryModel, TRepositoryKey>['create']
    >
  ): Promise<NextResponse<TRepositoryModel | { error: string }>>;
  async createFromRepository(
    callback: (repository: TRepository) => Promise<TRepositoryModel>
  ): Promise<
    NextResponse<TRepositoryModel | { success: false; error: string }>
  >;
  async createFromRepository(
    ...args:
      | FunctionArguments<
          | ObjectRepository<TRepositoryModel, TRepositoryKey>['create']
          | TRepository['create']
        >
      | [(repository: TRepository) => Promise<TRepositoryModel>]
  ): Promise<
    NextResponse<TRepositoryModel | { success: false; error: string }>
  > {
    if (!args?.length || !args[0]) {
      return NextResponse.json(
        { success: false, error: `Invalid request` },
        { status: 400 }
      );
    }
    try {
      let createdRecord: TRepositoryModel;
      if (args.length === 1) {
        createdRecord =
          typeof args[0] === 'function'
            ? await (
                args[0] as (
                  repository: TRepository
                ) => Promise<TRepositoryModel>
              )(this.repository)
            : await this.repository.create(
                args[0] as FunctionArguments<TRepository['create']>
              );

        return createdRecord
          ? NextResponse.json(createdRecord, { status: 200 })
          : NextResponse.json(
              { success: false, error: `Record not found` },
              { status: 404 }
            );
      } else {
        createdRecord = await this.repository.create.bind(this.repository)(
          args as FunctionArguments<
            ObjectRepository<TRepositoryModel, TRepositoryKey>['create']
          >
        );
      }
      return createdRecord
        ? NextResponse.json(createdRecord, { status: 200 })
        : NextResponse.json(
            { success: false, error: `Record not found` },
            { status: 404 }
          );
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RepositoryController::create',
      });
      return NextResponse.json(
        {
          success: false,
          error: `Internal Server Error`,
        },
        { status: 500 }
      );
    }
  }

  async update<
    TReqParams extends {
      [key in TRepositoryKey]: PickField<TRepositoryModel, key>;
    }
  >(req: NextRequest, params: { params: TReqParams | Promise<TReqParams> }) {
    const fromBody = await req.json();
    const fromParams = params
      ? await this.extractParams<TReqParams>(params)
      : {};
    if (isNextResponse<{ error: string }>(fromParams)) {
      return fromParams;
    }
    const data: PartialExceptFor<TRepositoryModel, TRepositoryKey> = {
      ...fromBody,
      ...fromParams,
    };
    return await this.updateFromRepository(data);
  }

  async updateFromRepository(
    ...args: FunctionArguments<
      ObjectRepository<TRepositoryModel, TRepositoryKey>['update']
    >
  ): Promise<
    NextResponse<TRepositoryModel | { success: false; error: string }>
  >;
  async updateFromRepository(
    ...args: FunctionArguments<TRepository['update']>
  ): Promise<
    NextResponse<TRepositoryModel | { success: false; error: string }>
  >;
  async updateFromRepository(
    callback: (repository: TRepository) => Promise<TRepositoryModel>
  ): Promise<
    NextResponse<TRepositoryModel | { success: false; error: string }>
  >;

  async updateFromRepository(
    ...args:
      | FunctionArguments<
          | TRepository['update']
          | ObjectRepository<TRepositoryModel, TRepositoryKey>['update']
        >
      | [(repository: TRepository) => Promise<TRepositoryModel>]
  ): Promise<
    NextResponse<TRepositoryModel | { success: false; error: string }>
  > {
    if (!args?.length || !args[0]) {
      return NextResponse.json(
        { success: false, error: `Invalid request` },
        { status: 400 }
      );
    }
    try {
      let updatedRecord: TRepositoryModel;
      if (args.length === 1) {
        updatedRecord =
          typeof args[0] === 'function'
            ? await (
                args[0] as (
                  repository: TRepository
                ) => Promise<TRepositoryModel>
              )(this.repository)
            : await this.repository.update(
                args[0] as FunctionArguments<TRepository['update']>
              );
        return updatedRecord
          ? NextResponse.json(updatedRecord, { status: 200 })
          : NextResponse.json(
              { success: false, error: `Record not found` },
              { status: 404 }
            );
      } else {
        updatedRecord = await this.repository.update.bind(this.repository)(
          args as FunctionArguments<TRepository['update']>
        );
      }
      return updatedRecord
        ? NextResponse.json(updatedRecord, { status: 200 })
        : NextResponse.json(
            { success: false, error: `Record not found` },
            { status: 404 }
          );
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RepositoryController::update',
      });
      return NextResponse.json(
        {
          success: false,
          error: `Internal Server Error`,
        },
        { status: 500 }
      );
    }
  }

  async deleteFromRepository(
    ...args: FunctionArguments<TRepository['delete']>
  ): Promise<
    NextResponse<{ success: true } | { success: false; error: string }>
  >;
  async deleteFromRepository(
    ...args: FunctionArguments<
      ObjectRepository<TRepositoryModel, TRepositoryKey>['delete']
    >
  ): Promise<
    NextResponse<{ success: true } | { success: false; error: string }>
  >;
  async deleteFromRepository(
    callback: (repository: TRepository) => Promise<boolean>
  ): Promise<
    NextResponse<{ success: true } | { success: false; error: string }>
  >;

  async deleteFromRepository(
    ...args:
      | FunctionArguments<TRepository['delete']>
      | FunctionArguments<
          ObjectRepository<TRepositoryModel, TRepositoryKey>['delete']
        >
      | [(repository: TRepository) => Promise<boolean>]
  ): Promise<
    NextResponse<{ success: true } | { success: false; error: string }>
  > {
    if (!args?.length || !args[0]) {
      return NextResponse.json(
        { success: false, error: `Invalid request` },
        { status: 400 }
      );
    }
    try {
      let wasDeleted: boolean;
      if (args.length === 1) {
        wasDeleted =
          typeof args[0] === 'function'
            ? await args[0](this.repository)
            : await this.repository.delete(
                args[0] as FunctionArguments<TRepository['delete']>
              );
        return wasDeleted
          ? NextResponse.json({ success: true }, { status: 200 })
          : NextResponse.json(
              { success: false, error: `Record not found` },
              { status: 404 }
            );
      } else {
        wasDeleted = await this.repository.delete.bind(this.repository)(
          args as FunctionArguments<TRepository['delete']>
        );
      }
      return wasDeleted
        ? NextResponse.json({ success: true }, { status: 200 })
        : NextResponse.json(
            { success: false, error: `Record not found` },
            { status: 404 }
          );
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'RepositoryController::delete',
      });
      return NextResponse.json(
        {
          success: false,
          error: `Internal Server Error`,
        },
        { status: 500 }
      );
    }
  }
  async delete<
    TReqParams extends {
      [key in TRepositoryKey]: PickField<TRepositoryModel, key>;
    }
  >(
    req: NextRequest,
    params: { params: TReqParams | Promise<TReqParams> }
  ): Promise<
    NextResponse<{ success: true } | { success: false; error: string }>
  > {
    const fromParams = params
      ? await this.extractKeyFromParams<TReqParams>(req, params)
      : {};
    if (isNextResponse<{ error: string; success: boolean }>(fromParams)) {
      return fromParams;
    }
    return await this.deleteFromRepository(fromParams);
  }
}
