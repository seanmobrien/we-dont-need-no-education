/**
 * Email viewer loading indicators.
 *
 * Small wrappers around the generic `Loading` component with pre-set text
 * for email-specific contexts, keeping call-sites concise and consistent.
 */
import { Loading } from '@/components/general/loading';

/**
 * Displays a standard loading card while an email message is being fetched.
 */
export const LoadingEmail = () => (
<Loading text="Loading Email..." loading />
);

/**
 * Displays a standard loading card while email attachments are being fetched.
 */
export const LoadingAttachments = () => (
  <Loading text="Loading Attachments..." loading />
);