import { createHash } from 'crypto';
import { Meter, metrics } from '@opentelemetry/api';

export const SERVICE_NAME = 'WebUi';
export const SERVICE_NAMESPACE = 'ObApps.ComplianceTheatre';
export const SERVICE_VERSION = '1.0.0';
export const SCHEMA_URL = 'https://opentelemetry.io/schemas/1.30.0';

export const appMeters: Meter = metrics.getMeter(
  SERVICE_NAME,
  SERVICE_VERSION,
  { schemaUrl: SCHEMA_URL },
);

export const hashUserId = (userId: string): string => {
  return createHash('sha256').update(userId).digest('hex').substring(0, 12);
};
