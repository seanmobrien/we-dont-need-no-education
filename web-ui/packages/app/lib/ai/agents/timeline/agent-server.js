import { aiModelFactory } from '@/lib/ai/aiModelFactory';
import { getCaseFileDocument } from '@/lib/ai/tools';
import { ClientTimelineAgent } from './agent';
import { ComplianceRating, } from './types';
import { generateChatId } from '@/lib/ai/core';
import { drizDb } from '@compliance-theater/database/orm';
import { setupDefaultTools } from '@/lib/ai/mcp/providers';
import { createAgentHistoryContext, wrapChatHistoryMiddleware, } from '@/lib/ai/middleware/chat-history';
import { LoggedError, log } from '@compliance-theater/logger';
import { auth } from '@/auth';
import { generateTextWithRetry } from '@/lib/ai/core/generate-text-with-retry';
class ServerTimelineAgent extends ClientTimelineAgent {
    #pendingDocuments = new Set();
    #processedDocuments = new Set();
    #documentMetadata = new Map();
    #documentContent = new Map();
    #userId;
    #timelineState = {
        globalMetadata: {
            caseId: '',
            propertyId: '',
            caseType: 'FERPA',
            requestType: 'Data Request',
            requestDate: '',
            requesterName: '',
            institutionName: '',
            complianceDeadline: '',
            currentStatus: 'In Progress',
            totalDocuments: 0,
            processedDocuments: 0,
        },
        sequentialActions: [],
        complianceRatings: {
            timeliness: ComplianceRating.Unknown,
            completeness: ComplianceRating.Unknown,
            accuracy: ComplianceRating.Unknown,
            transparency: ComplianceRating.Unknown,
            overall: ComplianceRating.Unknown,
        },
        criticalIssues: [],
        recommendations: [],
        lastUpdated: new Date().toISOString(),
    };
    #isInitialized = false;
    #chatHistoryContext;
    constructor(props) {
        super(props);
        if ('initialDocumentId' in props) {
            if (props.initialDocumentId) {
                this.#pendingDocuments.add(props.initialDocumentId);
            }
        }
        else if ('state' in props) {
            this.attach(props);
        }
    }
    async initialize({ req } = {}) {
        if (this.#isInitialized)
            return;
        const session = await auth();
        this.#userId = session?.user?.id;
        const initialDocId = Array.from(this.#pendingDocuments)[0];
        if (!(this.propertyId ?? initialDocId)) {
            throw new Error('No initial document provided');
        }
        try {
            const initialDocument = await this.#loadDocument(this.propertyId ?? initialDocId);
            const caseMetadata = await this.#extractCaseMetadata(initialDocument);
            if (!caseMetadata ||
                !caseMetadata.caseId ||
                !caseMetadata.communicationId) {
                throw new Error('Failed to extract case metadata');
            }
            this.#timelineState.globalMetadata = {
                ...this.#timelineState.globalMetadata,
                ...caseMetadata,
            };
            this.assertPropertyId(caseMetadata.caseId);
            const relatedDocuments = await this.#identifyRelatedDocuments({
                req,
                document: initialDocument,
            });
            relatedDocuments.forEach((docId) => this.#pendingDocuments.add(docId));
            this.#timelineState.globalMetadata.totalDocuments =
                this.#pendingDocuments.size;
            this.#isInitialized = true;
        }
        catch (error) {
            throw new Error(`Failed to initialize TimelineAgent: ${error}`);
        }
    }
    async processNextDocument(nextDocId) {
        if (!this.#isInitialized) {
            throw new Error('Agent must be initialized before processing documents');
        }
        if (!nextDocId) {
            return null;
        }
        try {
            const document = await this.#loadDocument(nextDocId);
            const result = await this.#processDocument(nextDocId, document);
            this.#updateTimelineState(result);
            this.#pendingDocuments.delete(nextDocId);
            this.#processedDocuments.add(nextDocId);
            if (result.additionalDocuments) {
                result.additionalDocuments.forEach((docId) => {
                    if (!this.#processedDocuments.has(docId) &&
                        !this.#pendingDocuments.has(docId)) {
                        this.#pendingDocuments.add(docId);
                    }
                });
            }
            this.#timelineState.globalMetadata.processedDocuments =
                this.#processedDocuments.size;
            this.#timelineState.globalMetadata.totalDocuments =
                this.#processedDocuments.size + this.#pendingDocuments.size;
            this.#timelineState.lastUpdated = new Date().toISOString();
            return result;
        }
        catch (error) {
            throw new Error(`Failed to process document ${nextDocId}: ${error}`);
        }
    }
    generateSummary() {
        this.#updateComplianceRatings();
        return {
            ...this.#timelineState,
            lastUpdated: new Date().toISOString(),
        };
    }
    async #loadDocument(documentId) {
        if (this.#documentContent.has(documentId)) {
            return this.#documentContent.get(documentId);
        }
        const docRequest = await getCaseFileDocument({
            caseFileId: documentId,
            goals: [
                `Create detailed timeline for call to action ${documentId}`,
                `Locate related case file documents and attachments for ${documentId}`,
                `Identify metadata such as Request Date, Requester Name, Requested Item, and Compliance Deadline for ${documentId}`,
                `Include verbatim statements regarding specific item(s) requested in ${documentId}`,
            ],
        });
        const result = docRequest?.structuredContent?.result;
        if (!result) {
            throw new Error(`Failed to load document ${documentId}: No content found`);
        }
        if (result.isError === true) {
            throw new Error(`Failed to load document ${documentId}: ${result.message}`);
        }
        const content = typeof result.value === 'string'
            ? result.value
            : JSON.stringify(result.value, null, 2);
        this.#documentContent.set(documentId, content);
        return content;
    }
    async #extractCaseMetadata(document) {
        const prompt = `
    Analyze the following document and extract case metadata. Return a JSON object with the following fields:
    - caseId: string - The documentPropertyId of the target call-to-action case file; usually formatted as a uuid.
    - communicationId: string - The ID of the email or attachment the target call-to-action originates from; usually formatted as an integer.
    - caseType: "FERPA" | "MNGDPA" | "Other"
    - requestType: string - The type of request being made (eg "Data Request from Subject", "Public Data Request", "Educational Records Request", "Title IX Request", "Other", etc.)
    - requestDate: ISO date string - The date the request was made
    - requesterName: string - The name of the requester
    - institutionName: string - The name of the institution handling the request
    - complianceDeadline: ISO date string - The nearest enforceable compliance deadline based on requestType and requestDate, considering any applicable laws or regulations and the request complexity.
    - currentStatus: string - The current status of the request

    Document:
    ${document}
    `;
        const response = await this.generateResponse(prompt);
        return response;
    }
    async #identifyRelatedDocuments({ req, document, }) {
        const callToActionRecord = await drizDb().query.documentProperty.findFirst({
            where: (property, { eq }) => eq(property.propertyId, this.propertyId ?? ''),
        });
        if (!callToActionRecord) {
            throw new Error(`Failed to find call to action record for document ${this.propertyId ?? 'null'}`);
        }
        const ctaText = callToActionRecord.propertyValue || '';
        const prompt = `
    You are the document retrieval pipeline that supports an AI compliance review system.  You will be provided with -
    1) A specific call to action made by a citizen to a responsible authority.
    2) The contents and metadata of the communication in when the citizen made the request.
    Your goal is to identify all email or attachment case files that reference this call to action specifically, or speak 
    to a similar or related request.  To do that, you will -
    ☐ Analyze the call to action, document content, and metadata.
    ☐ Use tool-based sequential thinking to formulate a comprehensive plan of action.
    ☐ Identify search terms and keywords that would retrieve relevant documents.  It is critical that we identify all related
        case files, so a comprehensive set of queries should be identified - including synonyms, related terms, related concepts, and rephrased queries.
    ☐ Use the case file search tool to retrieve all emails and attachment records that reference this call to action or related requests.
    ☐ Retrieve a summarized version of retrieved case files confirming their relevance.
        - The summarized document should also include the date it was sent as well as any document or attachment case file ID's that are associated.
    ☐ For any related case files not already identified, pull summarized content to confirm relevance and identify any additional documents, etc.

    Results should be returned in JSON format, and include both the document ID and the Date Sent for each identified value,
    It should also return the total number of eligible documents, the number of documents that have been identified, and the
    number of documents still pending analysis.
    
    Target Call to Action:
    Case File Id: ${this.propertyId}
    Text: ${ctaText}
    Source Document and Metadata:
    ${document}
    `;
        const response = await this.generateResponse(prompt, { req });
        try {
            const documentIds = typeof response === 'object' ? response : JSON.parse(response);
            return Array.isArray(documentIds) ? documentIds : [];
        }
        catch {
            return [];
        }
    }
    async #processDocument(documentId, document) {
        const metadata = await this.#extractDocumentMetadata(documentId, document);
        this.#documentMetadata.set(documentId, metadata);
        const prompt = `
    You are processing a document as part of a compliance timeline analysis for a data request case.
    
    Current Timeline State:
    ${JSON.stringify(this.#timelineState, null, 2)}
    
    Document to Process:
    ID: ${documentId}
    Metadata: ${JSON.stringify(metadata, null, 2)}
    Content: ${document}
    
    Please analyze this document and return a JSON object with:
    - timelineEntry: Object describing this document's place in the timeline
    - additionalDocuments: Array of additional document IDs discovered (if any)
    - notes: Array of string notes about issues, concerns, or questions
    - complianceImpact: Object describing how this document affects compliance ratings
    - verbatimStatements: Array of critical verbatim quotes from the document
    
    Focus on compliance aspects, timeline accuracy, and any actions or inactions that affect the case.
    `;
        const response = await this.generateResponse(prompt);
        if (!response || typeof response !== 'object') {
            throw new Error(`Failed to process document ${documentId}: Invalid response format`);
        }
        try {
            return {
                documentId,
                timelineEntry: response.timelineEntry,
                additionalDocuments: response.additionalDocuments || [],
                notes: response.notes || [],
                complianceImpact: response.complianceImpact || {},
                verbatimStatements: response.verbatimStatements || [],
            };
        }
        catch (error) {
            return {
                documentId,
                timelineEntry: {
                    documentId,
                    date: metadata.dateReceived ||
                        metadata.dateSent ||
                        new Date().toISOString(),
                    summary: `Failed to process document: ${error}`,
                },
                additionalDocuments: [],
                notes: [`Error processing document: ${error}`],
                complianceImpact: {},
                verbatimStatements: [],
            };
        }
    }
    async #extractDocumentMetadata(documentId, document) {
        const prompt = `
    Extract metadata from the following document. Return a JSON object with:
    - documentId: string
    - documentType: string
    - dateSent: ISO date string (if applicable)
    - dateReceived: ISO date string (if applicable)
    - sender: string
    - recipient: string
    - subject: string
    - attachmentCount: number
    - priority: "Low" | "Medium" | "High" | "Critical"
    
    Document:
    ${document}
    `;
        const response = await this.generateResponse(prompt);
        return (response ?? {
            documentId,
            propertyId: this.propertyId || '',
            documentType: 'Unknown',
            sender: '',
            recipient: '',
            subject: '',
            attachmentCount: 0,
            priority: 'Medium',
        });
    }
    #updateTimelineState(result) {
        if (result.timelineEntry) {
            this.#timelineState.sequentialActions.push(result.timelineEntry);
        }
        if (result.notes && result.notes.length > 0) {
            result.notes.forEach((note) => {
                if (note.toLowerCase().includes('concern') ||
                    note.toLowerCase().includes('issue') ||
                    note.toLowerCase().includes('problem')) {
                    this.#timelineState.criticalIssues.push(note);
                }
            });
        }
        this.#timelineState.sequentialActions.sort((a, b) => {
            const dateA = new Date(a.date || '');
            const dateB = new Date(b.date || '');
            return dateA.getTime() - dateB.getTime();
        });
    }
    static fromSnapshot(snapshot) {
        try {
            const serializedAgent = JSON.parse(snapshot);
            return new ServerTimelineAgent(serializedAgent);
        }
        catch (error) {
            throw new Error(`Failed to restore agent from snapshot: ${error}`);
        }
    }
    #updateComplianceRatings() {
        const processedCount = this.#timelineState.globalMetadata.processedDocuments;
        const totalCount = this.#timelineState.globalMetadata.totalDocuments;
        if (totalCount === 0) {
            this.#timelineState.complianceRatings.overall = ComplianceRating.Unknown;
            return;
        }
        const completionRate = processedCount / totalCount;
        if (completionRate >= 0.9) {
            this.#timelineState.complianceRatings.overall =
                ComplianceRating.Excellent;
        }
        else if (completionRate >= 0.75) {
            this.#timelineState.complianceRatings.overall = ComplianceRating.Good;
        }
        else if (completionRate >= 0.5) {
            this.#timelineState.complianceRatings.overall =
                ComplianceRating.Satisfactory;
        }
        else if (completionRate >= 0.25) {
            this.#timelineState.complianceRatings.overall = ComplianceRating.Poor;
        }
        else {
            this.#timelineState.complianceRatings.overall = ComplianceRating.Unknown;
        }
        this.#timelineState.complianceRatings.completeness =
            completionRate >= 0.8
                ? ComplianceRating.Good
                : ComplianceRating.Satisfactory;
        this.#timelineState.complianceRatings.timeliness =
            ComplianceRating.Satisfactory;
        this.#timelineState.complianceRatings.accuracy = ComplianceRating.Good;
        this.#timelineState.complianceRatings.transparency = ComplianceRating.Good;
    }
    async generateResponse(input, { model = 'lofi', req, operation, opProps, } = {}) {
        let tools = undefined;
        try {
            this.#chatHistoryContext ??= createAgentHistoryContext({
                model,
                originatingUserId: this.#userId ?? '-1',
                operation: operation ? `timeline:${operation}` : 'timeline:agent',
                opTags: opProps,
                chatId: generateChatId().id,
            });
            if (!this.#chatHistoryContext) {
                throw new TypeError('Unknown failure creating chat history context.');
            }
            const hal = wrapChatHistoryMiddleware({
                chatHistoryContext: this.#chatHistoryContext,
                model: await aiModelFactory(model ?? 'lofi'),
            });
            tools = await setupDefaultTools({ user: undefined, req });
            const ret = await generateTextWithRetry({
                model: hal,
                prompt: input,
                tools: tools.tools,
                experimental_telemetry: {
                    isEnabled: true,
                    functionId: 'agent-timeline-' + (operation ? operation : 'model-request'),
                },
            });
            this.#chatHistoryContext.iteration++;
            if (ret &&
                ret.providerMetadata &&
                'structuredOutputs' in ret.providerMetadata &&
                !!ret.providerMetadata.structuredOutputs) {
                return ret.providerMetadata.structuredOutputs;
            }
            return ret.text;
        }
        catch (error) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'TimelineAgent',
                message: 'Error generating response',
                critical: true,
                data: {
                    input,
                    model,
                    userId: this.#chatHistoryContext?.userId,
                    chatId: this.#chatHistoryContext?.chatId,
                },
            });
        }
        finally {
            if (tools) {
                try {
                    tools[Symbol.dispose]();
                }
                catch (e) {
                    log((l) => l.error('Error disposing tools', e));
                }
            }
        }
    }
}
const TimelineAgentFactory = (props) => {
    return new ServerTimelineAgent(props);
};
export { TimelineAgentFactory };
export { ServerTimelineAgent };
//# sourceMappingURL=agent-server.js.map