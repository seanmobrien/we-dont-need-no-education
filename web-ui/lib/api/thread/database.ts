import { query, queryExt } from '@/lib/neondb';
import { ValidationError } from '@/lib/react-util/errors';
import { DataIntegrityError } from '@/lib/react-util/errors/data-integrity-error';
import { PartialExceptFor } from '@/lib/typescript';
import { PaginatedResultset, PaginationStats } from '@/data-models/_types';
import { parsePaginationStats } from '@/data-models';
import { ObjectRepository } from '../_types';
import { Thread, ThreadSummary } from '@/data-models/api/thread';
import { BaseObjectRepository } from '../_baseObjectRepository';
import { log } from '@/lib/logger';

const mapRecordToSummary = (record: Record<string, unknown>) => ({
  threadId: Number(record.thread_id),
  subject: record.name as string,
  createdOn: record.created_date as Date,
  externalId: record.external_id as string,
});

export class ThreadRepository
  implements ObjectRepository<ThreadSummary, 'threadId'>
{
  constructor() {}
  static MapRecordToSummary = mapRecordToSummary;

  async list(
    pagination?: PaginationStats,
  ): Promise<PaginatedResultset<ThreadSummary>> {
    const { num, page, offset } = parsePaginationStats(pagination);
    try {
      const results = await query(
        (sql) =>
          sql`SELECT * FROM threads ORDER BY created_date DESC LIMIT ${num} OFFSET ${offset}`,
        { transform: ThreadRepository.MapRecordToSummary },
      );
      if (results.length === page) {
        const total = await query(
          (sql) => sql`SELECT COUNT(*) as records FROM threads`,
        );
        return {
          results,
          pageStats: {
            num,
            page,
            total: total[0].records as number,
          },
        };
      } else {
        return {
          results,
          pageStats: {
            num,
            page,
            total: offset + results.length,
          },
        };
      }
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ThreadRepository',
      });
    }
    return {
      results: [],
      pageStats: {
        num: 0,
        page: 0,
        total: 0,
      },
    };
  }

  async get(threadId: number | string): Promise<ThreadSummary | null> {
    try {
      let result: ThreadSummary[];

      if (typeof threadId === 'string') {
        result = await query(
          (sql) => sql`SELECT * FROM threads WHERE external_id = ${threadId}`,
          { transform: ThreadRepository.MapRecordToSummary },
        );
      } else {
        result = await query(
          (sql) => sql`SELECT * FROM threads WHERE thread_id = ${threadId}`,
          { transform: ThreadRepository.MapRecordToSummary },
        );
      }
      return result.length === 1 ? result[0] : null;
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ThreadRepository',
      });
    }
    // should never get here as logError throws
    return null;
  }

  async create({
    subject,
    externalId,
    createdOn,
  }: Omit<Partial<ThreadSummary>, 'threadId'>): Promise<ThreadSummary> {
    try {
      if (!subject) {
        throw new ValidationError({
          field: 'name||email',
          source: 'ThreadRepository',
        });
      }
      const createdDate = createdOn || new Date();
      const result = await query(
        (sql) =>
          sql`INSERT INTO threads (subject, created_at, external_id) VALUES (${subject}, ${createdDate}, ${externalId}) \
            RETURNING *`,
        { transform: ThreadRepository.MapRecordToSummary },
      );
      log((l) => l.verbose('[ [AUDIT]] -  Thread created:', result[0]));
      if (result.length !== 1) {
        throw new DataIntegrityError('Failed to create Thread', {
          table: 'Threads',
        });
      }
      return result[0];
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ThreadRepository',
      });
    }
  }

  async update({
    threadId,
    subject,
    externalId,
  }: PartialExceptFor<Thread, 'threadId'>): Promise<ThreadSummary> {
    if (!threadId) {
      throw new ValidationError({
        field: 'threadId',
        source: 'ThreadRepository',
      });
    }
    if (!subject && !externalId) {
      throw new ValidationError({
        field: 'At least one field is required for update',
        source: 'ThreadRepository',
      });
    }
    const updateFields: string[] = [];
    const values: unknown[] = [];
    const fieldMap = {
      subject,
      createdOn: 'created_on',
      externalId: 'external_id',
    };
    let paramIndex = 1;
    Object.entries(fieldMap).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });
    values.push(threadId);

    try {
      const result = await queryExt(
        (sql) =>
          sql<false, true>(
            `UPDATE threads SET ${updateFields.join(
              ', ',
            )} WHERE thread_id = $${paramIndex} RETURNING *`.toString(),
            values,
          ),
        { transform: ThreadRepository.MapRecordToSummary },
      );

      if (result.rowCount === 0) {
        throw new DataIntegrityError('Failed to update Thread');
      }
      log((l) => l.verbose('[[AUDIT]] -  Thread updated:', result.rows[0]));
      return result.rows[0];
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ThreadRepository',
      });
    }
  }

  async delete(threadId: number): Promise<boolean> {
    if (!threadId) {
      throw new TypeError('threadId is required for delete');
    }
    try {
      const results = await query(
        (sql) => sql`
            DELETE FROM threads
            WHERE thread_id = ${threadId}
            RETURNING thread_id`,
      );
      if (results.length === 0) {
        throw new DataIntegrityError('Failed to delete Thread');
      }
      return true;
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({
        error,
        source: 'ThreadRepository',
      });
    }
    return false;
  }
}
