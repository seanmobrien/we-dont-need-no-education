import { SafeProgressEvent } from '../utility-methods';
import { ErrorContext, IContextEnricher } from '@/lib/error-monitoring/types';
export declare class ProgressEventError<TEventTarget extends EventTarget = XMLHttpRequest> implements Error, IContextEnricher {
    #private;
    name: string;
    message: string;
    lengthComputable: boolean;
    loaded: number;
    total: number;
    cause: {
        source: EventTarget | null;
    };
    constructor(event: SafeProgressEvent<TEventTarget>);
    get source(): SafeProgressEvent<TEventTarget>;
    get headers(): Record<string, string> | undefined;
    enrichContext(context: ErrorContext): Promise<ErrorContext>;
}
//# sourceMappingURL=progress-event-error.d.ts.map