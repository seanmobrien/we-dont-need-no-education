/**
 * @fileoverview Case File Authorization Module
 *
 * This module provides a complete solution for managing case file authorization
 * using Keycloak Authorization Services. It includes resource management,
 * access checks, and helper utilities for integrating authorization into API endpoints.
 *
 * @module lib/auth/resources/case-file
 * @version 1.0.0
 */

export {
  ensureCaseFileResource,
  checkCaseFileAccess,
  getCaseFileResourceId,
  CaseFileScope,
  type CaseFileResource,
} from './case-file-resource';

export {
  getUserIdFromEmailId,
  getUserIdFromUnitId,
  getKeycloakUserIdFromUserId,
  getAccessibleUserIds,
} from './case-file-helpers';

export {
  checkEmailAuthorization,
  checkDocumentUnitAuthorization,
  type CaseFileAuthOptions,
  type AuthCheckResult,
} from './case-file-middleware';
