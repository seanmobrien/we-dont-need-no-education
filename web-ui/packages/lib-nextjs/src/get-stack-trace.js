import { getStackTrace as getStackTraceBase } from '@compliance-theater/types/get-stack-trace';
import { deprecate } from '@compliance-theater/types/deprecate';
export const getStackTrace = deprecate(getStackTraceBase, 'Use getStackTrace from @compliance-theater/types instead', 'DEP004');
//# sourceMappingURL=get-stack-trace.js.map