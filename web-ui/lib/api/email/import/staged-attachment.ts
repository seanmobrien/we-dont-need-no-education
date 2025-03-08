import { BaseObjectRepository } from '@/lib/api/_baseObjectRepository';
import { ObjectRepository } from '@/lib/api/_types';
import { query } from '@/lib/neondb';
import { ValidationError } from '@/lib/react-util';
import { FirstParameter } from '@/lib/typescript';

export type StagedAttachment = {
  stagedMessageId: string;
  partId: number;
  filename: string;
  mimeType: string | null;
  storageId: string | null;
  imported: boolean;
  size: number;
  fileOid: string | null;
  attachmentId: string | null;
};

const mapRecordToObject = (
  record: Record<string, unknown>
): StagedAttachment => ({
  stagedMessageId: record.staging_message_id as string,
  partId: record.partId as number,
  filename: record.filename as string,
  mimeType: record.mimeType as string,
  storageId: record.storageId as string | null,
  imported: record.imported as boolean,
  size: record.size as number,
  fileOid: record.file_oid as string | null,
  attachmentId: record.attachmentId as string | null,
});

export class StagedAttachmentRepository extends BaseObjectRepository<
  StagedAttachment,
  'partId'
> {
  constructor() {
    super({
      tableName: 'staging_attachment',
      idField: 'partId',
      objectMap: mapRecordToObject,
      summaryMap: mapRecordToObject,
    });
  }

  async create(
    props: Omit<StagedAttachment, 'partId'> &
      Partial<Pick<StagedAttachment, 'partId'>>
  ): Promise<StagedAttachment> {
    return super.create(props);
  }

  async getForMessage(
    stagedMessageId: string
  ): Promise<ReadonlyArray<StagedAttachment>> {
    const runQuery = () =>
      query(
        (sql) => sql`
      SELECT * FROM staging_attachment WHERE staging_message_id = ${stagedMessageId} ORDER BY "partId"`
      );
    return this.innerList(runQuery, runQuery).then(
      (x) => x.results as ReadonlyArray<StagedAttachment>
    );
  }

  /**
   * Validates the input for a specific method.
   *
   * @template TMethod
   * @param {TMethod} method - The method to validate.
   * @param {FirstParameter<ObjectRepository<T, KId>[TMethod]>} obj - The input to validate.
   */
  validate<TMethod extends keyof ObjectRepository<StagedAttachment, 'partId'>>(
    method: TMethod,
    obj: FirstParameter<
      Pick<ObjectRepository<StagedAttachment, 'partId'>, TMethod>[TMethod]
    >
  ): void {
    if (!obj) {
      throw new ValidationError('No object provided');
    }
    switch (method) {
      case 'create':
        break;
      case 'update':
        break;
      default:
        break;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getListQueryProperties(): [string, Array<any>, string] {
    return [
      `SELECT * FROM staging_attachment ORDER BY staging_message_id, partId`,
      [],
      `SELECT COUNT(*) as records FROM staging_attachment`,
    ];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getQueryProperties(recordId: number): [string, Array<any>] {
    return ['SELECT * FROM staging_attachment WHERE partId = $1', [recordId]];
  }
  protected getCreateQueryProperties({
    stagedMessageId,
    partId,
    filename,
    mimeType,
    size,
    attachmentId,
  }: StagedAttachment): [string, Array<unknown>] {
    return [
      `INSERT INTO staging_attachment (staging_message_id, "partId", filename, "mimeType", size, "attachmentId") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [stagedMessageId, partId, filename, mimeType, size, attachmentId],
    ];
  }
  protected updateQueryProperties(
    obj: StagedAttachment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): [Record<string, any>] {
    return [
      {
        staged_message_id: obj.stagedMessageId,
        partId: obj.partId,
        filename: obj.filename,
        mimeType: obj.mimeType,
        size: obj.size,
        file_oid: obj.fileOid,
        attachmentId: obj.attachmentId,
      },
    ];
  }
}
