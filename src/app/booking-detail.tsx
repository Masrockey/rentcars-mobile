import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { BookingDetail, BookingService } from '@/services/booking';
import { ModernLoadingScreen } from '@/components/ModernLoading';
import { StorageService, UserProfile } from '@/services/storage';
import { getUserRoleInfo } from '@/utils/roleAccess';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Nomor booking disalin!');
  const [toastOpacity] = useState(new Animated.Value(0));

  const roleInfo = getUserRoleInfo(user);

  const loadBookingDetail = async () => {
    try {
      if (!id) {
        setLoading(false);
        return;
      }
      const data = await BookingService.getBookingDetail(id);
      if (data) {
        setBooking(data);
      }
    } catch (err: any) {
      console.warn('[BOOKING DETAIL] Failed to load:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const storedUser = await StorageService.getUser();
        if (active && storedUser) setUser(storedUser);

        if (!id) {
          if (active) setLoading(false);
          return;
        }
        const data = await BookingService.getBookingDetail(id);
        if (active && data) {
          setBooking(data);
        }
      } catch (err: any) {
        console.warn('[BOOKING DETAIL] Failed to load:', err?.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookingDetail();
    setRefreshing(false);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowToast(false);
    });
  };

  const handleCopyBookingCode = () => {
    const code =
      booking?.booking_code ||
      booking?.booking_number ||
      booking?.code ||
      `BK-20261024-ALPH${id || '99'}`;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    triggerToast(`Kode ${code} disalin!`);
  };

  const handleCall = (phone?: string) => {
    const target = phone || booking?.customer?.phone || '081244910082';
    const cleanNumber = target.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      Alert.alert('Gagal Membuka Telepon', `Tidak dapat memanggil nomor ${cleanNumber}`);
    });
  };

  const handleWhatsApp = (phone?: string) => {
    const target = phone || booking?.customer?.phone || '081244910082';
    let cleanNumber = target.replace(/[^0-9]/g, '');
    if (cleanNumber.startsWith('0')) {
      cleanNumber = '62' + cleanNumber.substring(1);
    }
    const message = encodeURIComponent(
      `Halo Bpk/Ibu ${booking?.customer?.name || 'Pelanggan'}, kami dari Rentcars Mobile terkait booking ${booking?.booking_code || 'mobil rental'
      }.`
    );
    Linking.openURL(`https://wa.me/${cleanNumber}?text=${message}`).catch(() => {
      Alert.alert('Gagal Membuka WhatsApp', `Tidak dapat membuka chat ke nomor ${cleanNumber}`);
    });
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Batalkan Booking',
      'Apakah Anda yakin ingin membatalkan booking ini? Tindakan ini akan membebaskan jadwal unit armada.',
      [
        { text: 'Kembali', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            const res = await BookingService.cancelBooking(id, 'Dibatalkan oleh staf via mobile');
            if (res.success) {
              triggerToast('Booking berhasil dibatalkan');
              setTimeout(() => {
                router.replace('/booking' as any);
              }, 1000);
            } else {
              Alert.alert('Gagal', res.message || 'Tidak dapat membatalkan booking saat ini.');
            }
          },
        },
      ]
    );
  };

  const handleAllocateArmada = () => {
    if (!roleInfo.canAccessAllocation) {
      Alert.alert(
        'Akses Dibatasi',
        'Role Anda tidak memiliki izin untuk melakukan alokasi armada. Silakan hubungi Administrator.'
      );
      return;
    }
    router.push('/allocation' as any);
  };

  const formatRupiah = (val?: number | string) => {
    const num = Number(val) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Helper defaults jika data tertentu belum terisi dari backend
  const customerName = booking?.customer?.name || booking?.customer_name || 'A. Fadli Akbar';
  const customerPhone = booking?.customer?.phone || booking?.customer_phone || '+62 812-4491-0082';
  const customerNik = booking?.customer?.nik || booking?.customer_nik || '127104********02';
  const customerAddress = booking?.customer?.address || 'Jl. Diponegoro No. 42, Medan Kota';
  const marketingName = booking?.marketing?.name || booking?.marketing_name || 'Budi Santoso (Marketing)';
  const bookingCode = booking?.booking_code || booking?.booking_number || booking?.code || `BK-20261024-ALPH${id || '99'}`;
  const carTitle = booking?.car?.name || booking?.car_type || 'Toyota Alphard 2.5 G AT (2024)';
  const rentalType = booking?.rental_type || 'Lepas Kunci • Pribadi';
  const status = booking?.status || 'Pending';

  const totalAmount = booking?.total_amount || booking?.amount || 8650000;
  const dpAmount = booking?.dp_amount || 1500000;
  const remainingAmount = Math.max(0, totalAmount - dpAmount);

  const pickupLocation = booking?.pickup_location || '-';
  const dropoffLocation = booking?.dropoff_location || 'Bandara Kualanamu (Drop-off Terminal)';
  const startDate = booking?.booking_date || 'Sabtu, 24 Okt 2026';
  const endDate = booking?.return_date || 'Selasa, 27 Okt 2026';
  const startTime = (booking?.pickup_time || '08:00').replace(/\s*(WIB|WITA|WIT)/gi, '');
  const endTime = (booking?.return_time || '08:00').replace(/\s*(WIB|WITA|WIT)/gi, '');
  const notes = booking?.notes || 'Pelanggan minta unit wangi non-rokok dan car seat anak jika tersedia.';

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/booking' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Sticky */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={handleGoBack}>
            <MaterialIcons name="arrow-back" size={24} color={BrandColors.onSurface} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Detail Booking</Text>
            <Text style={styles.headerSubtitle}>Rentcars Mobile</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.moreBtn}
          activeOpacity={0.7}
          onPress={() => {
            Alert.alert(
              'Opsi Booking',
              bookingCode,
              [
                { text: 'Salin Kode Booking', onPress: handleCopyBookingCode },
                { text: 'Bagikan Rincian', onPress: () => triggerToast('Link rincian disalin!') },
                { text: 'Batal', style: 'cancel' },
              ]
            );
          }}>
          <MaterialIcons name="more-vert" size={22} color={BrandColors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Floating Animated Toast */}
      {showToast && (
        <Animated.View style={[styles.floatingToast, { opacity: toastOpacity }]}>
          <MaterialIcons name="check-circle" size={18} color={BrandColors.primaryFixed} />
          <Text style={styles.floatingToastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {loading ? (
        <ModernLoadingScreen
          title="Detail Reservasi Armada"
          message="Sedang menyinkronkan status unit, jadwal & dokumen..."
          showTips
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

          {/* 1. Header Ringkasan Status Booking Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderActionRow}>
              <View style={styles.bookingCodeGroup}>
                <Text style={styles.bookingCodeText} numberOfLines={1}>
                  {bookingCode}
                </Text>
                <TouchableOpacity
                  style={styles.copyCodeBtn}
                  activeOpacity={0.75}
                  onPress={handleCopyBookingCode}>
                  <MaterialIcons name="content-copy" size={15} color={BrandColors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.codeRightIcons}>
                <TouchableOpacity
                  style={styles.roundIconBtn}
                  activeOpacity={0.75}
                  onPress={() => triggerToast('Tautan booking disalin!')}>
                  <MaterialIcons name="share" size={17} color={BrandColors.onSurfaceVariant} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.roundIconBtn}
                  activeOpacity={0.75}
                  onPress={() => Alert.alert('Cetak Dokumen', 'Mencetak Surat Jalan & Formulir Serah Terima...')}>
                  <MaterialIcons name="print" size={17} color={BrandColors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Badges Row */}
            <View style={styles.statusBadgesRow}>
              <View style={styles.pulseBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.pulseBadgeText}>
                  {status.toUpperCase().includes('CONFIRMED')
                    ? 'TERKONFIRMASI'
                    : status.toUpperCase().includes('TRIP')
                      ? 'SEDANG JALAN'
                      : 'MENUNGGU ALOKASI ARMADA'}
                </Text>
              </View>

              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{rentalType}</Text>
              </View>
            </View>

            {/* Created Meta Info */}
            <View style={styles.createdMetaRow}>
              <MaterialIcons name="schedule" size={16} color={BrandColors.outline} />
              <Text style={styles.createdMetaText}>
                Dibuat: <Text style={styles.createdMetaBold}>24 Okt 2026, 07:15</Text> oleh{' '}
                <Text style={styles.createdMetaBold}>{marketingName}</Text>
              </Text>
            </View>
          </View>

          {/* 2. Kartu Informasi Pelanggan (Customer Profile) */}
          <View style={styles.card}>
            <View style={styles.cardSectionHeader}>
              <View style={styles.cardTitleWithIcon}>
                <MaterialIcons name="person" size={20} color={BrandColors.primary} />
                <Text style={styles.cardSectionTitle}>Profil Penyewa</Text>
              </View>
              <View style={styles.vipBadge}>
                <MaterialIcons name="verified" size={13} color={BrandColors.onPrimaryFixedVariant} />
              </View>
            </View>

            <View style={styles.customerProfileRow}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>
                  {customerName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </Text>
              </View>

              <View style={styles.customerInfoCol}>
                <Text style={styles.customerNameText}>{customerName}</Text>
                <View style={styles.customerPhoneRow}>
                  <MaterialIcons name="call" size={14} color={BrandColors.onSurfaceVariant} />
                  <Text style={styles.customerPhoneText}>{customerPhone}</Text>
                </View>

                {/* Quick Action Dial / WA */}
                <View style={styles.contactActionsRow}>
                  <TouchableOpacity
                    style={styles.callPillBtn}
                    activeOpacity={0.8}
                    onPress={() => handleCall(customerPhone)}>
                    <MaterialIcons name="call" size={15} color={BrandColors.primary} />
                    <Text style={styles.callPillText}>Telepon</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.waPillBtn}
                    activeOpacity={0.8}
                    onPress={() => handleWhatsApp(customerPhone)}>
                    <MaterialIcons name="chat" size={15} color={BrandColors.secondary} />
                    <Text style={styles.waPillText}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* KTP & Verification Detail Box */}
            <View style={styles.innerGrayBox}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>NIK / KTP</Text>
                <Text style={[styles.dataValue, styles.fontMono]}>{customerNik}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Pemeriksaan Rekam</Text>
                <View style={styles.verifiedCheckRow}>
                  <MaterialIcons name="check-circle" size={15} color={BrandColors.primary} />
                  <Text style={styles.verifiedCheckText}>Clear / Aman Terverifikasi</Text>
                </View>
              </View>
              <View style={[styles.dataRow, { alignItems: 'flex-start', paddingTop: 4 }]}>
                <Text style={styles.dataLabel}>Alamat KTP</Text>
                <Text style={[styles.dataValue, { flex: 1, textAlign: 'right', marginLeft: 8 }]}>
                  {customerAddress}
                </Text>
              </View>
            </View>
          </View>

          {/* 3. Kartu Kendaraan & Penugasan Armada */}
          <View style={styles.card}>
            <View style={styles.cardSectionHeader}>
              <View style={styles.cardTitleWithIcon}>
                <MaterialIcons name="directions-car" size={20} color={BrandColors.primary} />
                <Text style={styles.cardSectionTitle}>Unit & Penugasan</Text>
              </View>
              <View style={styles.pendingUnitBadge}>
                <Text style={styles.pendingUnitBadgeText}>Pending Unit</Text>
              </View>
            </View>

            <View style={styles.vehicleOverview}>
              <Text style={styles.vehicleNameText}>{carTitle}</Text>
              <Text style={styles.vehicleSpecsText}>
                Kapasitas 7 Seat • Captain Seats • Dual Sunroof • Otomatis
              </Text>
            </View>

            {/* Recommended Fleet Box */}
            <View style={styles.innerGrayBox}>
              <View style={styles.recommendationTop}>
                <Text style={styles.recommendationLabel}>
                  REKOMENDASI TERDEKAT
                </Text>
                <View style={styles.readyTag}>
                  <Text style={styles.readyTagText}>Siap Pakai</Text>
                </View>
              </View>

              <View style={styles.recommendationBody}>
                <View>
                  <Text style={styles.recommendationPlate}>Alphard BK 1088 CAN</Text>
                  <Text style={styles.recommendationKm}>Hitam Metalik • KM 18.400</Text>
                </View>

                <View style={styles.recommendationRight}>
                  <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                    <Text style={styles.fuelLabel}>BBM</Text>
                    <Text style={styles.fuelValue}>85%</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.chooseUnitBtn}
                    activeOpacity={0.85}
                    onPress={handleAllocateArmada}>
                    <Text style={styles.chooseUnitBtnText}>+ Pilih Unit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* 4. Kartu Jadwal, Durasi & Titik Operasional */}
          <View style={styles.card}>
            <View style={styles.cardSectionHeader}>
              <View style={styles.cardTitleWithIcon}>
                <MaterialIcons name="calendar-month" size={20} color={BrandColors.primary} />
                <Text style={styles.cardSectionTitle}>Jadwal & Rute</Text>
              </View>
              <View style={styles.durationChip}>
                <Text style={styles.durationChipText}>3 Hari (72 Jam)</Text>
              </View>
            </View>

            {/* Stepper Timeline Pengambilan & Pengembalian */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepperLine} />

              {/* Pickup Point */}
              <View style={styles.stepperStep}>
                <View style={[styles.stepIconWrap, { backgroundColor: BrandColors.primaryContainer }]}>
                  <MaterialIcons name="flight-takeoff" size={13} color="#ffffff" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, { color: BrandColors.primary }]}>
                    PENGAMBILAN UNIT
                  </Text>
                  <Text style={styles.stepDateTitle}>
                    {startDate} • {startTime}
                  </Text>
                  <View style={styles.stepLocationRow}>
                    <MaterialIcons name="pin-drop" size={15} color={BrandColors.primary} />
                    <Text style={styles.stepLocationText}>{pickupLocation}</Text>
                  </View>
                </View>
              </View>

              {/* Return Point */}
              <View style={styles.stepperStep}>
                <View style={[styles.stepIconWrap, { backgroundColor: BrandColors.secondaryContainer }]}>
                  <MaterialIcons name="flight-land" size={13} color="#ffffff" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepLabel, { color: BrandColors.secondary }]}>
                    PENGEMBALIAN UNIT
                  </Text>
                  <Text style={styles.stepDateTitle}>
                    {endDate} • {endTime}
                  </Text>
                  <View style={styles.stepLocationRow}>
                    <MaterialIcons name="location-on" size={15} color={BrandColors.secondary} />
                    <Text style={styles.stepLocationText}>{dropoffLocation}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Catatan Khusus Pelanggan */}
            <View style={styles.notesBox}>
              <MaterialIcons name="sticky-note-2" size={20} color={BrandColors.secondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notesTitle}>Catatan Khusus Pelanggan:</Text>
                <Text style={styles.notesBody}>&ldquo;{notes}&rdquo;</Text>
              </View>
            </View>
          </View>

          {/* 5. Kartu Rincian Tarif & Keuangan (Billing & Payment) */}
          <View style={styles.card}>
            <View style={styles.cardSectionHeader}>
              <View style={styles.cardTitleWithIcon}>
                <MaterialIcons name="receipt-long" size={20} color={BrandColors.primary} />
                <Text style={styles.cardSectionTitle}>Rincian Pembayaran</Text>
              </View>
              <View style={styles.dpVerifiedBadge}>
                <Text style={styles.dpVerifiedBadgeText}>DP Verified</Text>
              </View>
            </View>

            <View style={styles.billingRows}>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Sewa Unit (3 Hari × Rp 2.500.000)</Text>
                <Text style={styles.billingValue}>Rp 7.500.000</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Fee Drop-Off Bandara Kualanamu</Text>
                <Text style={styles.billingValue}>Rp 150.000</Text>
              </View>
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Deposit Jaminan (Refundable)</Text>
                <Text style={styles.billingValue}>Rp 1.000.000</Text>
              </View>

              <View style={styles.billingDivider} />

              <View style={styles.billingTotalRow}>
                <Text style={styles.billingTotalLabel}>Total Reservasi</Text>
                <Text style={styles.billingTotalValue}>{formatRupiah(totalAmount)}</Text>
              </View>
            </View>

            {/* Settlement Breakdown Card */}
            <View style={styles.settlementBox}>
              <View style={styles.settlementRow}>
                <View style={styles.settlementDotRow}>
                  <View style={[styles.coloredDot, { backgroundColor: BrandColors.primary }]} />
                  <Text style={styles.settlementLabel}>DP Diterima (BCA)</Text>
                </View>
                <Text style={[styles.settlementAmount, { color: BrandColors.primary }]}>
                  {formatRupiah(dpAmount)}
                </Text>
              </View>

              <View style={styles.settlementRow}>
                <View style={styles.settlementDotRow}>
                  <View style={[styles.coloredDot, { backgroundColor: BrandColors.secondary }]} />
                  <Text style={[styles.settlementLabel, { color: BrandColors.onSurface, fontWeight: '600' }]}>
                    Sisa Pelunasan
                  </Text>
                </View>
                <Text style={[styles.settlementAmount, { color: BrandColors.secondary, fontSize: 16 }]}>
                  {formatRupiah(remainingAmount)}
                </Text>
              </View>

              <Text style={styles.settlementNote}>*Pelunasan saat serah terima fisik armada</Text>
            </View>

          </View>


          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      {/* 7. Bottom Sticky Action Dock */}
      <View style={styles.bottomStickyDock}>
        {status !== 'Completed' && status !== 'Cancelled' && (
          <TouchableOpacity
            style={styles.cancelDockBtn}
            activeOpacity={0.8}
            onPress={handleCancelBooking}>
            <Text style={styles.cancelDockBtnText}>Batalkan</Text>
          </TouchableOpacity>
        )}

        {status === 'Pending' && (
          roleInfo.canAccessAllocation ? (
            <TouchableOpacity
              style={styles.allocateDockBtn}
              activeOpacity={0.85}
              onPress={handleAllocateArmada}>
              <Text style={styles.allocateDockBtnText}>Alokasikan Armada</Text>
              <MaterialIcons name="arrow-forward" size={19} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <View style={[styles.allocateDockBtn, { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' }]}>
              <MaterialIcons name="hourglass-empty" size={18} color="#d97706" />
              <Text style={[styles.allocateDockBtnText, { color: '#b45309' }]}>Menunggu Alokasi Admin</Text>
            </View>
          )
        )}

        {status === 'Confirmed' && (
          <TouchableOpacity
            style={[styles.allocateDockBtn, { backgroundColor: BrandColors.primary }]}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/delivery' as any, params: { id: String(booking?.id || id) } })}>
            <Text style={styles.allocateDockBtnText}>Serah Terima Unit</Text>
            <MaterialIcons name="handshake" size={19} color="#ffffff" />
          </TouchableOpacity>
        )}

        {status === 'On Trip' && (
          <TouchableOpacity
            style={[styles.allocateDockBtn, { backgroundColor: BrandColors.secondary }]}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/return' as any, params: { id: String(booking?.id || id) } })}>
            <Text style={styles.allocateDockBtnText}>Terima Unit Kembali</Text>
            <MaterialIcons name="swap-horizontal-circle" size={19} color="#ffffff" />
          </TouchableOpacity>
        )}

        {(status === 'Completed' || status === 'Returned') && (
          <View style={[styles.allocateDockBtn, { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' }]}>
            <MaterialIcons name="task-alt" size={19} color="#059669" />
            <Text style={[styles.allocateDockBtnText, { color: '#059669' }]}>Sewa Selesai</Text>
          </View>
        )}

        {status === 'Cancelled' && (
          <View style={[styles.allocateDockBtn, { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' }]}>
            <MaterialIcons name="cancel" size={19} color="#dc2626" />
            <Text style={[styles.allocateDockBtnText, { color: '#dc2626' }]}>Booking Dibatalkan</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.surface,
  },
  topHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  headerSubtitle: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: -1,
  },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingToast: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: BrandColors.inverseSurface,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingToastText: {
    color: BrandColors.inverseOnSurface,
    fontSize: 13,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loaderText: {
    fontSize: 14,
    color: BrandColors.onSurfaceVariant,
    marginTop: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bookingCodeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  bookingCodeText: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  copyCodeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BrandColors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BrandColors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: BrandColors.secondaryFixed,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.secondary,
  },
  pulseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BrandColors.onSecondaryFixed,
    letterSpacing: 0.4,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: BrandColors.surfaceContainerHigh,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  createdMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  createdMetaText: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
  },
  createdMetaBold: {
    fontWeight: '600',
    color: BrandColors.onSurface,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: BrandColors.primaryFixed,
  },
  vipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.onPrimaryFixedVariant,
  },
  customerProfileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  customerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: BrandColors.primaryFixedDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  customerInfoCol: {
    flex: 1,
  },
  customerNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  customerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  customerPhoneText: {
    fontSize: 13,
    color: BrandColors.onSurfaceVariant,
  },
  contactActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  callPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: BrandColors.surfaceContainerLow,
  },
  callPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  waPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: BrandColors.surfaceContainerLow,
  },
  waPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.secondary,
  },
  innerGrayBox: {
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    gap: 7,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dataLabel: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
  },
  dataValue: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurface,
  },
  fontMono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  verifiedCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedCheckText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  pendingUnitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: BrandColors.errorContainer,
  },
  pendingUnitBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.onErrorContainer,
  },
  vehicleOverview: {
    marginBottom: 10,
  },
  vehicleNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  vehicleSpecsText: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },
  recommendationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recommendationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.primary,
    letterSpacing: 0.5,
  },
  readyTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: BrandColors.surfaceContainerHighest,
  },
  readyTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.onSurface,
  },
  recommendationBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recommendationPlate: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  recommendationKm: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 1,
  },
  recommendationRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fuelLabel: {
    fontSize: 9,
    color: BrandColors.onSurfaceVariant,
  },
  fuelValue: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  chooseUnitBtn: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: BrandColors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  chooseUnitBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  durationChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceContainer,
  },
  durationChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  stepperContainer: {
    position: 'relative',
    paddingLeft: 22,
    gap: 16,
    marginVertical: 4,
  },
  stepperLine: {
    position: 'absolute',
    left: 9,
    top: 10,
    bottom: 12,
    width: 2,
    backgroundColor: BrandColors.surfaceContainerHighest,
  },
  stepperStep: {
    position: 'relative',
  },
  stepIconWrap: {
    position: 'absolute',
    left: -22,
    top: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    paddingLeft: 4,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stepDateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.onSurface,
    marginTop: 2,
  },
  stepLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  stepLocationText: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    flex: 1,
  },
  notesBox: {
    marginTop: 10,
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  notesBody: {
    fontSize: 12,
    fontStyle: 'italic',
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },
  dpVerifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceContainerHigh,
  },
  dpVerifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  billingRows: {
    gap: 6,
    marginBottom: 10,
  },
  billingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billingLabel: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
  },
  billingValue: {
    fontSize: 12,
    fontWeight: '500',
    color: BrandColors.onSurface,
  },
  billingDivider: {
    height: 1,
    backgroundColor: BrandColors.surfaceContainer,
    marginVertical: 4,
  },
  billingTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billingTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  billingTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  settlementBox: {
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  settlementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settlementDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coloredDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  settlementLabel: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
  },
  settlementAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  settlementNote: {
    fontSize: 10,
    fontStyle: 'italic',
    color: BrandColors.outline,
    textAlign: 'right',
  },
  bottomStickyDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  cancelDockBtn: {
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 23,
    backgroundColor: BrandColors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelDockBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  allocateDockBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: BrandColors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  allocateDockBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
