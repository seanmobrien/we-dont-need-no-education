import { generateChatId as refChatId } from '@/lib/ai/core/chat-ids';
import { deprecate } from 'util';

export const generateChatId = deprecate(
  (seed?: number): { seed: number; id: string } => refChatId(seed),
  'Import from @/lib/ai/core or @lib/ai instead',
  'DEPGENCHATID001',
);
