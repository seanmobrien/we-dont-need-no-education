/**
 * @fileoverview API endpoint for managing user cryptographic keys
 * 
 * This endpoint allows authenticated users to upload new public keys
 * to be associated with their account for cryptographic operations.
 * 
 * @module app/api/auth/keys/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { drizDb, schema } from '@/lib/drizzle-db';
import { log } from '@/lib/logger';
import { LoggedError } from '@/lib/react-util';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * Schema for validating public key upload requests
 */
const UploadKeyRequestSchema = z.object({
  publicKey: z.string().min(1, 'Public key is required'),
  expirationDate: z.string().datetime().optional(),
});

type UploadKeyRequest = z.infer<typeof UploadKeyRequestSchema>;

/**
 * Validates that a base64 string represents a valid public key
 */
function validatePublicKeyFormat(publicKeyBase64: string): boolean {
  try {
    // Basic validation - check if it's valid base64
    const decoded = atob(publicKeyBase64);
    
    // Check minimum length (ECDSA P-256 public keys are typically 65-91 bytes)
    if (decoded.length < 50) {
      return false;
    }
    
    // Check for SPKI header (basic format validation)
    const uint8Array = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      uint8Array[i] = decoded.charCodeAt(i);
    }
    
    // SPKI format typically starts with 0x30 (SEQUENCE)
    if (uint8Array[0] !== 0x30) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/auth/keys
 * 
 * Uploads a new public key for the authenticated user
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    console.log('POST /api/auth/keys called');
    // Verify user authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = typeof session.user.id === 'number' 
      ? session.user.id 
      : parseInt(session.user.id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    // Parse and validate request body
    let requestBody: UploadKeyRequest;
    try {
      const rawBody = await req.json();
      requestBody = UploadKeyRequestSchema.parse(rawBody);
    } catch (error) {
      log((l) => l.warn('Invalid key upload request', { error, userId }));
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      );
    }
    
    // Validate public key format
    if (!validatePublicKeyFormat(requestBody.publicKey)) {
      return NextResponse.json(
        { success: false, error: 'Invalid public key format' },
        { status: 400 }
      );
    }
    
    // Check if this public key already exists for this user
    const existingKey = await drizDb().query.userPublicKeys.findFirst({
      where: (keys, { eq, and, isNull, gte }) => and(
        eq(keys.userId, userId),
        eq(keys.publicKey, requestBody.publicKey),
        // Key is still active (not expired)
        isNull(keys.expirationDate) ? undefined : gte(keys.expirationDate, new Date().toISOString())
      ),
    });
    
    if (existingKey) {
      log((l) => l.info('Public key already exists for user', { userId, keyId: existingKey.id }));
      return NextResponse.json({
        success: true,
        message: 'Public key already registered',
        keyId: existingKey.id,
      });
    }
    
    // Calculate expiration date (default to 1 year from now)
    const expirationDate = requestBody.expirationDate 
      ? new Date(requestBody.expirationDate)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    
    // Insert new public key
    const [insertedKey] = await drizDb()
      .insert(schema.userPublicKeys)
      .values({
        userId,
        publicKey: requestBody.publicKey,
        effectiveDate: new Date().toISOString(),
        expirationDate: expirationDate.toISOString(),
      })
      .returning({
        id: schema.userPublicKeys.id,
        effectiveDate: schema.userPublicKeys.effectiveDate,
        expirationDate: schema.userPublicKeys.expirationDate,
      });
    
    log((l) => l.info('New public key registered', { 
      userId, 
      keyId: insertedKey.id,
      effectiveDate: insertedKey.effectiveDate,
      expirationDate: insertedKey.expirationDate,
    }));
    
    return NextResponse.json({
      success: true,
      message: 'Public key registered successfully',
      keyId: insertedKey.id,
      effectiveDate: insertedKey.effectiveDate,
      expirationDate: insertedKey.expirationDate,
    });
    
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'POST /api/auth/keys',
      message: 'Failed to upload public key',
      critical: false,
    });
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/keys
 * 
 * Retrieves all active public keys for the authenticated user
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Verify user authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = typeof session.user.id === 'number' 
      ? session.user.id 
      : parseInt(session.user.id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      );
    }
    
    // Get all active public keys for the user
    const userKeys = await drizDb().query.userPublicKeys.findMany({
      where: (keys, { eq, and, isNull, gte }) => and(
        eq(keys.userId, userId),
        // Key is still active (not expired)
        isNull(keys.expirationDate) ? undefined : gte(keys.expirationDate, new Date().toISOString())
      ),
      columns: {
        id: true,
        publicKey: true,
        effectiveDate: true,
        expirationDate: true,
        createdAt: true,
      },
      orderBy: (keys, { desc }) => [desc(keys.effectiveDate)],
    });
    
    return NextResponse.json({
      success: true,
      keys: userKeys,
      count: userKeys.length,
    });
    
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'GET /api/auth/keys',
      message: 'Failed to retrieve public keys',
      critical: false,
    });
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}