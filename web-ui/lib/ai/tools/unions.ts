/**
 * An array of valid policy search scope types.
 *
 * - `'school-district'`: Represents a school district level scope.
 * - `'state'`: Represents a state level scope.
 * - `'federal'`: Represents a federal level scope.
 *
 * This constant can be used to validate or restrict policy search operations to these predefined scopes.
 */
export const PolicySearchScopeTypeValues = [
  'school-district',
  'state',
  'federal',
] as const;

/**
 * An array of string literals representing the possible search scope types for a case file.
 *
 * The available values are:
 * - `'email'`: Represents email messages associated with the case file.
 * - `'attachment'`: Represents file attachments related to the case file.
 * - `'core-document'`: An alias for `'email'` and `'attachment'`.
 * - `'key-point'`: Represents key points extracted from the case file.
 * - `'call-to-action'`: Represents actionable items identified in the case file.
 * - `'responsive-action'`: Represents actions that are responsive to one or more call-to-actions.
 * This constant is used to restrict and validate the allowed search scope types within the application.
 */
export const CaseFileSearchScopeTypeValues = [
  'core-document',
  'email',
  'attachment',
  'key-point',
  'call-to-action',
  'responsive-action',
  'note',
] as const;

/**
 * Represents the possible values for the policy search scope.
 * This type is derived from the elements of the `PolicySearchScopeTypeValues` array.
 *
 * @see PolicySearchScopeTypeValues
 */
export type PolicySearchScopeType =
  (typeof PolicySearchScopeTypeValues)[number];

/**
 * Represents the possible values for the case file search scope type.
 * The type is derived from the elements of the `CaseFileSearchScopeTypeValues` array.
 *
 * @see CaseFileSearchScopeTypeValues
 */
export type CaseFileSearchScopeType =
  (typeof CaseFileSearchScopeTypeValues)[number];
