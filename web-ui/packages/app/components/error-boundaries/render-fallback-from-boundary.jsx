'use server';
import { RenderErrorBoundaryFallback } from './render-fallback';
export const RenderFallbackFromBoundary = async ({ error, resetErrorBoundary }) => {
    async function resetErrorBoundaryAction() {
        'use server';
        resetErrorBoundary();
    }
    return <RenderErrorBoundaryFallback resetErrorBoundaryAction={resetErrorBoundaryAction} error={error}/>;
};
//# sourceMappingURL=render-fallback-from-boundary.jsx.map