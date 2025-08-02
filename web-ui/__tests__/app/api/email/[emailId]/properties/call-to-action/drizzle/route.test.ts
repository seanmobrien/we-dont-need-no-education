/**
 * @jest-environment node
 */

/**
 * @fileoverview Unit tests for Drizzle call-to-action route handler
 * 
 * This file contains comprehensive tests for the Drizzle-based call-to-action
 * route handler, verifying its query construction, filtering, sorting, and pagination.
 */

import { GET } from '@/app/api/email/[emailId]/properties/call-to-action/route';
import { NextRequest } from 'next/server';

// Mock the dependencies
jest.mock('@/lib/nextjs-util', () => ({
  extractParams: jest.fn(),
}));

jest.mock('@/lib/drizzle-db', () => ({
  drizDbWithInit: jest.fn(),
}));

jest.mock('@/lib/drizzle-db/schema', () => ({
  schema: {
    documentProperty: {
      propertyId: { name: 'property_id' },
      propertyValue: { name: 'property_value' },
      documentPropertyTypeId: { name: 'document_property_type_id' },
      documentId: { name: 'document_id' },
      createdOn: { name: 'created_on' },
      policyBasis: { name: 'policy_basis' },
      tags: { name: 'tags' },
    },
    callToActionDetails: {
      propertyId: { name: 'property_id' },
      openedDate: { name: 'opened_date' },
      closedDate: { name: 'closed_date' },
      compliancyCloseDate: { name: 'compliancy_close_date' },
      completionPercentage: { name: 'completion_percentage' },
      complianceRating: { name: 'compliance_rating' },
      inferred: { name: 'inferred' },
      complianceDateEnforceable: { name: 'compliance_date_enforceable' },
      reasonableRequest: { name: 'reasonable_request' },
      reasonableReasons: { name: 'reasonable_reasons' },
      sentiment: { name: 'sentiment' },
      sentimentReasons: { name: 'sentiment_reasons' },
      complianceRatingReasons: { name: 'compliance_rating_reasons' },
      severity: { name: 'severity' },
      severityReason: { name: 'severity_reason' },
      titleIxApplicable: { name: 'title_ix_applicable' },
      titleIxApplicableReasons: { name: 'title_ix_applicable_reasons' },
      closureActions: { name: 'closure_actions' },
    },
    emailPropertyType: {
      propertyName: { name: 'property_name' },
      documentPropertyTypeId: { name: 'document_property_type_id' },
      emailPropertyCategoryId: { name: 'email_property_category_id' },
    },
    emailPropertyCategory: {
      description: { name: 'description' },
      emailPropertyCategoryId: { name: 'email_property_category_id' },
    },
    documentUnits: {
      unitId: { name: 'unit_id' },
      emailId: { name: 'email_id' },
    },
    callToActionDetailsCallToActionResponse: {
      complianceChapter13: { name: 'compliance_chapter_13' },
      complianceChapter13Reasons: { name: 'compliance_chapter_13_reasons' },
      callToActionId: { name: 'call_to_action_id' },
    },
  },
}));

jest.mock('@/lib/components/mui/data-grid/queryHelpers/drizzle/selectForGrid', () => ({
  selectForGrid: jest.fn(),
}));

jest.mock('@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleFilter', () => ({
  buildDrizzleAttachmentOrEmailFilter: jest.fn(),
}));

jest.mock('@/lib/components/mui/data-grid/server', () => ({
  DefaultEmailColumnMap: {
    email_id: 'email_id',
    created_date: 'created_on',
  },
}));

import { extractParams } from '@/lib/nextjs-util';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/selectForGrid';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers/drizzle/buildDrizzleFilter';

const mockExtractParams = extractParams as jest.MockedFunction<typeof extractParams>;
const mockSelectForGrid = selectForGrid as jest.MockedFunction<typeof selectForGrid>;
const mockBuildDrizzleAttachmentOrEmailFilter = buildDrizzleAttachmentOrEmailFilter as jest.MockedFunction<typeof buildDrizzleAttachmentOrEmailFilter>;
const mockDrizDbWithInit = drizDbWithInit as jest.MockedFunction<typeof drizDbWithInit>;

