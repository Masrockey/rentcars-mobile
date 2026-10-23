# Dokumentasi Lengkap REST API Rent Car System (v1)

Dokumentasi resmi REST API versi 1 (`/api/v1`) untuk **Rent Car System**. API ini dirancang untuk integrasi aplikasi mobile (iOS / Android / Flutter / React Native), frontend SPA (Next.js, Vue, React), maupun integrasi sistem backend pihak ketiga.

---

## Daftar Isi
1. [Ikhtisar & Base URL](#1-ikhtisar--base-url)
2. [Autentikasi & Otorisasi](#2-autentikasi--otorisasi)
3. [Format Response & Paginasi](#3-format-response--paginasi)
4. [Panduan Penggunaan Postman & Troubleshooting](#4-panduan-penggunaan-postman--troubleshooting)
5. [Daftar Lengkap Endpoint API](#5-daftar-lengkap-endpoint-api)
   - [5.1 Autentikasi & Profil](#51-autentikasi--profil-user)
   - [5.2 Dashboard Analytics](#52-dashboard-analytics)
   - [5.3 Master Data Lookup](#53-master-data-lookup)
   - [5.4 Manajemen Pengguna (Users)](#54-manajemen-pengguna-users)
   - [5.5 Pelanggan (Customers)](#55-pelanggan-customers)
   - [5.6 Armada Mobil (Cars)](#56-armada-mobil-cars)
   - [5.7 Tipe & Jenis Mobil (Car Types)](#57-tipe--jenis-mobil-car-types)
   - [5.8 Supir (Drivers)](#58-supir-drivers)
   - [5.9 Pemesanan & Alur Kerja (Bookings)](#59-pemesanan--alur-kerja-bookings)
   - [5.10 Log Perjalanan Supir (Driver Trip Logs)](#510-log-perjalanan-supir-driver-trip-logs)
   - [5.11 Alokasi Armada & Petugas (Allocations)](#511-alokasi-armada--petugas-allocations)
   - [5.12 Kontrak Rental (Rentals)](#512-kontrak-rental-rentals)
   - [5.13 Pengembalian Unit (Returns)](#513-pengembalian-unit-returns)
   - [5.14 Pembayaran & Invoice (Payments)](#514-pembayaran--invoice-payments)
   - [5.15 Perawatan & Servis (Services)](#515-perawatan--servis-services)
   - [5.16 Asuransi Kendaraan (Insurances)](#516-asuransi-kendaraan-insurances)
   - [5.17 Pajak Kendaraan & STNK (Vehicle Taxes)](#517-pajak-kendaraan--stnk-vehicle-taxes)
   - [5.18 Blacklist Konsumen](#518-blacklist-konsumen)
   - [5.19 Laporan Bulanan (Reports)](#519-laporan-bulanan-reports)
   - [5.20 Log Aktivitas Audit (Activity Logs)](#520-log-aktivitas-audit-activity-logs)
   - [5.21 Notifikasi Sistem (Notifications)](#521-notifikasi-sistem-notifications)
   - [5.22 WhatsApp Gateway Multi-Device Server (WA Server)](#522-whatsapp-gateway-multi-device-server-wa-server)
6. [Contoh Kode Integrasi (cURL & JavaScript / React)](#6-contoh-kode-integrasi)

---

## 1. Ikhtisar & Base URL

| Lingkungan | Base URL |
| :--- | :--- |
| **Production (Live)** | `https://rent.cdk-project.web.id/api/v1` |
| **Lokal (Development)** | `http://localhost:8000/api/v1` |

### Header Permintaan Wajib (HTTP Headers)
Setiap request ke API wajib menyertakan header standar:
```http
Accept: application/json
Content-Type: application/json
```
> **Catatan Upload File**: Saat mengirim request yang menyertakan berkas (foto KTP, bukti transfer, foto unit), gunakan format `multipart/form-data` (tanpa menyetel manual `Content-Type: application/json`).

---

## 2. Autentikasi & Otorisasi

API diamankan menggunakan **Laravel Sanctum (Bearer Token)**.

1. Lakukan request `POST /api/v1/auth/login` untuk memperoleh Token Bearer.
2. Sisipkan token pada header `Authorization` di setiap request berikutnya:
   ```http
   Authorization: Bearer <token_anda>
   ```

### Matriks Hak Akses (Role-Based Access Control)
| Role | Hak Akses Utama |
| :--- | :--- |
| **Super Admin** | Akses mutlak ke semua resource, manajemen user, ekspor data, delete record, dan override status sewa. |
| **Admin** | Akses operasional menyeluruh: Customers, Cars, Bookings, Allocations, Payments, Services, Taxes, Insurances, Blacklists. |
| **Marketing** | Menginput booking, mengelola data pelanggan yang dibuatnya sendiri, monitoring booking pribadi di dashboard. |
| **Peluncur** | Mengakses daftar alokasi, mengisi checklist serah terima (*Delivery*) & pengambilan unit (*Return*). |
| **Petugas Cuci** | Mengakses daftar antrean pencucian unit dan konfirmasi penyelesaian pencucian armada. |
| **Driver / Supir** | Mengakses jadwal tugas perjalanan dan pesanan sewa mobil yang ditugaskan kepadanya. |

---

## 3. Format Response & Paginasi

### 3.1 Respons Berhasil Tunggal (`200 OK` / `201 Created`)
```json
{
  "success": true,
  "message": "Operasi berhasil dilakukan.",
  "data": {
    "id": 1,
    "name": "Contoh Data"
  }
}
```

### 3.2 Respons Berhasil dengan Paginasi (`paginate`)
Endpoint list (`GET /bookings`, `GET /customers`, `GET /cars`, dll) mengembalikan metadata paginasi:
```json
{
  "success": true,
  "message": "Daftar data berhasil diambil.",
  "data": [
    { "id": 1, "name": "..." },
    { "id": 2, "name": "..." }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 9,
    "per_page": 10,
    "total": 89
  }
}
```

#### Penjelasan Object `meta`:
- `current_page`: Nomor halaman yang sedang ditampilkan.
- `last_page`: Total jumlah halaman yang tersedia ($total \div per\_page$).
- `per_page`: Jumlah baris data dalam satu halaman (default: `10`).
- `total`: Total keseluruhan record data yang ditemukan.

#### Mengontrol Halaman dan Jumlah Data (Query Parameters):
Tambahkan parameter `page` dan `per_page` pada URL:
```http
GET https://rent.cdk-project.web.id/api/v1/bookings?page=2&per_page=20
```

---

### 3.3 Respons Error Validasi (`422 Unprocessable Content`)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["Format email tidak valid."],
    "plate_number": ["Nomor plat mobil sudah digunakan."]
  }
}
```

### 3.4 Respons Autentikasi / Otorisasi (`401 Unauthorized` / `403 Forbidden`)
```json
{
  "message": "Unauthenticated."
}
```

---

## 4. Panduan Penggunaan Postman & Troubleshooting

### Pengaturan Standar di Postman
1. **URL**: Wajib menyertakan protokol secara lengkap:
   - Live: `https://rent.cdk-project.web.id/api/v1/auth/login`
   - Local: `http://localhost:8000/api/v1/auth/login`
2. **Tab Headers**:
   - `Accept` : `application/json`
   - `Content-Type` : `application/json`
3. **Tab Authorization** (untuk endpoint terproteksi):
   - Type: `Bearer Token`
   - Token: Masukkan token yang didapat dari respons login.

### Solusi Error Umum Postman:
- **`400 Bad Request (nginx)` / `Invalid Host "<calculated...>"`**:
  Terjadi jika baris URL tidak diawali `http://` atau `https://`, atau jika header `Host` diaktifkan secara manual. Hapus centang pada header `Host` di tab Headers dan pastikan URL diawali `http://` atau `https://`.
- **`The route api/v1 could not be found`**:
  Pastikan endpoint lengkap ditulis setelah `api/v1/` (contoh: `/api/v1/auth/login`, `/api/v1/bookings`).

---

## 5. Daftar Lengkap Endpoint API

---

### 5.1 Autentikasi & Profil User

#### 1. Login Akun & Generate Token
- **Method**: `POST`
- **Endpoint**: `/auth/login`
- **Autentikasi**: Tidak (Publik)
- **Kredensial Fleksibel**: Dapat menggunakan salah satu dari **Email**, **Username**, atau **Nomor Handphone (No HP)**.
- **Body Request (JSON)**:
  ```json
  {
    "login": "081234567890", // bisa berupa email, username, atau no HP
    "password": "password",
    "device_name": "mobile-app" // opsional
  }
  ```
  *Atau mengirim kunci spesifik:*
  ```json
  {
    "username": "driver_anto", // atau "phone": "081234567890" atau "email": "anto@example.com"
    "password": "password"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login berhasil.",
    "data": {
      "token": "1|rent_xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "token_type": "Bearer",
      "user": {
        "id": 1,
        "name": "Super Admin",
        "username": "superadmin",
        "email": "superadmin@rentcars.com",
        "phone": "081234567890",
        "roles": ["Super Admin"],
        "is_super_admin": true,
        "is_admin": true,
        "is_marketing": false,
        "is_peluncur": false,
        "is_petugas_cuci": false,
        "is_driver": false
      }
    }
  }
  ```

#### 2. Logout Akun
- **Method**: `POST`
- **Endpoint**: `/auth/logout`
- **Autentikasi**: Ya (Bearer Token)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logout berhasil.",
    "data": null
  }
  ```

#### 3. Info Profil User Login
- **Method**: `GET`
- **Endpoint**: `/user`
- **Autentikasi**: Ya (Bearer Token)
- **Response (200 OK)**: Mengembalikan data resource user saat ini.

#### 4. Update Profil User
- **Method**: `PUT`
- **Endpoint**: `/user/profile`
- **Body Request (JSON)**:
  ```json
  {
    "name": "Nama Baru",
    "username": "username_baru",
    "email": "email_baru@rentcars.com",
    "phone": "081299998888"
  }
  ```

#### 5. Update Password User
- **Method**: `PUT`
- **Endpoint**: `/user/password`
- **Body Request (JSON)**:
  ```json
  {
    "current_password": "passwordLama123",
    "password": "passwordBaru123",
    "password_confirmation": "passwordBaru123"
  }
  ```

---

### 5.2 Dashboard Analytics

#### 1. Ambil Statistik & Analitik Dashboard
- **Method**: `GET`
- **Endpoint**: `/dashboard`
- **Autentikasi**: Ya (Bearer Token)
- **Query Parameters**:
  - `preset`: `all` | `today` | `tomorrow` | `this_week` | `this_month` | `custom` (default: `all`)
  - `start_date`: Format `YYYY-MM-DD` (jika `preset=custom`)
  - `end_date`: Format `YYYY-MM-DD` (jika `preset=custom`)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Data dashboard berhasil diambil.",
    "data": {
      "role": "Super Admin",
      "preset": "this_month",
      "summary": {
        "total_cars": 25,
        "cars_ready": 18,
        "cars_not_ready": 5,
        "cars_service": 2,
        "cars_wash": 0,
        "utilization_rate": "28%",
        "revenue_today": "1500000.00",
        "revenue_month": "45200000.00",
        "overdue_returns": 0,
        "tax_expiring_soon": 1,
        "service_due": 2
      }
    }
  }
  ```

---

### 5.3 Master Data Lookup

#### 1. Ambil Semua Referensi Dropdown
- **Method**: `GET`
- **Endpoint**: `/lookups`
- **Autentikasi**: Ya (Bearer Token)
- **Response (200 OK)**: Mengembalikan koleksi `ready_cars`, `all_cars`, `car_types`, `ready_drivers`, `all_drivers`, `peluncur_officers`, `wash_officers`, `marketing_users`, dan `customers`.

---

### 5.4 Manajemen Pengguna (Users)
> *Khusus role Super Admin.*

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/users` | Daftar seluruh user (`?search=...`, `?roles=...`, `?page=1`, `?per_page=10`) |
| `POST` | `/users` | Tambah user baru |
| `GET` | `/users/{id}` | Detail user |
| `PUT` | `/users/{id}` | Update data user & roles |
| `DELETE` | `/users/{id}` | Hapus user |

**Body Tambah User (`POST /users`)**:
```json
{
  "name": "Budi Marketing",
  "username": "budimarketing",
  "email": "budi@rentcars.com",
  "phone": "08123456789",
  "password": "password123",
  "roles": ["Marketing"]
}
```
*Role yang valid: `Super Admin`, `Admin`, `Marketing`, `Peluncur`, `Petugas Cuci`, `Driver`.*

---

### 5.5 Pelanggan (Customers)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/customers` | Daftar pelanggan (`?search=...`, `?page=1`, `?per_page=10`) |
| `POST` | `/customers` | Tambah pelanggan baru (mendukung file upload KTP/SIM/Selfie) |
| `GET` | `/customers/{id}` | Detail pelanggan lengkap dengan riwayat booking |
| `POST` | `/customers/{id}` (`_method=PUT`) | Update data pelanggan |
| `DELETE` | `/customers/{id}` | Hapus pelanggan |

**Form Fields Pelanggan (`POST /customers`)**:
- `name` (string, wajib): Nama lengkap
- `nik` (string, 16 digit): Nomor Induk Kependudukan KTP
- `phone` (string, wajib): Nomor WhatsApp / HP
- `email` (string): Alamat email
- `address` (string): Alamat domisili
- `emergency_contact` (string): Nomor telepon darurat
- `sim_number` (string): Nomor SIM
- `sim_expiry` (date): `YYYY-MM-DD`
- `ktp_photo` (file): Gambar KTP (jpg, png, webp, maks 5MB)
- `sim_photo` (file): Gambar SIM
- `selfie_photo` (file): Gambar selfie memegang KTP
- `user_id` (integer): ID User Marketing penanggung jawab

---

### 5.6 Armada Mobil (Cars)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/cars` | Daftar armada (`?status=Ready\|Not Ready\|Belum Dicuci\|Service\|all`, `?search=...`) |
| `POST` | `/cars` | Tambah unit mobil baru |
| `GET` | `/cars/{id}` | Detail mobil beserta histori servis, asuransi, dan pajak |
| `POST` | `/cars/{id}` (`_method=PUT`) | Update armada mobil |
| `DELETE` | `/cars/{id}` | Hapus mobil |

**Field Utama Armada Mobil**:
- `name` (string, wajib): Nama / tipe lengkap mobil.
- `brand` (string): Merk kendaraan (Toyota, Daihatsu, dll).
- `model` (string): Model kendaraan (Avanza, Xenia, dll).
- `type` (string): Jenis kendaraan (MPV, SUV, Sedan, dll).
- `year` (integer, wajib): Tahun pembuatan.
- `plate_number` (string, wajib, unique): Nomor polisi kendaraan.
- `color` (string): Warna mobil.
- `transmission` (string): `Manual` | `Automatic`.
- `fuel_type` (string): `Bensin` | `Diesel` | `Hybrid` | `Listrik`.
- `passenger_capacity` (integer): Kapasitas penumpang.
- `chassis_number` (string): Nomor rangka kendaraan.
- `engine_number` (string): Nomor mesin kendaraan.
- `initial_km` (integer): **KM Awal (Basis Servis)**. Titik acuan kilometer servis berkala.
- `last_km` (integer): **KM Terakhir (Odometer Aktual)**.
- `daily_price`, `weekly_price`, `monthly_price` (numeric): Tarif rental.
- `status` (string): `Ready` | `Not Ready` | `Belum Dicuci` | `Service`.
- `photo` (file gambar): Foto kendaraan.

> **💡 Otomatisasi Status Servis (+10.000 KM)**:
> Sistem secara otomatis memantau selisih kilometer. Ketika `last_km >= initial_km + 10.000 KM`, status kendaraan otomatis berubah menjadi **`Service`**.
> Field terhitung tambahan pada response API:
> - `next_service_km`: KM batas wajib servis (`initial_km + 10.000`).
> - `km_until_service`: Sisa KM sebelum jatuh tempo servis.
> - `is_service_due`: `true` jika mobil sudah menyentuh/melewati batas servis.

---

### 5.7 Tipe & Jenis Mobil (Car Types)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/car-types` | Daftar kategori & tipe mobil |
| `POST` | `/car-types` | Tambah tipe mobil (`name`, `type`, `category`, `description`) |
| `GET` | `/car-types/{id}` | Detail tipe mobil |
| `PUT` | `/car-types/{id}` | Update tipe mobil |
| `DELETE` | `/car-types/{id}` | Hapus tipe mobil |

---

### 5.8 Supir (Drivers)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/drivers` | Daftar supir (`?status=Active\|Inactive`, `?search=...`, `?page=1&per_page=10`) |
| `POST` | `/drivers` | Tambah data supir & otomatis membuat akun login user supir |
| `GET` | `/drivers/{id}` | Detail supir & informasi akun login terkait |
| `PUT` | `/drivers/{id}` | Update data supir & kredensial login |
| `DELETE` | `/drivers/{id}` | Hapus supir & akun login terkait |

#### Parameter Input Supir (`POST` / `PUT /drivers`):
- `name` (string, wajib): Nama lengkap supir.
- `phone` (string, opsional): Nomor HP / WhatsApp supir (bisa dipakai login).
- `sim` (string, opsional): Nomor Surat Izin Mengemudi (SIM).
- `address` (string, opsional): Alamat supir.
- `status` (string, wajib): `Active` | `Inactive`.
- `daily_rate` (numeric, wajib): Tarif premi supir per hari.
- `username` (string, opsional): Username untuk login driver (jika kosong, di-*generate* otomatis).
- `email` (email, opsional): Email login driver (jika kosong, di-*generate* otomatis).
- `password` (string, opsional): Password login driver (default: `password`).

#### Contoh Response Detail Supir (`GET /drivers/{id}`):
```json
{
  "success": true,
  "message": "Detail supir berhasil diambil.",
  "data": {
    "id": 1,
    "user_id": 12,
    "username": "driver_anto",
    "email": "anto@driver.rentcars.com",
    "name": "Anto Supir",
    "phone": "081234567890",
    "sim": "SIM-987654321",
    "address": "Jl. Raya Mataram No. 10",
    "status": "Active",
    "daily_rate": "150000.00",
    "created_at": "2026-09-15T15:00:00.000000Z"
  }
}
```

---

### 5.9 Pemesanan & Alur Kerja (Bookings)

#### 1. List & Filter Pemesanan (`GET /bookings`)
- **Query Parameters**:
  - `status`: `Pending` | `Confirmed` | `On Trip` | `Returned` | `Completed` | `Cancelled` | `all`
  - `marketing_id`: Filter booking berdasarkan Marketing penanggung jawab
  - `start_date` & `end_date`: Filter rentang tanggal
  - `date_field`: `booking_date` (default) | `return_date` | `active_period`
  - `search`: Pencarian nama customer, nomor booking, plat mobil, supir
  - `page` & `per_page`: Paginasi

#### 2. Ekspor Seluruh Data Booking (`GET /bookings/export`)
Mengambil seluruh data booking terfilter tanpa paginasi dalam format JSON.

#### 3. Membuat Pemesanan Baru (`POST /bookings`)
Mendukung 2 metode:
- **Pelanggan Lama**: Kirim `customer_id`.
- **Pelanggan Baru Sekaligus**: Kirim `new_customer_name`, `new_customer_phone`, `new_customer_nik`, dll.

**Contoh Body Request**:
```json
{
  "customer_id": 1,
  "car_type": "Toyota Innova Reborn",
  "rental_type": "Lepas Kunci", // "Lepas Kunci" atau "With Driver"
  "booking_date": "2026-09-20",
  "return_date": "2026-09-23",
  "pickup_time": "09:00",
  "return_time": "18:00",
  "pickup_location": "Bandara Lombok",
  "dropoff_location": "Hotel Senggigi",
  "delivery_fee": 50000, // Opsional: Biaya pengantaran unit
  "pickup_fee": 50000, // Opsional: Biaya pengambilan unit
  "payment_method": "Transfer", // "Cash", "Transfer", "DP"
  "payment_status": "Pending",
  "amount": 1800000
}
```

#### 4. Detail, Update, Hapus, & Pembatalan Booking
- `GET /bookings/{id}`: Detail data booking relasional lengkap.
- `PUT /bookings/{id}`: Update info booking / alokasi armada.
- `DELETE /bookings/{id}`: Hapus booking (*Super Admin only*).
- `POST /bookings/{id}/cancel`: Batalkan booking (`{"cancellation_reason": "Alasan pembatalan..."}`).

---

#### 5. Operasional Checklist & Serah Terima Lapangan

##### A. Ambil Data Checklist (`GET /bookings/{id}/checklist`)
Mengambil data checklist keberangkatan & kepulangan unit.

##### B. Checklist Serah Terima Unit ke Konsumen (`POST /bookings/{id}/delivery`)
*Dilakukan oleh Peluncur / Admin saat serah terima unit.*
- **Dampak Sistem**:
  - Status Booking berubah ke `On Trip`.
  - Status Mobil berubah ke `Not Ready`, odometer `last_km` mobil diperbarui.
  - Kontrak `Rental` otomatis dibuat dan aktif.
- **Body Request**:
  ```json
  {
    "checklist": {
      "body": "mulus, ada baret halus bemper depan kanan",
      "interior": "bersih dan wangi",
      "ban_serep": "ada",
      "toolkit": "lengkap"
    },
    "km_out": 45100,
    "fuel_out": 100, // persentase BBM (0 - 100)
    "fuel_range_km": 420,
    "handover_location": "Bandara Lombok",
    "latitude": "-8.7612",
    "longitude": "116.2764",
    "notes": "Diserahkan tepat waktu."
  }
  ```

##### C. Checklist Pengembalian Unit dari Konsumen (`POST /bookings/{id}/return`)
*Dilakukan saat pelanggan mengembalikan mobil.*
- **Dampak Sistem**:
  - Status Booking berubah ke `Returned`.
  - Status Mobil berubah ke `Belum Dicuci`.
  - Kontrak `Rental` dicatat waktu kembali dan status `Returned`.
- **Body Request**:
  ```json
  {
    "checklist": {
      "body": "tidak ada lecet baru",
      "interior": "kotor wajar"
    },
    "km_out": 45480,
    "fuel_out": 100,
    "latitude": "-8.7612",
    "longitude": "116.2764",
    "notes": "Pengembalian selesai."
  }
  ```

##### D. Konfirmasi Selesai Cuci (`POST /bookings/{id}/wash`)
*Dilakukan oleh Petugas Cuci / Admin setelah mobil dicuci dan siap disewakan kembali.*
- **Dampak Sistem**:
  - Status Booking berubah ke `Completed`.
  - Status Mobil berubah kembali ke `Ready`.

---

### 5.10 Log Perjalanan Supir (Driver Trip Logs)

Fungsi untuk mencatat, memantau, dan mengelola riwayat titik perhentian (*multi-stop destination*) supir selama melayani sewa mobil (Tempat 1, Tempat 2, Tempat 3, dst.).

#### 1. Ikhtisar Log Perjalanan Seluruh Supir (`GET /driver-trip-logs`)
- **Autentikasi**: Ya (Bearer Token)
- **Role**: Super Admin, Admin
- **Query Parameters**:
  - `driver_id` (integer, opsional): Filter berdasarkan ID supir
  - `status` (string, opsional): `Checked In` | `Checked Out`
  - `start_date` & `end_date` (date: `YYYY-MM-DD`, opsional): Filter rentang tanggal checkin
  - `search` (string, opsional): Cari nama lokasi, catatan, atau nama supir
  - `page` & `per_page` (integer, default: 15): Paginasi data
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar seluruh log perjalanan supir berhasil diambil.",
    "data": [
      {
        "id": 1,
        "booking_id": 13,
        "driver_id": 3,
        "driver_name": "Agus Prasetyo",
        "location_name": "Penjemputan Bandara Lombok",
        "stop_order": 1,
        "status": "Checked Out",
        "checkin_at": "2026-09-15T09:00:00.000000Z",
        "checkin_at_formatted": "15/09/2026 09:00",
        "checkin_latitude": -8.7582,
        "checkin_longitude": 116.2764,
        "checkin_notes": "Tiba di lobi kedatangan",
        "checkin_photo_url": "https://domain.com/storage/driver_logs/xxx.jpg",
        "checkin_map_url": "https://www.openstreetmap.org/?mlat=-8.7582&mlon=116.2764#map=16/-8.7582/116.2764",
        "checkout_at": "2026-09-15T10:15:00.000000Z",
        "checkout_at_formatted": "15/09/2026 10:15",
        "checkout_latitude": -8.7585,
        "checkout_longitude": 116.2769,
        "checkout_notes": "Tamu sudah naik mobil, menuju Hotel Senggigi",
        "checkout_photo_url": "https://domain.com/storage/driver_logs/yyy.jpg",
        "checkout_map_url": "https://www.openstreetmap.org/?mlat=-8.7585&mlon=116.2769#map=16/-8.7585/116.2769",
        "booking": {
          "id": 13,
          "booking_number": "BK-202609-0013",
          "customer_name": "Budi Santoso",
          "car_plate": "DR 1234 AB"
        }
      }
    ],
    "meta": {
      "current_page": 1,
      "last_page": 1,
      "per_page": 15,
      "total": 1
    }
  }
  ```

#### 2. Ambil Riwayat Log Perjalanan Spesifik Booking (`GET /bookings/{id}/trip-logs`)
- **Autentikasi**: Ya (Bearer Token)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Daftar log perjalanan berhasil diambil.",
    "data": [
      {
        "id": 1,
        "booking_id": 13,
        "driver_id": 3,
        "driver_name": "Agus Prasetyo",
        "location_name": "Penjemputan Bandara Lombok",
        "stop_order": 1,
        "status": "Checked Out",
        "checkin_at": "2026-09-15T09:00:00.000000Z",
        "checkin_at_formatted": "15/09/2026 09:00",
        "checkin_latitude": -8.7582,
        "checkin_longitude": 116.2764",
        "checkin_notes": "Tiba di lobi kedatangan",
        "checkin_photo_url": "https://domain.com/storage/driver_logs/xxx.jpg",
        "checkin_map_url": "https://www.openstreetmap.org/?mlat=-8.7582&mlon=116.2764#map=16/-8.7582/116.2764",
        "checkout_at": "2026-09-15T10:15:00.000000Z",
        "checkout_at_formatted": "15/09/2026 10:15",
        "checkout_latitude": -8.7585,
        "checkout_longitude": 116.2769,
        "checkout_notes": "Tamu sudah naik mobil, menuju Hotel Senggigi",
        "checkout_photo_url": "https://domain.com/storage/driver_logs/yyy.jpg",
        "checkout_map_url": "https://www.openstreetmap.org/?mlat=-8.7585&mlon=116.2769#map=16/-8.7585/116.2769"
      }
    ]
  }
  ```

#### 3. Driver Check-in Tiba di Lokasi Baru (`POST /bookings/{id}/trip-logs/checkin`)
- **Autentikasi**: Ya (Driver bersangkutan / Admin)
- **Content-Type**: `multipart/form-data` (jika upload foto) atau `application/json`
- **Body Request**:
  - `location_name` (string, wajib): Nama tempat/tujuan (misal: "Hotel Senggigi").
  - `checkin_notes` (string, opsional): Catatan keterangan saat tiba.
  - `checkin_latitude` (numeric, opsional): Latitude GPS.
  - `checkin_longitude` (numeric, opsional): Longitude GPS.
  - `checkin_photo` (file gambar, opsional): Foto bukti tiba di lokasi.
- **Dampak Sistem**:
  - Status Booking otomatis berubah ke `On Trip` jika sebelumnya masih `Confirmed`.
  - Dibuatkan record stop baru dengan urutan `stop_order` berikutnya berstatus `Checked In`.

#### 4. Driver Check-out Meninggalkan Lokasi (`POST /bookings/{id}/trip-logs/{logId}/checkout`)
- **Autentikasi**: Ya (Driver bersangkutan / Admin)
- **Body Request**:
  - `checkout_notes` (string, opsional): Catatan keterangan keberangkatan.
  - `checkout_latitude` (numeric, opsional): Latitude GPS saat meninggalkan tempat.
  - `checkout_longitude` (numeric, opsional): Longitude GPS saat meninggalkan tempat.
  - `checkout_photo` (file gambar, opsional): Foto bukti saat checkout.
- **Dampak Sistem**:
  - Status stop log berubah menjadi `Checked Out` dan mencatat `checkout_at = now()`. Supir siap melakukan check-in di destinasi berikutnya.

---

### 5.11 Alokasi Armada & Petugas (Allocations)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/allocations` | Daftar alokasi (`?status=allocated\|unallocated`, filter tanggal, search) |
| `GET` | `/allocations/export` | Ekspor alokasi armada format JSON |
| `PUT` | `/allocations/{booking_id}` | Menetapkan / menukar unit mobil, supir, peluncur, petugas cuci |
| `DELETE` | `/allocations/{booking_id}` | Hapus data alokasi / booking (*Super Admin only*) |

**Body Update Alokasi (`PUT /allocations/{booking_id}`)**:
```json
{
  "car_id": 4,
  "driver_id": 2, // opsional jika sewa with driver
  "peluncur_id": 3,
  "petugas_cuci_id": 5,
  "amount": 1800000
}
```

---

### 5.12 Kontrak Rental (Rentals)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/rentals` | Daftar kontrak rental aktif & riwayat |
| `POST` | `/rentals` | Pembuatan kontrak manual (*Super Admin only*) |
| `GET` | `/rentals/{id}` | Detail kontrak sewa |
| `PUT` | `/rentals/{id}` | Update data kontrak & status unit |
| `DELETE` | `/rentals/{id}` | Hapus kontrak sewa |

---

### 5.13 Pengembalian Unit (Returns)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/returns` | Daftar unit armada yang sedang berstatus `On Trip` |
| `POST` | `/returns` | Finalisasi penerimaan unit pengembalian |

**Body Finalisasi Pengembalian (`POST /returns`)**:
```json
{
  "booking_id": 10,
  "checkin_datetime": "2026-09-23 18:30:00",
  "km_in": 45500,
  "fuel_in": 100,
  "fine_amount": 0,
  "notes": "Unit kembali dalam kondisi bersih dan aman."
}
```

---

### 5.14 Pembayaran & Invoice (Payments)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/payments` | Daftar transaksi pembayaran dan faktur |
| `POST` | `/payments` | Catat pembayaran baru (otomatis generate nomor `INV-YYYYMMDD-XXXX`) |
| `GET` | `/payments/{id}` | Detail pembayaran |
| `POST` | `/payments/{id}` (`_method=PUT`) | Update data pembayaran |
| `DELETE` | `/payments/{id}` | Hapus data pembayaran |

**Form Fields Pembayaran (`POST /payments`)**:
- `booking_id` (integer, wajib): ID booking
- `payment_method`: `Cash` | `Transfer` | `DP`
- `dp_amount`: Nominal uang muka (DP)
- `settlement_amount`: Nominal pelunasan
- `total_amount`: Total bayar
- `status`: `Pending` | `DP Dibayar` | `Lunas`
- `transfer_proof` (file): Bukti transfer bank (jpg, png, pdf, maks 5MB)

---

### 5.15 Perawatan & Servis (Services)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/services` | Riwayat perawatan armada (`?car_id=...`) |
| `POST` | `/services` | Tambah catatan servis baru |
| `GET` | `/services/{id}` | Detail servis |
| `PUT` | `/services/{id}` | Update catatan servis |
| `DELETE` | `/services/{id}` | Hapus data servis |

**Body Catat Servis (`POST /services`)**:
```json
{
  "car_id": 4,
  "service_date": "2026-09-14",
  "workshop": "Auto2000 Lombok",
  "service_type": "Servis Berkala 40.000 KM & Ganti Oli",
  "km": 40200,
  "cost": 850000,
  "next_service_date": "2026-12-14",
  "notes": "Semua kampas rem dan filter udara diganti baru."
}
```

> **⚡ Siklus Servis Selesai**:
> Ketika record servis berhasil dibuat melalui `POST /services`:
> 1. Field `initial_km` mobil otomatis diperbarui menjadi `km` servis tersebut (contoh: 40.200 KM).
> 2. Field `last_km` diperbarui jika `km` servis lebih tinggi dari odometer sebelumnya.
> 3. Status mobil otomatis dikembalikan menjadi **`Ready`** dan siap disewakan kembali. Target servis berikutnya otomatis menjadi `40.200 + 10.000 = 50.200 KM`.


---

### 5.16 Asuransi Kendaraan (Insurances)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/insurances` | Daftar polis asuransi unit (`?car_id=...`) |
| `POST` | `/insurances` | Tambah data polis asuransi |
| `GET` | `/insurances/{id}` | Detail polis |
| `PUT` | `/insurances/{id}` | Update polis |
| `DELETE` | `/insurances/{id}` | Hapus polis |

---

### 5.17 Pajak Kendaraan & STNK (Vehicle Taxes)

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/vehicle-taxes` | Daftar STNK & masa berlaku pajak (`expiring_soon_count`) |
| `POST` | `/vehicle-taxes` | Catat perpanjangan STNK / Pajak |
| `GET` | `/vehicle-taxes/{id}` | Detail pajak kendaraan |
| `PUT` | `/vehicle-taxes/{id}` | Update catatan pajak |
| `DELETE` | `/vehicle-taxes/{id}` | Hapus catatan pajak |

---

### 5.18 Blacklist Konsumen

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/blacklists` | Daftar database blacklist konsumen |
| `POST` | `/blacklists` | Tambah nama ke daftar blacklist & upload bukti |
| `POST` | `/blacklists/import` | Bulk import data blacklist via JSON |
| `GET` | `/blacklists/{id}` | Detail kasus blacklist |
| `POST` | `/blacklists/{id}` (`_method=PUT`) | Update data blacklist |
| `DELETE` | `/blacklists/{id}` | Hapus data blacklist |

---

### 5.19 Laporan Bulanan (Reports)

#### 1. Rekapitulasi Pendapatan & Booking Bulanan
- **Method**: `GET`
- **Endpoint**: `/reports`
- **Autentikasi**: Ya (Bearer Token)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Laporan bulanan berhasil diambil.",
    "data": [
      {
        "month": "2026-09",
        "total_bookings": 32,
        "total_earnings": "58400000.00"
      },
      {
        "month": "2026-08",
        "total_bookings": 41,
        "total_earnings": "72600000.00"
      }
    ]
  }
  ```

---

### 5.20 Log Aktivitas Audit (Activity Logs)

Modul pencatatan audit log sistem untuk memantau perubahan data sensitif oleh pengguna/staf.

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/activity-logs` | Mengambil riwayat log audit aktivitas (`?search=...`, `?user_id=...`, `?action=...`, `?page=1&per_page=15`) |
| `DELETE` | `/activity-logs` | Membersihkan log audit lama (*Super Admin only*, `days`: integer default 30 hari) |

#### Contoh Response Log Aktivitas (`GET /activity-logs`):
```json
{
  "success": true,
  "message": "Daftar log aktivitas berhasil diambil.",
  "data": [
    {
      "id": 105,
      "user_id": 1,
      "user_name": "Super Admin",
      "action": "UPDATE_BOOKING",
      "description": "Mengubah biaya penjemputan booking BK-202610-0012",
      "ip_address": "127.0.0.1",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-10-23T14:20:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 1
  }
}
```

---

### 5.21 Notifikasi Sistem (Notifications)

Modul notifikasi in-app untuk pengguna (seperti pengingat STNK jatuh tempo, reminder servis armada, booking baru).

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/notifications` | Mengambil daftar notifikasi pengguna saat ini (`unread_count`, data paginasi) |
| `POST` | `/notifications/{id}/read` | Menandai 1 notifikasi spesifik sebagai terbaca |
| `POST` | `/notifications/mark-all-read` | Menandai seluruh notifikasi yang belum dibaca sebagai terbaca |
| `DELETE` | `/notifications/{id}` | Menghapus data notifikasi spesifik |

#### Contoh Response Notifikasi (`GET /notifications`):
```json
{
  "success": true,
  "message": "Daftar notifikasi berhasil diambil.",
  "data": {
    "unread_count": 2,
    "notifications": [
      {
        "id": "9d8e7f6a-1234-4567-89ab-cdef01234567",
        "type": "App\\Notifications\\ServiceDueNotification",
        "data": {
          "title": "Mobil Perlu Servis",
          "message": "Mobil Toyota Innova (DR 1234 AB) telah mencapai batas KM servis.",
          "url": "/cars/4"
        },
        "read_at": null,
        "created_at": "2026-10-23T10:00:00.000000Z"
      }
    ]
  }
}
```

---

### 5.22 WhatsApp Gateway Multi-Device Server (WA Server)

Modul manajemen gateway WhatsApp multi-device (Node.js Baileys/WPPConnect/API server) untuk pengiriman notifikasi otomatis invoice, surat jalan, dan update status.
> **Role Restriction**: Hanya dapat diakses oleh **Super Admin**.

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/wa-server` | Halaman info & status ringkasan koneksi server WA |
| `PUT` | `/wa-server/settings` | Simpan URL gateway & token secret (`server_url`, `secret_key`) |
| `GET` | `/wa-server/qr` | Mengambil QR Code pairing WhatsApp terbaru (`?device_id=...`) |
| `POST` | `/wa-server/pair-code` | Meminta kode pairing 8-digit nomor HP WhatsApp (`phone`, `device_id`) |
| `GET` | `/wa-server/status` | Mengecek status koneksi real-time perangkat (`connected`, `device_id`, dll) |
| `POST` | `/wa-server/reconnect` | Meminta gateway mencoba reconnect ulang (`device_id`) |
| `POST` | `/wa-server/logout` | Memutuskan sesi WhatsApp pada gateway (`device_id`) |
| `POST` | `/wa-server/devices` | Mendaftarkan device/nomor WhatsApp baru ke gateway |
| `DELETE` | `/wa-server/devices/{id}` | Menghapus device dari server gateway |
| `GET` | `/wa-server/groups` | Mengambil daftar grup WhatsApp yang diikuti nomor gateway |
| `POST` | `/wa-server/target-group` | Mengatur ID Grup target notifikasi sistem (`group_id`) |
| `POST` | `/wa-server/test-message` | Mengirim pesan uji coba ke nomor tujuan atau grup (`phone`, `message`, `is_group`) |

#### Contoh Body Update Pengaturan Gateway (`PUT /wa-server/settings`):
```json
{
  "server_url": "https://wa.rentcars.com",
  "secret_key": "secret-api-token-anda"
}
```

#### Contoh Body Kirim Pesan Uji Coba (`POST /wa-server/test-message`):
```json
{
  "phone": "081234567890",
  "message": "Halo! Pesan tes dari Rent Car System berhasil dikirim.",
  "is_group": false
}
```
**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Pesan berhasil dikirim ke 6281234567890."
}
```

---

## 6. Contoh Kode Integrasi

### 6.1 Menggunakan cURL

#### Login & Dapatkan Token
```bash
curl -X POST "https://rent.cdk-project.web.id/api/v1/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "superadmin@rentcars.com",
    "password": "password"
  }'
```

#### Ambil Data Booking Halaman 2
```bash
curl -X GET "https://rent.cdk-project.web.id/api/v1/bookings?page=2&per_page=15" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer 1|rent_G8OBiUwW6p8f7vGd..."
```

---

### 6.2 Menggunakan JavaScript / TypeScript (Fetch API / React)

```typescript
const BASE_URL = 'https://rent.cdk-project.web.id/api/v1';

// 1. Fungsi Login
async function loginUser(emailOrUsername, password) {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ login: emailOrUsername, password }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Login gagal.');
  }

  // Simpan token ke localStorage / SecureStore
  localStorage.setItem('token', result.data.token);
  return result.data.user;
}

// 2. Fungsi Mengambil Data Booking dengan Paginasi
async function fetchBookings(page = 1, perPage = 10, status = 'all') {
  const token = localStorage.getItem('token');

  const url = new URL(`${BASE_URL}/bookings`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('per_page', String(perPage));
  if (status !== 'all') {
    url.searchParams.set('status', status);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const result = await response.json();
  return {
    items: result.data,
    pagination: result.meta, // { current_page, last_page, per_page, total }
  };
}
```

---
*Rent Car System REST API v1.0.0 — Terakhir Diperbarui: September 2026*
