import { NextResponse } from 'next/server';
import { getImportMessageStatus } from '../../../_utilitites';
import { LoggedError } from '@compliance-theater/logger';
export const dynamic = 'force-dynamic';
export const GET = async (req, { params }) => {
    const { provider, emailId } = await params;
    try {
        const result = await getImportMessageStatus({
            req,
            provider,
            emailId,
        });
        if (!result) {
            return NextResponse.json({ error: 'Unexpected failure' }, { status: 500 });
        }
        return NextResponse.json(result, { status: 200 });
    }
    catch (error) {
        const le = LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'google-email-import-status',
            provider,
            emailId,
        });
        return NextResponse.json({ error: le.message }, { status: 500 });
    }
};
//# sourceMappingURL=route.js.map