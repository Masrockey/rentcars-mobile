import { ENV } from '@/config/env';
import { StorageService } from './storage';

export interface DashboardSummary {
  total_cars: number;
  cars_ready: number;
  cars_not_ready: number;
  cars_service: number;
  cars_wash: number;
  utilization_rate: string;
  revenue_today?: string;
  revenue_month?: string;
  overdue_returns?: number;
  tax_expiring_soon?: number;
  service_due?: number;
  pending_bookings_count?: number;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  nik?: string | null;
}

export interface Car {
  id: number;
  name?: string;
  brand?: string;
  model?: string;
  plate_number?: string;
  car_type?: {
    id?: number;
    name?: string;
  };
}

export interface Driver {
  id: number;
  name: string;
  phone?: string | null;
}

export interface BookingItem {
  id: number;
  booking_code?: string;
  booking_number?: string;
  code?: string;
  customer?: Customer | null;
  customer_name?: string;
  car?: Car | null;
  car_type?: string;
  plate_number?: string;
  rental_type?: string;
  status: string;
  booking_date: string;
  return_date: string;
  pickup_time?: string;
  return_time?: string;
  driver?: Driver | null;
  amount?: number | string;
}

export const DashboardService = {
  /**
   * Mengambil ringkasan metrik statistik real dari GET /dashboard
   */
  async getDashboardData(): Promise<DashboardSummary | null> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) return null;

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${trimmedBase}/dashboard`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn(`[DASHBOARD API] Error status: ${response.status}`);
        return null;
      }

      const json = await response.json();
      return json?.data?.summary || null;
    } catch (err: any) {
      console.warn('[DASHBOARD API] Fetch failed:', err?.message);
      return null;
    }
  },

  /**
   * Mengambil daftar booking real dari GET /bookings
   */
  async getRecentBookings(limit = 5): Promise<{ items: BookingItem[]; total: number } | null> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) return null;

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${trimmedBase}/bookings?per_page=${limit}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn(`[BOOKINGS API] Error status: ${response.status}`);
        return null;
      }

      const json = await response.json();
      const items = Array.isArray(json?.data) ? json.data : (json?.data?.data || []);
      const total = json?.meta?.total ?? items.length;

      return { items, total };
    } catch (err: any) {
      console.warn('[BOOKINGS API] Fetch failed:', err?.message);
      return null;
    }
  },

  /**
   * Mengambil total booking baru / pending
   */
  async getPendingCount(): Promise<number> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) return 0;

      const trimmedBase = ENV.API_BASE_URL.replace(/\/+$/, '');
      const response = await fetch(`${trimmedBase}/bookings?status=Pending&per_page=1`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return 0;
      const json = await response.json();
      return json?.meta?.total ?? (Array.isArray(json?.data) ? json.data.length : 0);
    } catch {
      return 0;
    }
  },
};
