import { z } from 'zod';
import { CaseFileAmendmentShape } from './caseFileAmendmentShape';

export const AmendmentShape = z.object({
  id: z.union([z.number(), z.string()]),
  changes: CaseFileAmendmentShape.partial().describe('Partial case file changes'),
});

export const AmendmentResultShape = z.object({
  message: z.string().describe('Amendment operation result'),
  UpdatedRecords: z.array(AmendmentShape).describe('Successfully updated amendments'),
  InsertedRecords: z.array(AmendmentShape).describe('Successfully inserted amendments'),
  FailedRecords: z
    .array(
      AmendmentShape.extend({
        error: z.string(),
      }),
    )
    .describe('Failed amendments with errors'),
});
