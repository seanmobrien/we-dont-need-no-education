'use client';
import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/render-fallback';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';
export default function Error({ error, resetAction, }) {
    const { processedError } = useProcessedError({
        error,
        resetAction,
        errorBoundary: 'MessagesError',
    });
    return (<>
  {processedError && (<div>
      <RenderErrorBoundaryFallback error={processedError} resetErrorBoundaryAction={resetAction}/>
    </div>)}</>);
}
//# sourceMappingURL=error.jsx.map