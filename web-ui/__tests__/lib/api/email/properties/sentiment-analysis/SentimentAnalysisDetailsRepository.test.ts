/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @jest-environment node
 */
jest.mock('@/lib/neondb');

import { SentimentAnalysisDetailsRepository } from '@/lib/api/email/properties/sentiment-analysis/sentiment-analysis-details-repository';
import { ValidationError } from '@/lib/react-util';
import { query, queryExt } from '@/lib/neondb';
import { EmailSentimentAnalysisDetails } from '@/data-models/api';

describe('SentimentAnalysisDetailsRepository', () => {
  let repository: SentimentAnalysisDetailsRepository;

  beforeEach(() => {
    repository = new SentimentAnalysisDetailsRepository();
    (queryExt as jest.Mock).mockImplementation(() => []);
    (query as jest.Mock).mockImplementation(() => []);
  });

  afterEach(() => {
    // jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should generate a new UUID for create method if propertyId is missing', () => {
      const obj = {} as EmailSentimentAnalysisDetails;
      (repository as any).validate('create', obj);
      expect(obj.propertyId).toBeDefined();
    });

    it('should throw ValidationError for update method if propertyId is missing', () => {
      const obj = {} as EmailSentimentAnalysisDetails;
      expect(() => (repository as any).validate('update', obj)).toThrow(
        ValidationError,
      );
    });

    it('should not modify the object for other methods', () => {
      const obj = { propertyId: 'test-id' } as EmailSentimentAnalysisDetails;
      (query as jest.Mock).mockReturnValue({
        propertyId: 'test-id',
        sentimentScore: 0.8,
        detectedHostility: false,
        flaggedPhrases: 'test phrase',
        detectedOn: new Date(),
      } as EmailSentimentAnalysisDetails);
      (repository as any).validate('update', obj);
      expect(obj.propertyId).toBe('test-id');
    });
  });

  describe('getListQueryProperties', () => {
    it('should return the correct SQL query and parameters', () => {
      const [sqlQuery, values, sqlCountQuery] = (
        repository as any
      ).getListQueryProperties();
      expect(sqlQuery).toContain(
        'SELECT * FROM email_sentiment_analysis_details',
      );
      expect(values).toEqual([]);
      expect(sqlCountQuery).toContain(
        'SELECT COUNT(*) as records FROM email_sentiment_analysis_details',
      );
    });
  });

  describe('getQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given recordId', () => {
      const recordId = 'test-id';
      const [sqlQuery, values] = (repository as any).getQueryProperties(
        recordId,
      );
      expect(sqlQuery).toContain(
        'SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id,',
      );
      expect(values).toEqual([recordId]);
    });
  });

  describe('getCreateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given EmailSentimentAnalysisDetails object', () => {
      const obj: EmailSentimentAnalysisDetails = {
        propertyId: 'test-id',
        sentimentScore: 0.8,
        detectedHostility: false,
        flaggedPhrases: 'test phrase',
        detectedOn: new Date(),
      } as EmailSentimentAnalysisDetails;
      const [sqlQuery, values] = (repository as any).getCreateQueryProperties(
        obj,
      );
      expect(sqlQuery).toContain(
        'INSERT INTO email_sentiment_analysis_details',
      );
      expect(values).toEqual([
        undefined,
        obj.propertyId,
        undefined,
        values[3],
        obj.sentimentScore,
        obj.detectedHostility,
        obj.flaggedPhrases,
        obj.detectedOn,
        null,
        null,
      ]);
    });
  });

  describe('updateQueryProperties', () => {
    it('should return the correct SQL query and parameters for a given EmailSentimentAnalysisDetails object', () => {
      const obj: EmailSentimentAnalysisDetails = {
        propertyId: 'test-id',
        sentimentScore: 0.8,
        detectedHostility: false,
        flaggedPhrases: 'test phrase',
        detectedOn: new Date(),
      } as EmailSentimentAnalysisDetails;
      const [fieldMap] = (repository as any).getUpdateQueryProperties(obj);
      expect(fieldMap).toEqual({
        sentiment_score: obj.sentimentScore,
        detected_hostility: obj.detectedHostility,
        flagged_phrases: obj.flaggedPhrases,
        detected_on: obj.detectedOn,
      });
    });
  });
});
