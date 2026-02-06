import type { DatabaseMockType } from "./setup/jest.mock-drizzle";
type JestTestExtensions = {
    session: {
        id: string;
        user: {
            id: string;
            name: string;
            email: string;
            subject: string;
            image?: string;
        };
        expires: string;
    } | null;
    makeMockDb: () => DatabaseMockType;
    suppressDeprecation: boolean;
};
export declare const withJestTestExtensions: () => JestTestExtensions;
export {};
//# sourceMappingURL=jest.test-extensions.d.ts.map