import { z } from 'zod';
import { CaseFileAmendmentShape } from './caseFileAmendmentShape';

export const AmendmentShape = z.object({
  id: z
    .union([z.number(), z.string()])
    .describe('Unique identifier for the amendment.'),
  changes: CaseFileAmendmentShape.partial().describe(
    'Partial changes to the case file amendment.',
  ),
});

export const AmendmentResultShape = z.object({
  message: z
    .string()
    .describe('Message describing the result of the amendment operation.'),
  UpdatedRecords: z
    .array(AmendmentShape)
    .describe('Array of amendments that were successfully updated.'),
  InsertedRecords: z
    .array(AmendmentShape)
    .describe('Array of amendments that were successfully inserted.'),
  FailedRecords: z
    .array(
      AmendmentShape.extend({
        error: z.string().describe('Error message for the failed amendment.'),
      }),
    )
    .describe('Array of amendments that failed with error details.'),
});
