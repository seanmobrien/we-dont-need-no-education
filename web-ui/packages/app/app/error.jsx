'use client';
import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/render-fallback';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';
const Error = ({ error, reset }) => {
    const { processedError } = useProcessedError({
        error,
        resetAction: reset,
    });
    return (<>
    {!!processedError ? (<div>
        <RenderErrorBoundaryFallback error={processedError} resetErrorBoundaryAction={reset}/>
    </div>) : (<div>
        <p>An unexpected error occurred. Please try again later.</p>
      </div>)}
    </>);
};
export default Error;
//# sourceMappingURL=error.jsx.map