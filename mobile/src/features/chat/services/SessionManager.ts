/**
 * @file SessionManager.ts
 * @description JWT Authentication & Session Lifecycle Manager.
 *              Manages access/refresh token rotation, expiry detection,
 *              device registration, and secure session cleanup on logout.
 */

import useAuthStore from '../../../shared/store/authStore';
import { setSocketAuthCredentials, disconnectSocketOnLogout } from '../../../shared/services/socketManager';
import EncryptionManager from './EncryptionManager';
import apiClient from '../../../shared/services/apiClient';
import { toast } from '../../../shared/components/Toast';

export interface UserSession {
  token: string;
  refreshToken?: string;
  companyId: string;
  expiresAt: number;
}

export class SessionManagerClass {
  private sessionKey = 'user_session_credentials';

  /**
   * Initialize and store user login session
   */
  async loginSession(token: string, refreshToken: string, companyId: string, expiresInSec: number = 86400): Promise<void> {
    const expiresAt = Date.now() + expiresInSec * 1000;
    const sessionData: UserSession = {
      token,
      refreshToken,
      companyId,
      expiresAt,
    };

    // 1. Store in encrypted storage
    await EncryptionManager.encryptAndStore(this.sessionKey, sessionData);

    // 2. Set Socket credentials
    setSocketAuthCredentials(token, companyId, new Date().toISOString());
  }

  /**
   * Rotate JWT Access Token using Refresh Token
   */
  async refreshSessionToken(): Promise<string | null> {
    try {
      const session = await EncryptionManager.getAndDecrypt<UserSession>(this.sessionKey);
      if (!session || !session.refreshToken) return null;

      const res = await apiClient.post('/api/v1/auth/refresh-token', {
        refreshToken: session.refreshToken,
      });

      if (res.data?.status === 'success' && res.data.token) {
        const newToken = res.data.token;
        session.token = newToken;
        await EncryptionManager.encryptAndStore(this.sessionKey, session);
        setSocketAuthCredentials(newToken, session.companyId, new Date().toISOString());
        return newToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Terminate active user session and purge credentials
   */
  async logoutSession(): Promise<void> {
    try {
      // 1. Disconnect Socket
      disconnectSocketOnLogout();

      // 2. Remove encrypted session
      await EncryptionManager.removeEncryptedItem(this.sessionKey);

      // 3. Reset Zustand Auth Store
      useAuthStore.getState().logout();
      toast.info('Session ended');
    } catch (err) {
      console.warn('[SessionManager] Logout error:', err);
    }
  }
}

export const SessionManager = new SessionManagerClass();
export default SessionManager;
