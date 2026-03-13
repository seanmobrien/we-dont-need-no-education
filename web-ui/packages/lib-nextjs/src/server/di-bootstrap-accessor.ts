const DI_BOOTSTRAP_ACCESSOR_KEY = Symbol.for(
  '@compliance-theater/nextjs/server/di-bootstrap-accessor',
);

type BootstrapAccessor = () => void | Promise<void>;

type GlobalWithBootstrapAccessor = typeof globalThis & {
  [DI_BOOTSTRAP_ACCESSOR_KEY]?: BootstrapAccessor;
};

export const configureServerRequestBootstrap = (
  accessor: BootstrapAccessor,
): void => {
  const globalWithAccessor = globalThis as GlobalWithBootstrapAccessor;
  globalWithAccessor[DI_BOOTSTRAP_ACCESSOR_KEY] = accessor;
};

export const runServerRequestBootstrap = async (): Promise<void> => {
  const globalWithAccessor = globalThis as GlobalWithBootstrapAccessor;
  await globalWithAccessor[DI_BOOTSTRAP_ACCESSOR_KEY]?.();
};