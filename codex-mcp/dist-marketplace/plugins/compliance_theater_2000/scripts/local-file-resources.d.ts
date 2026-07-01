import type { AnyRecord } from "./types";
export type LocalFileResource = {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
    sourcePath: string;
    virtualPath: string;
};
export declare function listLocalFileResources(): Promise<AnyRecord[]>;
export declare function readLocalFileResource(uriOrPath: string): Promise<AnyRecord | undefined>;
//# sourceMappingURL=local-file-resources.d.ts.map