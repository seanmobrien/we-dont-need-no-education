import type {
  ensureCaseFileResource,
  checkCaseFileAccess,
  getCaseFileResourceId,
  CaseFileScope,
  CaseFileResource,
} from './case-file-resource';
import type {
  getUserIdFromEmailId,
  getUserIdFromUnitId,
  getKeycloakUserIdFromUserId,
  getAccessibleUserIds,
} from './case-file-helpers';
import type {
  checkCaseFileAuthorization,
  CaseFileAuthOptions,
  AuthCheckResult,
} from './case-file-middleware';

/**
 * Case File Authorization Module
 *
 * @module lib/auth/resources/case-file
 */
declare module '@/lib/auth/resources/case-file' {
  export {
    ensureCaseFileResource,
    checkCaseFileAccess,
    getCaseFileResourceId,
    CaseFileScope,
    type CaseFileResource,
    getUserIdFromEmailId,
    getUserIdFromUnitId,
    getKeycloakUserIdFromUserId,
    getAccessibleUserIds,
    checkCaseFileAuthorization,
    CaseFileAuthOptions,
    AuthCheckResult,
  };
}
