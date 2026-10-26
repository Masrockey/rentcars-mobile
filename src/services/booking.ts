import { ENV } from '@/config/env';
import { StorageService } from './storage';

export interface Customer {
  id: number;
  user_id?: number | null;
  name: string;
  phone?: string | null;
  nik?: string | null;
  address?: string | null;
  email?: string | null;
  is_verified?: boolean;
}

export interface Car {
  id: number;
  name?: string;
  brand?: string;
  model?: string;
  plate_number?: string;
  year?: number | string;
  transmission?: string;
  color?: string;
  daily_rate?: number | string;
  status?: string;
  fuel_percentage?: number;
  last_km?: number;
  car_type?: {
    id?: number;
    name?: string;
  };
}

export interface Driver {
  id: number;
  name: string;
  phone?: string | null;
  status?: string;
}

export interface MarketingUser {
  id: number;
  name: string;
  email?: string;
  username?: string;
  phone?: string | null;
  roles?: string[];
}

export interface BookingDetail {
  id: number;
  booking_code?: string;
  booking_number?: string;
  code?: string;
  customer?: Customer | null;
  customer_name?: string;
  customer_phone?: string;
  customer_nik?: string;
  marketing?: MarketingUser | null;
  marketing_name?: string;
  car?: Car | null;
  car_type?: string;
  plate_number?: string;
  rental_type?: string; // 'Lepas Kunci' | 'With Driver'
  status: string; // 'Pending' | 'Confirmed' | 'On Trip' | 'Returned' | 'Completed' | 'Cancelled'
  booking_date: string;
  return_date: string;
  pickup_time?: string;
  return_time?: string;
  pickup_location?: string;
  dropoff_location?: string;
  driver?: Driver | null;
  daily_rate?: number;
  amount?: number;
  total_amount?: number;
  dp_amount?: number;
  remaining_amount?: number;
  delivery_fee?: number;
  pickup_fee?: number;
  deposit_fee?: number;
  payment_method?: string; // 'Cash' | 'Transfer' | 'DP'
  payment_status?: string; // 'Pending' | 'DP Verified' | 'Paid'
  notes?: string | null;
  car_id?: number | null;
  customer_id?: number | null;
  driver_id?: number | null;
  peluncur_id?: number | null;
  duration_days?: number;
  delivery_checklist?: Record<string, any> | null;
  return_checklist?: Record<string, any> | null;
  rental?: {
    id: number;
    contract_number?: string;
    km_out?: number;
    fuel_out?: number;
    km_in?: number | null;
    fuel_in?: number | null;
    fine_amount?: number;
    status?: string;
  } | null;
  created_at?: string;
  audit_logs?: {
    id: number;
    title: string;
    description: string;
    time: string;
    status: 'done' | 'active' | 'upcoming';
  }[];
}

export interface CreateBookingPayload {
  user_id?: number;
  marketing_id?: number;
  customer_id?: number;
  new_customer_name?: string;
  new_customer_phone?: string;
  new_customer_nik?: string;
  car_id?: number;
  car_type?: string;
  rental_type: 'Lepas Kunci' | 'With Driver';
  price: number;
  duration_type: 'Hari' | '24 Jam' | string;
  duration_days?: number;
  booking_date: string;
  return_date: string;
  pickup_time: string;
  return_time: string;
  pickup_location: string;
  dropoff_location: string;
  delivery_fee?: number;
  pickup_fee?: number;
  driver_fee?: number;
  payment_method: string;
  payment_status?: string;
  amount: number;
  dp_amount?: number;
  rate_type?: string;
  notes?: string;
  [key: string]: any;
}

export interface LookupsData {
  ready_cars?: Car[];
  all_cars?: Car[];
  car_types?: { id: number; name: string }[];
  ready_drivers?: Driver[];
  all_drivers?: Driver[];
  marketing_users?: MarketingUser[];
  customers?: Customer[];
}

