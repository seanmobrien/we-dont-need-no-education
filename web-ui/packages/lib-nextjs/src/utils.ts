import { deprecate as baseDeprecate } from '@compliance-theater/types/deprecate';

export const deprecate = baseDeprecate(baseDeprecate,
  'deprecate is deprecated; import directly from lib-types instead of lib-nextjs.',
  'DEP002');
