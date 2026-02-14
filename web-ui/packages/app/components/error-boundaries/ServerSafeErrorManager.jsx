import dynamic from 'next/dynamic';
const ServerSafeErrorManager = dynamic(() => import('./ErrorManagerProvider').then((mod) => ({
    default: mod.DefaultErrorManager,
})), {
    ssr: true,
    loading: () => null,
});
const ConfigurableServerSafeErrorManager = dynamic(() => import('./ErrorManagerProvider').then((mod) => ({
    default: mod.ErrorManagerProvider,
})), {
    ssr: true,
    loading: () => null,
});
const DevServerSafeErrorManager = dynamic(() => import('./ErrorManagerProvider').then((mod) => ({
    default: mod.DevErrorManager,
})), {
    ssr: true,
    loading: () => null,
});
const ProdServerSafeErrorManager = dynamic(() => import('./ErrorManagerProvider').then((mod) => ({
    default: mod.ProdErrorManager,
})), {
    ssr: true,
    loading: () => null,
});
export default ServerSafeErrorManager;
export { ConfigurableServerSafeErrorManager as ConfigurableErrorManager, DevServerSafeErrorManager as DevErrorManager, ProdServerSafeErrorManager as ProdErrorManager, };
//# sourceMappingURL=ServerSafeErrorManager.jsx.map