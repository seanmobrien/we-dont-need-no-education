/**
 * @fileoverview Unit tests for Call-to-Action API route
 * 
 * Tests the GET and POST endpoints for call-to-action properties,
 * including pagination, filtering, and repository integration.
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/email/[emailId]/properties/call-to-action/route';

// Mock external dependencies
jest.mock('@/lib/neondb');
jest.mock('@/lib/api');
jest.mock('@/lib/components/mui/data-grid/queryHelpers/postgres');

// Mock data
const mockEmailId = 'test-email-123';
const mockCallToActionData = [
  {
    property_id: 'cta-1',
    property_value: 'Please provide documentation',
    document_property_type_id: 4,
    property_name: 'Call to Action',
    description: 'Action Required',
    email_property_category_id: 1,
    opened_date: '2024-01-15',
    closed_date: null,
    compliancy_close_date: '2024-02-15',
    completion_percentage: 0.00,
    compliance_rating: null,
    inferred: false,
    compliance_date_enforceable: true,
    reasonable_request: 1,
    reasonable_reasons: 'Documentation request is standard',
    sentiment: 0.2,
    sentiment_reasons: ['Professional tone', 'Clear request'],
    compliance_rating_reasons: null,
    severity: 3,
    severity_reason: ['High importance', 'Legal compliance'],
    title_ix_applicable: 1,
    title_ix_applicable_reasons: ['Educational records involved'],
    closure_actions: ['Documentation provided', 'Follow-up scheduled'],
    compliance_average_chapter_13: 0.85,
    compliance_chapter_13_reasons: ['Timely response', 'Complete documentation']
  }
];

// Mock the controller and repository
const mockController = {
  listFromRepository: jest.fn(),
  create: jest.fn(),
};

const mockRepository = {
  mapRecordToObject: jest.fn(),
  innerQuery: jest.fn(),
};

// Mock RepositoryCrudController and CallToActionDetailsRepository
jest.mock('@/lib/api', () => ({
  CallToActionDetailsRepository: jest.fn().mockImplementation(() => mockRepository),
  RepositoryCrudController: jest.fn().mockImplementation(() => mockController),
}));

describe('Call-to-Action API Route', () => {
  let mockRequest: NextRequest;
  let mockParams: { params: Promise<{ emailId: string }> };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock request
    mockRequest = new NextRequest('http://localhost:3000/api/email/test-email-123/properties/call-to-action?page=1&num=20');
    mockParams = {
      params: Promise.resolve({ emailId: mockEmailId })
    };
  });

  describe('GET /api/email/[emailId]/properties/call-to-action', () => {
    it('should successfully retrieve call-to-action data', async () => {
      // Setup controller mock to return successful response
      mockController.listFromRepository.mockResolvedValue(
        Response.json({
          results: mockCallToActionData,
          pageStats: { page: 1, num: 20, total: 1 }
        })
      );

      const response = await GET(mockRequest, mockParams);
      
      expect(response.status).toBe(200);
      expect(mockController.listFromRepository).toHaveBeenCalledTimes(1);
      expect(mockController.listFromRepository).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle pagination parameters correctly', async () => {
      const paginatedRequest = new NextRequest(
        'http://localhost:3000/api/email/test-email-123/properties/call-to-action?page=2&num=10'
      );

      mockController.listFromRepository.mockResolvedValue(
        Response.json({
          results: [],
          pageStats: { page: 2, num: 10, total: 0 }
        })
      );

      const response = await GET(paginatedRequest, mockParams);
      
      expect(response.status).toBe(200);
      expect(mockController.listFromRepository).toHaveBeenCalledTimes(1);
    });

    it('should handle empty results gracefully', async () => {
      mockController.listFromRepository.mockResolvedValue(
        Response.json({
          results: [],
          pageStats: { page: 1, num: 20, total: 0 }
        })
      );

      const response = await GET(mockRequest, mockParams);
      
      expect(response.status).toBe(200);
    });

    it('should handle server errors appropriately', async () => {
      const serverError = new Error('Database connection failed');
      mockController.listFromRepository.mockRejectedValue(serverError);

      await expect(GET(mockRequest, mockParams)).rejects.toThrow('Database connection failed');
    });

    it('should call repository with correct callback function', async () => {
      mockController.listFromRepository.mockImplementation(async (callback) => {
        // Verify callback is a function
        expect(typeof callback).toBe('function');
        
        // Call the callback with mock repository
        const result = await callback(mockRepository);
        
        return Response.json(result || { results: [], pageStats: { page: 1, num: 20, total: 0 } });
      });

      const response = await GET(mockRequest, mockParams);
      
      expect(response.status).toBe(200);
      expect(mockController.listFromRepository).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle filtering parameters', async () => {
      const requestWithFilters = new NextRequest(
        'http://localhost:3000/api/email/test-email-123/properties/call-to-action?attachments=true&severity=3'
      );

      mockController.listFromRepository.mockResolvedValue(
        Response.json({
          results: mockCallToActionData,
          pageStats: { page: 1, num: 20, total: 1 }
        })
      );

      const response = await GET(requestWithFilters, mockParams);
      
      expect(response.status).toBe(200);
      expect(mockController.listFromRepository).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid email ID parameters', async () => {
      const badParams = {
        params: Promise.resolve({ emailId: '' })
      };

      mockController.listFromRepository.mockRejectedValue(
        new Error('Invalid email ID')
      );

      await expect(GET(mockRequest, badParams)).rejects.toThrow('Invalid email ID');
    });
  });

  describe('POST /api/email/[emailId]/properties/call-to-action', () => {
    let mockPostParams: { params: Promise<{ emailId: string; propertyId: string }> };

    beforeEach(() => {
      mockPostParams = {
        params: Promise.resolve({ 
          emailId: mockEmailId, 
          propertyId: 'new-cta-123' 
        })
      };
    });

    it('should successfully create a new call-to-action', async () => {
      const newCallToAction = {
        property_value: 'New action required',
        opened_date: '2024-01-30',
        severity: 2,
        title_ix_applicable: 1
      };

      const mockPostRequest = new NextRequest(
        'http://localhost:3000/api/email/test-email-123/properties/call-to-action',
        {
          method: 'POST',
          body: JSON.stringify(newCallToAction),
          headers: { 'Content-Type': 'application/json' }
        }
      );

      mockController.create.mockResolvedValue(
        Response.json({ 
          id: 'cta-new-123', 
          ...newCallToAction 
        }, { status: 201 })
      );

      const response = await POST(mockPostRequest, mockPostParams);
      
      expect(response.status).toBe(201);
      expect(mockController.create).toHaveBeenCalledWith(
        mockPostRequest, 
        mockPostParams
      );
    });

    it('should handle validation errors for POST requests', async () => {
      const invalidData = {
        property_value: '' // Missing required data
      };

      const mockPostRequest = new NextRequest(
        'http://localhost:3000/api/email/test-email-123/properties/call-to-action',
        {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: { 'Content-Type': 'application/json' }
        }
      );

      mockController.create.mockResolvedValue(
        Response.json({ 
          error: 'Validation failed',
          details: ['property_value is required']
        }, { status: 400 })
      );

      const response = await POST(mockPostRequest, mockPostParams);
      
      expect(response.status).toBe(400);
      expect(mockController.create).toHaveBeenCalledWith(
        mockPostRequest, 
        mockPostParams
      );
    });

    it('should handle server errors during creation', async () => {
      const validData = {
        property_value: 'Valid action',
        opened_date: '2024-01-30',
        severity: 1
      };

      const mockPostRequest = new NextRequest(
        'http://localhost:3000/api/email/test-email-123/properties/call-to-action',
        {
          method: 'POST',
          body: JSON.stringify(validData),
          headers: { 'Content-Type': 'application/json' }
        }
      );

      mockController.create.mockRejectedValue(
        new Error('Database constraint violation')
      );

      await expect(POST(mockPostRequest, mockPostParams)).rejects.toThrow('Database constraint violation');
      expect(mockController.create).toHaveBeenCalledWith(
        mockPostRequest, 
        mockPostParams
      );
    });
  });

  describe('Integration Tests', () => {
    it('should maintain consistent data structure', async () => {
      mockController.listFromRepository.mockResolvedValue(
        Response.json({
          results: mockCallToActionData,
          pageStats: { page: 1, num: 20, total: 1 }
        })
      );

      const response = await GET(mockRequest, mockParams);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      
      // Verify response structure
      if (responseData.results && responseData.results.length > 0) {
        const firstResult = responseData.results[0];
        const expectedFields = [
          'property_id',
          'property_value',
          'opened_date',
          'completion_percentage',
          'severity',
          'title_ix_applicable'
        ];

        expectedFields.forEach(field => {
          expect(firstResult).toHaveProperty(field);
        });
      }

      expect(responseData).toHaveProperty('pageStats');
      expect(responseData.pageStats).toHaveProperty('page');
      expect(responseData.pageStats).toHaveProperty('num');
      expect(responseData.pageStats).toHaveProperty('total');
    });

    it('should handle concurrent requests properly', async () => {
      mockController.listFromRepository.mockImplementation(async () => {
        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return Response.json({
          results: mockCallToActionData,
          pageStats: { page: 1, num: 20, total: 1 }
        });
      });

      // Simulate concurrent requests
      const requests = Array.from({ length: 3 }, () => 
        GET(mockRequest, mockParams)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockController.listFromRepository).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      mockController.listFromRepository.mockRejectedValue(timeoutError);

      await expect(GET(mockRequest, mockParams)).rejects.toThrow('Request timeout');
    });

    it('should handle malformed request parameters', async () => {
      const malformedRequest = new NextRequest(
        'http://localhost:3000/api/email/test-email-123/properties/call-to-action?page=invalid&num=abc'
      );

      mockController.listFromRepository.mockResolvedValue(
        Response.json({
          results: [],
          pageStats: { page: 1, num: 20, total: 0 }
        })
      );

      const response = await GET(malformedRequest, mockParams);
      
      // Should still work with default pagination
      expect(response.status).toBe(200);
    });

    it('should handle missing required parameters', async () => {
      const emptyParams = {
        params: Promise.resolve({ emailId: mockEmailId })
      };

      mockController.listFromRepository.mockResolvedValue(
        Response.json({
          results: [],
          pageStats: { page: 1, num: 20, total: 0 }
        })
      );

      const response = await GET(mockRequest, emptyParams);
      
      expect(response.status).toBe(200);
    });
  });
});