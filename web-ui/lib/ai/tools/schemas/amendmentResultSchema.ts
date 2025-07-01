import { z } from 'zod';
import { CaseFileAmendmentShape } from './caseFileAmendmentShape';

export const AmendmentShape = z.object({
  id: z.union([z.number(), z.string()]),
  changes: CaseFileAmendmentShape.partial(),
});

export const AmendmentResultShape = z.object({
  message: z.string(),
  UpdatedRecords: z.array(AmendmentShape),
  InsertedRecords: z.array(AmendmentShape),
  FailedRecords: z.array(
    AmendmentShape.extend({
      error: z.string(),
    }),
  ),
});
