/*
import { initializeUserKeys, getUserPublicKeyForServer } from './confirmation';
*/
/**
 * Initialize user cryptographic keys and register public key with server if needed
 * Call this on app startup or user login
 */
/*
export const initializeUserSecurity = async (): Promise<void> => {
  try {
    // Ensure user has a key pair
    await initializeUserKeys();
    
    // Get public key for server registration
    const publicKey = await getUserPublicKeyForServer();
    
    if (publicKey) {
      // TODO: Send public key to server to associate with user account
      // This should be done via an API call to your backend
      console.log('User public key ready for server registration:', publicKey.substring(0, 50) + '...');
      
      // Example API call (uncomment and modify for your backend):
      /*
      try {
        await fetch('/api/user/register-public-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ publicKey }),
        });
      } catch (error) {
        console.error('Failed to register public key with server:', error);
      }
      * /
    }
  } catch (error) {
    console.error('Failed to initialize user security:', error);
  }
};
*/


/**
 * Check if user's cryptographic setup is ready
 */
/*
export const isUserSecurityInitialized = async (): Promise<boolean> => {
  try {
    const publicKey = await getUserPublicKeyForServer();
    return publicKey !== null;
  } catch {
    return false;
  }
};
*/