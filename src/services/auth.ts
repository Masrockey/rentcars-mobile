import { Platform } from 'react-native';
import { ENV } from '@/config/env';
import { StorageService, UserProfile } from './storage';

export interface LoginResponseData {
  token: string;
  token_type: string;
  user: UserProfile;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export class AuthError extends Error {
  errors?: Record<string, string[]>;
  constructor(message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'AuthError';
    this.errors = errors;
  }
}

export const AuthService = {
  /**
   * Melakukan autentikasi pengguna ke endpoint Laravel API
   * Menggunakan BASE URL dari file .env (ENV.API_BASE_URL)
   */
  async login(loginIdentifier: string, password: string): Promise<LoginResponseData> {
    if (!ENV.API_BASE_URL) {
      throw new AuthError(
        'Base URL API belum dikonfigurasi. Pastikan EXPO_PUBLIC_API_BASE_URL terdaftar di .env'
      );
    }

    const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
    const url = `${trimmedBase}/auth/login`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: loginIdentifier.trim(),
          password,
          device_name: `mobile-${Platform.OS}`,
        }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 422 && json?.errors) {
          const firstKey = Object.keys(json.errors)[0];
          const firstMessage = json.errors[firstKey]?.[0] || json.message || 'Validasi gagal';
          throw new AuthError(firstMessage, json.errors);
        }

        const errorMessage =
          json?.message ||
          (response.status === 401
            ? 'Kredensial salah. Periksa kembali email/username dan kata sandi Anda.'
            : `Gagal login (Status ${response.status})`);

        throw new AuthError(errorMessage, json?.errors);
      }

      if (!json?.data?.token) {
        throw new AuthError('Respons server tidak menyertakan token autentikasi.');
      }

      // Simpan session ke storage lokal
      await StorageService.setToken(json.data.token);
      if (json.data.user) {
        await StorageService.setUser(json.data.user);
      }

      return json.data;
    } catch (error: any) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        error?.message?.includes('Network request failed')
          ? 'Tidak dapat terhubung ke server API. Periksa koneksi internet atau Base URL di file .env.'
          : error?.message || 'Terjadi kesalahan sistem saat mencoba login.'
      );
    }
  },

  /**
   * Logout akun dan bersihkan session lokal
   */
  async logout(): Promise<void> {
    const token = await StorageService.getToken();
    if (token && ENV.API_BASE_URL) {
      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      try {
        await fetch(`${trimmedBase}/auth/logout`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch {
        // Abaikan error jaringan saat logout, token tetap dibersihkan
      }
    }
    await StorageService.clearAuth();
  },
};
