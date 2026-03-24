import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { HF_CONFIG } from './config';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'hf_access_token';
const REFRESH_KEY = 'hf_refresh_token';

export interface HFUser {
  sub: string;
  name: string;
  preferred_username: string;
  picture: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: HFUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: HF_CONFIG.authorizationEndpoint,
  tokenEndpoint: HF_CONFIG.tokenEndpoint,
};

const redirectUri = AuthSession.makeRedirectUri({ scheme: 'smollabapp', path: 'oauth/callback' });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<HFUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: HF_CONFIG.clientId,
      scopes: HF_CONFIG.scopes,
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery,
  );

  const fetchUserInfo = useCallback(async (accessToken: string): Promise<HFUser | null> => {
    try {
      const res = await fetch(HF_CONFIG.userinfoEndpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (stored) {
          const userInfo = await fetchUserInfo(stored);
          if (userInfo) {
            setToken(stored);
            setUser(userInfo);
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_KEY);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [fetchUserInfo]);

  // Handle OAuth response
  useEffect(() => {
    if (response?.type !== 'success' || !request?.codeVerifier) return;

    (async () => {
      try {
        const tokenRes = await AuthSession.exchangeCodeAsync(
          {
            clientId: HF_CONFIG.clientId,
            code: response.params.code,
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier! },
          },
          discovery,
        );

        const accessToken = tokenRes.accessToken;
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        if (tokenRes.refreshToken) {
          await SecureStore.setItemAsync(REFRESH_KEY, tokenRes.refreshToken);
        }

        const userInfo = await fetchUserInfo(accessToken);
        setToken(accessToken);
        setUser(userInfo);
      } catch (err) {
        console.error('Token exchange failed:', err);
      }
    })();
  }, [response, request, fetchUserInfo]);

  const login = useCallback(async () => {
    await promptAsync();
  }, [promptAsync]);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
