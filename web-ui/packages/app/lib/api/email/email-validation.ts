import z from 'zod';
import { normalizeNullableNumeric } from '@/data-models/_utilities';
import { CreateEmailRequest, UpdateEmailRequest } from './email-service';

// Reusable date-like parser (accepts Date or ISO-ish string)
const dateLike = z
  .union([
    z.date(),
    z
      .string()
      .min(1)
      .refine((v) => !Number.isNaN(Date.parse(v)), {
        message: 'Invalid date string',
      }),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

// Recipient schema accepting snake/camel variants then normalizing
const rawRecipientSchema = z
  .object({
    recipientId: z.number().int().positive().optional(),
    recipient_id: z.number().int().positive().optional(),
    recipientName: z.string().min(1).optional(),
    recipient_name: z.string().min(1).optional(),
    recipientEmail: z.string().email().optional(),
    recipient_email: z.string().email().optional(),
  })
  .refine((r) => (r.recipientId ?? r.recipient_id) !== undefined, {
    message: 'recipientId (recipientId or recipient_id) is required',
  })
  .transform((r) => ({
    recipientId: r.recipientId ?? r.recipient_id!,
    recipientName: r.recipientName ?? r.recipient_name,
    recipientEmail: r.recipientEmail ?? r.recipient_email,
  }));

// Sender schema (supports snake variant)
const senderSchema = z
  .object({ contactId: z.number().int().positive() })
  .or(
    z
      .object({ contact_id: z.number().int().positive() })
      .transform((s) => ({ contactId: s.contact_id })),
  );

// Create email schema (required core fields)
export const createEmailRequestSchema = z
  .object({
    senderId: z.number().int().positive().optional(),
    sender: senderSchema.optional(),
    subject: z.string().min(1, 'subject is required'),
    body: z.string().min(1, 'body is required'),
    sentOn: dateLike.optional(),
    threadId: z.number().int().positive().nullable().optional(),
    parentEmailId: z.string().min(1).nullable().optional(),
    recipients: z
      .array(rawRecipientSchema)
      .min(1, 'At least one recipient is required'),
  })
  .superRefine((val, ctx) => {
    if (!val.senderId && !val.sender?.contactId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'senderId or sender.contactId is required',
      });
    }
  });

// Update email schema (emailId required, others optional, at least one besides emailId)
export const updateEmailRequestSchema = z
  .object({
    emailId: z.string().min(1, 'emailId is required'),
    senderId: z.number().int().positive().optional(),
    sender: senderSchema.optional(),
    subject: z.string().min(1).optional(),
    body: z.string().min(1).optional(),
    sentOn: dateLike.optional(),
    threadId: z.number().int().positive().nullable().optional(),
    parentEmailId: z.string().min(1).nullable().optional(),
    recipients: z.array(rawRecipientSchema).min(1).optional(),
  })
  .superRefine((val, ctx) => {
    if (
      val.senderId === undefined &&
      val.sender === undefined &&
      val.subject === undefined &&
      val.body === undefined &&
      val.sentOn === undefined &&
      val.threadId === undefined &&
      val.parentEmailId === undefined &&
      val.recipients === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field to update must be provided',
      });
    }
  });

export type CreateEmailRequestInput = z.infer<typeof createEmailRequestSchema>;
export type UpdateEmailRequestInput = z.infer<typeof updateEmailRequestSchema>;

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}
export interface ValidationFailure {
  success: false;
  error: z.ZodError;
}
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validateCreateEmail(
  raw: unknown,
): ValidationResult<CreateEmailRequest> {
  const parsed = createEmailRequestSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error };
  const v = parsed.data;
  const senderId = v.senderId ?? v.sender?.contactId;
  const normalized: CreateEmailRequest = {
    senderId: senderId!,
    subject: v.subject,
    body: v.body,
    sentOn: v.sentOn,
    threadId: normalizeNullableNumeric(v.threadId),
    parentEmailId: v.parentEmailId ?? null,
    recipients: v.recipients.map((r) => ({
      recipientId: r.recipientId,
      recipientName: r.recipientName,
      recipientEmail: r.recipientEmail,
    })),
    sender: v.sender ? { contactId: v.sender.contactId } : undefined,
  };
  return { success: true, data: normalized };
}

export function validateUpdateEmail(
  raw: unknown,
): ValidationResult<UpdateEmailRequest> {
  const parsed = updateEmailRequestSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error };
  const v = parsed.data;
  const senderId = v.senderId ?? v.sender?.contactId;
  const normalized: UpdateEmailRequest = {
    emailId: v.emailId,
    senderId: senderId,
    subject: v.subject,
    body: v.body,
    sentOn: v.sentOn,
    threadId: normalizeNullableNumeric(v.threadId),
    parentEmailId: v.parentEmailId ?? null,
    recipients: v.recipients?.map((r) => ({
      recipientId: r.recipientId,
      recipientName: r.recipientName,
      recipientEmail: r.recipientEmail,
    })),
    sender: v.sender ? { contactId: v.sender.contactId } : undefined,
  };
  return { success: true, data: normalized };
}
