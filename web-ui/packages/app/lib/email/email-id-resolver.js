import { drizDbWithInit } from '@compliance-theater/database/orm';
import { isValidUuid } from '@compliance-theater/typescript';
import { redirect, notFound } from 'next/navigation';
import { LoggedError } from '@compliance-theater/logger';
export async function resolveEmailIdWithRedirect(emailIdParam, currentPath) {
    const emailId = await resolveEmailId(emailIdParam);
    if (!emailId) {
        notFound();
        return null;
    }
    if (emailIdParam !== emailId) {
        const redirectPath = currentPath.replace(`[emailId]`, emailId);
        redirect(redirectPath);
    }
    return emailId;
}
export async function resolveEmailId(emailIdParam) {
    if (!emailIdParam) {
        return null;
    }
    if (isValidUuid(emailIdParam)) {
        return emailIdParam;
    }
    const documentId = Number(emailIdParam);
    if (!documentId || Number.isNaN(documentId)) {
        return null;
    }
    try {
        const doc = await (await drizDbWithInit()).query.documentUnits.findFirst({
            where: (d, { eq }) => eq(d.unitId, documentId),
            columns: {
                unitId: true,
                emailId: true,
            },
        });
        return doc?.emailId || null;
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'EmailIdResolver.resolveEmailId',
            critical: true,
        });
        return null;
    }
}
//# sourceMappingURL=email-id-resolver.js.map