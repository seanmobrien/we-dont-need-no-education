import { drizDbWithInit } from '@/lib/drizzle-db';
import { isValidUuid } from '@/lib/typescript/_guards';
import { redirect, notFound } from 'next/navigation';
import { LoggedError } from '../react-util';
import { SiteRoute } from '../site-util/url-builder/_types';

/**
 * Resolves an email ID from either a UUID or document unit ID, with automatic redirects.
 *
 * @param emailIdParam - The route parameter that could be either an email ID (UUID) or document unit ID (number)
 * @param currentPath - The current path to redirect to with the resolved email ID
 * @returns The resolved email ID if valid, otherwise triggers redirect or 404
 */
export async function resolveEmailIdWithRedirect(
  emailIdParam: string,
  currentPath: string,
): Promise<string | null> {
  const emailId = await resolveEmailId(emailIdParam);
  // If no email id provided, show 404
  if (!emailId) {
    notFound();
    return null;
  }
  // Document ID was used - redirect to the email ID equivalent
  if (emailIdParam !== emailId) {
    const redirectPath = currentPath.replace(
      `[emailId]`,
      emailId,
    ) as SiteRoute;
    redirect(redirectPath);
  }
  return emailId;
}

/**
 * Resolves an email ID from either a UUID or document unit ID, without redirects.
 * Used for cases where you just need the email ID value.
 *
 * @param emailIdParam - The route parameter that could be either an email ID (UUID) or document unit ID (number)
 * @returns The resolved email ID if valid, otherwise null
 */
export async function resolveEmailId(
  emailIdParam: string,
): Promise<string | null> {
  // If no email id provided, return null
  if (!emailIdParam) {
    return null;
  }

  // Check if it's already a valid UUID (email ID)
  if (isValidUuid(emailIdParam)) {
    return emailIdParam;
  }

  // Try to parse as document unit ID (numeric)
  const documentId = Number(emailIdParam);
  if (!documentId || Number.isNaN(documentId)) {
    // Invalid format - not UUID and not a valid number
    return null;
  }

  // Look up the email ID associated with this document unit ID
  try {
    const doc = await (
      await drizDbWithInit()
    ).query.documentUnits.findFirst({
      where: (d, { eq }) => eq(d.unitId, documentId),
      columns: {
        unitId: true,
        emailId: true,
      },
    });

    return doc?.emailId || null;
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'EmailIdResolver.resolveEmailId',
      critical: true,
    });
    return null;
  }
}
