/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @jest-environment node
 */

import { DefaultImportManager } from '@/lib/email/import/importmanager';
import { ImportSourceMessage } from '@/data-models/api/import/email-message';
import { NextRequest } from 'next/server';
import { loadEmail } from '@/lib/api/email/import/google';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { query, queryExt } from '@/lib/neondb';
import { sendApiRequest } from '@/lib/send-api-request';
import { ICancellablePromise, ICancellablePromiseExt } from '@/lib/typescript';

jest.mock('@/lib/neondb');
jest.mock('google-auth-library');
jest.mock('googleapis');
jest.mock('@/lib/send-api-request');
jest.mock('@/lib/api/email/import/google');
jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
  errorLogFactory: jest.fn(),
}));

const mockLoadEmail = loadEmail as jest.MockedFunction<typeof loadEmail>;

describe('DefaultImportManager', () => {
  const defaultApiResponse: ImportSourceMessage = {
    id: 'testEmailId',
    providerId: 'incoming-email-id',
    stage: 'completed',
    raw: {},
  };
  const provider = 'google';
  const req = {
    headers: {
      get: jest.fn(),
    },
    json: jest.fn(),
    method: 'GET',
    url: 'http://localhost',
  } as unknown as NextRequest;
  let manager: DefaultImportManager;

  beforeEach(() => {
    (
      sendApiRequest as jest.MockedFunction<typeof sendApiRequest>
    ).mockReturnValue(
      Promise.resolve({
        success: true,
        message: 'Import successful',
        data: defaultApiResponse,
      }) as ICancellablePromiseExt<unknown>
    );
    manager = new DefaultImportManager(provider);
  });

  describe('runImportStage', () => {
    it('should run the import stage and return the import source message', async () => {
      const emailId = 'testEmailId';
      const importSourceMessage: ImportSourceMessage = {
        id: 'testEmailId',
        stage: 'new',
        providerId: emailId,
        raw: {},
      };
      mockLoadEmail.mockResolvedValue(importSourceMessage);

      const result = await manager.runImportStage(importSourceMessage, { req });

      expect(result).toEqual(importSourceMessage);
    });

    it('should handle errors and log them', async () => {
      const emailId = 'testEmailId';
      const importSourceMessage: ImportSourceMessage = {
        id: 'testEmailId',
        stage: 'new',
        providerId: emailId,
        raw: {},
      };
      const error = new Error('Test error');
      mockLoadEmail.mockRejectedValue(error);

      await expect(
        manager.runImportStage(importSourceMessage, { req })
      ).rejects.toThrow(LoggedError);
    });
  });

  describe('importEmail', () => {
    it('should import the email and return success', async () => {
      const emailId = 'testEmailId';
      const importSourceMessage: ImportSourceMessage = {
        id: 'testEmailId',
        providerId: emailId,
        stage: 'completed',
        raw: {},
      };
      mockLoadEmail.mockResolvedValue(importSourceMessage);

      const result = await manager.importEmail(emailId, { req });

      expect(result).toEqual({
        success: true,
        message: 'Import successful',
        data: importSourceMessage,
      });
    });

    it('should handle errors and return failure', async () => {
      const emailId = 'testEmailId';
      const error = new Error('Test error');
      mockLoadEmail.mockRejectedValue(error);

      const result = await manager.importEmail(emailId, { req });

      expect(result).toEqual({
        success: false,
        message: 'Test error',
        error: error,
      });
    });
  });
});
