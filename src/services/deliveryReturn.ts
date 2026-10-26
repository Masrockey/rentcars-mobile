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
  photos?: string[];
  ktp_photos?: string[];
  sim_photos?: string[];
  body_depan_photos?: string[];
  body_kiri_photos?: string[];
  body_kanan_photos?: string[];
  body_belakang_photos?: string[];
  body_atap_photos?: string[];
}

export interface ReturnPayload {
  km_out: number; // Odometer saat masuk/kembali
  fuel_out: number; // Level BBM saat masuk/kembali (0 - 100)
  fuel_range_km?: number;
  handover_location?: string;
  notes?: string;
  checklist: Record<string, any>;
  photos?: string[];
  body_depan_photos?: string[];
  body_kiri_photos?: string[];
  body_kanan_photos?: string[];
  body_belakang_photos?: string[];
  body_atap_photos?: string[];
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

/**
 * Helper untuk mengirim multipart/form-data menggunakan XMLHttpRequest native React Native
 * Menghindari bug Expo SDK 52 fetch "Unsupported FormDataPart implementation"
 */
function sendMultipartRequest(url: string, token: string, formData: FormData): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'application/json');
    // JANGAN set Content-Type, biarkan React Native native networking mengatur boundary multipart

    xhr.onload = () => {
      let json: any = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        json = { message: xhr.responseText || 'Gagal memproses respon server.' };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(json);
      } else {
        reject(new Error(json.message || `Server error (${xhr.status})`));
      }
    };

    xhr.onerror = (e) => {
      console.error('[XHR NETWORK ERROR]:', e);
      reject(new Error('Gagal terhubung ke server saat mengunggah formulir. Pastikan jaringan aktif.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Waktu permintaan habis (timeout) saat mengunggah foto. Silakan coba lagi.'));
    };

    xhr.timeout = 120000; // 120 detik
    xhr.send(formData);
  });
}

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

      const hasFiles =
        (payload.photos && payload.photos.length > 0) ||
        (payload.ktp_photos && payload.ktp_photos.length > 0) ||
        (payload.sim_photos && payload.sim_photos.length > 0) ||
        (payload.body_depan_photos && payload.body_depan_photos.length > 0) ||
        (payload.body_kiri_photos && payload.body_kiri_photos.length > 0) ||
        (payload.body_kanan_photos && payload.body_kanan_photos.length > 0) ||
        (payload.body_belakang_photos && payload.body_belakang_photos.length > 0) ||
        (payload.body_atap_photos && payload.body_atap_photos.length > 0);

      let json: any;

      if (hasFiles) {
        const formData = new FormData();
        formData.append('km_out', String(payload.km_out));
        formData.append('fuel_out', String(payload.fuel_out));
        if (payload.fuel_range_km !== undefined) formData.append('fuel_range_km', String(payload.fuel_range_km));
        if (payload.handover_location) formData.append('handover_location', payload.handover_location);
        if (payload.notes) formData.append('notes', payload.notes);
        if (payload.checkout_date) formData.append('checkout_date', payload.checkout_date);
        if (payload.checkout_time) formData.append('checkout_time', payload.checkout_time);
        if (payload.checkout_datetime) formData.append('checkout_datetime', payload.checkout_datetime);

        Object.entries(payload.checklist || {}).forEach(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            formData.append(`checklist[${k}]`, JSON.stringify(v));
          } else {
            formData.append(`checklist[${k}]`, String(v));
          }
        });

        const appendFileGroup = (field: string, list?: string[]) => {
          if (!list || list.length === 0) return;
          list.forEach((uri, idx) => {
            if (!uri) return;
            // Jika sudah berupa URL online remote
            if (uri.startsWith('http://') || uri.startsWith('https://')) {
              formData.append(`${field}_urls[]`, uri);
              return;
            }
            const filename = uri.split('/').pop() || `${field}_${idx}.jpg`;
            const extMatch = /\.(\w+)$/.exec(filename);
            const mime = extMatch ? `image/${extMatch[1].toLowerCase()}` : 'image/jpeg';
            formData.append(`${field}[]`, {
              uri,
              name: filename,
              type: mime,
            } as any);
          });
        };

        appendFileGroup('photos', payload.photos);
        appendFileGroup('ktp_photos', payload.ktp_photos);
        appendFileGroup('sim_photos', payload.sim_photos);
        appendFileGroup('body_depan_photos', payload.body_depan_photos);
        appendFileGroup('body_kiri_photos', payload.body_kiri_photos);
        appendFileGroup('body_kanan_photos', payload.body_kanan_photos);
        appendFileGroup('body_belakang_photos', payload.body_belakang_photos);
        appendFileGroup('body_atap_photos', payload.body_atap_photos);

        json = await sendMultipartRequest(getEndpointUrl(`bookings/${bookingId}/delivery`), token, formData);
      } else {
        const res = await fetch(getEndpointUrl(`bookings/${bookingId}/delivery`), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });
        json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Gagal menyimpan serah terima unit.');
        }
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

      const hasFiles =
        (payload.photos && payload.photos.length > 0) ||
        (payload.body_depan_photos && payload.body_depan_photos.length > 0) ||
        (payload.body_kiri_photos && payload.body_kiri_photos.length > 0) ||
        (payload.body_kanan_photos && payload.body_kanan_photos.length > 0) ||
        (payload.body_belakang_photos && payload.body_belakang_photos.length > 0) ||
        (payload.body_atap_photos && payload.body_atap_photos.length > 0);

      let json: any;

      if (hasFiles) {
        const formData = new FormData();
        formData.append('km_out', String(payload.km_out));
        formData.append('fuel_out', String(payload.fuel_out));
        if (payload.fuel_range_km !== undefined) formData.append('fuel_range_km', String(payload.fuel_range_km));
        if (payload.handover_location) formData.append('handover_location', payload.handover_location);
        if (payload.notes) formData.append('notes', payload.notes);

        Object.entries(payload.checklist || {}).forEach(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            formData.append(`checklist[${k}]`, JSON.stringify(v));
          } else {
            formData.append(`checklist[${k}]`, String(v));
          }
        });

        const appendFileGroup = (field: string, list?: string[]) => {
          if (!list || list.length === 0) return;
          list.forEach((uri, idx) => {
            if (!uri) return;
            if (uri.startsWith('http://') || uri.startsWith('https://')) {
              formData.append(`${field}_urls[]`, uri);
              return;
            }
            const filename = uri.split('/').pop() || `${field}_${idx}.jpg`;
            const extMatch = /\.(\w+)$/.exec(filename);
            const mime = extMatch ? `image/${extMatch[1].toLowerCase()}` : 'image/jpeg';
            formData.append(`${field}[]`, {
              uri,
              name: filename,
              type: mime,
            } as any);
          });
        };

        appendFileGroup('photos', payload.photos);
        appendFileGroup('body_depan_photos', payload.body_depan_photos);
        appendFileGroup('body_kiri_photos', payload.body_kiri_photos);
        appendFileGroup('body_kanan_photos', payload.body_kanan_photos);
        appendFileGroup('body_belakang_photos', payload.body_belakang_photos);
        appendFileGroup('body_atap_photos', payload.body_atap_photos);

        json = await sendMultipartRequest(getEndpointUrl(`bookings/${bookingId}/return`), token, formData);
      } else {
        const res = await fetch(getEndpointUrl(`bookings/${bookingId}/return`), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });
        json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || 'Gagal memproses pengembalian unit.');
        }
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

