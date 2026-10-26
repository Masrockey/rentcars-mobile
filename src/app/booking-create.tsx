import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { getUserRoleInfo } from '@/utils/roleAccess';
import { BookingService, CreateBookingPayload, Customer, LookupsData, MarketingUser } from '@/services/booking';
import { StorageService, UserProfile } from '@/services/storage';
import { CalendarPickerModal } from '@/components/CalendarPickerModal';
import { ModernLoadingIndicator, ModernLoadingOverlay } from '@/components/ModernLoading';

const PRESET_TIMES = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
];

const PAYMENT_METHODS = ['Cash', 'Transfer', 'DP (Down Payment)'] as const;
type PaymentMethodType = (typeof PAYMENT_METHODS)[number];

const RATE_TYPES = ['Hari', '24 Jam'] as const;
type RateType = (typeof RATE_TYPES)[number];

export default function BookingCreateScreen() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lookups, setLookups] = useState<LookupsData | null>(null);

  const isAdmin = Boolean(
    currentUser?.is_admin ||
    currentUser?.is_super_admin ||
    currentUser?.roles?.some((r) => {
      const l = (r || '').toLowerCase();
      return l === 'admin' || l === 'super admin' || l === 'superadmin';
    })
  );

  // Form State
  const [selectedMarketing, setSelectedMarketing] = useState<MarketingUser | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCarType, setSelectedCarType] = useState<{ id: number; name: string } | null>(null);
  const [rentalType, setRentalType] = useState<'Lepas Kunci' | 'With Driver'>('Lepas Kunci');

  // Schedule & Location
  const [startDate, setStartDate] = useState('');
  const [pickupTime, setPickupTime] = useState('08:00');
  const [endDate, setEndDate] = useState('');
  const [returnTime, setReturnTime] = useState('08:00');
  const [durationDays, setDurationDays] = useState<number | ''>('');
  const [pickupLocation, setPickupLocation] = useState('Garasi');
  const [dropoffLocation, setDropoffLocation] = useState('Bandara');
  const [customPickupLocation, setCustomPickupLocation] = useState('');
  const [customDropoffLocation, setCustomDropoffLocation] = useState('');

  // Pricing & Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [rateType, setRateType] = useState<RateType>('Hari');
  const [ratePerDay, setRatePerDay] = useState<number>(0);
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [pickupFee, setPickupFee] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Modal selector states
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'marketing' | 'customer' | 'car' | 'pickup' | 'dropoff' | 'payment' | 'rate_type'>('customer');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [newCustomerModalVisible, setNewCustomerModalVisible] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustNik, setNewCustNik] = useState('');

  // Date & Time Picker Modal states
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [dateTarget, setDateTarget] = useState<'start' | 'end'>('start');

  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [timeTarget, setTimeTarget] = useState<'pickup' | 'return'>('pickup');
  const [customTimeInput, setCustomTimeInput] = useState('');

  const openDatePicker = (target: 'start' | 'end') => {
    setDateTarget(target);
    setDateModalVisible(true);
  };

  const openTimePicker = (target: 'pickup' | 'return') => {
    setTimeTarget(target);
    setCustomTimeInput(target === 'pickup' ? pickupTime : returnTime);
    setTimeModalVisible(true);
  };

  const handleSelectDate = (dateStr: string) => {
    let s = startDate;
    let e = endDate;
    if (dateTarget === 'start') {
      s = dateStr;
      setStartDate(dateStr);
    } else {
      e = dateStr;
      setEndDate(dateStr);
    }

    // Hitung estimasi durasi sewa jika kedua tanggal sudah terisi
    if (s && e) {
      const sIso = toISODate(s);
      const eIso = toISODate(e);
      if (sIso && eIso) {
        const sTime = new Date(sIso).getTime();
        const eTime = new Date(eIso).getTime();
        const diffDays = Math.round((eTime - sTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
          // Tanggal sama = sewa harian (1 hari)
          setDurationDays(1);
        } else if (diffDays > 0) {
          setDurationDays(diffDays);
        }
      }
    }
  };

  const handleSelectTime = (timeStr: string) => {
    if (timeTarget === 'pickup') {
      setPickupTime(timeStr);
    } else {
      setReturnTime(timeStr);
    }
    setTimeModalVisible(false);
  };

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [userProfile, data] = await Promise.all([
          StorageService.getUser(),
          BookingService.getLookups(),
        ]);

        if (!active) return;

        const roleInfo = getUserRoleInfo(userProfile);
        if (roleInfo.isPeluncur) {
          Alert.alert(
            'Akses Dibatasi',
            'Role Peluncur hanya memiliki akses untuk modul Serah Terima dan Pengambilan unit.',
            [
              { text: 'Buka Serah Terima', onPress: () => router.replace('/delivery') },
              { text: 'Kembali', onPress: () => router.replace('/welcome') },
            ]
          );
          return;
        }
        if (userProfile) {
          setCurrentUser(userProfile);
        }

        const userIsAdmin = Boolean(
          userProfile?.is_admin ||
          userProfile?.is_super_admin ||
          userProfile?.roles?.some((r) => {
            const l = (r || '').toLowerCase();
            return l === 'admin' || l === 'super admin' || l === 'superadmin';
          })
        );

        if (data) {
          setLookups(data);

          // Defaults Marketing:
          // Jika Admin: boleh pilih marketing lain, default ke user yang login jika terdaftar, atau marketing pertama
          if (userIsAdmin) {
            const matchCurrent = data.marketing_users?.find((m) => m.id === userProfile?.id);
            if (matchCurrent) {
              setSelectedMarketing(matchCurrent);
            } else if (data.marketing_users && data.marketing_users.length > 0) {
              setSelectedMarketing(data.marketing_users[0]);
            }
          } else if (userProfile) {
            // Jika role Marketing: otomatis terikat ke user marketing yang login
            setSelectedMarketing({
              id: userProfile.id,
              name: userProfile.name,
              email: userProfile.email,
              phone: userProfile.phone || undefined,
            });
          }

          // Defaults Konsumen:
          // Jika bukan admin, hanya ambil konsumen yang terikat dengan marketing ini
          const availableCustomers = (data.customers || []).filter((c) => {
            if (userIsAdmin) return true;
            return !c.user_id || c.user_id === userProfile?.id;
          });

          if (availableCustomers.length > 0) {
            setSelectedCustomer(availableCustomers[0]);
          } else {
            setSelectedCustomer(null);
          }

          if (data.car_types && data.car_types.length > 0) {
            setSelectedCarType(data.car_types[0]);
          }
        }
      } catch (err: any) {
        console.warn('[BOOKING CREATE] Failed lookups:', err?.message);
      } finally {
        if (active) setLoadingLookups(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const adjustDuration = (delta: number) => {
    const cur = typeof durationDays === 'number' ? durationDays : (parseInt(String(durationDays), 10) || 0);
    const nextDuration = Math.max(0, cur + delta);
    setDurationDays(nextDuration > 0 ? nextDuration : '');
  };

  // Live calculation
  const numericDuration = typeof durationDays === 'number' ? durationDays : (parseInt(String(durationDays), 10) || 0);
  const totalRent = numericDuration * ratePerDay;
  const grandTotal = totalRent + deliveryFee + pickupFee;
  const isDP = paymentMethod === 'DP (Down Payment)';
  const remaining = Math.max(0, grandTotal - (isDP ? dpAmount : grandTotal));

  const formatRupiah = (val: number) => {
    return 'Rp ' + (val || 0).toLocaleString('id-ID');
  };

  const showToastSuccess = () => {
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
      router.replace('/booking' as any);
    });
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/booking' as any);
    }
  };

  // Helper Formatters untuk Backend API
  const toISODate = (dateStr: string) => {
    // Input format: DD/MM/YYYY -> Output format: YYYY-MM-DD
    const parts = (dateStr || '').trim().split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  const toCleanTime = (timeStr: string) => {
    // Input format: "08:00 WIB" atau "08:00" -> Output format: "08:00"
    const match = (timeStr || '').match(/(\d{1,2}:\d{2})/);
    return match ? match[1] : '08:00';
  };

  const handleSaveBooking = async () => {
    if (!selectedCustomer && !newCustName.trim()) {
      Alert.alert('Perhatian', 'Pilih atau masukkan nama pelanggan.');
      return;
    }

    setSubmitting(true);
    try {
      setSubmitError(null);

      const finalPickupLocation =
        pickupLocation === 'Lokasi Lain'
          ? (customPickupLocation.trim() || 'Lokasi Lain')
          : pickupLocation;

      const finalDropoffLocation =
        dropoffLocation === 'Lokasi Lain'
          ? (customDropoffLocation.trim() || 'Lokasi Lain')
          : dropoffLocation;

      // Mapping metode pembayaran sesuai enum Laravel API: 'Cash' | 'Transfer' | 'DP'
      const apiPaymentMethod =
        paymentMethod === 'DP (Down Payment)'
          ? 'DP'
          : paymentMethod === 'Transfer'
            ? 'Transfer'
            : 'Cash';

      if (!startDate || !startDate.trim()) {
        Alert.alert('Perhatian', 'Silakan pilih Tanggal Sewa terlebih dahulu.');
        setSubmitting(false);
        return;
      }

      if (!endDate || !endDate.trim()) {
        Alert.alert('Perhatian', 'Silakan pilih Tanggal Balik terlebih dahulu.');
        setSubmitting(false);
        return;
      }

      const finalDuration = typeof durationDays === 'number' ? durationDays : (parseInt(String(durationDays), 10) || 0);
      if (finalDuration <= 0) {
        Alert.alert('Perhatian', 'Silakan isi Durasi Sewa (minimal 1 hari).');
        setSubmitting(false);
        return;
      }

      const startIso = toISODate(startDate);
      const endIso = toISODate(endDate);

      if (endIso < startIso) {
        Alert.alert(
          'Perhatian',
          'Tanggal Balik tidak boleh sebelum Tanggal Sewa.'
        );
        setSubmitting(false);
        return;
      }

      const isNewCustomer = (selectedCustomer as any)?.isNew;
      const customerId = isNewCustomer ? undefined : selectedCustomer?.id;
      const customerName = isNewCustomer ? selectedCustomer?.name : (!selectedCustomer ? (newCustName.trim() || undefined) : undefined);
      const customerPhone = isNewCustomer ? (selectedCustomer?.phone || undefined) : (!selectedCustomer ? (newCustPhone.trim() || undefined) : undefined);
      const customerNik = isNewCustomer ? (selectedCustomer?.nik || undefined) : (!selectedCustomer ? (newCustNik.trim() || undefined) : undefined);

      // Kumpulkan catatan tambahan agar aman terhadap schema database
      const notesItems: string[] = [];
      if (rateType) notesItems.push(`Tarif: ${rateType}`);
      if (apiPaymentMethod === 'DP' && dpAmount > 0) notesItems.push(`DP: Rp ${dpAmount.toLocaleString('id-ID')}`);
      if (notes.trim()) notesItems.push(notes.trim());
      const combinedNotes = notesItems.join(' | ') || undefined;

      // Pastikan user_id sesuai role pengguna: jika Marketing wajib akun sendiri
      const loggedUser = currentUser || (await StorageService.getUser());
      const effectiveUserId = isAdmin
        ? (selectedMarketing?.id ?? loggedUser?.id)
        : loggedUser?.id;

      // Payload sesuai Controller Laravel di rentcarsystemV2/app/Http/Controllers/Api/V1/BookingController.php
      const payload: CreateBookingPayload = {
        user_id: effectiveUserId,
        marketing_id: effectiveUserId,
        customer_id: customerId,
        new_customer_name: customerName,
        new_customer_phone: customerPhone,
        new_customer_nik: customerNik,
        car_type: selectedCarType?.name || 'Brio',
        rental_type: rentalType,
        price: ratePerDay || grandTotal,
        duration_type: rateType,
        duration_days: finalDuration,
        booking_date: startIso,
        return_date: endIso,
        pickup_time: toCleanTime(pickupTime),
        return_time: toCleanTime(returnTime),
        pickup_location: finalPickupLocation,
        dropoff_location: finalDropoffLocation,
        delivery_fee: deliveryFee || 0,
        pickup_fee: pickupFee || 0,
        payment_method: apiPaymentMethod,
        dp_amount: apiPaymentMethod === 'DP' ? dpAmount : 0,
        payment_status: apiPaymentMethod === 'DP' ? 'Down Payment' : 'Paid',
        amount: grandTotal,
        notes: combinedNotes,
      };

      // Hapus properti bernilai undefined agar JSON body bersih
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      console.log('[BOOKING CREATE] Payload to backend:', JSON.stringify(payload));

      const res = await BookingService.createBooking(payload);
      if (res.success) {
        setSubmitError(null);
        showToastSuccess();
      } else {
        const errorMsg = res.message || 'Terjadi kesalahan validasi data pemesanan pada server.';
        setSubmitError(errorMsg);
        Alert.alert(
          'Gagal Menyimpan Booking',
          errorMsg
        );
      }
    } catch (err: any) {
      const errText = err?.message || 'Terjadi kesalahan saat menyimpan booking.';
      setSubmitError(errText);
      Alert.alert('Gagal Menyimpan', errText);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateNewCustomer = () => {
    if (!newCustName.trim()) {
      Alert.alert('Peringatan', 'Nama pelanggan wajib diisi.');
      return;
    }
    const tempCust: Customer & { isNew?: boolean } = {
      id: Date.now(),
      name: newCustName.trim(),
      phone: newCustPhone.trim() || '0812-0000-0000',
      nik: newCustNik.trim() || '1271000000000000',
      is_verified: true,
      isNew: true,
    };
    setSelectedCustomer(tempCust);
    setNewCustomerModalVisible(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustNik('');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={handleGoBack}>
            <MaterialIcons name="arrow-back" size={24} color={BrandColors.onSurface} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Tambah Booking Baru</Text>
            <Text style={styles.headerSubtitle}>Formulir Reservasi Sewa</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.cancelTextBtn}
          activeOpacity={0.7}
          onPress={() => {
            Alert.alert(
              'Batalkan Formulir',
              'Apakah Anda yakin ingin membatalkan pengisian formulir reservasi?',
              [
                { text: 'Tidak', style: 'cancel' },
                { text: 'Ya, Batalkan', onPress: handleGoBack },
              ]
            );
          }}>
          <Text style={styles.cancelText}>Batal</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Animated Toast */}
      {toastVisible && (
        <Animated.View style={[styles.floatingToast, { opacity: toastOpacity }]}>
          <MaterialIcons name="done-all" size={20} color={BrandColors.primaryFixed} />
          <View>
            <Text style={styles.toastTitle}>Booking Berhasil Disimpan!</Text>
            <Text style={styles.toastSubtitle}>ID: BK-20261024-ALPHARD dialokasikan.</Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Top Stepper & Info Card */}
        <View style={styles.card}>
          <View style={styles.stepperTopRow}>
            <View style={styles.pulseRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.companyBadgeText}>PT. CAHAYA AUTO NUSANTARA</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.formMainTitle}>Formulir Reservasi Sewa</Text>
            {loadingLookups && <ModernLoadingIndicator size="mini" />}
          </View>
          <Text style={styles.formMainSubtitle}>
            Lengkapi data pemesanan unit armada secara akurat untuk validasi kontrak.
          </Text>
        </View>

        {/* Error Alert Banner jika validasi server gagal */}
        {submitError ? (
          <View style={styles.errorAlertContainer}>
            <View style={styles.errorAlertHeader}>
              <MaterialIcons name="error" size={20} color="#b91c1c" />
              <Text style={styles.errorAlertTitle}>Validasi Server Gagal (422)</Text>
            </View>
            <Text style={styles.errorAlertMessage}>{submitError}</Text>
          </View>
        ) : null}

        {/* CARD 1: Data Pelanggan & Marketing */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBanner}>
            <View style={styles.cardTitleWithIcon}>
              <View style={styles.cardHeaderIconWrap}>
                <MaterialIcons name="person" size={18} color={BrandColors.primary} />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>
                  {isAdmin ? 'Data Pelanggan & Marketing' : 'Data Pelanggan'}
                </Text>
                <Text style={styles.cardHeaderSubtitle}>
                  {isAdmin
                    ? 'Informasi identitas penyewa & penugasan marketing'
                    : 'Informasi identitas penyewa'}
                </Text>
              </View>
            </View>
            <View style={styles.mandatoryBadge}>
              <Text style={styles.mandatoryBadgeText}>Wajib</Text>
            </View>
          </View>

          <View style={styles.cardBodySpacing}>
            {/* Field Marketing - HANYA MUNCUL JIKA USER ADALAH ADMIN */}
            {isAdmin && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Nama Marketing <Text style={styles.textError}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  activeOpacity={0.8}
                  onPress={() => {
                    setPickerType('marketing');
                    setPickerModalVisible(true);
                  }}>
                  <MaterialIcons name="badge" size={19} color={BrandColors.onSurfaceVariant} />
                  <Text style={styles.dropdownInputText} numberOfLines={1}>
                    {selectedMarketing?.name || 'Pilih Marketing'}
                  </Text>
                  <MaterialIcons name="expand-more" size={20} color={BrandColors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            )}

            {/* Field Pilih Customer */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelBetween}>
                <Text style={styles.fieldLabel}>
                  Pilih Customer <Text style={styles.textError}>*</Text>
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setNewCustomerModalVisible(true)}>
                  <Text style={styles.addNewCustLink}>+ Tambah Baru</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.dropdownInput}
                activeOpacity={0.8}
                onPress={() => {
                  setPickerType('customer');
                  setCustomerSearchQuery('');
                  setPickerModalVisible(true);
                }}>
                <MaterialIcons name="account-circle" size={20} color={BrandColors.primary} />
                <Text
                  style={[
                    styles.dropdownInputText,
                    selectedCustomer ? styles.fontSemiBold : { color: BrandColors.onSurfaceVariant },
                  ]}
                  numberOfLines={1}>
                  {selectedCustomer?.name || 'Pilih Customer'}
                </Text>
                <MaterialIcons name="expand-more" size={20} color={BrandColors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* CARD 2: Detail Kendaraan & Tipe Sewa */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBanner}>
            <View style={styles.cardTitleWithIcon}>
              <View style={styles.cardHeaderIconWrap}>
                <MaterialIcons name="directions-car" size={18} color={BrandColors.primary} />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>Detail Kendaraan & Tipe Sewa</Text>
                <Text style={styles.cardHeaderSubtitle}>Penugasan unit operasional</Text>
              </View>
            </View>
            <View style={styles.readyBadge}>
              <Text style={styles.readyBadgeText}>Armada Ready</Text>
            </View>
          </View>

          <View style={styles.cardBodySpacing}>
            {/* Field Tipe Mobil */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelBetween}>
                <Text style={styles.fieldLabel}>
                  Tipe Mobil yang Dipesan <Text style={styles.textError}>*</Text>
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setPickerType('car');
                    setPickerModalVisible(true);
                  }}>
                  <Text style={styles.addNewCustLink}>+ Pilih Tipe Mobil</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.dropdownInput}
                activeOpacity={0.8}
                onPress={() => {
                  setPickerType('car');
                  setPickerModalVisible(true);
                }}>
                <MaterialIcons name="directions-car" size={20} color={BrandColors.primary} />
                <Text style={[styles.dropdownInputText, styles.fontSemiBold]} numberOfLines={1}>
                  {selectedCarType?.name || 'Pilih Tipe Mobil'}
                </Text>
                <MaterialIcons name="expand-more" size={20} color={BrandColors.onSurfaceVariant} />
              </TouchableOpacity>
            </View>

            {/* Field Tipe Sewa Segmented Control */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Tipe Sewa <Text style={styles.textError}>*</Text>
              </Text>

              <View style={styles.segmentedContainer}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    rentalType === 'Lepas Kunci' ? styles.segmentButtonActive : null,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setRentalType('Lepas Kunci')}>
                  <MaterialIcons
                    name="key"
                    size={17}
                    color={rentalType === 'Lepas Kunci' ? '#ffffff' : BrandColors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.segmentButtonText,
                      rentalType === 'Lepas Kunci' ? styles.segmentButtonTextActive : null,
                    ]}>
                    Lepas Kunci
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    rentalType === 'With Driver' ? styles.segmentButtonActive : null,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => setRentalType('With Driver')}>
                  <MaterialIcons
                    name="airline-seat-recline-normal"
                    size={17}
                    color={rentalType === 'With Driver' ? '#ffffff' : BrandColors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.segmentButtonText,
                      rentalType === 'With Driver' ? styles.segmentButtonTextActive : null,
                    ]}>
                    Dengan Sopir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* CARD 3: Jadwal Sewa & Lokasi */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBanner}>
            <View style={styles.cardTitleWithIcon}>
              <View style={styles.cardHeaderIconWrap}>
                <MaterialIcons name="calendar-today" size={18} color={BrandColors.primary} />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>Jadwal Sewa & Lokasi</Text>
                <Text style={styles.cardHeaderSubtitle}>Itinerary & pool tujuan</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardBodySpacing}>
            {/* Tanggal Sewa & Jam Pengambilan */}
            <View style={styles.gridTwoCol}>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabelSmall}>
                  Tanggal Sewa <Text style={styles.textError}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.iconTextInput}
                  activeOpacity={0.8}
                  onPress={() => openDatePicker('start')}>
                  <MaterialIcons name="calendar-today" size={16} color={BrandColors.primary} />
                  <Text
                    style={[
                      styles.textInputStyle,
                      styles.dateDisplayText,
                      !startDate ? { color: '#9ca5af' } : null,
                    ]}
                    numberOfLines={1}>
                    {startDate || 'Pilih Tanggal'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color={BrandColors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.fieldLabelSmall}>
                  Jam Pengambilan <Text style={styles.textError}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.iconTextInput}
                  activeOpacity={0.8}
                  onPress={() => openTimePicker('pickup')}>
                  <MaterialIcons name="schedule" size={16} color={BrandColors.primary} />
                  <Text style={[styles.textInputStyle, styles.dateDisplayText]} numberOfLines={1}>
                    {pickupTime}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color={BrandColors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Tanggal Balik & Jam Pengembalian */}
            <View style={styles.gridTwoCol}>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabelSmall}>
                  Tanggal Balik <Text style={styles.textError}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.iconTextInput}
                  activeOpacity={0.8}
                  onPress={() => openDatePicker('end')}>
                  <MaterialIcons name="event-repeat" size={16} color={BrandColors.primary} />
                  <Text
                    style={[
                      styles.textInputStyle,
                      styles.dateDisplayText,
                      !endDate ? { color: '#9ca5af' } : null,
                    ]}
                    numberOfLines={1}>
                    {endDate || 'Pilih Tanggal'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color={BrandColors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.fieldLabelSmall}>
                  Jam Pengembalian <Text style={styles.textError}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.iconTextInput}
                  activeOpacity={0.8}
                  onPress={() => openTimePicker('return')}>
                  <MaterialIcons name="find-replace" size={16} color={BrandColors.primary} />
                  <Text style={[styles.textInputStyle, styles.dateDisplayText]} numberOfLines={1}>
                    {returnTime}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={18} color={BrandColors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Durasi Hari Counter Stepper */}
            <View style={styles.durationCounterBox}>
              <View style={styles.durationLeft}>
                <MaterialIcons name="timelapse" size={20} color={BrandColors.primary} />
                <View>
                  <Text style={styles.durationTitle}>Durasi Sewa (Hari)</Text>
                  <Text style={styles.durationSubtitle}>Terhitung 24 Jam / Hari</Text>
                </View>
              </View>

              <View style={styles.stepperPill}>
                <TouchableOpacity
                  style={styles.stepperMiniBtn}
                  activeOpacity={0.7}
                  onPress={() => adjustDuration(-1)}>
                  <MaterialIcons name="remove" size={16} color={BrandColors.onSurface} />
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.stepperValueText,
                    {
                      minWidth: 32,
                      textAlign: 'center',
                      paddingVertical: 0,
                      paddingHorizontal: 4,
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca5af"
                  value={durationDays !== '' && durationDays !== undefined ? String(durationDays) : ''}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9]/g, '');
                    setDurationDays(clean ? parseInt(clean, 10) : '');
                  }}
                />
                <Text style={styles.stepperUnitText}>Hari</Text>

                <TouchableOpacity
                  style={[styles.stepperMiniBtn, { backgroundColor: BrandColors.primary }]}
                  activeOpacity={0.7}
                  onPress={() => adjustDuration(1)}>
                  <MaterialIcons name="add" size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Tempat Pengambilan */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Tempat Pengambilan <Text style={styles.textError}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                activeOpacity={0.8}
                onPress={() => {
                  setPickerType('pickup');
                  setPickerModalVisible(true);
                }}>
                <MaterialIcons name="pin-drop" size={20} color={BrandColors.primary} />
                <Text style={styles.dropdownInputText} numberOfLines={1}>
                  {pickupLocation}
                </Text>
                <MaterialIcons name="expand-more" size={20} color={BrandColors.onSurfaceVariant} />
              </TouchableOpacity>

              {/* Box input jika pilih Lokasi Lain */}
              {pickupLocation === 'Lokasi Lain' && (
                <View style={styles.customLocationBox}>
                  <MaterialIcons name="edit-location-alt" size={18} color={BrandColors.primary} />
                  <TextInput
                    style={styles.customLocationInput}
                    placeholder="Tuliskan alamat/lokasi penjemputan lengkap..."
                    placeholderTextColor="#9ca5af"
                    value={customPickupLocation}
                    onChangeText={setCustomPickupLocation}
                  />
                </View>
              )}
            </View>

            {/* Tempat Pengantaran / Pengembalian */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Tempat Pengantaran / Pengembalian <Text style={styles.textError}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                activeOpacity={0.8}
                onPress={() => {
                  setPickerType('dropoff');
                  setPickerModalVisible(true);
                }}>
                <MaterialIcons name="flag" size={20} color={BrandColors.secondary} />
                <Text style={styles.dropdownInputText} numberOfLines={1}>
                  {dropoffLocation}
                </Text>
                <MaterialIcons name="expand-more" size={20} color={BrandColors.onSurfaceVariant} />
              </TouchableOpacity>

              {/* Box input jika pilih Lokasi Lain */}
              {dropoffLocation === 'Lokasi Lain' && (
                <View style={styles.customLocationBox}>
                  <MaterialIcons name="edit-location-alt" size={18} color={BrandColors.secondary} />
                  <TextInput
                    style={styles.customLocationInput}
                    placeholder="Tuliskan alamat/lokasi pengantaran lengkap..."
                    placeholderTextColor="#9ca5af"
                    value={customDropoffLocation}
                    onChangeText={setCustomDropoffLocation}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* CARD 4: Tarif Sewa & Pembayaran */}
        <View style={styles.card}>
          <View style={styles.cardHeaderBanner}>
            <View style={styles.cardTitleWithIcon}>
              <View style={styles.cardHeaderIconWrap}>
                <MaterialIcons name="payments" size={18} color={BrandColors.primary} />
              </View>
              <View>
                <Text style={styles.cardHeaderTitle}>Tarif Sewa & Pembayaran</Text>
                <Text style={styles.cardHeaderSubtitle}>Rincian invoice & deposit</Text>
              </View>
            </View>
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyBadgeText}>IDR (Rp)</Text>
            </View>
          </View>

          <View style={styles.cardBodySpacing}>
            {/* Metode Bayar & Jumlah DP (Kondisional: Jumlah DP hanya tampil jika DP dipilih) */}
            {paymentMethod === 'DP (Down Payment)' ? (
              <View style={styles.gridTwoCol}>
                <View style={styles.colHalf}>
                  <Text style={styles.fieldLabelSmall}>
                    Metode Bayar <Text style={styles.textError}>*</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.iconTextInput}
                    activeOpacity={0.8}
                    onPress={() => {
                      setPickerType('payment');
                      setPickerModalVisible(true);
                    }}>
                    <MaterialIcons name="account-balance-wallet" size={16} color={BrandColors.primary} />
                    <Text style={[styles.textInputStyle, { fontWeight: '600' }]} numberOfLines={1}>
                      {paymentMethod}
                    </Text>
                    <MaterialIcons name="expand-more" size={18} color={BrandColors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.fieldLabelSmall}>
                    Jumlah DP (Rp) <Text style={styles.textError}>*</Text>
                  </Text>
                  <View style={styles.iconTextInput}>
                    <MaterialIcons name="price-check" size={16} color={BrandColors.primary} />
                    <TextInput
                      style={[styles.textInputStyle, { color: BrandColors.primary, fontWeight: '700' }]}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#9ca5af"
                      value={dpAmount > 0 ? String(dpAmount) : ''}
                      onChangeText={(txt) => setDpAmount(Number(txt.replace(/[^0-9]/g, '')) || 0)}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabelSmall}>
                  Metode Bayar <Text style={styles.textError}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.iconTextInput}
                  activeOpacity={0.8}
                  onPress={() => {
                    setPickerType('payment');
                    setPickerModalVisible(true);
                  }}>
                  <MaterialIcons name="account-balance-wallet" size={16} color={BrandColors.primary} />
                  <Text style={[styles.textInputStyle, { fontWeight: '600' }]} numberOfLines={1}>
                    {paymentMethod}
                  </Text>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>Pelunasan Penuh (100%)</Text>
                  </View>
                  <MaterialIcons name="expand-more" size={18} color={BrandColors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            )}

            {/* Harga Sewa & Pilihan Tarif */}
            <View style={styles.gridTwoCol}>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabelSmall}>
                  Harga Sewa (Rp) <Text style={styles.textError}>*</Text>
                </Text>
                <View style={styles.iconTextInput}>
                  <MaterialIcons name="sell" size={16} color={BrandColors.primary} />
                  <TextInput
                    style={[styles.textInputStyle, { fontWeight: '700' }]}
                    keyboardType="numeric"
                    placeholder="Contoh: 350000"
                    placeholderTextColor="#9ca5af"
                    value={ratePerDay > 0 ? String(ratePerDay) : ''}
                    onChangeText={(txt) => setRatePerDay(Number(txt.replace(/[^0-9]/g, '')) || 0)}
                  />
                </View>
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.fieldLabelSmall}>
                  Pilihan Tarif <Text style={styles.textError}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.iconTextInput}
                  activeOpacity={0.8}
                  onPress={() => {
                    setPickerType('rate_type');
                    setPickerModalVisible(true);
                  }}>
                  <MaterialIcons name="timer" size={16} color={BrandColors.primary} />
                  <Text style={[styles.textInputStyle, { fontWeight: '600' }]} numberOfLines={1}>
                    {rateType}
                  </Text>
                  <MaterialIcons name="expand-more" size={18} color={BrandColors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Fee Pengantaran & Fee Pengambilan */}
            <View style={styles.gridTwoCol}>
              <View style={styles.colHalf}>
                <Text style={styles.fieldLabelSmall}>Fee Pengantaran (Rp)</Text>
                <View style={styles.iconTextInput}>
                  <MaterialIcons name="local-shipping" size={16} color={BrandColors.onSurfaceVariant} />
                  <TextInput
                    style={styles.textInputStyle}
                    keyboardType="numeric"
                    placeholder="0"
                    value={deliveryFee > 0 ? String(deliveryFee) : ''}
                    onChangeText={(txt) => setDeliveryFee(Number(txt.replace(/[^0-9]/g, '')) || 0)}
                  />
                </View>
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.fieldLabelSmall}>Fee Pengambilan (Rp)</Text>
                <View style={styles.iconTextInput}>
                  <MaterialIcons name="assignment-return" size={16} color={BrandColors.onSurfaceVariant} />
                  <TextInput
                    style={styles.textInputStyle}
                    keyboardType="numeric"
                    placeholder="0"
                    value={pickupFee > 0 ? String(pickupFee) : ''}
                    onChangeText={(txt) => setPickupFee(Number(txt.replace(/[^0-9]/g, '')) || 0)}
                  />
                </View>
                <Text style={styles.freePromoNote}>Free promo pool drop</Text>
              </View>
            </View>

            {/* Catatan Tambahan */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabelSmall}>Catatan Khusus</Text>
              <TextInput
                style={styles.notesTextArea}
                multiline
                numberOfLines={2}
                value={notes}
                onChangeText={setNotes}
                placeholder="Catatan permintaan unit, wangi non-rokok, dll..."
              />
            </View>

            {/* SUMMARY CARD ESTIMASI TOTAL TARIF (Prominent Navy Box) */}
            <View style={styles.navySummaryCard}>
              <View style={styles.navySummaryHeader}>
                <View style={styles.navyHeaderLeft}>
                  <MaterialIcons name="calculate" size={19} color={BrandColors.primaryFixed} />
                  <Text style={styles.navyHeaderTitle}>REKAPITULASI TAGIHAN</Text>
                </View>
                <View style={styles.navyBadge}>
                  <Text style={styles.navyBadgeText}>Resmi Sistem</Text>
                </View>
              </View>

              <View style={styles.navyFormulaList}>
                <View style={styles.navyFormulaRow}>
                  <Text style={styles.navyFormulaLabel}>
                    Sewa ({numericDuration} {rateType === 'Hari' ? 'Hari' : 'x 24 Jam'} × {formatRupiah(ratePerDay)})
                  </Text>
                  <Text style={styles.navyFormulaValue}>{formatRupiah(totalRent)}</Text>
                </View>
                <View style={styles.navyFormulaRow}>
                  <Text style={styles.navyFormulaLabel}>Fee Pengantaran Unit Bandara</Text>
                  <Text style={styles.navyFormulaValue}>{formatRupiah(deliveryFee)}</Text>
                </View>
                <View style={styles.navyFormulaRow}>
                  <Text style={styles.navyFormulaLabel}>Fee Pengambilan Unit Pool</Text>
                  <Text style={styles.navyFormulaValue}>{formatRupiah(pickupFee)}</Text>
                </View>
              </View>

              {/* Grand Total Row */}
              <View style={styles.navyGrandTotalSection}>
                <View style={styles.navyTotalRow}>
                  <Text style={styles.navyTotalLabel}>TOTAL ESTIMASI TARIF:</Text>
                  <Text style={styles.navyTotalValue}>{formatRupiah(grandTotal)}</Text>
                </View>

                {/* DP & Sisa Bar */}
                <View style={styles.navyDpBar}>
                  <View style={styles.navyDpLeft}>
                    <MaterialIcons name="credit-score" size={15} color={BrandColors.secondaryContainer} />
                    <Text style={styles.navyDpText}>
                      {isDP ? 'DP: ' : 'Bayar: '}
                      <Text style={styles.fontBold}>{isDP ? formatRupiah(dpAmount) : formatRupiah(grandTotal)}</Text>
                    </Text>
                  </View>
                  <View style={styles.navyDpRight}>
                    <Text style={styles.navyRemainingText}>
                      Sisa: <Text style={[styles.fontBold, { color: BrandColors.primaryFixed }]}>{formatRupiah(remaining)}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Insurance Protection Note */}
            <View style={styles.insuranceBox}>
              <MaterialIcons name="verified-user" size={18} color={BrandColors.primary} />
              <Text style={styles.insuranceText}>
                Unit dilindungi asuransi All-Risk. Data pemesanan ini langsung disinkronkan ke jadwal dispatch armada.
              </Text>
            </View>
          </View>
        </View>

        {/* Error Alert Banner di atas tombol aksi */}
        {submitError ? (
          <View style={[styles.errorAlertContainer, { marginBottom: 12 }]}>
            <View style={styles.errorAlertHeader}>
              <MaterialIcons name="error-outline" size={18} color="#b91c1c" />
              <Text style={styles.errorAlertTitle}>Mohon Periksa Data Formulir</Text>
            </View>
            <Text style={styles.errorAlertMessage}>{submitError}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.bottomButtonsRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.8}
            onPress={handleGoBack}>
            <Text style={styles.cancelBtnText}>Batal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitBtn}
            activeOpacity={0.85}
            disabled={submitting}
            onPress={handleSaveBooking}>
            {submitting ? (
              <ModernLoadingIndicator size="mini" color="#ffffff" accentColor="#ffddb8" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                <Text style={styles.submitBtnText}>Simpan Booking</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Picker Modal (Generic for Marketing, Customer, Car, Locations) */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerType === 'marketing'
                  ? 'Pilih Marketing'
                  : pickerType === 'customer'
                    ? 'Pilih Customer'
                    : pickerType === 'car'
                      ? 'Pilih Tipe & Jenis Mobil'
                      : pickerType === 'pickup'
                        ? 'Pilih Lokasi Pengambilan'
                        : pickerType === 'dropoff'
                          ? 'Pilih Lokasi Pengantaran'
                          : pickerType === 'payment'
                            ? 'Pilih Metode Pembayaran'
                            : 'Pilih Skema Tarif'}
              </Text>
              <TouchableOpacity onPress={() => setPickerModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={BrandColors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Search Input Khusus Pilihan Customer */}
            {pickerType === 'customer' && (
              <View style={styles.modalSearchBox}>
                <MaterialIcons name="search" size={20} color={BrandColors.primary} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Cari nama, no. HP, atau NIK konsumen..."
                  placeholderTextColor={BrandColors.onSurfaceVariant}
                  value={customerSearchQuery}
                  onChangeText={setCustomerSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {customerSearchQuery ? (
                  <TouchableOpacity
                    onPress={() => setCustomerSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="cancel" size={18} color={BrandColors.onSurfaceVariant} />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              {pickerType === 'marketing' &&
                (lookups?.marketing_users || [
                  { id: 1, name: 'Budi Santoso - Fleet Ops' },
                  { id: 2, name: 'Diana Putri - Corporate Sales' },
                  { id: 3, name: 'Reza Aditya - Executive Desk' },
                ]).map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedMarketing(item);
                      setPickerModalVisible(false);
                    }}>
                    <Text style={styles.pickerItemText}>{item.name}</Text>
                    {selectedMarketing?.id === item.id && (
                      <MaterialIcons name="check" size={18} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

              {pickerType === 'customer' && (() => {
                const rawCustomers = (lookups?.customers || []).filter((item: any) => {
                  if (isAdmin) return true;
                  // Hanya muncul konsumen yang terikat dengan marketing ini
                  return !item.user_id || item.user_id === currentUser?.id;
                });
                const query = customerSearchQuery.trim().toLowerCase();
                const filtered = query
                  ? rawCustomers.filter((item: any) => {
                    const name = (item.name || '').toLowerCase();
                    const phone = (item.phone || '').toLowerCase();
                    const nik = (item.nik || '').toLowerCase();
                    return name.includes(query) || phone.includes(query) || nik.includes(query);
                  })
                  : rawCustomers;

                if (filtered.length === 0) {
                  return (
                    <View style={styles.pickerEmptyBox}>
                      <MaterialIcons name="person-search" size={40} color={BrandColors.onSurfaceVariant} />
                      <Text style={styles.pickerEmptyTitle}>
                        {customerSearchQuery ? 'Konsumen Tidak Ditemukan' : 'Belum Ada Konsumen'}
                      </Text>
                      <Text style={styles.pickerEmptyDesc}>
                        {customerSearchQuery
                          ? `Tidak ada data konsumen yang cocok dengan "${customerSearchQuery}"`
                          : !isAdmin
                            ? 'Belum ada konsumen yang terikat dengan akun marketing Anda.'
                            : 'Belum ada data konsumen di sistem.'}
                      </Text>
                      <TouchableOpacity
                        style={styles.pickerAddNewBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          setPickerModalVisible(false);
                          setNewCustName(customerSearchQuery);
                          setNewCustomerModalVisible(true);
                        }}>
                        <MaterialIcons name="person-add" size={16} color="#ffffff" />
                        <Text style={styles.pickerAddNewBtnText}>
                          + Tambah {customerSearchQuery ? `"${customerSearchQuery}"` : 'Pelanggan'} Baru
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <>
                    {customerSearchQuery.trim() ? (
                      <View style={styles.searchResultBadge}>
                        <Text style={styles.searchResultBadgeText}>
                          Ditemukan {filtered.length} konsumen
                        </Text>
                      </View>
                    ) : null}
                    {filtered.map((item: any) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.pickerItem}
                        onPress={() => {
                          setSelectedCustomer(item);
                          setPickerModalVisible(false);
                          setCustomerSearchQuery('');
                        }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.pickerItemText}>{item.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            {item.phone ? <Text style={styles.pickerItemSub}>{item.phone}</Text> : null}
                            {item.nik ? (
                              <Text style={[styles.pickerItemSub, { color: BrandColors.primary }]}>
                                NIK: {item.nik}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        {selectedCustomer?.id === item.id && (
                          <MaterialIcons name="check" size={18} color={BrandColors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </>
                );
              })()}

              {pickerType === 'car' &&
                (lookups?.car_types || [
                  { id: 1, name: 'Brio' },
                  { id: 2, name: 'Avanza' },
                  { id: 3, name: 'Innova Reborn' },
                  { id: 4, name: 'Innova Zenix' },
                  { id: 5, name: 'Fortuner' },
                  { id: 6, name: 'Alphard' },
                  { id: 7, name: 'HiAce Premio' },
                ]).map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setSelectedCarType(item);
                      setPickerModalVisible(false);
                    }}>
                    <Text style={styles.pickerItemText}>{item.name}</Text>
                    {selectedCarType?.id === item.id && (
                      <MaterialIcons name="check" size={18} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

              {(pickerType === 'pickup' || pickerType === 'dropoff') &&
                [
                  'Garasi',
                  'Bandara',
                  'Mataram',
                  'Pelabuhan Lembar',
                  'Senggigi',
                  'Kuta Mandalika',
                  'Pelabuhan Bangsal',
                  'Lokasi Lain',
                ].map((loc, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.pickerItem}
                    onPress={() => {
                      if (pickerType === 'pickup') setPickupLocation(loc);
                      else setDropoffLocation(loc);
                      setPickerModalVisible(false);
                    }}>
                    <Text style={styles.pickerItemText}>{loc}</Text>
                  </TouchableOpacity>
                ))}

              {pickerType === 'payment' &&
                PAYMENT_METHODS.map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={styles.pickerItem}
                    onPress={() => {
                      setPaymentMethod(method);
                      if (method !== 'DP (Down Payment)') {
                        setDpAmount(0);
                      }
                      setPickerModalVisible(false);
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <MaterialIcons
                        name={
                          method === 'Cash'
                            ? 'payments'
                            : method === 'Transfer'
                              ? 'account-balance'
                              : 'price-check'
                        }
                        size={20}
                        color={paymentMethod === method ? BrandColors.primary : BrandColors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.pickerItemText,
                          paymentMethod === method ? { color: BrandColors.primary, fontWeight: '700' } : null,
                        ]}>
                        {method}
                      </Text>
                    </View>
                    {paymentMethod === method && (
                      <MaterialIcons name="check" size={20} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

              {pickerType === 'rate_type' &&
                RATE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.pickerItem}
                    onPress={() => {
                      setRateType(type);
                      setPickerModalVisible(false);
                    }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <MaterialIcons
                        name={type === 'Hari' ? 'calendar-view-day' : 'timelapse'}
                        size={20}
                        color={rateType === type ? BrandColors.primary : BrandColors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.pickerItemText,
                          rateType === type ? { color: BrandColors.primary, fontWeight: '700' } : null,
                        ]}>
                        {type}
                      </Text>
                    </View>
                    {rateType === type && (
                      <MaterialIcons name="check" size={20} color={BrandColors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Tambah Customer Baru */}
      <Modal
        visible={newCustomerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewCustomerModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Pelanggan Baru</Text>
              <TouchableOpacity onPress={() => setNewCustomerModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={BrandColors.onSurface} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, paddingVertical: 10 }}>
              <View>
                <Text style={styles.fieldLabelSmall}>Nama Lengkap *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Contoh: A. Fadli Akbar"
                  value={newCustName}
                  onChangeText={setNewCustName}
                />
              </View>

              <View>
                <Text style={styles.fieldLabelSmall}>No. Telepon / WhatsApp *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Contoh: 081244910082"
                  keyboardType="phone-pad"
                  value={newCustPhone}
                  onChangeText={setNewCustPhone}
                />
              </View>

              <View>
                <Text style={styles.fieldLabelSmall}>NIK / No. KTP</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Contoh: 1271040000000000"
                  keyboardType="numeric"
                  value={newCustNik}
                  onChangeText={setNewCustNik}
                />
              </View>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                activeOpacity={0.85}
                onPress={handleCreateNewCustomer}>
                <Text style={styles.modalSaveBtnText}>Gunakan Pelanggan Ini</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal (Kalender Interaktif) */}
      <CalendarPickerModal
        visible={dateModalVisible}
        onClose={() => setDateModalVisible(false)}
        selectedDate={dateTarget === 'start' ? startDate : endDate}
        onSelectDate={handleSelectDate}
        title={dateTarget === 'start' ? 'Pilih Tanggal Sewa' : 'Pilih Tanggal Balik'}
        subtitle={dateTarget === 'start' ? 'Target: Mulai Pengambilan Unit' : 'Target: Jadwal Pengembalian Unit'}
      />

      {/* Time Picker Modal (Pilihan Jam) */}
      <Modal
        visible={timeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeModalVisible(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.timeModalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {timeTarget === 'pickup' ? 'Pilih Jam Pengambilan' : 'Pilih Jam Pengembalian'}
                </Text>
                <Text style={styles.calendarModalSubtitle}>Pilih waktu serah terima unit</Text>
              </View>
              <TouchableOpacity onPress={() => setTimeModalVisible(false)}>
                <MaterialIcons name="close" size={22} color={BrandColors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Pilihan Jam Operasional Grid */}
            <Text style={styles.presetSectionTitle}>Pilihan Jam Operasional</Text>
            <View style={styles.timePresetsGrid}>
              {PRESET_TIMES.map((timeStr) => {
                const currentVal = timeTarget === 'pickup' ? pickupTime : returnTime;
                const isSelected = currentVal === timeStr;
                return (
                  <TouchableOpacity
                    key={timeStr}
                    style={[
                      styles.timePresetPill,
                      isSelected ? styles.timePresetPillSelected : null,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSelectTime(timeStr)}>
                    <Text
                      style={[
                        styles.timePresetPillText,
                        isSelected ? styles.timePresetPillTextSelected : null,
                      ]}>
                      {timeStr}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Time Input */}
            <View style={styles.customTimeBox}>
              <Text style={styles.fieldLabelSmall}>Atau Masukkan Jam Tertentu:</Text>
              <View style={styles.customTimeRow}>
                <TextInput
                  style={styles.customTimeInput}
                  value={customTimeInput}
                  onChangeText={setCustomTimeInput}
                  placeholder="Contoh: 08:30"
                  placeholderTextColor={BrandColors.outline}
                />
                <TouchableOpacity
                  style={styles.customTimeSaveBtn}
                  onPress={() => {
                    if (customTimeInput.trim()) {
                      handleSelectTime(customTimeInput.trim());
                    }
                  }}>
                  <Text style={styles.customTimeSaveBtnText}>Pilih</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modern Loading Overlay saat menyimpan booking */}
      <ModernLoadingOverlay
        visible={submitting}
        title="Menyimpan Booking"
        message="Sedang mendaftarkan reservasi unit ke sistem armada CAN..."
      />
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
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  cancelTextBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  floatingToast: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    backgroundColor: BrandColors.inverseSurface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 999,
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.inverseOnSurface,
  },
  toastSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  stepperTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.primary,
  },
  companyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BrandColors.primary,
    letterSpacing: 0.5,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: BrandColors.surfaceContainer,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  formMainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  formMainSubtitle: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },
  stepperGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  stepperCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  stepBar: {
    width: '100%',
    height: 5,
    borderRadius: 3,
  },
  stepTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    marginHorizontal: -16,
    marginTop: -16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: 14,
  },
  cardTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
  },
  mandatoryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: BrandColors.primaryFixed,
  },
  mandatoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  readyBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceContainerHigh,
  },
  readyBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.onSurface,
  },
  wibBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: BrandColors.surfaceContainer,
  },
  wibBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  currencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: BrandColors.secondaryFixed,
  },
  currencyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.onSecondaryFixedVariant,
  },
  cardBodySpacing: {
    gap: 12,
  },
  fieldGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  fieldLabelSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
    marginBottom: 4,
  },
  fieldLabelBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addNewCustLink: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  textError: {
    color: BrandColors.error,
    fontWeight: '700',
  },
  dropdownInput: {
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.surfaceContainerLow,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownInputText: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.onSurface,
  },
  customLocationBox: {
    marginTop: 6,
    height: 44,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: BrandColors.primaryFixed,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customLocationInput: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.onSurface,
    paddingVertical: 0,
  },
  fontSemiBold: {
    fontWeight: '600',
  },
  customerSnapshotBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  custSnapshotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  custMiniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  custMiniAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  custVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  custSnapshotName: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  vipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: BrandColors.primaryFixed,
  },
  vipTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  custSnapshotPhone: {
    fontSize: 10,
    color: BrandColors.onSurfaceVariant,
    marginTop: 1,
  },
  callIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitSnapshotBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unitSnapshotIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitSnapshotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitSnapshotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  executiveTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: BrandColors.secondaryFixed,
  },
  executiveTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: BrandColors.onSecondaryFixedVariant,
  },
  unitSnapshotDesc: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },
  plateNumberText: {
    fontWeight: '700',
    color: BrandColors.primary,
  },
  segmentedContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 24,
    backgroundColor: BrandColors.surfaceContainer,
  },
  segmentButton: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  segmentButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  gridTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  iconTextInput: {
    height: 42,
    borderRadius: 21,
    backgroundColor: BrandColors.surfaceContainerLow,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textInputStyle: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.onSurface,
    padding: 0,
  },
  freePromoNote: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.primary,
    marginTop: 3,
    paddingLeft: 6,
  },
  durationCounterBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  durationSubtitle: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  stepperMiniBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BrandColors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.primary,
    minWidth: 20,
    textAlign: 'center',
  },
  stepperUnitText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurface,
    marginRight: 4,
  },
  notesTextArea: {
    height: 60,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceContainerLow,
    padding: 10,
    fontSize: 12,
    color: BrandColors.onSurface,
    textAlignVertical: 'top',
  },
  navySummaryCard: {
    borderRadius: 16,
    backgroundColor: BrandColors.primary,
    padding: 16,
    marginTop: 6,
    shadowColor: BrandColors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  navySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  navyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navyHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: BrandColors.primaryFixed,
    letterSpacing: 0.6,
  },
  navyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  navyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  navyFormulaList: {
    paddingVertical: 8,
    gap: 4,
  },
  navyFormulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navyFormulaLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  navyFormulaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  navyGrandTotalSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  navyTotalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  navyTotalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.primaryFixed,
  },
  navyTotalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  navyDpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  navyDpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navyDpText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  fontBold: {
    fontWeight: '700',
  },
  navyDpRight: {},
  navyRemainingText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  insuranceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BrandColors.surfaceContainer,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  insuranceText: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    flex: 1,
    lineHeight: 15,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.onSurface,
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    backgroundColor: BrandColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: BrandColors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerItemText: {
    fontSize: 14,
    color: BrandColors.onSurface,
    fontWeight: '500',
  },
  pickerItemSub: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },
  modalTextInput: {
    height: 44,
    borderRadius: 12,
    backgroundColor: BrandColors.surfaceContainerLow,
    paddingHorizontal: 12,
    fontSize: 13,
    color: BrandColors.onSurface,
    marginTop: 4,
  },
  modalSaveBtn: {
    height: 46,
    borderRadius: 23,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dateDisplayText: {
    fontWeight: '600',
    paddingVertical: 10,
  },
  calendarModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  calendarModalSubtitle: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },
  calendarMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
    paddingHorizontal: 4,
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  sundayText: {
    color: BrandColors.error,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: `${100 / 7}%`,
    height: 40,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  dayCellSelected: {
    backgroundColor: BrandColors.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: BrandColors.primary,
  },
  dayCellText: {
    fontSize: 13,
    color: BrandColors.onSurface,
    fontWeight: '500',
  },
  dayCellTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dayCellTextToday: {
    color: BrandColors.primary,
    fontWeight: '700',
  },
  calendarQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: BrandColors.primaryFixed,
  },
  quickActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  timeModalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  presetSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.onSurface,
    marginTop: 14,
    marginBottom: 8,
  },
  timePresetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timePresetPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: BrandColors.surfaceContainerLow,
  },
  timePresetPillSelected: {
    backgroundColor: BrandColors.primary,
  },
  timePresetPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.onSurface,
  },
  timePresetPillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  customTimeBox: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 6,
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customTimeInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: BrandColors.surfaceContainerLow,
    paddingHorizontal: 12,
    fontSize: 13,
    color: BrandColors.onSurface,
  },
  customTimeSaveBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTimeSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  paidBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: BrandColors.surfaceContainerHigh,
    marginRight: 6,
  },
  paidBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  errorAlertContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  errorAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  errorAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorAlertMessage: {
    fontSize: 13,
    color: '#b91c1c',
    lineHeight: 19,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.onSurface,
    paddingVertical: 0,
  },
  searchResultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: BrandColors.surfaceContainer,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  searchResultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  pickerEmptyBox: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.onSurface,
    marginTop: 8,
  },
  pickerEmptyDesc: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 17,
  },
  pickerAddNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  pickerAddNewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
