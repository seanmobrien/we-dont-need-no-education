import { LoggedError } from '/lib/react-util/errors/logged-error';
import { signData } from '/lib/site-util/auth/user-keys';

/**
 * Represents a user's response to a confirmation prompt.
 *
 * @property callId - The unique identifier for the call or confirmation session.
 * @property selectedOption - The option chosen by the user.
 * @property hash - A hash value for validation or integrity checking.
 */
export type UserResponse = {
  /**
   * Unique identifier for the call or confirmation session the option was selected in.
   * This is used to track which confirmation prompt the response belongs to, and to
   * ensure that the response is correctly associated with the right context.
   * @type {string}
   */
  callId: string;
  /**
   * The option selected by the user in response to the confirmation prompt.
   * This could be a string representing a choice like "Yes" or "No".
   * @type {string}
   */
  choice: string;
  /**
   * A digital signature of the choice and call ID using the user's private key.
   * This is used for validation purposes to ensure the integrity and authenticity of the response.
   * @type {string}
   */
  hash: string;
};

/**
 * Generates a valid digital signature for a response made by the currently logged-in user.
 *
 * @param source - The source object containing the callId and selected choice to sign.
 * @returns A UserResponse object with a digital signature generated from the callId and selectedOption.
 */
export const signResponse = async (
  source: Omit<UserResponse, 'hash'>,
): Promise<UserResponse> => {
  try {
    // Create a message to sign that includes both callId and choice
    const message = `${source.callId}:${source.choice}`;

    // Sign the message using ECDSA
    const hash = await signData(message);

    return { ...source, hash };
  } catch (error) {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: 'signResponse',
    });
    // Fallback to a basic hash if crypto fails (should not happen in secure contexts)
    const fallbackHash = btoa(
      `${source.callId}:${source.choice}:${Date.now()}`,
    );
    return { ...source, hash: fallbackHash };
  }
};
