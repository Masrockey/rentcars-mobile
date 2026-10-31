# Rentcars Mobile 🚗📱

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Expo](https://img.shields.io/badge/Expo-SDK%2058-000020.svg?style=flat&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB.svg?style=flat&logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/citradinamika/rentcars-mobile/pulls)

**Rentcars Mobile** adalah aplikasi mobile *open source* untuk manajemen operasional rental mobil dan pengelolaan armada kendaraan (*fleet management*). Dibangun menggunakan **React Native** dan **Expo SDK 58** dengan arsitektur navigasi modern berbasis **Expo Router**, aplikasi ini menyediakan solusi end-to-end mulai dari pencatatan reservasi pelanggan hingga serah terima dan pengembalian unit kendaraan.

---

## 🌟 Fitur Utama

- **🔐 Autentikasi & Kontrol Akses Berbasis Peran**
  - Manajemen sesi akun yang aman menggunakan AsyncStorage dan API token.
  - Dukungan otorisasi peran (Superadmin, Admin, Driver, dll.).
  - Dialog interaktif reset kata sandi dan antarmuka login glassmorphic.

- **📊 Dashboard Operasional Interaktif**
  - Ringkasan KPI armada (total unit, unit tersedia, sedang disewa, masa perawatan).
  - Monitoring jadwal keberangkatan (*delivery*) dan jadwal pengembalian (*return*) harian.
  - Akses cepat menu operasional dan profil pengguna.

- **📅 Manajemen Booking & Reservasi**
  - Pembuatan data booking baru dengan *multi-step wizard* yang intuitif.
  - Perhitungan otomatis durasi sewa, tarif harian/bulanan, dan total tagihan.
  - Integrasi pesan WhatsApp sekali klik untuk konfirmasi instan ke pelanggan.

- **🚘 Alokasi Armada & Pengemudi**
  - Penetapan unit mobil sesuai ketersediaan jadwal dan tipe yang dipesan.
  - Penugasan pengemudi (*driver*) dengan validasi status penugasan.

- **📋 Serah Terima Unit (Delivery / Handover)**
  - Checklist inspeksi kondisi fisik kendaraan sebelum diserahkan ke pelanggan.
  - Pencatatan posisi level bahan bakar (BBM) dan angka odometer (KM).
  - Unggah foto bukti kondisi fisik unit dan tanda tangan serah terima.

- **🔄 Pengembalian Unit (Return)**
  - Audit komparatif kondisi kendaraan pasca pemakaian.
  - Penghitungan denda otomatis (keterlambatan pengembalian, kekurangan BBM, atau kerusakan bodi).
  - Konfirmasi penyelesaian transaksi sewa secara tuntas.

- **🎨 Modern Glassmorphic UI & Visual Experience**
  - Desain bertema otomotif kontemporer dengan palet warna terstandarisasi.
  - *Animated splash screen* halus dan indikator loading ambient glow.
  - Komponen pop-up alert modern (`ModernAlertModal`) yang menggantikan dialog bawaan OS.

---

## 🏗️ Struktur Proyek

```plaintext
rentcars-mob/
├── assets/                  # Aset gambar, logo aplikasi, dan favicon
├── src/
│   ├── app/                 # Layar & rute aplikasi (Expo Router)
│   │   ├── _layout.tsx      # Root layout, provider alert, & splash screen
│   │   ├── index.tsx        # Layar login & autentikasi
│   │   ├── welcome.tsx      # Dashboard beranda operasional
│   │   ├── booking.tsx      # Daftar data reservasi sewa
│   │   ├── booking-create.tsx # Formulir pembuatan reservasi baru
│   │   ├── booking-detail.tsx # Detail reservasi & kontak WhatsApp
│   │   ├── allocation.tsx   # Alokasi unit armada & driver
│   │   ├── delivery.tsx     # Inspeksi & serah terima unit (Delivery)
│   │   ├── return.tsx       # Inspeksi & pengembalian unit (Return)
│   │   └── splash.tsx       # Showcase demo splash, loader, & alert modal
│   ├── components/          # Komponen UI modular (Modal, Loading, Splash)
│   ├── config/              # Konfigurasi environment & runtime API
│   ├── constants/           # Token desain (BrandColors) & data konstanta
│   └── services/            # Layer integrasi API backend (Auth, Fleet, Booking)
├── app.json                 # Konfigurasi Expo Application Manifest
├── package.json             # Dependensi proyek & npm scripts
├── tsconfig.json            # Konfigurasi TypeScript
└── LICENSE                  # Lisensi Open Source MIT
```

---

## 🚀 Memulai (Getting Started)

### Prasyarat

Pastikan Anda telah menginstal perangkat lunak berikut di komputer Anda:
- [Node.js](https://nodejs.org/) (versi LTS yang direkomendasikan, v18 atau v20+)
- [Git](https://git-scm.com/)
- Perangkat fisik dengan aplikasi **Expo Go** (tersedia di Google Play Store & iOS App Store) ATAU emulator Android Studio / iOS Simulator.

### 1. Kloning Repositori

```bash
git clone https://github.com/Masrockey/rentcars-mobile
cd rentcars-mobile
```

### 2. Instalasi Dependensi

```bash
npm install
```

### 3. Konfigurasi Environment Variables

Salin berkas template environment atau sesuaikan file `.env` di root direktori proyek:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.your-rental-domain.com/api
```

### 4. Menjalankan Aplikasi

Jalankan server pengembangan Metro Bundler:

```bash
npx expo start
```

Setelah server berjalan, Anda dapat:
- Pindai **QR Code** menggunakan kamera HP (iOS) atau aplikasi **Expo Go** (Android).
- Tekan `a` untuk membuka di Emulator Android.
- Tekan `i` untuk membuka di iOS Simulator.
- Tekan `w` untuk membuka versi Web browser.

---

## 🛠️ Perintah Pengembangan (Scripts)

| Perintah | Deskripsi |
| :--- | :--- |
| `npx expo start` | Menjalankan server pengembangan Metro bundler |
| `npx tsc --noEmit` | Menjalankan pemeriksaan validasi tipe TypeScript (*typecheck*) |
| `npx expo lint` | Memeriksa kualitas kode menggunakan ESLint |
| `npx expo run:android` | Menjalankan build lokal pada perangkat/emulator Android |
| `npx expo run:ios` | Menjalankan build lokal pada simulator iOS (khusus macOS) |

---

## 🤝 Berkontribusi (Contributing)

Sebagai proyek **open-source**, kami sangat terbuka terhadap kontribusi komunitas! Anda dapat berkontribusi dengan:
1. **Fork** repositori ini.
2. Buat branch fitur baru (`git checkout -b feature/FiturKeren`).
3. Lakukan commit perubahan Anda (`git commit -m 'feat: tambahkan fitur keren'`).
4. Pastikan typecheck dan linter lolos (`npx tsc --noEmit && npx expo lint`).
5. **Push** branch Anda (`git push origin feature/FiturKeren`).
6. Buka sebuah **Pull Request (PR)**.

Untuk pelaporan bug atau usulan fitur baru, silakan gunakan menu [GitHub Issues](https://github.com/citradinamika/rentcars-mobile/issues).

---

## 📄 Lisensi (License)

Proyek ini didistribusikan di bawah lisensi terbuka **MIT License**.

Anda bebas menggunakan, memodifikasi, mendistribusikan, dan memanfaatkan kode sumber aplikasi ini untuk keperluan komersial maupun non-komersial sesuai ketentuan lisensi. Lihat berkas [LICENSE](LICENSE) untuk informasi teks lengkap lisensi.
