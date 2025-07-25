export const ValidKeyValidationStatusValues = [
  'unknown', // Key validation hasn't been attempted yet
  'validating', // Key validation is in progress
  'valid', // Keys are validated and match server
  'invalid', // Keys don't match server or are missing
  'synchronizing', // New keys are being generated and uploaded
  'synchronized', // Key synchronization completed successfully
  'failed', // Key validation or synchronization failed
] as const;
