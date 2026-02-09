import { SafeProgressEvent } from '../utilities/error-guards';
import { ErrorContext, IContextEnricher } from '../types';

export declare class ProgressEventError<
    TEventTarget extends EventTarget = XMLHttpRequest,
  >
  implements Error, IContextEnricher
{
  name: string;
  message: string;
  lengthComputable: boolean;
  loaded: number;
  total: number;
  cause: { source: EventTarget | null };

  constructor(event: SafeProgressEvent<TEventTarget>);

  get source(): SafeProgressEvent<TEventTarget>;
  get headers(): Record<string, string> | undefined;
  enrichContext(context: ErrorContext): Promise<ErrorContext>;
}
