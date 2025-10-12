import { NextRequest, NextResponse } from 'next/server';
import { BaseDrizzleRepository } from './_baseDrizzleRepository';
import { PickField } from '@/lib/typescript';
import { LikeNextRequest } from '@/lib/nextjs-util/types';
import { isRequestOrApiRequest } from '@/lib/nextjs-util/guards';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { PaginatedResultset } from '@/data-models/_types';
import type { PaginationStats } from '@/data-models/_types';
import { GridSortModel, GridFilterModel } from '@mui/x-data-grid-pro';
import { PaginatedGridListRequest } from '../components/mui/data-grid';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';

type KeysFromModel<
  TRepositoryModel,
  TRepositoryKey extends keyof TRepositoryModel,
> = {
  [key in TRepositoryKey]: PickField<TRepositoryModel, key>;
};

/**
 * DrizzleCrudRepositoryController provides REST API endpoints for any BaseDrizzleRepository implementation.
 * It handles HTTP requests and delegates to the repository for data operations while providing
 * consistent error handling and response formatting.
 *
 * @template TRepository - The specific DrizzleRepository implementation
 * @template TRepositoryModel - The domain model type managed by the repository
 * @template TRepositoryKey - The primary key field of the domain model
 */
export class DrizzleCrudRepositoryController<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TRepository extends BaseDrizzleRepository<any, keyof any>,
  TRepositoryModel extends TRepository extends BaseDrizzleRepository<
    infer TInferModel,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  >
    ? TInferModel
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any = TRepository extends BaseDrizzleRepository<infer TInferModel, any>
    ? TInferModel
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
  TRepositoryKey extends TRepository extends BaseDrizzleRepository<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any,
    infer TInferKey
  >
    ? TInferKey
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any = TRepository extends BaseDrizzleRepository<any, infer TInferKey>
    ? TInferKey
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any,
> {
  constructor(private repository: TRepository) {}

  /**
   * Handles GET requests for listing resources with optional pagination
   */
  async list(): Promise<
    NextResponse<
      PaginatedResultset<Partial<TRepositoryModel>> | { error: string }
    >
  >;
  async list(
    ops: PaginationStats,
    sort?: GridSortModel,
    filter?: GridFilterModel,
  ): Promise<
    NextResponse<
      PaginatedResultset<Partial<TRepositoryModel>> | { error: string }
    >
  >;
  async list(
    req: LikeNextRequest,
  ): Promise<
    NextResponse<
      PaginatedResultset<Partial<TRepositoryModel>> | { error: string }
    >
  >;

  async list(
    ops?: LikeNextRequest | PaginatedGridListRequest,
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
        total: ops.total ?? 0,
      };
    } else {
      pagination = { page: 1, num: 10, total: 0 };
    }

    try {
      const result = await this.repository.list(pagination);
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'DrizzleCrudRepositoryController::list',
      });
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  }

  /**
   * Handles GET requests for retrieving a single resource by ID
   */
  async get(
    req: NextRequest,
    args: {
      params: Promise<KeysFromModel<TRepositoryModel, TRepositoryKey>>;
    },
  ): Promise<
    NextResponse<TRepositoryModel | { success: false; error: string }>
  > {
    try {
      const params = await args.params;
      const keys = Object.keys(params);
      if (keys.length !== 1) {
        return NextResponse.json(
          { success: false, error: 'Invalid parameters' },
          { status: 400 },
        );
      }

      const idValue = params[keys[0] as TRepositoryKey];
      const record = await this.repository.get(idValue);

      if (!record) {
        return NextResponse.json(
          { success: false, error: 'Record not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(record, { status: 200 });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'DrizzleCrudRepositoryController::get',
      });
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  }

  /**
   * Handles POST requests for creating new resources
   */
  async create(
    req: NextRequest,
  ): Promise<
    NextResponse<TRepositoryModel | { success: false; error: string }>
  > {
    try {
      const body = await req.json();
      const newRecord = await this.repository.create(body);
      return NextResponse.json(newRecord, { status: 201 });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'DrizzleCrudRepositoryController::create',
      });
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  }

  /**
   * Handles PUT requests for updating existing resources
   */
  async update(
    req: NextRequest,
    args: {
      params: Promise<KeysFromModel<TRepositoryModel, TRepositoryKey>>;
    },
  ): Promise<
    NextResponse<TRepositoryModel | { success: false; error: string }>
  > {
    try {
      const params = await args.params;
      const body = await req.json();

      const keys = Object.keys(params);
      if (keys.length !== 1) {
        return NextResponse.json(
          { success: false, error: 'Invalid parameters' },
          { status: 400 },
        );
      }

      const idKey = keys[0] as TRepositoryKey;
      const idValue = params[idKey];

      // Ensure the ID is included in the update data
      const updateData = { ...body, [idKey]: idValue };

      const updatedRecord = await this.repository.update(updateData);
      return NextResponse.json(updatedRecord, { status: 200 });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'DrizzleCrudRepositoryController::update',
      });
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  }

  /**
   * Handles DELETE requests for removing resources
   */
  async delete(
    req: NextRequest,
    args: {
      params: Promise<KeysFromModel<TRepositoryModel, TRepositoryKey>>;
    },
  ): Promise<NextResponse<{ success: boolean; error?: string }>> {
    try {
      const params = await args.params;
      const keys = Object.keys(params);
      if (keys.length !== 1) {
        return NextResponse.json(
          { success: false, error: 'Invalid parameters' },
          { status: 400 },
        );
      }

      const idValue = params[keys[0] as TRepositoryKey];
      const deleted = await this.repository.delete(idValue);

      if (!deleted) {
        return NextResponse.json(
          { success: false, error: 'Record not found' },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'DrizzleCrudRepositoryController::delete',
      });
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  }

  /**
   * Executes a custom operation using the repository
   */
  async updateFromRepository(
    callback: (repository: TRepository) => Promise<TRepositoryModel>,
  ): Promise<
    NextResponse<TRepositoryModel | { success: false; error: string }>
  > {
    try {
      const result = await callback(this.repository);
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'DrizzleCrudRepositoryController::updateFromRepository',
      });
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 },
      );
    }
  }
}
