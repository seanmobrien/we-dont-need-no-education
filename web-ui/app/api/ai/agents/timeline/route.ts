export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import {
  TimelineAgentFactory,
  ServerTimelineAgent as TimelineAgent,
} from '@/lib/ai/agents/timeline/agent-server';
import { LoggedError } from '@/lib/react-util';

const buildFallback = {
  success: true,
  data: {
    summary: {
      title: 'Mock Timeline Summary',
      description: 'This is a mock summary for the timeline.',
    },
    counts: {
      totalDocuments: 1,
      processedDocuments: 1,
    },
    hasMoreDocuments: false,
    snapshot: {
      documentId: 'mock-doc-1',
      date: new Date().toISOString(),
      summary: 'Mock document processed successfully',
      verbatimStatements: [
        'This is a mock verbatim statement from the document',
      ],
      complianceNotes: [
        'Build-optimized mock document',
      ],
      actionTaken: 'Document reviewed and analyzed',
      actionRequired: 'Continue to next document in sequence',
    },
  },
} as const;

/**
 * API endpoint for Timeline Agent operations
 * Handles initialization, document processing, summary generation, and state serialization
 */
export const POST = wrapRouteRequest(async (request: NextRequest) => {
  try {
    const { action, initialDocumentId, snapshot, propertyId } =
      await request.json();

    switch (action) {
      case 'initialize': {
        if (!initialDocumentId) {
          return NextResponse.json(
            { error: 'initialDocumentId is required' },
            { status: 400 },
          );
        }

        const agent = TimelineAgentFactory({ initialDocumentId, propertyId });

        await agent.initialize({ req: request });

        const summary = agent.generateSummary();
        const counts = agent.getDocumentCounts();

        return NextResponse.json({
          success: true,
          data: {
            summary,
            counts,
            hasMoreDocuments: agent.hasMoreDocuments(),
            snapshot: agent.createSnapshot(), // Include serialized state
          },
        });
      }

      case 'restore': {
        if (!snapshot) {
          return NextResponse.json(
            { error: 'snapshot is required for restore action' },
            { status: 400 },
          );
        }

        try {
          const agent = TimelineAgent.fromSnapshot(snapshot);
          const summary = agent.generateSummary();
          const counts = agent.getDocumentCounts();

          return NextResponse.json({
            success: true,
            data: {
              summary,
              counts,
              hasMoreDocuments: agent.hasMoreDocuments(),
              snapshot: agent.createSnapshot(),
            },
          });
        } catch (error) {
          return NextResponse.json(
            { error: `Failed to restore agent: ${error}` },
            { status: 400 },
          );
        }
      }

      case 'process': {
        // In a real implementation, you would need to persist the agent state
        // For now, this is a mock response
        return NextResponse.json({
          success: true,
          data: {
            documentId: 'mock-doc-' + Date.now(),
            timelineEntry: {
              documentId: 'mock-doc-' + Date.now(),
              date: new Date().toISOString(),
              summary: 'Mock document processed successfully',
              verbatimStatements: [
                'This is a mock verbatim statement from the document',
                'Another key statement for compliance review',
              ],
              complianceNotes: [
                'Document follows standard format',
                'No immediate compliance concerns identified',
              ],
              actionTaken: 'Document reviewed and analyzed',
              actionRequired: 'Continue to next document in sequence',
            },
            notes: [
              'Mock processing completed successfully',
              'Document appears to be in proper format',
            ],
            additionalDocuments:
              Math.random() > 0.7 ? ['additional-doc-' + Date.now()] : [],
          },
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'Timeline Agent API',
      message: 'Error processing Timeline Agent request',
      extra: { action: request.method, url: request.url },
    })    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}, { buildFallback });

export const GET = wrapRouteRequest(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return NextResponse.json(
      { error: 'documentId parameter is required' },
      { status: 400 },
    );
  }

  // Mock document data for demonstration
  const mockDocument = {
    id: documentId,
    content: `This is mock content for document ${documentId}. In a real implementation, this would be fetched from a document store or database.`,
    metadata: {
      documentType: 'Email Communication',
      dateSent: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      sender: 'mock.sender@example.com',
      recipient: 'mock.recipient@example.com',
      subject: `Mock Document ${documentId}`,
      attachmentCount: Math.floor(Math.random() * 3),
      priority: ['Low', 'Medium', 'High', 'Critical'][
        Math.floor(Math.random() * 4)
      ] as 'Low' | 'Medium' | 'High' | 'Critical',
    },
  };

  return NextResponse.json({
    success: true,
    data: mockDocument,
  });
  }, { buildFallback });