'use client';
import dynamic from 'next/dynamic';
const ClientErrorManager = dynamic(() => import('./ClientErrorManager').then(mod => ({ default: mod.ClientErrorManager })), {
    ssr: false,
    loading: () => null,
});
export function ErrorManagerProvider(props) {
    return <ClientErrorManager {...props}/>;
}
export function DefaultErrorManager() {
    return (<ErrorManagerProvider surfaceToErrorBoundary={true} reportSuppressedErrors={false} debounceMs={1000}/>);
}
export function DevErrorManager() {
    return (<ErrorManagerProvider surfaceToErrorBoundary={true} reportSuppressedErrors={true} debounceMs={500}/>);
}
export function ProdErrorManager() {
    return (<ErrorManagerProvider surfaceToErrorBoundary={true} reportSuppressedErrors={false} debounceMs={2000}/>);
}
//# sourceMappingURL=ErrorManagerProvider.jsx.map