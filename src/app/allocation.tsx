import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BrandColors } from '@/constants/brand';
import { BookingDetail, Car, Driver } from '@/services/booking';
import { AllocationService, BlacklistRecord } from '@/services/allocation';
import { ModernLoadingIndicator } from '@/components/ModernLoading';
import { StorageService } from '@/services/storage';
import { getUserRoleInfo } from '@/utils/roleAccess';

const { width } = Dimensions.get('window');

type StatusTab = 'all' | 'unallocated' | 'allocated';
type PresetDate = 'all' | 'today' | 'tomorrow' | 'this_week' | 'this_month';
type CheckStage = 'checking' | 'clean' | 'blacklisted';

export default function AllocationScreen() {
  const router = useRouter();

  // State List Alokasi
  const [allocations, setAllocations] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Counters
  const [totalCount, setTotalCount] = useState(0);
  const [unallocatedCount, setUnallocatedCount] = useState(0);
  const [allocatedCount, setAllocatedCount] = useState(0);

  // Filters
  const [activeStatus, setActiveStatus] = useState<StatusTab>('all');
  const [activePreset, setActivePreset] = useState<PresetDate>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Master Data
  const [readyCars, setReadyCars] = useState<Car[]>([]);
  const [readyDrivers, setReadyDrivers] = useState<Driver[]>([]);
  const [blacklists, setBlacklists] = useState<BlacklistRecord[]>([]);

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);

  // Modal 1 & 2: Scan Blacklist
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const [checkStage, setCheckStage] = useState<CheckStage>('checking');
  const [matchedBlacklist, setMatchedBlacklist] = useState<BlacklistRecord | null>(null);

  // Modal 3: Alokasi Mobil
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [carPickerModalOpen, setCarPickerModalOpen] = useState(false);
  const [driverPickerModalOpen, setDriverPickerModalOpen] = useState(false);

  // Load data function
  const loadData = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) setRefreshing(true);
    try {
      const [cars, drivers, blList, res] = await Promise.all([
        AllocationService.getReadyCars(),
        AllocationService.getReadyDrivers(),
        AllocationService.getBlacklists(),
        AllocationService.getAllocations({
          status: activeStatus,
          preset: activePreset,
          search: searchQuery,
          per_page: 25,
        }),
      ]);

      setReadyCars(cars);
      setReadyDrivers(drivers);
      setBlacklists(blList);
      setAllocations(res.items || []);
      setTotalCount(res.total);
      setUnallocatedCount(res.unallocated_count);
      setAllocatedCount(res.allocated_count);
    } catch (err: any) {
      console.warn('[FETCH ALLOCATIONS ERROR]:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeStatus, activePreset, searchQuery]);

  useEffect(() => {
    let active = true;
    (async () => {
      const user = await StorageService.getUser();
      const roleInfo = getUserRoleInfo(user);

      if (!roleInfo.canAccessAllocation) {
        if (active) {
          setAccessDenied(true);
          setLoading(false);
        }
        Alert.alert(
          'Akses Dibatasi',
          'Role Anda tidak memiliki izin untuk mengakses modul Alokasi Armada.',
          [
            {
              text: 'Kembali ke Beranda',
              onPress: () => router.replace('/welcome'),
            },
          ]
        );
        return;
      }

      if (active) {
        loadData();
      }
    })();

    return () => {
      active = false;
    };
  }, [loadData, router]);

  const onRefresh = () => {
    loadData(true);
  };

  // Helper Sanitasi Nomor HP & NIK untuk Matching Blacklist
  const cleanPhone = (p?: string | null) =>
    (p || '')
      .replace(/\D/g, '')
      .replace(/^0/, '')
      .replace(/^62/, '');

  /**
   * 1. Mulai Alokasi: Scan Konsumen ke Database Blacklist
   */
  const handleStartAllocation = (booking: BookingDetail) => {
    if (booking.status === 'Cancelled') {
      Alert.alert('Perhatian', 'Booking yang sudah dibatalkan tidak dapat dialokasikan.');
      return;
    }

    setSelectedBooking(booking);
    setCheckStage('checking');
    setMatchedBlacklist(null);
    setIsCheckModalOpen(true);

    // Simulasi scanner delay 750ms untuk pengalaman visual seperti di desktop
    setTimeout(() => {
      const cust = booking.customer;
      if (!cust) {
        setCheckStage('clean');
        return;
      }

      const custPhone = cleanPhone(cust.phone || booking.customer_phone);
      const custNik = (cust.nik || booking.customer_nik || '').trim().toLowerCase();
      const custName = (cust.name || booking.customer_name || '').trim().toLowerCase();

      const found = blacklists.find((bl) => {
        const blPhone = cleanPhone(bl.phone);
        const blNik = (bl.nik || '').trim().toLowerCase();
        const blName = (bl.name || '').trim().toLowerCase();

        if (custNik && blNik && custNik === blNik) return true;
        if (
          custPhone &&
          blPhone &&
          custPhone.length >= 6 &&
          blPhone.length >= 6 &&
          (custPhone === blPhone || custPhone.endsWith(blPhone) || blPhone.endsWith(custPhone))
        ) {
          return true;
        }
        if (
          custName &&
          blName &&
          (custName === blName || custName.includes(blName) || blName.includes(custName))
        ) {
          return true;
        }
        return false;
      });

      if (found) {
        setMatchedBlacklist(found);
        setCheckStage('blacklisted');
      } else {
        setMatchedBlacklist(null);
        setCheckStage('clean');
      }
    }, 750);
  };

  /**
   * 2. Lanjut ke Form Pilihan Mobil Ready setelah lolos Blacklist
   */
  const handleProceedToCarAllocation = () => {
    if (!selectedBooking) return;
    setIsCheckModalOpen(false);

    // Pre-fill form alokasi
    setSelectedCarId(selectedBooking.car?.id || null);
    setSelectedDriverId(selectedBooking.driver?.id || null);
    const existingAmount = selectedBooking.amount || selectedBooking.total_amount || 0;
    setInputAmount(existingAmount > 0 ? String(existingAmount) : '');

    setIsAllocateModalOpen(true);
  };

  /**
   * 3. Simpan Alokasi ke Backend Database
   */
  const handleSaveAllocation = async () => {
    if (!selectedBooking) return;

    if (!selectedCarId) {
      Alert.alert('Perhatian', 'Silakan pilih kendaraan yang ready terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const parsedAmount = inputAmount ? parseFloat(inputAmount.replace(/[^0-9]/g, '')) : undefined;
      const res = await AllocationService.updateAllocation(selectedBooking.id, {
        car_id: selectedCarId,
        driver_id: selectedDriverId,
        amount: parsedAmount,
      });

      if (res.success) {
        setIsAllocateModalOpen(false);
        Alert.alert('Berhasil', res.message || 'Alokasi armada berhasil disimpan!');
        loadData();
      } else {
        Alert.alert('Gagal', res.message || 'Terjadi kesalahan saat menyimpan alokasi.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Gagal menyimpan alokasi.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val?: number | string | null) => {
    const num = typeof val === 'number' ? val : parseFloat(String(val || 0)) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const getCustomerName = (item: BookingDetail) => {
    return item.customer?.name || item.customer_name || 'KONSUMEN';
  };

  const getBookingCode = (item: BookingDetail) => {
    return item.booking_number || item.booking_code || item.code || `#BK-${item.id}`;
  };

  // Pilihan armada yang ready (ditambah mobil saat ini jika sudah dialokasi sebelumnya)
  const availableCarOptions = useMemo(() => {
    const list = [...readyCars];
    if (selectedBooking?.car && !list.some((c) => c.id === selectedBooking.car?.id)) {
      list.unshift(selectedBooking.car);
    }
    return list;
  }, [readyCars, selectedBooking]);

  const currentlySelectedCar = useMemo(() => {
    return availableCarOptions.find((c) => c.id === selectedCarId);
  }, [availableCarOptions, selectedCarId]);

  if (accessDenied) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.replace('/welcome')}>
            <MaterialIcons name="arrow-back" size={24} color={BrandColors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Alokasi Armada</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <MaterialIcons name="gpp-bad" size={64} color="#dc2626" />
          <Text style={{ fontSize: 18, fontWeight: '700', color: BrandColors.onSurface, marginTop: 16 }}>
            Akses Dibatasi
          </Text>
          <Text style={{ fontSize: 14, color: BrandColors.onSurfaceVariant, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
            Halaman Alokasi Armada hanya dapat diakses oleh Administrator. Role Peluncur dan Marketing tidak diizinkan membuka modul ini.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 24,
              backgroundColor: BrandColors.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 12,
            }}
            onPress={() => router.replace('/welcome')}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Kembali ke Beranda</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. TOP APP BAR */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => router.replace('/welcome')}>
            <MaterialIcons name="arrow-back" size={24} color={BrandColors.onSurface} />
          </TouchableOpacity>
          <View>
            <View style={styles.titleWithBadge}>
              <Text style={styles.headerTitle}>Daftar Alokasi Armada</Text>
              <View style={styles.counterBadgeHeader}>
                <Text style={styles.counterBadgeHeaderText}>
                  {unallocatedCount > 0 ? `${unallocatedCount} Perlu Alokasi` : `${totalCount}`}
                </Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>PT. Cahaya Auto Nusantara</Text>
          </View>
        </View>
      </View>

      {/* 2. TAB STATUS UTAMA (Semua, Belum Dialokasi, Dialokasi) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeStatus === 'all' && styles.tabButtonActive]}
          activeOpacity={0.8}
          onPress={() => setActiveStatus('all')}>
          <Text style={[styles.tabButtonText, activeStatus === 'all' && styles.tabButtonTextActive]}>
            Semua ({totalCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeStatus === 'unallocated' && styles.tabButtonActiveUnallocated,
          ]}
          activeOpacity={0.8}
          onPress={() => setActiveStatus('unallocated')}>
          <View style={styles.tabInlineRow}>
            <MaterialIcons
              name="warning-amber"
              size={14}
              color={activeStatus === 'unallocated' ? '#c2410c' : '#ea580c'}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeStatus === 'unallocated' && styles.tabButtonTextActiveUnallocated,
              ]}>
              Belum Dialokasi ({unallocatedCount})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeStatus === 'allocated' && styles.tabButtonActiveAllocated]}
          activeOpacity={0.8}
          onPress={() => setActiveStatus('allocated')}>
          <View style={styles.tabInlineRow}>
            <MaterialIcons
              name="check-circle"
              size={14}
              color={activeStatus === 'allocated' ? '#15803d' : '#16a34a'}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeStatus === 'allocated' && styles.tabButtonTextActiveAllocated,
              ]}>
              Dialokasi ({allocatedCount})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. PENCARIAN & PRESET TANGGAL */}
      <View style={styles.filterSection}>
        {/* Search Bar */}
        <View style={styles.searchBarBox}>
          <MaterialIcons name="search" size={20} color={BrandColors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari pelanggan / no. booking..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="cancel" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Date Filter Chips Horizontal */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateChipsScroll}>
          <Text style={styles.filterLabelInline}>WAKTU:</Text>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'today', label: 'Hari Ini' },
            { id: 'tomorrow', label: 'Besok' },
            { id: 'this_week', label: 'Minggu Ini' },
            { id: 'this_month', label: 'Bulan Ini' },
          ].map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[styles.dateChip, isActive && styles.dateChipActive]}
                activeOpacity={0.7}
                onPress={() => setActivePreset(preset.id as PresetDate)}>
                <Text style={[styles.dateChipText, isActive && styles.dateChipTextActive]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. DAFTAR KARTU ALOKASI ARMADA */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ModernLoadingIndicator
            size="large"
            message="Memuat data alokasi armada..."
            submessage="Sinkronisasi data unit & reservasi terbaru"
          />
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[BrandColors.primary]}
            />
          }>
          {allocations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="directions-car" size={56} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>Tidak ada booking ditemukan</Text>
              <Text style={styles.emptySubtitle}>
                Coba ubah filter status atau kata kunci pencarian.
              </Text>
            </View>
          ) : (
            allocations.map((item) => {
              const custName = getCustomerName(item);
              const bookingCode = getBookingCode(item);
              const carDipesan = item.car_type || 'Armada Mobil';
              const isAllocated = Boolean(item.car);
              const allocatedCarName = item.car
                ? `${item.car.name || item.car.brand || ''} (${item.car.plate_number || '-'})`
                : null;
              const isLepasKunci = (item.rental_type || '').toLowerCase().includes('lepas');
              const price = item.amount || item.total_amount || 0;
              const mktName = item.marketing?.name || item.marketing_name || 'Admin';

              return (
                <View key={item.id} style={styles.allocationCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.customerGroup}>
                      <Text style={styles.customerNameText} numberOfLines={1}>
                        {custName.toUpperCase()}
                      </Text>
                      <Text style={styles.bookingNumberText}>{bookingCode}</Text>
                    </View>
                    <View
                      style={[
                        styles.rentalTypeBadge,
                        {
                          backgroundColor: isLepasKunci
                            ? 'rgba(219,225,255,0.7)'
                            : 'rgba(255,221,184,0.7)',
                        },
                      ]}>
                      <Text
                        style={[
                          styles.rentalTypeBadgeText,
                          {
                            color: isLepasKunci ? BrandColors.primary : BrandColors.secondary,
                          },
                        ]}>
                        {item.rental_type || 'Lepas Kunci'}
                      </Text>
                    </View>
                  </View>

                  {/* Card Body - Grid Info */}
                  <View style={styles.cardBodyBox}>
                    {/* Tipe Mobil Dipesan */}
                    <View style={styles.infoRowItem}>
                      <Text style={styles.infoRowLabel}>Tipe Mobil Dipesan:</Text>
                      <Text style={styles.infoRowValueBold}>{carDipesan.toUpperCase()}</Text>
                    </View>

                    {/* Status Alokasi Armada */}
                    <View style={styles.infoRowItem}>
                      <Text style={styles.infoRowLabel}>Armada Alokasi:</Text>
                      {isAllocated ? (
                        <View style={styles.allocatedPill}>
                          <MaterialIcons name="check-circle" size={13} color="#16a34a" />
                          <Text style={styles.allocatedPillText} numberOfLines={1}>
                            {allocatedCarName}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.unallocatedPill}>
                          <MaterialIcons name="warning" size={13} color="#ea580c" />
                          <Text style={styles.unallocatedPillText}>Belum Dialokasi</Text>
                        </View>
                      )}
                    </View>

                    {/* Tanggal & Jam Sewa */}
                    <View style={styles.scheduleRow}>
                      <MaterialIcons name="event" size={14} color={BrandColors.onSurfaceVariant} />
                      <Text style={styles.scheduleText}>
                        Start: {item.booking_date} ({item.pickup_time || '08:00'}) {'\n'}
                        End: {item.return_date} ({item.return_time || '22:00'})
                      </Text>
                    </View>

                    {/* Marketing & Tarif */}
                    <View style={styles.footerInfoSplit}>
                      <View>
                        <Text style={styles.metaLabel}>Marketing:</Text>
                        <Text style={styles.metaValue}>{mktName}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.metaLabel}>Tarif Sewa:</Text>
                        <Text style={styles.priceHighlightText}>{formatRupiah(price)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Card Action Button [ALOKASI] */}
                  <View style={styles.cardFooterAction}>
                    <TouchableOpacity
                      style={[
                        styles.alokasiButton,
                        isAllocated ? styles.alokasiButtonOutline : styles.alokasiButtonSolid,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => handleStartAllocation(item)}>
                      <MaterialIcons
                        name={isAllocated ? 'edit' : 'vpn-key'}
                        size={16}
                        color={isAllocated ? BrandColors.primary : '#ffffff'}
                      />
                      <Text
                        style={[
                          styles.alokasiButtonText,
                          isAllocated && { color: BrandColors.primary },
                        ]}>
                        {isAllocated ? 'Ubah Alokasi' : 'Alokasi'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1 & 2: SCAN BLACKLIST KONSUMEN                                     */}
      {/* ========================================================================= */}
      <Modal
        visible={isCheckModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCheckModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardCentered}>
            {/* Tombol Tutup */}
            <TouchableOpacity
              style={styles.modalCloseIconBtn}
              onPress={() => setIsCheckModalOpen(false)}>
              <MaterialIcons name="close" size={20} color="#64748b" />
            </TouchableOpacity>

            {/* TAHAP A: SEDANG MEMERIKSA DATA BLACKLIST */}
            {checkStage === 'checking' && (
              <View style={styles.modalCenterContent}>
                <ModernLoadingIndicator
                  size="large"
                  color={BrandColors.primary}
                  accentColor={BrandColors.secondaryContainer}
                />

                <Text style={styles.checkTitle}>Memeriksa Data Blacklist...</Text>
                <Text style={styles.checkSubtitle}>
                  Mengecek rekam jejak konsumen{' '}
                  <Text style={{ fontWeight: '700', color: BrandColors.onSurface }}>
                    {selectedBooking ? getCustomerName(selectedBooking) : ''}
                  </Text>{' '}
                  di database blacklist rental mobil.
                </Text>

                {/* Info Pill */}
                <View style={styles.infoPillGray}>
                  <Text style={styles.infoPillGrayText}>
                    No. Booking: {selectedBooking ? getBookingCode(selectedBooking) : '-'} • NIK:{' '}
                    {selectedBooking?.customer?.nik || selectedBooking?.customer_nik || '-'}
                  </Text>
                </View>
              </View>
            )}

            {/* TAHAP B: KONSUMEN AMAN (TIDAK BLACKLIST) */}
            {checkStage === 'clean' && (
              <View style={styles.modalCleanContent}>
                <View style={styles.cleanHeaderRow}>
                  <View style={styles.greenCheckCircle}>
                    <MaterialIcons name="check" size={24} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cleanTitle}>Konsumen Aman (Tidak Blacklist)</Text>
                    <Text style={styles.cleanSubtitle}>
                      Pemeriksaan selesai. Data konsumen bersih dari catatan blacklist rental.
                    </Text>
                  </View>
                </View>

                {/* Detail Box Hijau Lembut */}
                <View style={styles.greenDetailBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Nama Konsumen:</Text>
                    <Text style={styles.detailRowValue}>
                      {selectedBooking ? getCustomerName(selectedBooking).toUpperCase() : '-'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Tipe Mobil Dipesan:</Text>
                    <Text style={styles.detailRowValue}>
                      {(selectedBooking?.car_type || 'Armada').toUpperCase()} (
                      {selectedBooking?.rental_type || 'Lepas Kunci'})
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Status Pengecekan:</Text>
                    <View style={styles.clearStatusBadge}>
                      <Text style={styles.clearStatusBadgeText}>✓ CLEAR / AMAN</Text>
                    </View>
                  </View>
                </View>

                {/* Tombol Aksi Bawah */}
                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={styles.btnSecondary}
                    onPress={() => setIsCheckModalOpen(false)}>
                    <Text style={styles.btnSecondaryText}>Batal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnSuccess}
                    activeOpacity={0.85}
                    onPress={handleProceedToCarAllocation}>
                    <Text style={styles.btnSuccessText}>Lanjut Alokasi</Text>
                    <MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* TAHAP C: PERINGATAN KONSUMEN MASUK BLACKLIST */}
            {checkStage === 'blacklisted' && (
              <View style={styles.modalCleanContent}>
                <View style={styles.cleanHeaderRow}>
                  <View style={styles.redWarningCircle}>
                    <MaterialIcons name="error-outline" size={26} color="#dc2626" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.dangerTitle}>Peringatan: Masuk Blacklist!</Text>
                    <Text style={styles.dangerSubtitle}>
                      Data konsumen terdeteksi memiliki catatan pelanggaran / sengketa sewa rental!
                    </Text>
                  </View>
                </View>

                {/* Detail Box Merah */}
                <View style={styles.redDetailBox}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Nama / Kontak:</Text>
                    <Text style={styles.detailRowValueBold}>
                      {matchedBlacklist?.name || getCustomerName(selectedBooking!)} (
                      {matchedBlacklist?.phone || '-'})
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Pelapor / Sumber:</Text>
                    <Text style={styles.detailRowValue}>
                      {matchedBlacklist?.blacklisted_by || 'Asosiasi Rental Mobil'}
                    </Text>
                  </View>

                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.detailRowLabel}>Kronologi / Catatan Pelanggaran:</Text>
                    <View style={styles.violationBox}>
                      <Text style={styles.violationText}>
                        {matchedBlacklist?.perpetrator_info ||
                          'Pelanggaran sewa / unit bermasalah / tunggakan rental.'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={styles.btnSecondary}
                    onPress={() => setIsCheckModalOpen(false)}>
                    <Text style={styles.btnSecondaryText}>Tutup / Batalkan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnSecondary, { borderColor: '#dc2626' }]}
                    onPress={() => {
                      Alert.alert(
                        'Konfirmasi Override',
                        'Konsumen ini ada dalam daftar blacklist. Apakah Anda yakin tetap ingin mengalokasikan unit?',
                        [
                          { text: 'Batal', style: 'cancel' },
                          { text: 'Tetap Lanjutkan', onPress: handleProceedToCarAllocation },
                        ]
                      );
                    }}>
                    <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 13 }}>
                      Tetap Lanjutkan
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ALOKASI ARMADA MOBIL & STAF (FORM READY CARS DARI DATABASE)      */}
      {/* ========================================================================= */}
      <Modal
        visible={isAllocateModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAllocateModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.allocateModalSheet}>
            {/* Header Modal Alokasi */}
            <View style={styles.allocateModalHeader}>
              <View style={styles.allocateHeaderTitleRow}>
                <MaterialIcons name="settings" size={20} color={BrandColors.onSurface} />
                <Text style={styles.allocateModalTitle}>Alokasi Armada Mobil & Staf</Text>
              </View>
              <TouchableOpacity onPress={() => setIsAllocateModalOpen(false)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {/* Box Ringkasan Booking */}
              {selectedBooking && (
                <View style={styles.bookingSummaryBox}>
                  <View style={styles.summaryItemRow}>
                    <Text style={styles.summaryLabel}>Nama Marketing:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedBooking.marketing?.name || selectedBooking.marketing_name || 'Admin'}
                    </Text>
                  </View>

                  <View style={styles.summaryItemRow}>
                    <Text style={styles.summaryLabel}>Pelanggan:</Text>
                    <Text style={styles.summaryValueBold}>
                      {getCustomerName(selectedBooking).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.summaryItemRow}>
                    <Text style={styles.summaryLabel}>Tipe Mobil Dipesan:</Text>
                    <Text style={styles.summaryValueBold}>
                      {(selectedBooking.car_type || 'Armada').toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.summaryItemRow}>
                    <Text style={styles.summaryLabel}>Type Sewa:</Text>
                    <View style={styles.tagSummaryPill}>
                      <Text style={styles.tagSummaryPillText}>
                        {selectedBooking.rental_type || 'Lepas Kunci'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryItemRow}>
                    <Text style={styles.summaryLabel}>Tanggal Sewa:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedBooking.booking_date} s/d {selectedBooking.return_date}
                    </Text>
                  </View>
                </View>
              )}

              {/* Form Input 1: Alokasi Armada Mobil (Ready) */}
              <View style={styles.formGroup}>
                <Text style={styles.formGroupLabel}>
                  Alokasi Armada Mobil (Ready) <Text style={{ color: '#dc2626' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.formDropdownInput}
                  activeOpacity={0.8}
                  onPress={() => setCarPickerModalOpen(true)}>
                  <MaterialIcons name="directions-car" size={20} color={BrandColors.primary} />
                  <Text
                    style={[
                      styles.formDropdownInputText,
                      !currentlySelectedCar ? { color: '#9ca3af' } : null,
                    ]}
                    numberOfLines={1}>
                    {currentlySelectedCar
                      ? `${currentlySelectedCar.brand || ''} ${currentlySelectedCar.model || currentlySelectedCar.name || ''} • ${currentlySelectedCar.plate_number || ''}`
                      : 'Pilih kendaraan yang ready...'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748b" />
                </TouchableOpacity>
                <Text style={styles.formHelperText}>
                  *Data unit mobil diambil langsung secara real-time dari database armada yang berstatus Ready.
                </Text>
              </View>

              {/* Form Input 2: Pilihan Supir (Tampil jika With Driver) */}
              {selectedBooking &&
                !(selectedBooking.rental_type || '').toLowerCase().includes('lepas') && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formGroupLabel}>Supir / Driver Ditugaskan</Text>
                    <TouchableOpacity
                      style={styles.formDropdownInput}
                      activeOpacity={0.8}
                      onPress={() => setDriverPickerModalOpen(true)}>
                      <MaterialIcons name="badge" size={20} color={BrandColors.secondary} />
                      <Text
                        style={[
                          styles.formDropdownInputText,
                          !selectedDriverId ? { color: '#9ca3af' } : null,
                        ]}
                        numberOfLines={1}>
                        {selectedDriverId
                          ? readyDrivers.find((d) => d.id === selectedDriverId)?.name || 'Supir Terpilih'
                          : 'Pilih supir yang bertugas...'}
                      </Text>
                      <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                )}

              {/* Form Input 3: Harga / Tarif Sewa (Rp) - Readonly / Tidak Dapat Diedit */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={styles.formGroupLabelNoMargin}>Harga / Tarif Sewa (Rp)</Text>
                  <View style={styles.lockedBadge}>
                    <MaterialIcons name="lock" size={11} color="#64748b" />
                    <Text style={styles.lockedBadgeText}>Terkunci</Text>
                  </View>
                </View>
                <View style={styles.formTextInputWrapDisabled}>
                  <MaterialIcons name="payments" size={18} color="#94a3b8" />
                  <TextInput
                    style={styles.formTextInputFieldDisabled}
                    editable={false}
                    selectTextOnFocus={false}
                    value={inputAmount}
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <Text style={styles.formHelperText}>
                  *Tarif sewa terkunci sesuai harga pada invoice pemesanan.
                </Text>
              </View>

              {/* Tombol Aksi Bawah */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => setIsAllocateModalOpen(false)}>
                  <Text style={styles.btnSecondaryText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnPrimaryDark, submitting && { opacity: 0.7 }]}
                  disabled={submitting}
                  activeOpacity={0.85}
                  onPress={handleSaveAllocation}>
                  {submitting ? (
                    <ModernLoadingIndicator size="mini" color="#ffffff" accentColor="#ffddb8" />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={16} color="#ffffff" />
                      <Text style={styles.btnPrimaryDarkText}>Simpan Alokasi</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL PICKER: PILIH MOBIL READY DARI DATABASE                             */}
      {/* ========================================================================= */}
      <Modal
        visible={carPickerModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCarPickerModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerModalBox}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Pilih Kendaraan Ready</Text>
              <TouchableOpacity onPress={() => setCarPickerModalOpen(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {availableCarOptions.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <MaterialIcons name="no-crash" size={40} color="#cbd5e1" />
                  <Text style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                    Tidak ada mobil yang berstatus Ready saat ini.
                  </Text>
                </View>
              ) : (
                availableCarOptions.map((car) => {
                  const isSelected = selectedCarId === car.id;
                  const carTitle = `${car.brand || ''} ${car.model || car.name || 'Armada'}`;
                  return (
                    <TouchableOpacity
                      key={car.id}
                      style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setSelectedCarId(car.id);
                        setCarPickerModalOpen(false);
                      }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pickerItemCarTitle}>{carTitle}</Text>
                        <Text style={styles.pickerItemCarSub}>
                          Plat: {car.plate_number || '-'} • Warna: {car.color || '-'}
                        </Text>
                      </View>
                      {isSelected && (
                        <MaterialIcons name="check-circle" size={20} color={BrandColors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL PICKER: PILIH SUPIR READY DARI DATABASE                             */}
      {/* ========================================================================= */}
      <Modal
        visible={driverPickerModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDriverPickerModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerModalBox}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Pilih Supir / Driver</Text>
              <TouchableOpacity onPress={() => setDriverPickerModalOpen(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              <TouchableOpacity
                style={styles.pickerItemRow}
                onPress={() => {
                  setSelectedDriverId(null);
                  setDriverPickerModalOpen(false);
                }}>
                <Text style={{ color: '#64748b', fontStyle: 'italic' }}>Tanpa Supir</Text>
              </TouchableOpacity>
              {readyDrivers.map((driver) => {
                const isSelected = selectedDriverId === driver.id;
                return (
                  <TouchableOpacity
                    key={driver.id}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedDriverId(driver.id);
                      setDriverPickerModalOpen(false);
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerItemCarTitle}>{driver.name}</Text>
                      <Text style={styles.pickerItemCarSub}>
                        No. HP: {driver.phone || '-'}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check-circle" size={20} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 6,
    marginRight: 8,
    borderRadius: 8,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.onSurface,
  },
  counterBadgeHeader: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceContainerHigh,
  },
  counterBadgeHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  tabButtonActive: {
    backgroundColor: BrandColors.primary,
  },
  tabButtonActiveUnallocated: {
    backgroundColor: '#ffedd5',
    borderWidth: 1,
    borderColor: '#ea580c',
  },
  tabButtonActiveAllocated: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  tabInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  tabButtonTextActiveUnallocated: {
    color: '#c2410c',
    fontWeight: '800',
  },
  tabButtonTextActiveAllocated: {
    color: '#15803d',
    fontWeight: '800',
  },
  filterSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    color: BrandColors.onSurface,
    padding: 0,
  },
  dateChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    gap: 6,
  },
  filterLabelInline: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    marginRight: 2,
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  dateChipActive: {
    backgroundColor: BrandColors.onSurface,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  dateChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: BrandColors.onSurfaceVariant,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  allocationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  customerGroup: {
    flex: 1,
  },
  customerNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.onSurface,
  },
  bookingNumberText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  rentalTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rentalTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardBodyBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  infoRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRowLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  infoRowValueBold: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  unallocatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#fed7aa',
  },
  unallocatedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  allocatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: width * 0.55,
  },
  allocatedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
    marginTop: 2,
  },
  scheduleText: {
    fontSize: 10,
    color: '#475569',
    lineHeight: 14,
  },
  footerInfoSplit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metaLabel: {
    fontSize: 9,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  metaValue: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  priceHighlightText: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  cardFooterAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'flex-end',
  },
  alokasiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  alokasiButtonSolid: {
    backgroundColor: '#0f172a',
  },
  alokasiButtonOutline: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: BrandColors.primary,
  },
  alokasiButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCardCentered: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalCloseIconBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 4,
  },
  modalCenterContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  shieldPulseContainer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  shieldOuterRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldInnerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BrandColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.onSurface,
    textAlign: 'center',
  },
  checkSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  infoPillGray: {
    marginTop: 16,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoPillGrayText: {
    fontSize: 10,
    color: '#475569',
    fontFamily: 'monospace',
  },
  modalCleanContent: {
    paddingTop: 8,
  },
  cleanHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  greenCheckCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#86efac',
  },
  cleanTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16a34a',
  },
  cleanSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  greenDetailBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  redWarningCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fca5a5',
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#dc2626',
  },
  dangerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  redDetailBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  violationBox: {
    backgroundColor: '#fee2e2',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  violationText: {
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '600',
    lineHeight: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRowLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  detailRowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurface,
  },
  detailRowValueBold: {
    fontSize: 12,
    fontWeight: '800',
    color: BrandColors.onSurface,
  },
  clearStatusBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  clearStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  btnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  btnSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#16a34a',
  },
  btnSuccessText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  allocateModalSheet: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  allocateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  allocateHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allocateModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.onSurface,
  },
  bookingSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 11,
    color: BrandColors.onSurface,
  },
  summaryValueBold: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  tagSummaryPill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tagSummaryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  formGroup: {
    marginBottom: 14,
  },
  formGroupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.onSurface,
    marginBottom: 6,
  },
  formDropdownInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formDropdownInputText: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 12,
    color: BrandColors.onSurface,
    fontWeight: '500',
  },
  formHelperText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 14,
  },
  formGroupLabelNoMargin: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  formTextInputWrap: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  formTextInputWrapDisabled: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  formTextInputField: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: BrandColors.onSurface,
    fontWeight: '700',
    padding: 0,
  },
  formTextInputFieldDisabled: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
    padding: 0,
  },
  btnPrimaryDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  btnPrimaryDarkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  pickerModalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    overflow: 'hidden',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  pickerModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  pickerItemRowSelected: {
    backgroundColor: '#f0f9ff',
  },
  pickerItemCarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  pickerItemCarSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
});
