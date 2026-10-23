import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  AUTH_TOKEN: '@rentcars_auth_token',
  AUTH_USER: '@rentcars_auth_user',
  REMEMBER_IDENTIFIER: '@rentcars_remember_identifier',
  REMEMBER_ENABLED: '@rentcars_remember_enabled',
} as const;

export interface UserProfile {
  id: number;
  name: string;
  username: string;
  email: string;
  phone?: string | null;
  roles?: string[];
  is_super_admin?: boolean;
  is_admin?: boolean;
  is_marketing?: boolean;
  is_peluncur?: boolean;
  is_petugas_cuci?: boolean;
  is_driver?: boolean;
}

export const StorageService = {
  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } catch (e) {
      console.error('Failed to save token to storage', e);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    } catch (e) {
      console.error('Failed to read token from storage', e);
      return null;
    }
  },

  async setUser(user: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user to storage', e);
    }
  },

  async getUser(): Promise<UserProfile | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to read user from storage', e);
      return null;
    }
  },

  async setRememberMe(enabled: boolean, identifier: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ENABLED, enabled ? '1' : '0');
      if (enabled) {
        await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_IDENTIFIER, identifier);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_IDENTIFIER);
      }
    } catch (e) {
      console.error('Failed to set remember me', e);
    }
  },

  async getRememberMe(): Promise<{ enabled: boolean; identifier: string }> {
    try {
      const enabled = (await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ENABLED)) === '1';
      const identifier = (await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_IDENTIFIER)) || '';
      return { enabled, identifier };
    } catch {
      return { enabled: true, identifier: '' };
    }
  },

  async clearAuth(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.AUTH_USER]);
    } catch (e) {
      console.error('Failed to clear auth from storage', e);
    }
  },
};
