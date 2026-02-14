import { NextRequest, NextResponse } from 'next/server';
export declare const unauthorizedServiceResponse: ({ req, scopes, }?: {
    req?: NextRequest;
    scopes?: Array<string>;
}) => NextResponse<{
    error: string;
    message: string;
}>;
//# sourceMappingURL=unauthorized-service-response.d.ts.map