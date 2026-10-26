import { ENV } from '@/config/env';
import { StorageService } from './storage';
import { BookingDetail, Car, Driver } from './booking';

export interface BlacklistRecord {
  id: number;
  name: string;
  phone?: string | null;
  nik?: string | null;
  address?: string | null;
  incident_date?: string | null;
  report_date?: string | null;
  perpetrator_info?: string | null;
  blacklisted_by?: string | null;
}

export interface AllocationListResponse {
  items: BookingDetail[];
  total: number;
  unallocated_count: number;
  allocated_count: number;
  current_page: number;
  last_page: number;
}

export interface AllocationPayload {
  car_id: number;
  driver_id?: number | null;
  peluncur_id?: number | null;
  petugas_cuci_id?: number | null;
  amount?: number | null;
}

export const AllocationService = {
  /**
   * Mengambil daftar alokasi booking dari backend
   */
  async getAllocations(params?: {
    status?: 'all' | 'unallocated' | 'allocated';
    search?: string;
    preset?: 'all' | 'today' | 'tomorrow' | 'this_week' | 'this_month';
    start_date?: string;
    end_date?: string;
    date_field?: 'booking_date' | 'return_date' | 'active_period';
    page?: number;
    per_page?: number;
  }): Promise<AllocationListResponse> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) {
        return {
          items: [],
          total: 0,
          unallocated_count: 0,
          allocated_count: 0,
          current_page: 1,
          last_page: 1,
        };
      }

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const queryParts: string[] = [];

      if (params?.status && params.status !== 'all') {
        queryParts.push(`status=${encodeURIComponent(params.status)}`);
      }
      if (params?.search && params.search.trim()) {
        queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
      }
      if (params?.preset && params.preset !== 'all') {
        queryParts.push(`preset=${encodeURIComponent(params.preset)}`);
      }
      if (params?.start_date) {
        queryParts.push(`start_date=${encodeURIComponent(params.start_date)}`);
      }
      if (params?.end_date) {
        queryParts.push(`end_date=${encodeURIComponent(params.end_date)}`);
      }
      if (params?.date_field && params.date_field !== 'booking_date') {
        queryParts.push(`date_field=${encodeURIComponent(params.date_field)}`);
      }
      if (params?.page) {
        queryParts.push(`page=${params.page}`);
      }
      queryParts.push(`per_page=${params?.per_page || 15}`);

      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const response = await fetch(`${trimmedBase}/allocations${queryString}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        return {
          items: [],
          total: 0,
          unallocated_count: 0,
          allocated_count: 0,
          current_page: 1,
          last_page: 1,
        };
      }

      const json = await response.json();
      const meta = json?.meta || {};
      const dataList = Array.isArray(json?.data) ? json.data : [];

      return {
        items: dataList,
        total: meta.total ?? dataList.length,
        unallocated_count: meta.unallocated_count ?? 0,
        allocated_count: meta.allocated_count ?? 0,
        current_page: meta.current_page ?? 1,
        last_page: meta.last_page ?? 1,
      };
    } catch (err: any) {
      console.warn('[ALLOCATION SERVICE ERROR]:', err?.message);
      return {
        items: [],
        total: 0,
        unallocated_count: 0,
        allocated_count: 0,
        current_page: 1,
        last_page: 1,
      };
    }
  },

  /**
   * Mengambil data armada mobil yang berstatus Ready dari database
   */
  async getReadyCars(): Promise<Car[]> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) return [];

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      // Coba ambil dari endpoint lookups terlebih dahulu
      const lookupRes = await fetch(`${trimmedBase}/lookups`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (lookupRes.ok) {
        const lookupJson = await lookupRes.json();
        const readyCars = lookupJson?.data?.ready_cars;
        if (Array.isArray(readyCars) && readyCars.length > 0) {
          return readyCars;
        }
      }

      // Fallback ke /cars?status=Ready
      const carsRes = await fetch(`${trimmedBase}/cars?status=Ready&per_page=100`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (carsRes.ok) {
        const carsJson = await carsRes.json();
        if (Array.isArray(carsJson?.data)) {
          return carsJson.data;
        }
      }

      return [];
    } catch (err: any) {
      console.warn('[READY CARS ERROR]:', err?.message);
      return [];
    }
  },

  /**
   * Mengambil data supir aktif untuk pesanan With Driver
   */
  async getReadyDrivers(): Promise<Driver[]> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) return [];

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const lookupRes = await fetch(`${trimmedBase}/lookups`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (lookupRes.ok) {
        const lookupJson = await lookupRes.json();
        const drivers = lookupJson?.data?.ready_drivers;
        if (Array.isArray(drivers)) return drivers;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Mengambil daftar blacklist konsumen dari database
   */
  async getBlacklists(): Promise<BlacklistRecord[]> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) return [];

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const res = await fetch(`${trimmedBase}/blacklists?per_page=150`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.data)) {
          return json.data;
        }
      }
      return [];
    } catch (err: any) {
      console.warn('[BLACKLIST SERVICE ERROR]:', err?.message);
      return [];
    }
  },

  /**
   * Menetapkan alokasi armada mobil ke booking
   */
  async updateAllocation(
    bookingId: number | string,
    payload: AllocationPayload
  ): Promise<{ success: boolean; message: string }> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) {
        return { success: false, message: 'Sesi login tidak valid' };
      }

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const res = await fetch(`${trimmedBase}/allocations/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          message: json?.message || 'Gagal menyimpan alokasi kendaraan.',
        };
      }

      return {
        success: true,
        message: json?.message || 'Alokasi armada mobil berhasil disimpan.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Terjadi kesalahan jaringan.',
      };
    }
  },
};