export const BookingService = {
  /**
   * Mengambil daftar booking dengan filter & paginasi
   */
  async getBookings(params?: {
    status?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ items: BookingDetail[]; total: number; currentPage: number; lastPage: number } | null> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) return null;

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const query = new URLSearchParams();

      if (params?.status && params.status !== 'all' && params.status !== 'Semua') {
        query.append('status', params.status);
      }
      if (params?.search) {
        query.append('search', params.search);
      }
      if (params?.page) {
        query.append('page', String(params.page));
      }
      query.append('per_page', String(params?.per_page || 10));

      const response = await fetch(`${trimmedBase}/bookings?${query.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      const json = await response.json();
      const items: BookingDetail[] = Array.isArray(json?.data) ? json.data : (json?.data?.data || []);
      const total = json?.meta?.total ?? items.length;
      const currentPage = json?.meta?.current_page ?? 1;
      const lastPage = json?.meta?.last_page ?? 1;

      return { items, total, currentPage, lastPage };
    } catch (err: any) {
      console.warn('[BOOKING SERVICE] Fetch bookings failed:', err?.message);
      return null;
    }
  },

  /**
   * Mengambil detail satu booking lengkap
   */
  async getBookingDetail(id: number | string): Promise<BookingDetail | null> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) return null;

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${trimmedBase}/bookings/${id}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      const json = await response.json();
      return json?.data || null;
    } catch (err: any) {
      console.warn('[BOOKING SERVICE] Fetch booking detail failed:', err?.message);
      return null;
    }
  },

  /**
   * Mengambil master data lookups untuk dropdown form booking
   */
  async getLookups(): Promise<LookupsData | null> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) return null;

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${trimmedBase}/lookups`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      const json = await response.json();
      return json?.data || null;
    } catch (err: any) {
      console.warn('[BOOKING SERVICE] Fetch lookups failed:', err?.message);
      return null;
    }
  },

  /**
   * Membuat booking baru
   */
  async createBooking(payload: CreateBookingPayload): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) {
        return { success: false, message: 'Autentikasi token tidak ditemukan' };
      }

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${trimmedBase}/bookings`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        let errMsg = json?.message || `Gagal menyimpan booking (Status ${response.status})`;
        if (json?.errors && typeof json.errors === 'object') {
          const detailErrors = Object.entries(json.errors)
            .map(([field, msgs]: [string, any]) => `• ${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join('\n');
          if (detailErrors) {
            errMsg = `${errMsg}:\n${detailErrors}`;
          }
        }
        console.warn('[BOOKING SERVICE 422 ERROR]:', errMsg, json);
        return { success: false, message: errMsg };
      }

      return { success: true, data: json?.data, message: json?.message || 'Booking berhasil dibuat.' };
    } catch (err: any) {
      console.warn('[BOOKING SERVICE ERROR]:', err?.message);
      return { success: false, message: err?.message || 'Terjadi kesalahan jaringan.' };
    }
  },

  /**
   * Membatalkan booking
   */
  async cancelBooking(id: number | string, reason: string): Promise<{ success: boolean; message?: string }> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) return { success: false, message: 'Token tidak valid' };

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${trimmedBase}/bookings/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ cancellation_reason: reason }),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        return { success: false, message: json?.message || 'Gagal membatalkan booking' };
      }
      return { success: true, message: json?.message || 'Booking berhasil dibatalkan' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Koneksi gagal' };
    }
  },

  /**
   * Menghitung total metrik booking (Total, Pending, Sedang Jalan)
   */
  async getMetrics(): Promise<{ total: number; pending: number; onTrip: number }> {
    try {
      const [allRes, pendingRes, onTripRes] = await Promise.all([
        this.getBookings({ per_page: 1 }),
        this.getBookings({ status: 'Pending', per_page: 1 }),
        this.getBookings({ status: 'On Trip', per_page: 1 }),
      ]);

      return {
        total: allRes?.total ?? 0,
        pending: pendingRes?.total ?? 0,
        onTrip: onTripRes?.total ?? 0,
      };
    } catch {
      return { total: 0, pending: 0, onTrip: 0 };
    }
  },
};