// Mock Response.json
global.Response = {
  json: jest.fn().mockImplementation((data) => ({
    json: () => Promise.resolve(data),
    data,
  })),
} as any;

describe('Drizzle Call-to-Action Route Handler', () => {
  let mockRequest: NextRequest;
  let mockParams: { params: Promise<{ emailId: string }> };
  let mockQueryBuilder: any;

  beforeEach(() => {
    // jest.clearAllMocks();

    // Setup mock request
    mockRequest = {
      url: 'https://example.com/api/email/test-email-id/properties/call-to-action/drizzle?page=1&pageSize=10',
      headers: new Headers(),
      method: 'GET',
    } as NextRequest;

    // Setup mock params
    mockParams = {
      params: Promise.resolve({ emailId: 'test-email-id' }),
    };

    // Setup mock query builder
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    };

    mockDrizDbWithInit.mockResolvedValue(mockQueryBuilder);
    mockExtractParams.mockResolvedValue({ emailId: 'test-email-id' });
    mockBuildDrizzleAttachmentOrEmailFilter.mockReturnValue(undefined);
  });

  describe('Basic functionality', () => {
    it('should extract emailId from route parameters', async () => {
      const mockResult = {
        results: [],
        pageStats: { page: 1, num: 10, total: 0 },
      };
      mockSelectForGrid.mockResolvedValue(mockResult);

      await GET(mockRequest, mockParams);

      expect(mockExtractParams).toHaveBeenCalledWith(mockParams);
    });

    it('should call selectForGrid with correct parameters', async () => {
      const mockResult = {
        results: [
          {
            propertyId: 'test-property-id',
            value: 'Test call to action',
            severity: 3,
          },
        ],
        pageStats: { page: 1, num: 10, total: 1 },
      };
      mockSelectForGrid.mockResolvedValue(mockResult);

      await GET(mockRequest, mockParams);

      expect(mockSelectForGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          emailId: 'test-email-id',
        })
      );
    });

    it('should return JSON response with selectForGrid result', async () => {
      const mockResult = {
        results: [
          {
            propertyId: 'test-property-id',
            value: 'Test call to action',
            severity: 3,
          },
        ],
        pageStats: { page: 1, num: 10, total: 1 },
      };
      mockSelectForGrid.mockResolvedValue(mockResult);

      const response = await GET(mockRequest, mockParams);

      expect(Response.json).toHaveBeenCalledWith(mockResult);
      expect(response).toBeDefined();
    });
  });

  describe('Query construction', () => {
    it('should build query with correct select fields', async () => {
      mockSelectForGrid.mockResolvedValue({ results: [], pageStats: { page: 1, num: 10, total: 0 } });

      await GET(mockRequest, mockParams);

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyId: expect.any(Object),
          propertyValue: expect.any(Object),
          documentPropertyTypeId: expect.any(Object),
          documentId: expect.any(Object),
          createdOn: expect.any(Object),
          policyBasis: expect.any(Object),
          tags: expect.any(Object),
          propertyName: expect.any(Object),
          description: expect.any(Object),
          emailPropertyCategoryId: expect.any(Object),
          openedDate: expect.any(Object),
          closedDate: expect.any(Object),
          compliancyCloseDate: expect.any(Object),
          completionPercentage: expect.any(Object),
          complianceRating: expect.any(Object),
          inferred: expect.any(Object),
          complianceDateEnforceable: expect.any(Object),
          reasonableRequest: expect.any(Object),
          reasonableReasons: expect.any(Object),
          sentiment: expect.any(Object),
          sentimentReasons: expect.any(Object),
          complianceRatingReasons: expect.any(Object),
          severity: expect.any(Object),
          severityReason: expect.any(Object),
          titleIxApplicable: expect.any(Object),
          titleIxApplicableReasons: expect.any(Object),
          closureActions: expect.any(Object),
          complianceAverageChapter13: expect.any(Object),
          complianceChapter13Reasons: expect.any(Object),
        })
      );
    });

    it('should include attachment/email filter in WHERE clause', async () => {
      mockSelectForGrid.mockResolvedValue({ results: [], pageStats: { page: 1, num: 10, total: 0 } });

      await GET(mockRequest, mockParams);

      expect(mockBuildDrizzleAttachmentOrEmailFilter).toHaveBeenCalledWith({
        attachments: mockRequest,
        email_id: 'test-email-id',
        email_id_column: expect.any(Object),
        document_id_column: expect.any(Object),
      });
    });
  });

  describe('Column getter function', () => {
    let getColumnFunction: (name: string) => any;

    beforeEach(async () => {
      mockSelectForGrid.mockImplementation((params) => {
        getColumnFunction = params.getColumn;
        return Promise.resolve({ results: [], pageStats: { page: 1, num: 10, total: 0 } });
      });

      await GET(mockRequest, mockParams);
    });

    it('should return correct column for property_id', () => {
      const column = getColumnFunction('property_id');
      expect(column).toBeDefined();
      expect(column.name).toBe('property_id');
    });

    it('should return correct column for property_value', () => {
      const column = getColumnFunction('property_value');
      expect(column).toBeDefined();
      expect(column.name).toBe('property_value');
    });

    it('should return correct column for call-to-action specific fields', () => {
      const testCases = [
        'opened_date',
        'closed_date',
        'compliancy_close_date',
        'completion_percentage',
        'compliance_rating',
        'inferred',
        'compliance_date_enforceable',
        'severity',
        'title_ix_applicable',
      ];

      testCases.forEach(columnName => {
        const column = getColumnFunction(columnName);
        expect(column).toBeDefined();
        expect(column.name).toBe(columnName);
      });
    });

    it('should return undefined for unknown columns', () => {
      const column = getColumnFunction('unknown_column');
      expect(column).toBeUndefined();
    });
  });

  describe('Record mapper function', () => {
    let recordMapperFunction: (record: Record<string, unknown>) => any;

    beforeEach(async () => {
      mockSelectForGrid.mockImplementation((params) => {
        recordMapperFunction = params.recordMapper!;
        return Promise.resolve({ results: [], pageStats: { page: 1, num: 10, total: 0 } });
      });

      await GET(mockRequest, mockParams);
    });

    it('should map database record to CallToActionDetails format', () => {
      const mockRecord = {
        propertyId: '123e4567-e89b-12d3-a456-426614174000',
        propertyValue: 'Test call to action',
        documentPropertyTypeId: 4,
        documentId: 123,
        createdOn: '2023-01-01T00:00:00Z',
        policyBasis: ['Policy 1', 'Policy 2'],
        tags: ['tag1', 'tag2'],
        propertyName: 'Call to Action',
        description: 'CTA Category',
        emailPropertyCategoryId: 1,
        openedDate: new Date('2023-01-01'),
        closedDate: null,
        compliancyCloseDate: new Date('2023-02-01'),
        completionPercentage: '75.50',
        complianceRating: 4.5,
        inferred: false,
        complianceDateEnforceable: true,
        reasonableRequest: 1,
        reasonableReasons: ['reason1'],
        sentiment: 3.5,
        sentimentReasons: ['positive'],
        complianceRatingReasons: ['good'],
        severity: 3,
        severityReason: ['high'],
        titleIxApplicable: 1,
        titleIxApplicableReasons: ['applies'],
        closureActions: ['action1'],
        complianceAverageChapter13: 4.2,
        complianceChapter13Reasons: ['chapter13 reason'],
      };

      const result = recordMapperFunction(mockRecord);

      expect(result).toEqual({
        propertyId: '123e4567-e89b-12d3-a456-426614174000',
        documentId: 123,
        createdOn: new Date('2023-01-01T00:00:00Z'),
        policy_basis: ['Policy 1', 'Policy 2'],
        tags: ['tag1', 'tag2'],
        opened_date: new Date('2023-01-01'),
        closed_date: null,
        compliancy_close_date: new Date('2023-02-01'),
        completion_percentage: 75.50,
        compliance_rating: 4.5,
        inferred: false,
        compliance_date_enforceable: true,
        reasonable_request: 1,
        reasonable_reasons: ['reason1'],
        sentiment: 3.5,
        sentiment_reasons: ['positive'],
        compliance_rating_reasons: ['good'],
        severity: 3,
        severity_reason: ['high'],
        title_ix_applicable: 1,
        title_ix_applicable_reasons: ['applies'],
        closure_actions: ['action1'],
        value: 'Test call to action', // Maps propertyValue to value
        compliance_average_chapter_13: 4.2,
        compliance_chapter_13_reasons: ['chapter13 reason'],
      });
    });

    it('should handle null/undefined values correctly', () => {
      const mockRecord = {
        propertyId: 'test-id',
        propertyValue: 'test value',
        completionPercentage: '0',
        complianceRating: null,
        reasonableRequest: null,
        reasonableReasons: null,
        sentiment: null,
        sentimentReasons: null,
      };

      const result = recordMapperFunction(mockRecord);

      expect(result.completion_percentage).toBe(0);
      expect(result.compliance_rating).toBeNull();
      expect(result.reasonable_request).toBeNull();
      expect(result.reasonable_reasons).toBeNull();
      expect(result.sentiment).toBeNull();
      expect(result.sentiment_reasons).toBeNull();
    });
  });

  describe('Query validation', () => {
    it('should pass the correct parameters to selectForGrid', async () => {
      await GET(mockRequest, mockParams);
      
      expect(mockSelectForGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          req: mockRequest,
          emailId: 'test-email-id',
          query: expect.any(Object),
          getColumn: expect.any(Function),
          columnMap: expect.any(Object),
          recordMapper: expect.any(Function),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should handle extractParams errors', async () => {
      const error = new Error('Failed to extract params');
      mockExtractParams.mockRejectedValue(error);

      await expect(GET(mockRequest, mockParams)).rejects.toThrow('Failed to extract params');
    });

    it('should handle selectForGrid errors', async () => {
      const error = new Error('Database query failed');
      mockSelectForGrid.mockRejectedValue(error);

      await expect(GET(mockRequest, mockParams)).rejects.toThrow('Database query failed');
    });

    it('should handle buildDrizzleAttachmentOrEmailFilter errors', async () => {
      const error = new Error('Filter construction failed');
      mockBuildDrizzleAttachmentOrEmailFilter.mockImplementation(() => {
        throw error;
      });

      await expect(GET(mockRequest, mockParams)).rejects.toThrow('Filter construction failed');
    });
  });

  describe('Integration with existing API', () => {
    it('should return wire-compatible response structure', async () => {
      const mockResult = {
        results: [
          {
            propertyId: 'test-id',
            value: 'Test CTA',
            severity: 3,
            inferred: false,
            compliance_rating: 4.5,
          },
        ],
        pageStats: {
          page: 1,
          num: 10,
          total: 1,
        },
      };
      mockSelectForGrid.mockResolvedValue(mockResult);

      const response = await GET(mockRequest, mockParams);

      // Should match PaginatedResultset<Partial<CallToActionDetails>> structure
      expect(Response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.any(Array),
          pageStats: expect.objectContaining({
            page: expect.any(Number),
            num: expect.any(Number),
            total: expect.any(Number),
          }),
        })
      );
    });

    it('should use DefaultEmailColumnMap for column mapping', async () => {
      mockSelectForGrid.mockResolvedValue({ results: [], pageStats: { page: 1, num: 10, total: 0 } });

      await GET(mockRequest, mockParams);

      expect(mockSelectForGrid).toHaveBeenCalledWith(
        expect.objectContaining({
          columnMap: expect.objectContaining({
            email_id: 'email_id',
            created_date: 'created_on',
          }),
        })
      );
    });
  });
});
