import { ENV } from '@/config/env';
import { StorageService } from './storage';
import { BookingDetail } from './booking';

export interface DeliveryPayload {
  km_out: number;
  fuel_out: number; // 0 - 100
  fuel_range_km?: number;
  handover_location?: string;
  notes?: string;
  checkout_date?: string;
  checkout_time?: string;
  checkout_datetime?: string;
  checklist: Record<string, any>;
}

export interface ReturnPayload {
  km_out: number; // Odometer saat masuk/kembali
  fuel_out: number; // Level BBM saat masuk/kembali (0 - 100)
  fuel_range_km?: number;
  handover_location?: string;
  notes?: string;
  checklist: Record<string, any>;
}

export interface DeliveryListResponse {
  items: BookingDetail[];
  total: number;
  ready_count: number;
  on_trip_count: number;
  current_page: number;
  last_page: number;
}

export interface ReturnListResponse {
  items: BookingDetail[];
  total: number;
  on_trip_count: number;
  returned_count: number;
  current_page: number;
  last_page: number;
}

const getEndpointUrl = (endpoint: string) => {
  const base = (ENV.API_BASE_URL || '').replace(/\/+$/, '');
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  if (base.endsWith('/api/v1') && cleanEndpoint.startsWith('api/v1/')) {
    return `${base}/${cleanEndpoint.substring(7)}`;
  }
  if (!base.endsWith('/api/v1') && !cleanEndpoint.startsWith('api/v1/')) {
    return `${base}/api/v1/${cleanEndpoint}`;
  }
  return `${base}/${cleanEndpoint}`;
};

export const DeliveryReturnService = {
  /**
   * Mengambil daftar booking untuk Serah Terima (Delivery)
   * Menyaring booking yang sudah memiliki mobil (allocated), baik yang siap serah (Confirmed) maupun yang sudah On Trip
   */
  async getDeliveryList(params?: {
    tab?: 'ready' | 'on_trip' | 'all';
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<DeliveryListResponse> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) {
        return {
          items: [],
          total: 0,
          ready_count: 0,
          on_trip_count: 0,
          current_page: 1,
          last_page: 1,
        };
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', String(params.page));
      queryParams.append('per_page', String(params?.per_page || 50));
      if (params?.search) queryParams.append('search', params.search);

      const url = `${getEndpointUrl('bookings')}?${queryParams.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal mengambil daftar serah terima.');
      }

      const allBookings: BookingDetail[] = json.data || [];

      // Saring hanya booking yang sudah dialokasikan mobil dan belum dibatalkan
      const allocatedBookings = allBookings.filter(
        (b) => b.car_id && b.status !== 'Cancelled'
      );

      const readyItems = allocatedBookings.filter(
        (b) => b.status === 'Confirmed' || (b.status === 'Pending' && b.car_id && !b.delivery_checklist)
      );

      const onTripItems = allocatedBookings.filter((b) => b.status === 'On Trip');

      let filteredItems = allocatedBookings;
      if (params?.tab === 'ready') {
        filteredItems = readyItems;
      } else if (params?.tab === 'on_trip') {
        filteredItems = onTripItems;
      }

      return {
        items: filteredItems,
        total: allocatedBookings.length,
        ready_count: readyItems.length,
        on_trip_count: onTripItems.length,
        current_page: json.meta?.current_page || 1,
        last_page: json.meta?.last_page || 1,
      };
    } catch (err: any) {
      console.error('DeliveryReturnService.getDeliveryList error:', err);
      return {
        items: [],
        total: 0,
        ready_count: 0,
        on_trip_count: 0,
        current_page: 1,
        last_page: 1,
      };
    }
  },

  /**
   * Submit Serah Terima Unit (Delivery Checklist -> Ubah Status ke On Trip)
   */
  async submitDelivery(bookingId: number, payload: DeliveryPayload): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const token = await StorageService.getToken();
      if (!token) throw new Error('Sesi telah berakhir. Silakan login kembali.');

      const res = await fetch(getEndpointUrl(`bookings/${bookingId}/delivery`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal menyimpan serah terima unit.');
      }

      return {
        success: true,
        message: json.message || 'Serah terima unit berhasil disimpan. Status kini On Trip.',
        data: json.data,
      };
    } catch (err: any) {
      console.error('DeliveryReturnService.submitDelivery error:', err);
      return {
        success: false,
        message: err.message || 'Terjadi kesalahan saat memproses serah terima unit.',
      };
    }
  },

  /**
   * Mengambil daftar booking untuk Pengembalian Unit (Return)
   * Menyaring unit yang sedang On Trip dan yang sudah Completed/Returned
   */
  async getReturnList(params?: {
    tab?: 'on_trip' | 'completed' | 'all';
    search?: string;
    page?: number;
    per_page?: number;
  }): Promise<ReturnListResponse> {
    try {
      const token = await StorageService.getToken();
      if (!token || !ENV.API_BASE_URL) {
        return {
          items: [],
          total: 0,
          on_trip_count: 0,
          returned_count: 0,
          current_page: 1,
          last_page: 1,
        };
      }

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', String(params.page));
      queryParams.append('per_page', String(params?.per_page || 50));
      if (params?.search) queryParams.append('search', params.search);

      // Ambil daftar booking
      const url = `${getEndpointUrl('bookings')}?${queryParams.toString()}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal mengambil daftar pengembalian.');
      }

      const allBookings: BookingDetail[] = json.data || [];

      // Saring booking yang relevan dengan kepulangan unit (On Trip atau Completed/Returned)
      const onTripItems = allBookings.filter((b) => b.status === 'On Trip');
      const returnedItems = allBookings.filter(
        (b) => b.status === 'Completed' || b.status === 'Returned'
      );

      let filteredItems = allBookings.filter(
        (b) => b.status === 'On Trip' || b.status === 'Completed' || b.status === 'Returned'
      );

      if (params?.tab === 'on_trip') {
        filteredItems = onTripItems;
      } else if (params?.tab === 'completed') {
        filteredItems = returnedItems;
      }

      return {
        items: filteredItems,
        total: filteredItems.length,
        on_trip_count: onTripItems.length,
        returned_count: returnedItems.length,
        current_page: json.meta?.current_page || 1,
        last_page: json.meta?.last_page || 1,
      };
    } catch (err: any) {
      console.error('DeliveryReturnService.getReturnList error:', err);
      return {
        items: [],
        total: 0,
        on_trip_count: 0,
        returned_count: 0,
        current_page: 1,
        last_page: 1,
      };
    }
  },

  /**
   * Submit Pengembalian Unit (Return Checklist -> Ubah Status ke Completed / Returned)
   */
  async submitReturn(bookingId: number, payload: ReturnPayload): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const token = await StorageService.getToken();
      if (!token) throw new Error('Sesi telah berakhir. Silakan login kembali.');

      const res = await fetch(getEndpointUrl(`bookings/${bookingId}/return`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Gagal memproses pengembalian unit.');
      }

      return {
        success: true,
        message: json.message || 'Pengembalian unit berhasil dicatat. Status kini Selesai.',
        data: json.data,
      };
    } catch (err: any) {
      console.error('DeliveryReturnService.submitReturn error:', err);
      return {
        success: false,
        message: err.message || 'Terjadi kesalahan saat memproses pengembalian unit.',
      };
    }
  },
};
