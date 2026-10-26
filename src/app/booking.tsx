import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { BookingDetail, BookingService } from '@/services/booking';
import { ModernLoadingIndicator } from '@/components/ModernLoading';

const STATUS_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'Pending', label: 'Booking Baru', dot: BrandColors.secondary },
  { key: 'Confirmed', label: 'Terkonfirmasi', dot: BrandColors.primary },
  { key: 'On Trip', label: 'Sedang Jalan', dot: BrandColors.tertiary },
  { key: 'Completed', label: 'Selesai' },
];

const DATE_SCOPES = ['Hari Ini', 'Besok', 'Minggu Ini', 'Bulan Ini'];

export default function BookingListScreen() {
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateScope, setSelectedDateScope] = useState('Hari Ini');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchBookingsData = async () => {
    try {
      const listRes = await BookingService.getBookings({
        status: selectedStatus,
        search: searchQuery,
        page: page,
        per_page: 10,
      });

      if (listRes?.items) {
        setBookings(listRes.items);
        setTotalCount(listRes.total);
      }
    } catch (err: any) {
      console.warn('[BOOKING LIST] Error loading data:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const listRes = await BookingService.getBookings({
          status: selectedStatus,
          search: searchQuery,
          page: page,
          per_page: 10,
        });

        if (active && listRes?.items) {
          setBookings(listRes.items);
          setTotalCount(listRes.total);
        }
      } catch (err: any) {
        console.warn('[BOOKING LIST] Error loading data:', err?.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedStatus, page, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookingsData();
    setRefreshing(false);
  };

  const handleSearchSubmit = () => {
    setPage(1);
    fetchBookingsData();
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending')) {
      return { bg: BrandColors.secondaryFixed, text: BrandColors.onSecondaryContainer, label: 'Booking Baru' };
    }
    if (s.includes('confirmed')) {
      return { bg: BrandColors.primaryFixed, text: BrandColors.onPrimaryFixedVariant, label: 'Terkonfirmasi' };
    }
    if (s.includes('trip') || s.includes('active')) {
      return { bg: '#d1fae5', text: '#065f46', label: 'Sedang Jalan' };
    }
    if (s.includes('return')) {
      return { bg: BrandColors.secondaryContainer, text: '#ffffff', label: 'Mendekati Kembali' };
    }
    if (s.includes('completed')) {
      return { bg: BrandColors.surfaceContainer, text: BrandColors.onSurfaceVariant, label: 'Selesai' };
    }
    return { bg: BrandColors.surfaceContainerHigh, text: BrandColors.onSurfaceVariant, label: status };
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Sticky Top App Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandGroup}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={() => router.replace('/welcome')}>
            <MaterialIcons name="arrow-back" size={24} color={BrandColors.onSurface} />
          </TouchableOpacity>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brandTitle}>Data Booking</Text>
              <View style={styles.quarterBadge}>
                <Text style={styles.quarterBadgeText}>{totalCount > 0 ? `${totalCount} Data` : '2026/Q4'}</Text>
              </View>
            </View>
            <Text style={styles.brandSubtitle}>PT. Cahaya Auto Nusantara</Text>
          </View>
        </View>

        <View style={styles.headerRightActions}>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* Quick CTA & Action Row */}
        <View style={styles.quickCtaRow}>
          <TouchableOpacity
            style={styles.primaryAddBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/booking-create' as any)}>
            <MaterialIcons name="add-circle" size={20} color="#ffffff" />
            <Text style={styles.primaryAddBtnText}>+ Booking Baru</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterBtn}
            activeOpacity={0.75}
            onPress={() => Alert.alert('Filter Lanjutan', 'Pilih filter tanggal & kategori.')}>
            <MaterialIcons name="tune" size={18} color={BrandColors.onSurfaceVariant} />
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar with Floating Lens */}
        <View style={styles.searchBarWrapper}>
          <MaterialIcons name="search" size={20} color={BrandColors.outline} style={styles.searchIconLeft} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari No. Booking, Pelanggan, Plat..."
            placeholderTextColor="#9ca5af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.scanBtn} onPress={() => Alert.alert('Scan QR', 'Buka scanner QR fisik armada.')}>
            <MaterialIcons name="qr-code-scanner" size={18} color={BrandColors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Status Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsScroll}>
          {STATUS_FILTERS.map((f) => {
            const isSelected = selectedStatus === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, isSelected ? styles.filterPillActive : styles.filterPillInactive]}
                onPress={() => setSelectedStatus(f.key)}
                activeOpacity={0.75}>
                {f.dot && !isSelected && (
                  <View style={[styles.pillColorDot, { backgroundColor: f.dot }]} />
                )}
                <Text style={[styles.filterPillText, isSelected ? styles.filterPillTextActive : styles.filterPillTextInactive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Quick Date Scope Range */}
        <View style={styles.dateScopeRow}>
          <MaterialIcons name="calendar-today" size={15} color={BrandColors.onSurfaceVariant} />
          <View style={styles.dateScopeButtons}>
            {DATE_SCOPES.map((scope) => {
              const isSelected = selectedDateScope === scope;
              return (
                <TouchableOpacity
                  key={scope}
                  style={[styles.scopeBtn, isSelected && styles.scopeBtnActive]}
                  onPress={() => setSelectedDateScope(scope)}>
                  <Text style={[styles.scopeBtnText, isSelected && styles.scopeBtnTextActive]}>
                    {scope}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Booking List Feed */}
        {loading ? (
          <ModernLoadingIndicator
            size="medium"
            message="Memuat data booking armada..."
            submessage="Sinkronisasi jadwal dengan server"
            style={{ marginVertical: 32 }}
          />
        ) : bookings.length > 0 ? (
          bookings.map((item) => {
            const custName = item.customer?.name || item.customer_name || 'A. Fadli Akbar';
            const custPhone = item.customer?.phone || item.customer_phone || '0812-4491-0082';
            const mkt = item.marketing?.name || item.marketing_name || 'Budi Santoso';
            const code = item.booking_code || item.booking_number || item.code || `BK-${item.id}`;
            const carTitle = item.car?.name || (item.car?.brand ? `${item.car.brand} ${item.car.model}` : item.car_type) || 'Toyota Alphard 2.5 G AT';
            const plate = item.car?.plate_number || item.plate_number || 'Belum Terpasang';
            const statusBadge = getStatusBadgeStyle(item.status);
            const rentalType = item.rental_type || 'Lepas Kunci';

            return (
              <View key={item.id} style={styles.bookingFeedCard}>
                {/* Top Strip / Badges */}
                <View style={styles.cardTopRow}>
                  <View style={styles.codeGroup}>
                    <Text style={styles.codeText}>{code}</Text>
                    <View style={styles.rentalTypeTag}>
                      <Text style={styles.rentalTypeTagText}>{rentalType}</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: statusBadge.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: statusBadge.text }}>
                      {statusBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Customer Details Strip */}
                <View style={styles.customerStrip}>
                  <View style={styles.custAvatar}>
                    <Text style={styles.custAvatarText}>{custName.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={styles.custTextGroup}>
                    <View style={styles.custNameRow}>
                      <Text style={styles.custNameText}>{custName}</Text>
                    </View>
                    <Text style={styles.custSubText}>
                      {custPhone} • Mkt: {mkt}
                    </Text>
                  </View>
                </View>

                {/* Vehicle & Unit Assignment */}
                <View style={styles.vehicleRow}>
                  <View style={styles.vehicleLeft}>
                    <View style={styles.vehicleIconWrap}>
                      <MaterialIcons name="directions-car" size={18} color={BrandColors.primary} />
                    </View>
                    <View>
                      <Text style={styles.vehicleTitle}>{carTitle}</Text>
                      <Text style={styles.vehiclePlate}>Plat: {plate}</Text>
                    </View>
                  </View>
                  {plate.includes('Belum') && (
                    <View style={styles.unassignedBadge}>
                      <Text style={styles.unassignedBadgeText}>Butuh Alokasi</Text>
                    </View>
                  )}
                </View>

                {/* Schedule Itinerary Row */}
                <View style={styles.scheduleRow}>
                  <View style={styles.scheduleLeft}>
                    <MaterialIcons name="schedule" size={16} color={BrandColors.primary} />
                    <View>
                      <Text style={styles.scheduleDateText}>
                        {item.booking_date} — {item.return_date}
                      </Text>
                      <Text style={styles.scheduleSubText}>
                        {(item.pickup_time || '08:00').replace(/\s*(WIB|WITA|WIT)/gi, '')} sd {(item.return_time || '08:00').replace(/\s*(WIB|WITA|WIT)/gi, '')}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.durationBadgeText}>3 Hari</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.detailBtn}
                    activeOpacity={0.75}
                    onPress={() => router.push({ pathname: '/booking-detail' as any, params: { id: String(item.id) } })}>
                    <Text style={styles.detailBtnText}>Detail Lengkap</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.allocateBtn}
                    activeOpacity={0.85}
                    onPress={() => router.push({ pathname: '/booking-detail' as any, params: { id: String(item.id) } })}>
                    <MaterialIcons name="assignment-turned-in" size={16} color="#ffffff" />
                    <Text style={styles.allocateBtnText}>Alokasikan Unit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <MaterialIcons name="receipt-long" size={40} color={BrandColors.outline} />
            <Text style={styles.emptyTitle}>Belum Ada Data Booking</Text>
            <Text style={styles.emptyDesc}>Tidak ada reservasi yang sesuai dengan filter pencarian.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/booking-create' as any)}>
              <Text style={styles.emptyBtnText}>+ Buat Booking Baru</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Bottom Navigation Bar */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNavCard}>
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => router.replace('/welcome')}
            activeOpacity={0.7}>
            <MaterialIcons name="dashboard" size={22} color={BrandColors.onSurfaceVariant} />
            <Text style={styles.navTabLabel}>Beranda</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navTabItem} activeOpacity={0.7}>
            <MaterialIcons name="receipt-long" size={22} color={BrandColors.primary} />
            <Text style={[styles.navTabLabel, { color: BrandColors.primary, fontWeight: '700' }]}>Booking</Text>
          </TouchableOpacity>

          <View style={styles.centerFabWrapper}>
            <TouchableOpacity
              style={styles.centerFabButton}
              activeOpacity={0.85}
              onPress={() => router.push('/booking-create' as any)}>
              <MaterialIcons name="add" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.centerFabLabel}>Baru</Text>
          </View>

          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => Alert.alert('Armada', 'Membuka menu pemantauan armada.')}
            activeOpacity={0.7}>
            <MaterialIcons name="commute" size={22} color={BrandColors.onSurfaceVariant} />
            <Text style={styles.navTabLabel}>Armada</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => router.replace('/welcome')}
            activeOpacity={0.7}>
            <MaterialIcons name="tune" size={22} color={BrandColors.onSurfaceVariant} />
            <Text style={styles.navTabLabel}>Setelan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  topHeader: {
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
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.onSurface,
  },
  quarterBadge: {
    backgroundColor: BrandColors.primaryFixed,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
  },
  quarterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.onPrimaryFixedVariant,
  },
  brandSubtitle: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 1,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BrandColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  quickCtaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  primaryAddBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  filterBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 9999,
    backgroundColor: BrandColors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },

  /* Ticker Grid */
  tickerGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tickerCard: {
    flex: 1,
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 10,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    justifyContent: 'space-between',
    minHeight: 80,
  },
  tickerIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tickerValue: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.onSurface,
    lineHeight: 22,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.secondary,
  },
  tickerLabel: {
    fontSize: 10,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },

  /* Search Bar */
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 9999,
    height: 46,
    paddingHorizontal: 14,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 12,
  },
  searchIconLeft: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.onSurface,
    height: '100%',
  },
  scanBtn: {
    padding: 4,
  },

  /* Filter Pills */
  filterPillsScroll: {
    gap: 8,
    paddingBottom: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  filterPillActive: {
    backgroundColor: BrandColors.primary,
  },
  filterPillInactive: {
    backgroundColor: BrandColors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  pillColorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  filterPillTextInactive: {
    color: BrandColors.onSurfaceVariant,
  },

  /* Date Scopes */
  dateScopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dateScopeButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  scopeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  scopeBtnActive: {
    backgroundColor: BrandColors.surfaceContainerHigh,
  },
  scopeBtnText: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
  },
  scopeBtnTextActive: {
    fontWeight: '700',
    color: BrandColors.onSurface,
  },

  /* Booking Feed Cards */
  bookingFeedCard: {
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  rentalTypeTag: {
    backgroundColor: BrandColors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  rentalTypeTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  feedStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  feedStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  customerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(242, 243, 255, 0.7)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  custAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  custTextGroup: {
    flex: 1,
  },
  custNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  custNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  custSubText: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 1,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  vehicleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  vehicleIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BrandColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  vehiclePlate: {
    fontSize: 11,
    color: BrandColors.secondary,
    fontWeight: '600',
    marginTop: 1,
  },
  unassignedBadge: {
    backgroundColor: BrandColors.errorContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unassignedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.onErrorContainer,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 243, 255, 0.5)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurface,
  },
  scheduleSubText: {
    fontSize: 10,
    color: BrandColors.outline,
    marginTop: 1,
  },
  durationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingTop: 4,
  },
  financialLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: BrandColors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  financialValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  financialTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.onSurface,
  },
  financialDp: {
    fontSize: 11,
    color: BrandColors.secondary,
    fontWeight: '600',
  },
  financialRemaining: {
    fontSize: 11,
    color: BrandColors.error,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBtn: {
    flex: 1,
    height: 38,
    borderRadius: 9999,
    backgroundColor: BrandColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  allocateBtn: {
    flex: 1,
    height: 38,
    borderRadius: 9999,
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  allocateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* Empty state */
  emptyCard: {
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  emptyDesc: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: BrandColors.primaryFixed,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  emptyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  /* Bottom Navigation */
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
});
