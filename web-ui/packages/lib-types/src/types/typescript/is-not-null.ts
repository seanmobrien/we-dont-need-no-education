export type IsNotNull<K> = K extends null
    ? never
    : K extends undefined
    ? never
    : K;