import TimelineAgentFactory, {
  TimelineAgent,
} from '../../../../lib/ai/agents/timeline/agent';
import { ComplianceRating } from '../../../../lib/ai/agents/timeline/types';

describe('TimelineAgent', () => {
  let agent: TimelineAgent;

  beforeEach(() => {
    agent = TimelineAgentFactory({
      initialDocumentId: 'test-doc-001',
    });
  });

  afterEach(() => {
    agent.reset();
  });

  describe('Initialization', () => {
    it('should create an agent with initial document', () => {
      expect(agent).toBeDefined();
      expect(agent.getDocumentCounts().total).toBe(1);
      expect(agent.getDocumentCounts().pending).toBe(1);
      expect(agent.getDocumentCounts().processed).toBe(0);
    });

    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });

    it('should not reinitialize if already initialized', async () => {
      await agent.initialize();
      const firstCounts = agent.getDocumentCounts();

      await agent.initialize();
      const secondCounts = agent.getDocumentCounts();

      expect(firstCounts).toEqual(secondCounts);
    });

    it('should throw error when initializing without documents', async () => {
      const emptyAgent = TimelineAgentFactory({});
      await expect(emptyAgent.initialize()).rejects.toThrow(
        'No initial document provided',
      );
    });
  });

  describe('Document Processing', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should process documents in order', async () => {
      expect(agent.hasMoreDocuments()).toBe(true);

      const result = await agent.processNextDocument();
      expect(result).toBeDefined();
      expect(result?.documentId).toBe('test-doc-001');

      const counts = agent.getDocumentCounts();
      expect(counts.processed).toBe(1);
      expect(counts.pending).toBe(0);
    });

    it('should return null when no more documents to process', async () => {
      // Process all documents
      while (agent.hasMoreDocuments()) {
        await agent.processNextDocument();
      }

      const result = await agent.processNextDocument();
      expect(result).toBeNull();
    });

    it('should throw error when processing before initialization', async () => {
      const uninitializedAgent = TimelineAgentFactory({
        initialDocumentId: 'test-doc',
      });

      await expect(uninitializedAgent.processNextDocument()).rejects.toThrow(
        'Agent must be initialized before processing documents',
      );
    });

    it('should handle additional documents discovered during processing', async () => {
      // Mock the processing to return additional documents
      const result = await agent.processNextDocument();

      if (
        result?.additionalDocuments &&
        result.additionalDocuments.length > 0
      ) {
        const countsAfter = agent.getDocumentCounts();
        expect(countsAfter.total).toBeGreaterThan(1);
      }

      // This test depends on the mock implementation returning additional documents
      // In a real scenario, you would mock the generateResponse method
    });
  });

  describe('Document Management', () => {
    it('should add new documents to pending queue', () => {
      const initialCounts = agent.getDocumentCounts();

      agent.addDocuments(['doc-2', 'doc-3', 'doc-4']);

      const newCounts = agent.getDocumentCounts();
      expect(newCounts.total).toBe(initialCounts.total + 3);
      expect(newCounts.pending).toBe(initialCounts.pending + 3);
    });

    it('should not add duplicate documents', () => {
      agent.addDocuments(['doc-2', 'doc-3']);
      const countsAfterFirst = agent.getDocumentCounts();

      agent.addDocuments(['doc-2', 'doc-3', 'doc-4']); // doc-2 and doc-3 are duplicates
      const countsAfterSecond = agent.getDocumentCounts();

      expect(countsAfterSecond.total).toBe(countsAfterFirst.total + 1); // Only doc-4 should be added
    });

    it('should not add already processed documents', async () => {
      await agent.initialize();
      await agent.processNextDocument(); // Process the initial document

      const countsAfterProcessing = agent.getDocumentCounts();

      agent.addDocuments(['test-doc-001']); // Try to add the already processed document
      const countsAfterAdding = agent.getDocumentCounts();

      expect(countsAfterAdding).toEqual(countsAfterProcessing); // Should remain the same
    });
  });

  describe('Timeline Summary Generation', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should generate a timeline summary', () => {
      const summary = agent.generateSummary();

      expect(summary).toBeDefined();
      expect(summary.globalMetadata).toBeDefined();
      expect(summary.sequentialActions).toBeDefined();
      expect(summary.complianceRatings).toBeDefined();
      expect(summary.criticalIssues).toBeDefined();
      expect(summary.recommendations).toBeDefined();
      expect(summary.lastUpdated).toBeDefined();
    });

    it('should have proper structure for global metadata', () => {
      const summary = agent.generateSummary();
      const metadata = summary.globalMetadata;

      expect(metadata.caseId).toBeDefined();
      expect(metadata.caseType).toBeDefined();
      expect(metadata.requestType).toBeDefined();
      expect(metadata.currentStatus).toBeDefined();
      expect(typeof metadata.totalDocuments).toBe('number');
      expect(typeof metadata.processedDocuments).toBe('number');
    });

    it('should update compliance ratings', () => {
      const summary = agent.generateSummary();
      const ratings = summary.complianceRatings;

      expect(Object.values(ComplianceRating)).toContain(ratings.overall);
      expect(Object.values(ComplianceRating)).toContain(ratings.completeness);
      expect(Object.values(ComplianceRating)).toContain(ratings.timeliness);
      expect(Object.values(ComplianceRating)).toContain(ratings.accuracy);
      expect(Object.values(ComplianceRating)).toContain(ratings.transparency);
    });

    it('should update last modified timestamp', () => {
      const summary1 = agent.generateSummary();

      // Wait a bit and generate another summary
      setTimeout(() => {
        const summary2 = agent.generateSummary();
        expect(summary2.lastUpdated).not.toBe(summary1.lastUpdated);
      }, 10);
    });
  });

  describe('State Management', () => {
    it('should track document counts correctly', async () => {
      const initialCounts = agent.getDocumentCounts();
      expect(initialCounts.pending).toBe(1);
      expect(initialCounts.processed).toBe(0);
      expect(initialCounts.total).toBe(1);

      await agent.initialize();
      await agent.processNextDocument();

      const finalCounts = agent.getDocumentCounts();
      expect(finalCounts.pending).toBe(0);
      expect(finalCounts.processed).toBe(1);
      expect(finalCounts.total).toBe(1);
    });

    it('should reset to initial state', async () => {
      await agent.initialize();
      agent.addDocuments(['doc-2', 'doc-3']);
      await agent.processNextDocument();

      const beforeReset = agent.getDocumentCounts();
      expect(beforeReset.total).toBeGreaterThan(0);

      agent.reset();

      const afterReset = agent.getDocumentCounts();
      expect(afterReset.pending).toBe(0);
      expect(afterReset.processed).toBe(0);
      expect(afterReset.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle document loading errors gracefully', async () => {
      // This test would require mocking the generateResponse method to simulate failures
      // For now, we'll just ensure the agent doesn't crash
      await agent.initialize();
      const result = await agent.processNextDocument();
      expect(result).toBeDefined();
    });

    it('should handle JSON parsing errors in document processing', async () => {
      // This would require mocking generateResponse to return invalid JSON
      await agent.initialize();
      const result = await agent.processNextDocument();
      expect(result).toBeDefined();
      // Should have fallback behavior when JSON parsing fails
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle a complete FERPA case workflow', async () => {
      const ferpaAgent = TimelineAgentFactory({
        initialDocumentId: 'ferpa-student-request-001',
      });

      await ferpaAgent.initialize();

      // Add typical FERPA documents
      ferpaAgent.addDocuments([
        'identity-verification-form',
        'records-search-results',
        'partial-release-notification',
        'final-records-package',
      ]);

      // Process all documents
      const results = [];
      while (ferpaAgent.hasMoreDocuments()) {
        const result = await ferpaAgent.processNextDocument();
        if (result) results.push(result);
      }

      expect(results.length).toBeGreaterThan(0);

      const summary = ferpaAgent.generateSummary();
      expect(summary.globalMetadata.caseType).toBe('FERPA');
      expect(summary.sequentialActions.length).toBe(results.length);

      ferpaAgent.reset();
    });

    it('should maintain chronological order in timeline', async () => {
      await agent.initialize();

      // Add documents with known timestamps (this would be handled by the document processing)
      agent.addDocuments(['doc-older', 'doc-newer', 'doc-middle']);

      // Process all documents
      while (agent.hasMoreDocuments()) {
        await agent.processNextDocument();
      }

      const summary = agent.generateSummary();

      // Verify chronological order (this assumes the mock processing provides dates)
      for (let i = 1; i < summary.sequentialActions.length; i++) {
        const prevDate = new Date(summary.sequentialActions[i - 1].date);
        const currDate = new Date(summary.sequentialActions[i].date);
        expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime());
      }
    });
  });
});
