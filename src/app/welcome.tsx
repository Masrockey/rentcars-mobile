import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { AuthService } from '@/services/auth';
import {
  BookingItem,
  DashboardService,
  DashboardSummary,
} from '@/services/dashboard';
import { StorageService, UserProfile } from '@/services/storage';

export default function BerandaScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'beranda' | 'booking' | 'armada' | 'setelan'>('beranda');
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [storedUser, dashData, bookingsRes, pendingTotal] = await Promise.all([
          StorageService.getUser(),
          DashboardService.getDashboardData(),
          DashboardService.getRecentBookings(5),
          DashboardService.getPendingCount(),
        ]);

        if (active) {
          if (storedUser) setUser(storedUser);
          if (dashData) setSummary(dashData);
          if (bookingsRes?.items) setBookings(bookingsRes.items);
          setPendingCount(pendingTotal);
        }
      } catch (err: any) {
        console.warn('[BERANDA] Error loading real data:', err?.message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [storedUser, dashData, bookingsRes, pendingTotal] = await Promise.all([
        StorageService.getUser(),
        DashboardService.getDashboardData(),
        DashboardService.getRecentBookings(5),
        DashboardService.getPendingCount(),
      ]);
      if (storedUser) setUser(storedUser);
      if (dashData) setSummary(dashData);
      if (bookingsRes?.items) setBookings(bookingsRes.items);
      setPendingCount(pendingTotal);
    } catch (err: any) {
      console.warn('[BERANDA] Error refreshing real data:', err?.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    setShowProfileModal(false);
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari sistem?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
            } finally {
              router.replace('/');
            }
          },
        },
      ]
    );
  };

  const handleMenuClick = (menuName: string) => {
    if (menuName === 'Booking' || menuName === 'Halaman Booking' || menuName === 'Lihat Semua Booking') {
      router.push('/booking' as any);
      return;
    }
    if (menuName === 'Buat Booking Baru' || menuName === 'Baru') {
      router.push('/booking-create' as any);
      return;
    }
    if (menuName === 'Alokasi' || menuName === 'Alokasi Armada') {
      router.push('/allocation' as any);
      return;
    }
    if (menuName === 'Serah Unit' || menuName === 'Serah Terima') {
      router.push('/delivery' as any);
      return;
    }
    if (menuName === 'Kembali' || menuName === 'Unit Kembali' || menuName === 'Pengembalian') {
      router.push('/return' as any);
      return;
    }
    if (menuName === 'Lainnya' || menuName === 'Splash Screen' || menuName === 'Animasi') {
      router.push('/splash' as any);
      return;
    }
    Alert.alert('Menu Operasional', `Fitur ${menuName} sedang dibuka.`, [{ text: 'OK' }]);
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending')) {
      return { bg: BrandColors.secondaryFixed, text: BrandColors.onSecondaryContainer };
    }
    if (s.includes('confirmed')) {
      return { bg: BrandColors.primaryFixed, text: BrandColors.onPrimaryFixedVariant };
    }
    if (s.includes('trip') || s.includes('active')) {
      return { bg: '#d1fae5', text: '#065f46' };
    }
    if (s.includes('return')) {
      return { bg: BrandColors.tertiaryFixed, text: BrandColors.tertiary };
    }
    return { bg: BrandColors.surfaceContainerHigh, text: BrandColors.onSurfaceVariant };
  };

  const getCustomerInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const fullUserName = user?.name || 'Pengguna';

  const userRoles = (user?.roles || []).map((r) => String(r).toLowerCase().trim());
  const isSuperAdmin = Boolean(
    user?.is_super_admin ||
    userRoles.includes('super admin') ||
    userRoles.includes('superadmin')
  );
  const isAdmin = Boolean(
    isSuperAdmin ||
    user?.is_admin ||
    userRoles.includes('admin')
  );
  const isMarketing = Boolean(
    !isAdmin && (
      user?.is_marketing ||
      userRoles.includes('marketing')
    )
  );
  const isPeluncur = Boolean(
    !isAdmin && (
      user?.is_peluncur ||
      userRoles.includes('peluncur')
    )
  );
  const isDriver = Boolean(
    !isAdmin && (
      user?.is_driver ||
      userRoles.includes('driver') ||
      userRoles.includes('supir')
    )
  );
  const isPetugasCuci = Boolean(
    !isAdmin && (
      user?.is_petugas_cuci ||
      userRoles.includes('petugas cuci') ||
      userRoles.includes('petugascuci')
    )
  );

  interface MenuItem {
    id: string;
    title: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    circleBg?: string;
    iconColor?: string;
    onPress: () => void;
  }

  interface MenuGroup {
    title: string;
    items: MenuItem[];
  }

  const menuGroups: MenuGroup[] = (() => {
    // 1. ADMIN & SUPER ADMIN: Akses penuh (Semua 3 grup)
    if (isAdmin) {
      return [
        {
          title: 'Layanan Utama',
          items: [
            {
              id: 'booking',
              title: 'Booking',
              icon: 'calendar-month',
              circleBg: 'rgba(204,229,255,0.7)',
              iconColor: BrandColors.primary,
              onPress: () => handleMenuClick('Booking'),
            },
            {
              id: 'alokasi',
              title: 'Alokasi',
              icon: 'vpn-key',
              circleBg: 'rgba(255,221,184,0.6)',
              iconColor: BrandColors.secondary,
              onPress: () => handleMenuClick('Alokasi'),
            },
            {
              id: 'serah_unit',
              title: 'Serah Unit',
              icon: 'handshake',
              circleBg: 'rgba(219,225,255,0.7)',
              iconColor: BrandColors.tertiary,
              onPress: () => handleMenuClick('Serah Unit'),
            },
            {
              id: 'kembali',
              title: 'Kembali',
              icon: 'swap-horizontal-circle',
              circleBg: BrandColors.surfaceContainerHigh,
              iconColor: BrandColors.primary,
              onPress: () => handleMenuClick('Kembali'),
            },
          ],
        },
        {
          title: 'Manajemen & Finansial',
          items: [
            {
              id: 'data_mobil',
              title: 'Data Mobil',
              icon: 'directions-car',
              onPress: () => handleMenuClick('Data Mobil'),
            },
            {
              id: 'bayar',
              title: 'Bayar',
              icon: 'payments',
              onPress: () => handleMenuClick('Bayar'),
            },
            {
              id: 'servis',
              title: 'Servis',
              icon: 'car-repair',
              onPress: () => handleMenuClick('Servis'),
            },
            {
              id: 'sopir',
              title: 'Sopir',
              icon: 'badge',
              onPress: () => handleMenuClick('Sopir'),
            },
          ],
        },
        {
          title: 'Proteksi & Laporan',
          items: [
            {
              id: 'asuransi',
              title: 'Asuransi',
              icon: 'shield',
              onPress: () => handleMenuClick('Asuransi'),
            },
            {
              id: 'laporan',
              title: 'Laporan',
              icon: 'query-stats',
              onPress: () => handleMenuClick('Laporan'),
            },
            {
              id: 'tarif',
              title: 'Tarif',
              icon: 'style',
              onPress: () => handleMenuClick('Tarif'),
            },
            {
              id: 'lainnya',
              title: 'Lainnya',
              icon: 'grid-view',
              onPress: () => handleMenuClick('Lainnya'),
            },
          ],
        },
      ];
    }

    // 2. MARKETING: Hanya menu pemasaran, buat booking, cek tarif, dan konsumen
    if (isMarketing) {
      return [
        {
          title: 'Layanan Pemasaran',
          items: [
            {
              id: 'booking',
              title: 'Booking',
              icon: 'calendar-month',
              circleBg: 'rgba(204,229,255,0.7)',
              iconColor: BrandColors.primary,
              onPress: () => handleMenuClick('Booking'),
            },
            {
              id: 'buat_booking',
              title: 'Buat Baru',
              icon: 'add-circle-outline',
              circleBg: 'rgba(255,221,184,0.6)',
              iconColor: BrandColors.secondary,
              onPress: () => router.push('/booking-create' as any),
            },
            {
              id: 'tarif',
              title: 'Tarif Sewa',
              icon: 'style',
              circleBg: 'rgba(219,225,255,0.7)',
              iconColor: BrandColors.tertiary,
              onPress: () => handleMenuClick('Tarif Sewa'),
            },
            {
              id: 'pelanggan',
              title: 'Konsumen',
              icon: 'people',
              circleBg: BrandColors.surfaceContainerHigh,
              iconColor: BrandColors.primary,
              onPress: () => handleMenuClick('Data Konsumen'),
            },
          ],
        },
      ];
    }

    // 3. PELUNCUR: Serah terima & pengembalian unit
    if (isPeluncur) {
      return [
        {
          title: 'Tugas Operasional',
          items: [
            {
              id: 'booking',
              title: 'Tugas Saya',
              icon: 'calendar-month',
              circleBg: 'rgba(204,229,255,0.7)',
              iconColor: BrandColors.primary,
              onPress: () => handleMenuClick('Booking'),
            },
            {
              id: 'serah_unit',
              title: 'Serah Unit',
              icon: 'handshake',
              circleBg: 'rgba(219,225,255,0.7)',
              iconColor: BrandColors.tertiary,
              onPress: () => handleMenuClick('Serah Unit'),
            },
            {
              id: 'kembali',
              title: 'Kembali',
              icon: 'swap-horizontal-circle',
              circleBg: BrandColors.surfaceContainerHigh,
              iconColor: BrandColors.primary,
              onPress: () => handleMenuClick('Kembali'),
            },
            {
              id: 'data_mobil',
              title: 'Data Mobil',
              icon: 'directions-car',
              onPress: () => handleMenuClick('Data Mobil'),
            },
          ],
        },
      ];
    }

    // 4. DRIVER: Jadwal supir & log perjalanan
    if (isDriver) {
      return [
        {
          title: 'Tugas Supir',
          items: [
            {
              id: 'booking',
              title: 'Jadwal Trip',
              icon: 'calendar-month',
              circleBg: 'rgba(204,229,255,0.7)',
              iconColor: BrandColors.primary,
              onPress: () => handleMenuClick('Booking'),
            },
            {
              id: 'sopir',
              title: 'Log Trip',
              icon: 'badge',
              circleBg: 'rgba(255,221,184,0.6)',
              iconColor: BrandColors.secondary,
              onPress: () => handleMenuClick('Log Perjalanan'),
            },
          ],
        },
      ];
    }

    // 5. PETUGAS CUCI: Tugas pembersihan armada
    if (isPetugasCuci) {
      return [
        {
          title: 'Tugas Kebersihan',
          items: [
            {
              id: 'booking',
              title: 'Tugas Cuci',
              icon: 'calendar-month',
              circleBg: 'rgba(204,229,255,0.7)',
              iconColor: BrandColors.primary,
              onPress: () => handleMenuClick('Booking'),
            },
            {
              id: 'data_mobil',
              title: 'Data Mobil',
              icon: 'directions-car',
              onPress: () => handleMenuClick('Data Mobil'),
            },
          ],
        },
      ];
    }

    // Default Fallback
    return [
      {
        title: 'Layanan Utama',
        items: [
          {
            id: 'booking',
            title: 'Booking',
            icon: 'calendar-month',
            circleBg: 'rgba(204,229,255,0.7)',
            iconColor: BrandColors.primary,
            onPress: () => handleMenuClick('Booking'),
          },
          {
            id: 'tarif',
            title: 'Tarif',
            icon: 'style',
            circleBg: 'rgba(219,225,255,0.7)',
            iconColor: BrandColors.tertiary,
            onPress: () => handleMenuClick('Tarif'),
          },
        ],
      },
    ];
  })();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header (Sticky Top) */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.brandLogoBox}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.brandLogoImage}
              contentFit="contain"
            />
          </View>
          <View style={styles.brandTextGroup}>
            <View style={styles.brandTitleRow}>
              <Text style={styles.brandTitle}>PT. Cahaya Auto Nusantara</Text>
            </View>
            <Text style={styles.brandSubtitle}>Best Rent Car Partner</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notificationBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Notifikasi', 'Tidak ada notifikasi baru.')}>
            <MaterialIcons name="notifications-none" size={22} color={BrandColors.onSurfaceVariant} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileAvatarBtn}
            activeOpacity={0.8}
            onPress={() => setShowProfileModal(true)}>
            <MaterialIcons name="person" size={20} color={BrandColors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* 2. Hero Greeting Banner */}
        <LinearGradient
          colors={['#006194', '#007bb9', '#0051d5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}>

          {/* Subtle Watermark Icon */}
          <View pointerEvents="none" style={styles.watermarkContainer}>
            <MaterialIcons name="local-taxi" size={120} color="rgba(255,255,255,0.07)" />
          </View>

          {/* Greeting Text */}
          <View style={styles.heroTextSection}>
            <Text style={styles.heroGreeting}>Halo, {fullUserName}</Text>
            <Text style={styles.heroSubtitle}>Semoga hari ini berjalan lancar.</Text>
          </View>

          {/* Bottom Chips */}
          <View style={styles.heroChipsRow}>
            <View style={styles.glassChip}>
              <MaterialIcons name="wb-sunny" size={13} color="#ffffff" />
              <Text style={styles.glassChipText}>Operasional Live</Text>
            </View>

            <View style={styles.urgentChip}>
              <MaterialIcons name="notification-important" size={13} color="#ffffff" />
              <Text style={styles.urgentChipText}>
                {isAdmin
                  ? `${pendingCount || (summary ? summary.cars_not_ready : 0)} Unit Butuh Alokasi`
                  : isMarketing
                    ? `${pendingCount || 0} Booking Baru`
                    : isPeluncur
                      ? `${pendingCount || 0} Tugas Serah/Kembali`
                      : `${pendingCount || 0} Tugas Aktif`}
              </Text>
            </View>

            <View style={styles.glassChip}>
              <MaterialIcons name="trending-up" size={13} color="#ffffff" />
              <Text style={styles.glassChipText}>
                {summary?.utilization_rate || '0%'} Utilisasi
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 4. Menu Operasional */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.titleBar, { backgroundColor: BrandColors.primary }]} />
              <Text style={styles.sectionTitle}>Menu Operasional</Text>
            </View>
          </View>

          <View style={styles.menuContainerCard}>
            {menuGroups.map((group, groupIdx) => (
              <View
                key={group.title}
                style={groupIdx === 0 ? styles.menuGroup : styles.menuGroupBordered}>
                <Text style={styles.menuGroupTitle}>{group.title}</Text>
                <View style={styles.menuGrid}>
                  {group.items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.menuItem}
                      onPress={item.onPress}
                      activeOpacity={0.7}>
                      <View
                        style={
                          item.circleBg
                            ? [styles.menuIconCircle, { backgroundColor: item.circleBg }]
                            : styles.menuIconCircleNeutral
                        }>
                        <MaterialIcons
                          name={item.icon}
                          size={22}
                          color={item.iconColor || BrandColors.onSurfaceVariant}
                        />
                      </View>
                      <Text style={styles.menuItemText} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 5. Booking Terbaru (Real Data from Laravel API) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.titleBar, { backgroundColor: BrandColors.secondaryContainer }]} />
              <Text style={styles.sectionTitle}>Booking Terbaru</Text>
            </View>
            <TouchableOpacity
              style={styles.seeAllRow}
              onPress={() => handleMenuClick('Lihat Semua Booking')}>
              <Text style={styles.sectionActionText}>Lihat Semua</Text>
              <MaterialIcons name="chevron-right" size={16} color={BrandColors.primary} />
            </TouchableOpacity>
          </View>

          {/* Render real bookings if available */}
          {bookings.length > 0 ? (
            bookings.map((item) => {
              const custName = item.customer?.name || item.customer_name || 'Pelanggan';
              const code = item.booking_code || item.booking_number || item.code || `#BK-${item.id}`;
              const carTitle = item.car?.name || (item.car?.brand ? `${item.car.brand} ${item.car.model}` : item.car_type) || 'Unit Armada';
              const plate = item.car?.plate_number || item.plate_number || 'Belum Ditentukan';
              const statusColors = getStatusColor(item.status);

              return (
                <View key={item.id} style={styles.bookingCard}>
                  <View style={styles.bookingCardHeader}>
                    <View style={styles.customerRow}>
                      <View style={[styles.avatarCircle, { backgroundColor: BrandColors.primaryFixed }]}>
                        <Text style={[styles.avatarText, { color: BrandColors.primary }]}>
                          {getCustomerInitials(custName)}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.customerName}>{custName}</Text>
                        <Text style={styles.bookingCode}>{code}</Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadgePill, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.statusBadgePillText, { color: statusColors.text }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bookingDivider} />

                  <View style={styles.bookingDetailsRow}>
                    <View style={styles.bookingDetailCol}>
                      <Text style={styles.bookingDetailLabel}>Unit Kendaraan</Text>
                      <Text style={styles.bookingDetailCar}>{carTitle}</Text>
                      <View style={styles.plateTag}>
                        <Text style={styles.plateText}>{plate}</Text>
                      </View>
                    </View>

                    <View style={styles.bookingDetailCol}>
                      <Text style={styles.bookingDetailLabel}>Periode Rental</Text>
                      <View style={styles.periodRow}>
                        <MaterialIcons name="schedule" size={13} color={BrandColors.primary} />
                        <Text style={styles.periodText}>{item.booking_date} — {item.return_date}</Text>
                      </View>
                      <Text style={styles.timeText}>
                        {item.pickup_time ? `${item.pickup_time} sd ${item.return_time || '-'}` : (item.rental_type || 'Lepas Kunci')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bookingActionsRow}>
                    <TouchableOpacity
                      style={styles.primaryActionButton}
                      onPress={() => router.push({ pathname: '/booking-detail' as any, params: { id: String(item.id) } })}
                      activeOpacity={0.85}>
                      <Text style={styles.primaryActionText}>
                        {item.status.toLowerCase().includes('pending')
                          ? 'Alokasikan Unit'
                          : item.status.toLowerCase().includes('confirmed')
                            ? 'Serah Terima'
                            : 'Kelola'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryActionButton}
                      onPress={() => router.push({ pathname: '/booking-detail' as any, params: { id: String(item.id) } })}
                      activeOpacity={0.75}>
                      <Text style={styles.secondaryActionText}>Detail</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyBookingsCard}>
              <MaterialIcons name="receipt-long" size={36} color={BrandColors.outline} />
              <Text style={styles.emptyBookingsText}>Belum ada data pemesanan terbaru.</Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => handleMenuClick('Buat Booking Baru')}>
                <Text style={styles.emptyCreateBtnText}>+ Buat Booking Baru</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 6. Jadwal Servis Berkala Notice (Real data from Laravel) */}
        <View style={styles.serviceNoticeCard}>
          <View style={styles.serviceNoticeLeft}>
            <View style={styles.serviceIconWrap}>
              <MaterialIcons name="build-circle" size={20} color={BrandColors.primary} />
            </View>
            <View>
              <Text style={styles.serviceTitle}>Jadwal Servis Berkala</Text>
              <Text style={styles.serviceSubtitle}>
                {summary ? (summary.service_due ?? 0) : 0} unit armada jatuh tempo servis
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.serviceArrowBtn}
            onPress={() => handleMenuClick('Jadwal Servis')}
            activeOpacity={0.75}>
            <MaterialIcons name="arrow-forward" size={18} color={BrandColors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Space at the bottom for floating navigation bar */}
        <View style={{ height: 95 }} />
      </ScrollView>

      {/* 7. Floating Bottom Navigation Bar */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNavCard}>
          {/* Tab 1: Beranda */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => setActiveTab('beranda')}
            activeOpacity={0.7}>
            <MaterialIcons
              name="dashboard"
              size={22}
              color={activeTab === 'beranda' ? BrandColors.primary : BrandColors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.navTabLabel,
                activeTab === 'beranda' && styles.navTabLabelActive,
              ]}>
              Beranda
            </Text>
          </TouchableOpacity>

          {/* Tab 2: Booking */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveTab('booking');
              handleMenuClick('Halaman Booking');
            }}
            activeOpacity={0.7}>
            <MaterialIcons
              name="receipt-long"
              size={22}
              color={activeTab === 'booking' ? BrandColors.primary : BrandColors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.navTabLabel,
                activeTab === 'booking' && styles.navTabLabelActive,
              ]}>
              Booking
            </Text>
          </TouchableOpacity>

          {/* Center Elevated FAB */}
          <View style={styles.centerFabWrapper}>
            <TouchableOpacity
              style={styles.centerFabButton}
              activeOpacity={0.85}
              onPress={() => handleMenuClick('Buat Booking Baru')}>
              <Ionicons name="add" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.centerFabLabel}>Baru</Text>
          </View>

          {/* Tab 3: Armada */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveTab('armada');
              handleMenuClick('Halaman Armada');
            }}
            activeOpacity={0.7}>
            <MaterialIcons
              name="commute"
              size={22}
              color={activeTab === 'armada' ? BrandColors.primary : BrandColors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.navTabLabel,
                activeTab === 'armada' && styles.navTabLabelActive,
              ]}>
              Armada
            </Text>
          </TouchableOpacity>

          {/* Tab 4: Setelan */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveTab('setelan');
              setShowProfileModal(true);
            }}
            activeOpacity={0.7}>
            <MaterialIcons
              name="tune"
              size={22}
              color={activeTab === 'setelan' ? BrandColors.primary : BrandColors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.navTabLabel,
                activeTab === 'setelan' && styles.navTabLabelActive,
              ]}>
              Setelan
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile & Logout Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileModal(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowProfileModal(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalAvatar}>
                <MaterialIcons name="person" size={32} color={BrandColors.primary} />
              </View>
              <Text style={styles.modalName}>{user?.name || 'Administrator'}</Text>
              <Text style={styles.modalEmail}>{user?.email || 'admin@cahayaauto.co.id'}</Text>
              {user?.roles && user.roles.length > 0 && (
                <View style={styles.modalRolePill}>
                  <Text style={styles.modalRoleText}>{user.roles.join(', ')}</Text>
                </View>
              )}
            </View>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={styles.modalLogoutBtn}
              onPress={handleLogout}
              activeOpacity={0.85}>
              <MaterialIcons name="logout" size={20} color={BrandColors.error} />
              <Text style={styles.modalLogoutText}>Keluar dari Akun</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowProfileModal(false)}>
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },

  /* 1. Header */
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(250, 248, 255, 0.95)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    zIndex: 10,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoImage: {
    width: 24,
    height: 24,
  },
  brandTextGroup: {
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.onSurface,
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    fontWeight: '500',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.error,
    borderWidth: 1.5,
    borderColor: BrandColors.surface,
  },
  profileAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll Content */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },

  /* 2. Hero Greeting Banner */
  heroBanner: {
    borderRadius: 22,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 14,
  },
  watermarkContainer: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  glassPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  glassPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  glassPillTextSmall: {
    fontSize: 10,
    fontWeight: '500',
    color: '#ffffff',
  },
  heroTextSection: {
    marginVertical: 4,
  },
  heroGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  heroChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  glassChipText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  urgentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BrandColors.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  urgentChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* 3. Metrics Grid */
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 90,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: BrandColors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginTop: 2,
  },
  metricValueBold: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.onSurface,
  },
  metricValueTotal: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
  },
  metricValueBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.secondary,
  },
  metricValueSub: {
    fontSize: 10,
    color: BrandColors.onSurfaceVariant,
  },

  /* 4. Section Commons */
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  /* Menu Container Card */
  menuContainerCard: {
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 14,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuGroup: {
    marginBottom: 4,
  },
  menuGroupBordered: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BrandColors.surfaceContainerLow,
    marginBottom: 4,
  },
  menuGroupTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'rgba(63, 72, 80, 0.7)',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  menuItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconCircleNeutral: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 11,
    fontWeight: '500',
    color: BrandColors.onSurface,
    marginTop: 6,
    textAlign: 'center',
  },

  /* 5. Booking Terbaru Cards */
  bookingCard: {
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  bookingCode: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 1,
  },
  statusBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusBadgePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bookingDivider: {
    height: 1,
    backgroundColor: BrandColors.surfaceContainerLow,
    marginVertical: 12,
  },
  bookingDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  bookingDetailCol: {
    flex: 1,
  },
  bookingDetailLabel: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
  },
  bookingDetailCar: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.onSurface,
    marginTop: 2,
  },
  plateTag: {
    backgroundColor: BrandColors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  plateText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '500',
    color: BrandColors.onSurface,
  },
  timeText: {
    fontSize: 10,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },
  bookingActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: BrandColors.primary,
    paddingVertical: 9,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: BrandColors.surfaceContainerHigh,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurface,
  },

  /* Empty Bookings State */
  emptyBookingsCard: {
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyBookingsText: {
    fontSize: 13,
    color: BrandColors.onSurfaceVariant,
    textAlign: 'center',
  },
  emptyCreateBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: BrandColors.primaryFixed,
  },
  emptyCreateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  /* 6. Service Notice */
  serviceNoticeCard: {
    backgroundColor: BrandColors.surfaceContainer,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  serviceNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  serviceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BrandColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  serviceSubtitle: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 1,
  },
  serviceArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* 7. Floating Bottom Navigation Bar */
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  bottomNavCard: {
    maxWidth: 460,
    width: '100%',
    height: 62,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  navTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTabLabel: {
    fontSize: 10,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
    fontWeight: '500',
  },
  navTabLabelActive: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  centerFabWrapper: {
    alignItems: 'center',
    marginHorizontal: 4,
    position: 'relative',
    top: -12,
  },
  centerFabButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  centerFabLabel: {
    fontSize: 10,
    color: BrandColors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: '500',
  },

  /* Profile Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
  },
  modalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: BrandColors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalName: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  modalEmail: {
    fontSize: 12,
    color: BrandColors.outline,
    marginTop: 2,
  },
  modalRolePill: {
    backgroundColor: BrandColors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    marginTop: 8,
  },
  modalRoleText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.onPrimaryFixedVariant,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: BrandColors.surfaceContainerLow,
    marginVertical: 18,
  },
  modalLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BrandColors.errorContainer,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 9999,
    justifyContent: 'center',
  },
  modalLogoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.error,
  },
  modalCloseBtn: {
    marginTop: 12,
    paddingVertical: 6,
  },
  modalCloseText: {
    fontSize: 13,
    color: BrandColors.outline,
    fontWeight: '600',
  },
});
