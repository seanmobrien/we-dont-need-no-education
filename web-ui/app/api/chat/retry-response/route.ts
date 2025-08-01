import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { rateLimitQueueManager } from '@/lib/ai/middleware/key-rate-limiter/queue-manager';
// import { authOptions } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request ID from query parameters
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    console.log(`Checking retry response for request ${requestId}`);

    // Check if request exists in system
    const requestExists = await rateLimitQueueManager.checkIfRequestExists(requestId);
    if (!requestExists) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Try to get processed response
    const response = await rateLimitQueueManager.getResponse(requestId);
    
    if (!response) {
      // Request is still in queue, return try-again-later
      return NextResponse.json({
        status: 'pending',
        message: 'Request is still being processed, try again later',
        requestId,
      }, { status: 202 }); // 202 Accepted
    }

    // Response is ready, remove it from storage and return it
    await rateLimitQueueManager.removeResponse(requestId);

    if (response.error) {
      // Return error response
      return NextResponse.json({
        status: 'error',
        requestId,
        error: response.error,
        processedAt: response.processedAt,
      }, { 
        status: response.error.type === 'will_not_retry' ? 410 : 400 // 410 Gone for will_not_retry
      });
    }

    // Return successful response
    return NextResponse.json({
      status: 'success',
      requestId,
      response: response.response,
      processedAt: response.processedAt,
    });

  } catch (error) {
    console.error('Error in retry-response API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get request ID from request body
    const body = await req.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    console.log(`Checking retry response for request ${requestId} (POST)`);

    // Check if request exists in system
    const requestExists = await rateLimitQueueManager.checkIfRequestExists(requestId);
    if (!requestExists) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Try to get processed response
    const response = await rateLimitQueueManager.getResponse(requestId);
    
    if (!response) {
      // Request is still in queue, return try-again-later
      return NextResponse.json({
        status: 'pending',
        message: 'Request is still being processed, try again later',
        requestId,
      }, { status: 202 }); // 202 Accepted
    }

    // Response is ready, remove it from storage and return it
    await rateLimitQueueManager.removeResponse(requestId);

    if (response.error) {
      // Return error response
      return NextResponse.json({
        status: 'error',
        requestId,
        error: response.error,
        processedAt: response.processedAt,
      }, { 
        status: response.error.type === 'will_not_retry' ? 410 : 400 // 410 Gone for will_not_retry
      });
    }

    // Return successful response
    return NextResponse.json({
      status: 'success',
      requestId,
      response: response.response,
      processedAt: response.processedAt,
    });

  } catch (error) {
    console.error('Error in retry-response API (POST):', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}