export type RawSourceClassProps = {
  source: string | Buffer;
};
export type RawSourceClassDef = RawSourceClassProps & {
  new (source: string | Buffer): RawSourceClassProps;
  get source(): string | Buffer;
};

export type WebpackTap<TArg> = (
  props: string | { name: string; stage: unknown },
  callback: (arg: TArg) => void,
) => void;

export type WebpackAsset = {
  source: () => string | Buffer;
};

export type WebpackCompilation = {
  updateAsset(name: string, asset: WebpackAsset | RawSourceClassProps): unknown;
  hooks: {
    processAssets: {
      tap: WebpackTap<Record<PropertyKey, RawSourceClassProps>>;
    };
  };
};

export type WebpackCompiler = {
  hooks: {
    compilation: {
      tap: WebpackTap<WebpackCompilation>;
    };
  };
  webpack: {
    sources: {
      RawSource: RawSourceClassDef;
    };
    Compilation: Record<PropertyKey, WebpackCompilation>;
  };
};

export type WebpackPlugin = {
  apply: (compiler: WebpackCompiler) => void;
};
