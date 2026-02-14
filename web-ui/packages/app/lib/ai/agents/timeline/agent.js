import AgentBase from '../agent-base';
import { ComplianceRating, } from './types';
export class ClientTimelineAgent extends AgentBase {
    pendingDocuments = new Set();
    processedDocuments = new Set();
    documentMetadata = new Map();
    documentContent = new Map();
    timelineState = {
        globalMetadata: {
            caseId: '',
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
    isInitialized = false;
    #propertyId = null;
    constructor(props) {
        super();
        if ('version' in props) {
            this.attach(props);
            this.#propertyId = props.state.propertyId || null;
            props.state.pendingDocumentIds.forEach((id) => this.pendingDocuments.add(id));
            props.state.processedDocumentIds.forEach((id) => this.processedDocuments.add(id));
            if (props.state.metadata) {
                Object.entries(props.state.metadata).forEach(([id, meta]) => {
                    this.documentMetadata.set(id, meta);
                });
            }
        }
        else {
            this.#propertyId = props.propertyId || null;
            if (props.initialDocumentId) {
                this.pendingDocuments.add(props.initialDocumentId);
            }
        }
    }
    get propertyId() {
        return this.#propertyId;
    }
    getCurrentDocumentId() {
        const pendingDocs = Array.from(this.pendingDocuments);
        if (pendingDocs.length === 0)
            return null;
        return this.getNextDocumentToProcess();
    }
    async initialize() {
        if (this.isInitialized)
            return;
        const initialDocId = Array.from(this.pendingDocuments)[0];
        if (!initialDocId) {
            throw new Error('No initial document provided');
        }
    }
    async processNextDocument() {
        if (!this.isInitialized) {
            throw new Error('Agent must be initialized before processing documents');
        }
        const nextDocId = this.getNextDocumentToProcess();
        if (!nextDocId) {
            return null;
        }
        try {
            this.timelineState.globalMetadata.processedDocuments =
                this.processedDocuments.size;
            this.timelineState.globalMetadata.totalDocuments =
                this.processedDocuments.size + this.pendingDocuments.size;
            this.timelineState.lastUpdated = new Date().toISOString();
            return {};
        }
        catch (error) {
            throw new Error(`Failed to process document ${nextDocId}: ${error}`);
        }
    }
    addDocuments(documentIds) {
        documentIds.forEach((docId) => {
            if (!this.processedDocuments.has(docId) &&
                !this.pendingDocuments.has(docId)) {
                this.pendingDocuments.add(docId);
            }
        });
        this.timelineState.globalMetadata.totalDocuments =
            this.processedDocuments.size + this.pendingDocuments.size;
    }
    generateSummary() {
        this.updateComplianceRatings();
        return {
            ...this.timelineState,
            lastUpdated: new Date().toISOString(),
        };
    }
    hasMoreDocuments() {
        return this.pendingDocuments.size > 0;
    }
    getDocumentCounts() {
        return {
            pending: this.pendingDocuments.size,
            processed: this.processedDocuments.size,
            total: this.pendingDocuments.size + this.processedDocuments.size,
        };
    }
    reset() {
        this.pendingDocuments.clear();
        this.processedDocuments.clear();
        this.documentMetadata.clear();
        this.documentContent.clear();
        this.isInitialized = false;
        this.timelineState = {
            globalMetadata: {
                caseId: '',
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
    }
    getNextDocumentToProcess() {
        if (this.pendingDocuments.size === 0)
            return null;
        const sortedDocs = Array.from(this.pendingDocuments).sort((a, b) => {
            const metaA = this.documentMetadata.get(a);
            const metaB = this.documentMetadata.get(b);
            if (!metaA && !metaB)
                return 0;
            if (!metaA)
                return 1;
            if (!metaB)
                return -1;
            const dateA = new Date(metaA.dateReceived || metaA.dateSent || '');
            const dateB = new Date(metaB.dateReceived || metaB.dateSent || '');
            return dateA.getTime() - dateB.getTime();
        });
        return sortedDocs[0];
    }
    updateComplianceRatings() {
        const totalDocs = this.timelineState.globalMetadata.totalDocuments;
        const processedDocs = this.timelineState.globalMetadata.processedDocuments;
        const issueCount = this.timelineState.criticalIssues.length;
        if (processedDocs === totalDocs && totalDocs > 0) {
            this.timelineState.complianceRatings.completeness = ComplianceRating.Good;
        }
        else if (processedDocs / totalDocs > 0.8) {
            this.timelineState.complianceRatings.completeness =
                ComplianceRating.Satisfactory;
        }
        else {
            this.timelineState.complianceRatings.completeness = ComplianceRating.Poor;
        }
        if (issueCount === 0) {
            this.timelineState.complianceRatings.overall = ComplianceRating.Good;
        }
        else if (issueCount < 3) {
            this.timelineState.complianceRatings.overall =
                ComplianceRating.Satisfactory;
        }
        else {
            this.timelineState.complianceRatings.overall = ComplianceRating.Poor;
        }
        this.timelineState.complianceRatings.timeliness = ComplianceRating.Unknown;
        this.timelineState.complianceRatings.accuracy = ComplianceRating.Unknown;
        this.timelineState.complianceRatings.transparency =
            ComplianceRating.Unknown;
    }
    serialize() {
        const state = {
            propertyId: this.propertyId || '',
            pendingDocumentIds: Array.from(this.pendingDocuments),
            processedDocumentIds: Array.from(this.processedDocuments),
            currentDocumentId: this.getCurrentDocumentId(),
            summary: this.timelineState,
            metadata: Object.fromEntries(this.documentMetadata),
            createdAt: this.timelineState.globalMetadata.requestDate ||
                new Date().toISOString(),
            lastUpdated: this.timelineState.lastUpdated,
        };
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            state,
        };
    }
    attach(agent) {
        const { state } = agent;
        this.reset();
        this.pendingDocuments.clear();
        state.pendingDocumentIds.forEach((id) => this.pendingDocuments.add(id));
        this.processedDocuments.clear();
        state.processedDocumentIds.forEach((id) => this.processedDocuments.add(id));
        this.documentMetadata.clear();
        Object.entries(state.metadata).forEach(([id, metadata]) => this.documentMetadata.set(id, metadata));
        if (state.summary) {
            this.timelineState = state.summary;
        }
        if (state.propertyId) {
            this.#propertyId = state.propertyId;
        }
        this.isInitialized =
            state.processedDocumentIds.length > 0 ||
                (state.summary?.globalMetadata.caseId?.length ?? 0) > 0;
    }
    static deserialize(serializedAgent) {
        const { state } = serializedAgent;
        const agent = new ClientTimelineAgent({
            initialDocumentId: state.pendingDocumentIds[0],
            propertyId: state.propertyId,
        });
        return agent;
    }
    createSnapshot() {
        return JSON.stringify(this.serialize(), null, 2);
    }
    assertPropertyId(value) {
        if (!value) {
            throw new Error('Property ID is required');
        }
        if (!this.#propertyId) {
            this.#propertyId = value;
        }
        else if (this.#propertyId !== value) {
            throw new Error(`Property ID mismatch: expected ${this.#propertyId}, got ${value}`);
        }
    }
    static fromSnapshot(snapshot) {
        try {
            const serializedAgent = JSON.parse(snapshot);
            return ClientTimelineAgent.deserialize(serializedAgent);
        }
        catch (error) {
            throw new Error(`Failed to restore agent from snapshot: ${error}`);
        }
    }
    static isCompatibleVersion(serializedAgent) {
        const currentVersion = '1.0.0';
        const [currentMajor] = currentVersion.split('.').map(Number);
        const [serializedMajor] = serializedAgent.version.split('.').map(Number);
        return currentMajor === serializedMajor;
    }
}
const TimelineAgentFactory = (props) => {
    return new ClientTimelineAgent(props);
};
export default TimelineAgentFactory;
export { ClientTimelineAgent as TimelineAgent };
//# sourceMappingURL=agent.js.map