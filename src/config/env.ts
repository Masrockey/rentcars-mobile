/**
 * Environment configuration module.
 * Semua nilai URL/Konfigurasi diambil dari file .env (EXPO_PUBLIC_*).
 * Tidak ada URL yang di-hardcode di kode aplikasi.
 */

export const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
} as const;

if (!ENV.API_BASE_URL) {
  console.warn(
    '[ENV WARNING] EXPO_PUBLIC_API_BASE_URL belum disetel di file .env! ' +
    'Pastikan file .env memiliki EXPO_PUBLIC_API_BASE_URL=https://rent.cdk-project.web.id/api/v1'
  );
}

export default ENV;
