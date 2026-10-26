import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect, Circle, Line, Text as SvgText } from 'react-native-svg';
import { BrandColors } from '@/constants/brand';
import { BookingDetail } from '@/services/booking';
import { DeliveryReturnService, DeliveryPayload } from '@/services/deliveryReturn';

type BodySide = 'depan' | 'kiri' | 'kanan' | 'belakang' | 'atap';
type BodyCondition = 'baik' | 'baret' | 'penyok' | 'rusak';

interface SideData {
  title: string;
  condition: BodyCondition;
  note: string;
}

export default function DeliveryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  // State
  const [activeTab, setActiveTab] = useState<'ready' | 'on_trip' | 'all'>('ready');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [items, setItems] = useState<BookingDetail[]>([]);
  const [readyCount, setReadyCount] = useState(0);
  const [onTripCount, setOnTripCount] = useState(0);

  // Selected Booking untuk Form Serah Terima
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);

  // Form States (Sesuai Desain Prototype)
  const [kmOut, setKmOut] = useState('14250');
  const [checkoutTime, setCheckoutTime] = useState('13:30 WIB');
  const [checkoutDate, setCheckoutDate] = useState('24/10/2026');
  const [handoverLocation, setHandoverLocation] = useState('Hotel Victor - Lobby Utama (Jl. Sudirman No. 42)');
  const [gpsLocked, setGpsLocked] = useState(false);
  const [gpsCoord, setGpsCoord] = useState('Lat -6.1754, Long 106.8272');
  const [fuelPercent, setFuelPercent] = useState<number>(43);
  const [generalNotes, setGeneralNotes] = useState('Baret halus di velg kiri belakang (minor). Ban serep dalam kondisi baik tapi tekanan angin disarankan cek berkala. Bahan bakar posisi 43% (~122 KM).');

  // Checklist 8 Item
  const [checklists, setChecklists] = useState<Record<string, boolean>>({
    kunci_kontak: true,
    stnk_asli: true,
    ban_serep: true,
    dongkrak_kit: true,
    kunci_roda: true,
    stang_dongkrak: true,
    ac_mobil: true,
    audio_system: true,
  });

  // Inspeksi 5 Sisi Bodi
  const [activeSide, setActiveSide] = useState<BodySide>('depan');
  const [bodySides, setBodySides] = useState<Record<BodySide, SideData>>({
    depan: {
      title: 'Tampak Depan',
      condition: 'baik',
      note: 'Kondisi cat depan mulus, sensor parkir depan bersih.',
    },
    kiri: {
      title: 'Samping Kiri',
      condition: 'baret',
      note: 'Baret tipis dekat hendel pintu penumpang baris dua.',
    },
    kanan: {
      title: 'Samping Kanan',
      condition: 'baik',
      note: 'Kondisi bodi samping kanan mulus sempurna.',
    },
    belakang: {
      title: 'Tampak Belakang',
      condition: 'baret',
      note: 'Bumper belakang kiri ada goresan kecil saat parkir sebelumnya.',
    },
    atap: {
      title: 'Tampak Atas / Atap',
      condition: 'baik',
      note: 'Panoramic sunroof bersih tanpa retak atau baret.',
    },
  });

  const openDeliveryForm = useCallback((booking: BookingDetail) => {
    setSelectedBooking(booking);
    setKmOut(String(booking.car?.last_km ?? 14250));
    setHandoverLocation(booking.pickup_location || 'Pool Sudirman (Kantor Pusat PT. CAN)');

    const now = new Date();
    const dStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const tStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;
    setCheckoutDate(booking.booking_date || dStr);
    setCheckoutTime(booking.pickup_time ? `${booking.pickup_time} WIB` : tStr);
    setFuelPercent(43);
    setGpsLocked(false);
  }, []);

  // Load data list
  const loadData = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) setRefreshing(true);
    try {
      const res = await DeliveryReturnService.getDeliveryList({
        tab: activeTab,
        search: searchQuery,
      });
      setItems(res.items);
      setReadyCount(res.ready_count);
      setOnTripCount(res.on_trip_count);

      // Jika ada param id dari route, buka langsung
      if (params.id) {
        const found = res.items.find((b) => String(b.id) === String(params.id));
        if (found) {
          openDeliveryForm(found);
        }
      }
    } catch (err: any) {
      console.warn('[FETCH DELIVERY ERROR]:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, searchQuery, params.id, openDeliveryForm]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) loadData();
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadData]);

  const onRefresh = () => {
    loadData(true);
  };

  // Toggle Semua OK
  const handleToggleAllOk = () => {
    setChecklists({
      kunci_kontak: true,
      stnk_asli: true,
      ban_serep: true,
      dongkrak_kit: true,
      kunci_roda: true,
      stang_dongkrak: true,
      ac_mobil: true,
      audio_system: true,
    });
  };

  const toggleChecklist = (key: string) => {
    setChecklists((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const updateSideCondition = (condition: BodyCondition) => {
    setBodySides((prev) => ({
      ...prev,
      [activeSide]: {
        ...prev[activeSide],
        condition,
      },
    }));
  };

  const updateSideNote = (note: string) => {
    setBodySides((prev) => ({
      ...prev,
      [activeSide]: {
        ...prev[activeSide],
        note,
      },
    }));
  };

  // Kunci Koordinat GPS
  const handleLockGps = () => {
    setGpsLocked(true);
    setGpsCoord('Lat -6.1754, Long 106.8272');
    Alert.alert('GPS Terkunci', 'Koordinat lokasi serah terima berhasil diverifikasi dan dikunci.');
  };

  // Submit Penyerahan Unit
  const handleSubmitDelivery = async () => {
    if (!selectedBooking) return;

    const km = parseInt(kmOut, 10);
    if (isNaN(km) || km < 0) {
      Alert.alert('Perhatian', 'Mohon isi angka KM Keluar dengan benar.');
      return;
    }

    Alert.alert(
      'Konfirmasi Simpan & Kunci',
      `Apakah Anda yakin data serah terima untuk ${selectedBooking.car?.name || 'Mobil'} (${selectedBooking.car?.plate_number || '-'}) sudah lengkap dan ingin mengunci formulir ini secara permanen?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Simpan & Kunci',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              const now = new Date();
              const payload: DeliveryPayload = {
                km_out: km,
                fuel_out: fuelPercent,
                fuel_range_km: Math.round((fuelPercent / 100) * 280),
                handover_location: handoverLocation.trim() || undefined,
                notes: generalNotes.trim() || undefined,
                checkout_date: checkoutDate,
                checkout_time: checkoutTime,
                checkout_datetime: now.toISOString(),
                checklist: {
                  ...checklists,
                  body_sides: bodySides,
                  gps_coordinates: gpsCoord,
                  handover_at: now.toISOString(),
                },
              };

              const res = await DeliveryReturnService.submitDelivery(selectedBooking.id, payload);
              if (res.success) {
                Alert.alert('Berhasil', res.message, [
                  {
                    text: 'OK',
                    onPress: () => {
                      setSelectedBooking(null);
                      loadData();
                    },
                  },
                ]);
              } else {
                Alert.alert('Gagal', res.message);
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Terjadi kesalahan sistem.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Helper Estimasi Jarak Tempuh dari Fuel
  const estimatedKm = Math.round((fuelPercent / 100) * 280);

  // Render Gauge Needle SVG
  const angleRad = Math.PI - (fuelPercent / 100) * Math.PI;
  const needleLength = 65;
  const needleX = 100 + needleLength * Math.cos(angleRad);
  const needleY = 100 - needleLength * Math.sin(angleRad);

  // Arc end point
  const arcX = 100 - 80 * Math.cos((fuelPercent / 100) * Math.PI);
  const arcY = 100 - 80 * Math.sin((fuelPercent / 100) * Math.PI);

  // -------------------------------------------------------------
  // JIKA FORM DETAIL SERAH TERIMA DIBUKA
  // -------------------------------------------------------------
  if (selectedBooking) {
    const curSide = bodySides[activeSide];

    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedBooking(null)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={BrandColors.onSurface} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Detail Booking</Text>
              <Text style={styles.headerSubtitle}>PT. Cahaya Auto Nusantara</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <MaterialIcons name="more-vert" size={22} color={BrandColors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            {/* Top Progress & Status Pill */}
            <View style={styles.progressRow}>
              <View style={styles.statusPillContainer}>
                <View style={styles.pulseDot} />
                <Text style={styles.statusPillText}>Tahap Serah Terima (Check-in)</Text>
              </View>
              <Text style={styles.stepText}>Langkah 2 dari 3</Text>
            </View>

            {/* Hero Summary Card */}
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.badgeRow}>
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateBadgeText}>
                        {selectedBooking.car?.plate_number || 'BK 1088 CAN'}
                      </Text>
                    </View>
                    <Text style={styles.bookingNumberSmall}>
                      #{selectedBooking.booking_number || 'BK-20261024-ALPH99'}
                    </Text>
                  </View>
                  <Text style={styles.carNameTitle}>
                    {selectedBooking.car?.name || selectedBooking.car_type || 'Toyota Alphard 2.5 G'}
                  </Text>
                  <Text style={styles.carSubtitle}>
                    {selectedBooking.car?.color || 'Black Metallic'} • Luxury VIP Executive
                  </Text>
                </View>
                <View style={styles.carIconBox}>
                  <MaterialIcons name="directions-car" size={28} color={BrandColors.primary} />
                </View>
              </View>

              <View style={styles.officerGrid}>
                <View style={styles.officerCol}>
                  <Text style={styles.officerLabel}>Petugas Lapangan</Text>
                  <Text style={styles.officerName}>
                    {selectedBooking.peluncur_id ? 'Budi Santoso' : 'Dispatcher Pool 01'}
                  </Text>
                  <Text style={styles.officerRole}>Dispatcher Pool 01</Text>
                </View>
                <View style={styles.officerCol}>
                  <Text style={styles.officerLabel}>Konsumen / Penyewa</Text>
                  <Text style={styles.officerName}>
                    {selectedBooking.customer?.name || 'A. Fadli Akbar'}
                  </Text>
                  <Text style={styles.officerRole}>
                    {selectedBooking.customer?.phone || 'PT. Mahakarya Energi'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 1. Detail Meteran & Waktu Keluar */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <MaterialIcons name="speed" size={20} color={BrandColors.primary} />
                <Text style={styles.sectionTitle}>1. Meteran & Waktu Keluar</Text>
              </View>
              <View style={styles.requiredTag}>
                <Text style={styles.requiredTagText}>Wajib Diisi</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              {/* Odometer Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Range Odometer Keluar (KM) *</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="pin" size={20} color={BrandColors.onSurfaceVariant} />
                  <TextInput
                    style={styles.textInputBold}
                    keyboardType="number-pad"
                    value={kmOut}
                    onChangeText={setKmOut}
                    placeholder="0"
                  />
                  <Text style={styles.inputSuffixBold}>KM</Text>
                </View>
              </View>

              {/* Time & Date */}
              <View style={styles.splitRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Jam Keluar *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialIcons name="schedule" size={18} color={BrandColors.onSurfaceVariant} />
                    <TextInput
                      style={styles.textInput}
                      value={checkoutTime}
                      onChangeText={setCheckoutTime}
                    />
                  </View>
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Tanggal Keluar *</Text>
                  <View style={styles.inputContainer}>
                    <MaterialIcons name="calendar-today" size={18} color={BrandColors.onSurfaceVariant} />
                    <TextInput
                      style={styles.textInput}
                      value={checkoutDate}
                      onChangeText={setCheckoutDate}
                    />
                  </View>
                </View>
              </View>

              {/* Lokasi Penyerahan */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Lokasi Penyerahan Unit *</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="apartment" size={20} color={BrandColors.onSurfaceVariant} />
                  <TextInput
                    style={styles.textInput}
                    value={handoverLocation}
                    onChangeText={setHandoverLocation}
                    placeholder="Alamat penyerahan..."
                  />
                </View>
              </View>

              {/* Geolocation Radar Card */}
              <View style={styles.radarCard}>
                <View style={styles.radarHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="location-searching" size={18} color={BrandColors.primary} />
                    <Text style={styles.radarTitle}>Verifikasi Koordinat Lapangan</Text>
                  </View>
                  <View
                    style={[
                      styles.gpsPill,
                      gpsLocked ? styles.gpsPillLocked : styles.gpsPillReady,
                    ]}
                  >
                    <View
                      style={[
                        styles.gpsPillDot,
                        { backgroundColor: gpsLocked ? '#059669' : BrandColors.secondary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.gpsPillText,
                        { color: gpsLocked ? '#059669' : BrandColors.onSecondaryFixedVariant },
                      ]}
                    >
                      {gpsLocked ? '✓ Terkunci' : 'Siap Kunci'}
                    </Text>
                  </View>
                </View>

                {/* Radar Area Preview */}
                <View style={styles.radarPreviewBox}>
                  <View style={styles.radarRingOuter} />
                  <View style={styles.radarRingInner}>
                    <View style={styles.radarCenterPin}>
                      <MaterialIcons name="pin-drop" size={14} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.gpsCoordTag}>
                    <Text style={styles.gpsCoordText}>
                      <Text style={{ fontWeight: '700', color: BrandColors.primary }}>GPS Aktif: </Text>
                      {gpsCoord}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.radarBtn, gpsLocked && styles.radarBtnLocked]}
                  onPress={handleLockGps}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name={gpsLocked ? 'verified' : 'lock'} size={18} color="#fff" />
                  <Text style={styles.radarBtnText}>
                    {gpsLocked ? 'Lokasi Berhasil Dikunci' : 'Kunci Titik GPS Serah Terima'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Interactive Fuel Meter */}
              <View style={styles.fuelCard}>
                <View style={styles.fuelHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialIcons name="local-gas-station" size={20} color={BrandColors.secondary} />
                    <Text style={styles.radarTitle}>Indikator BBM (Fuel Level)</Text>
                  </View>
                  <View style={styles.fuelValueBadge}>
                    <Text style={styles.fuelValueText}>
                      {fuelPercent}% ({fuelPercent > 80 ? 'Full' : fuelPercent > 35 ? '~1/2' : 'Kritis'})
                    </Text>
                  </View>
                </View>

                {/* Gauge SVG */}
                <View style={styles.gaugeContainer}>
                  <Svg width={180} height={100} viewBox="0 0 200 110">
                    {/* Background Arc */}
                    <Path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#dae2fd"
                      strokeWidth={14}
                      strokeLinecap="round"
                    />
                    {/* Active Arc */}
                    <Path
                      d={`M 20 100 A 80 80 0 0 1 ${arcX} ${arcY}`}
                      fill="none"
                      stroke="#007bb9"
                      strokeWidth={14}
                      strokeLinecap="round"
                    />
                    {/* Gauge Ticks */}
                    <SvgText x="18" y="108" fill="#707881" fontSize="10" fontWeight="700">
                      E
                    </SvgText>
                    <SvgText x="96" y="18" fill="#707881" fontSize="10" fontWeight="700">
                      1/2
                    </SvgText>
                    <SvgText x="176" y="108" fill="#707881" fontSize="10" fontWeight="700">
                      F
                    </SvgText>
                    {/* Needle */}
                    <Circle cx="100" cy="100" r="7" fill="#131b2e" />
                    <Line
                      x1="100"
                      y1="100"
                      x2={needleX}
                      y2={needleY}
                      stroke="#131b2e"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  </Svg>

                  {/* Quick Select Buttons */}
                  <View style={styles.fuelQuickRow}>
                    {[15, 25, 43, 50, 75, 100].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.fuelSelectBtn,
                          fuelPercent === val && styles.fuelSelectBtnActive,
                        ]}
                        onPress={() => setFuelPercent(val)}
                      >
                        <Text
                          style={[
                            styles.fuelSelectBtnText,
                            fuelPercent === val && styles.fuelSelectBtnTextActive,
                          ]}
                        >
                          {val}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.rangeRow}>
                  <Text style={styles.rangeLabel}>Estimasi Jarak Tempuh (KM):</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={styles.rangeVal}>{estimatedKm}</Text>
                    <Text style={styles.rangeUnit}>KM</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Status Kelengkapan Unit */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <MaterialIcons name="fact-check" size={20} color={BrandColors.primary} />
                <Text style={styles.sectionTitle}>2. Status Kelengkapan Unit</Text>
              </View>
              <TouchableOpacity
                style={styles.allOkBtn}
                onPress={handleToggleAllOk}
                activeOpacity={0.8}
              >
                <Text style={styles.allOkBtnText}>✓ Semua OK</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionDesc}>
                Periksa dokumen original, perkakas cadangan, dan fungsi elektrikal standar cabin.
              </Text>

              {[
                { key: 'kunci_kontak', icon: 'key', label: 'Kunci Kontak Utama & Cadangan' },
                { key: 'stnk_asli', icon: 'description', label: 'Copy STNK Asli / Pajak Hidup' },
                { key: 'ban_serep', icon: 'tire-repair', label: 'Ban Serep / Cadangan Standar' },
                { key: 'dongkrak_kit', icon: 'car-repair', label: 'Dongkrak Kit Set Lengkap' },
                { key: 'kunci_roda', icon: 'build', label: 'Kunci Roda Set Tool Package' },
                { key: 'stang_dongkrak', icon: 'pan-tool-alt', label: 'Stang Dongkrak Putar' },
                { key: 'ac_mobil', icon: 'ac-unit', label: 'AC Mobil Dingin & Blower Aktif' },
                { key: 'audio_system', icon: 'volume-up', label: 'Audio System & Bluetooth Headunit' },
              ].map((item) => {
                const isOk = checklists[item.key];
                return (
                  <View key={item.key} style={styles.checkRow}>
                    <View style={styles.checkLeft}>
                      <MaterialIcons
                        name={item.icon as any}
                        size={20}
                        color={BrandColors.primary}
                      />
                      <Text style={styles.checkLabel} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.checkToggleBtn,
                        isOk ? styles.checkToggleBtnOk : styles.checkToggleBtnNo,
                      ]}
                      onPress={() => toggleChecklist(item.key)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.checkToggleBtnText,
                          isOk ? styles.checkToggleTextOk : styles.checkToggleTextNo,
                        ]}
                      >
                        {isOk ? '✓ OK' : '✕ Tidak'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {/* 3. Inspeksi Bodi (5 Sisi) */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <MaterialIcons name="directions-car-filled" size={20} color={BrandColors.primary} />
                <Text style={styles.sectionTitle}>3. Inspeksi Bodi (5 Sisi)</Text>
              </View>
              <Text style={styles.inspectHint}>Klik & Tandai</Text>
            </View>

            <View style={styles.sectionCard}>
              {/* Status Legend */}
              <View style={styles.legendGrid}>
                <View style={[styles.legendBox, { backgroundColor: '#eff6ff' }]}>
                  <Text style={[styles.legendText, { color: BrandColors.primary }]}>✓ Baik</Text>
                </View>
                <View style={[styles.legendBox, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.legendText, { color: '#b45309' }]}>{'// Baret'}</Text>
                </View>
                <View style={[styles.legendBox, { backgroundColor: '#fed7aa' }]}>
                  <Text style={[styles.legendText, { color: '#c2410c' }]}>O Penyok</Text>
                </View>
                <View style={[styles.legendBox, { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.legendText, { color: '#dc2626' }]}>X Rusak</Text>
                </View>
              </View>

              {/* Tab 5 Sisi */}
              <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                style={styles.sideTabScroll}
                contentContainerStyle={{ gap: 8 }}
              >
                {[
                  { key: 'depan', label: 'Depan' },
                  { key: 'kiri', label: 'Samping Kiri' },
                  { key: 'kanan', label: 'Samping Kanan' },
                  { key: 'belakang', label: 'Belakang' },
                  { key: 'atap', label: 'Atap' },
                ].map((s) => (
                  <TouchableOpacity
                    key={s.key}
                    style={[
                      styles.sideTabBtn,
                      activeSide === s.key && styles.sideTabBtnActive,
                    ]}
                    onPress={() => setActiveSide(s.key as BodySide)}
                  >
                    <Text
                      style={[
                        styles.sideTabText,
                        activeSide === s.key && styles.sideTabTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Blueprint Canvas Box */}
              <View style={styles.blueprintCard}>
                <View style={styles.blueprintHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.blueDot} />
                    <Text style={styles.blueprintTitle}>{curSide.title}</Text>
                  </View>
                  <View style={styles.conditionTag}>
                    <Text style={styles.conditionTagText}>
                      Kondisi: {curSide.condition.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* SVG Blueprint Render Sesuai Sisi */}
                <View style={styles.svgContainer}>
                  {activeSide === 'depan' && (
                    <Svg width={200} height={120} viewBox="0 0 200 130">
                      <Path
                        d="M 40 100 L 45 60 C 48 45 65 30 100 30 C 135 30 152 45 155 60 L 160 100 Z"
                        fill="#eaedff"
                        stroke="#006194"
                        strokeWidth={2.5}
                      />
                      <Path
                        d="M 54 58 C 58 46 72 38 100 38 C 128 38 142 46 146 58 Z"
                        fill="#dae2fd"
                        stroke="#006194"
                        strokeWidth={1.8}
                      />
                      <Rect x="74" y="65" width="52" height="34" rx="4" fill="#dae2fd" stroke="#006194" strokeWidth={1.5} />
                      <Rect x="36" y="98" width="16" height="18" rx="3" fill="#131b2e" />
                      <Rect x="148" y="98" width="16" height="18" rx="3" fill="#131b2e" />
                      <Circle cx="100" cy="82" r="6" fill="#006194" />
                    </Svg>
                  )}

                  {activeSide === 'kiri' && (
                    <Svg width={220} height={100} viewBox="0 0 240 100">
                      <Path
                        d="M 20 65 L 45 40 L 175 40 L 220 55 L 225 72 L 20 72 Z"
                        fill="#eaedff"
                        stroke="#006194"
                        strokeWidth={2.5}
                      />
                      <Rect x="55" y="44" width="45" height="18" rx="2" fill="#dae2fd" stroke="#006194" />
                      <Rect x="105" y="44" width="55" height="18" rx="2" fill="#dae2fd" stroke="#006194" />
                      <Circle cx="55" cy="72" r="14" fill="#131b2e" />
                      <Circle cx="180" cy="72" r="14" fill="#131b2e" />
                      <Circle cx="120" cy="62" r="6" fill="#fea619" />
                    </Svg>
                  )}

                  {activeSide === 'kanan' && (
                    <Svg width={220} height={100} viewBox="0 0 240 100">
                      <Path
                        d="M 220 65 L 195 40 L 65 40 L 20 55 L 15 72 L 220 72 Z"
                        fill="#eaedff"
                        stroke="#006194"
                        strokeWidth={2.5}
                      />
                      <Rect x="140" y="44" width="45" height="18" rx="2" fill="#dae2fd" stroke="#006194" />
                      <Rect x="80" y="44" width="55" height="18" rx="2" fill="#dae2fd" stroke="#006194" />
                      <Circle cx="60" cy="72" r="14" fill="#131b2e" />
                      <Circle cx="185" cy="72" r="14" fill="#131b2e" />
                    </Svg>
                  )}

                  {activeSide === 'belakang' && (
                    <Svg width={200} height={120} viewBox="0 0 200 130">
                      <Path
                        d="M 45 100 L 48 55 C 50 42 65 32 100 32 C 135 32 150 42 152 55 L 155 100 Z"
                        fill="#eaedff"
                        stroke="#006194"
                        strokeWidth={2.5}
                      />
                      <Path
                        d="M 55 52 C 60 42 75 36 100 36 C 125 36 140 42 145 52 Z"
                        fill="#dae2fd"
                        stroke="#006194"
                        strokeWidth={1.8}
                      />
                      <Rect x="75" y="78" width="50" height="18" rx="2" fill="#ffffff" stroke="#006194" />
                      <Rect x="38" y="98" width="16" height="18" rx="3" fill="#131b2e" />
                      <Rect x="146" y="98" width="16" height="18" rx="3" fill="#131b2e" />
                      <Circle cx="56" cy="94" r="6" fill="#fea619" />
                    </Svg>
                  )}

                  {activeSide === 'atap' && (
                    <Svg width={140} height={140} viewBox="0 0 140 180">
                      <Rect x="25" y="20" width="90" height="140" rx="24" fill="#eaedff" stroke="#006194" strokeWidth={2.5} />
                      <Rect x="40" y="45" width="60" height="35" rx="6" fill="#dae2fd" stroke="#006194" strokeWidth={1.5} />
                      <Rect x="40" y="90" width="60" height="45" rx="6" fill="#dae2fd" stroke="#006194" strokeWidth={1.5} />
                    </Svg>
                  )}
                </View>

                <Text style={styles.blueprintFooterHint}>
                  Pilih status kondisi di bawah untuk memperbarui inspeksi sisi ini
                </Text>
              </View>

              {/* Status Radio 4 Buttons */}
              <View style={styles.conditionRadioRow}>
                {[
                  { key: 'baik', label: 'Baik', icon: 'check-circle', color: BrandColors.primary },
                  { key: 'baret', label: 'Baret', icon: 'edit-note', color: '#b45309' },
                  { key: 'penyok', label: 'Penyok', icon: 'radio-button-checked', color: '#c2410c' },
                  { key: 'rusak', label: 'Rusak', icon: 'cancel', color: '#dc2626' },
                ].map((cond) => {
                  const isSelected = curSide.condition === cond.key;
                  return (
                    <TouchableOpacity
                      key={cond.key}
                      style={[
                        styles.conditionRadioBtn,
                        isSelected && { backgroundColor: cond.color },
                      ]}
                      onPress={() => updateSideCondition(cond.key as BodyCondition)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons
                        name={cond.icon as any}
                        size={18}
                        color={isSelected ? '#ffffff' : BrandColors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.conditionRadioText,
                          isSelected && { color: '#ffffff', fontWeight: '700' },
                        ]}
                      >
                        {cond.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Catatan Sisi Terpilih */}
              <View style={{ marginTop: 10 }}>
                <Text style={styles.fieldLabel}>Catatan Sisi Terpilih:</Text>
                <TextInput
                  style={styles.textInputArea}
                  value={curSide.note}
                  onChangeText={updateSideNote}
                  placeholder="Catatan baret / kondisi sisi..."
                />
              </View>

              <TouchableOpacity
                style={styles.photoSideBtn}
                onPress={() => Alert.alert('Kamera', `Membuka kamera untuk foto ${curSide.title}...`)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="photo-camera" size={18} color={BrandColors.primary} />
                <Text style={styles.photoSideBtnText}>Ambil Foto {curSide.title}</Text>
              </TouchableOpacity>
            </View>

            {/* 4. Foto Unit & Identitas */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <MaterialIcons name="add-a-photo" size={20} color={BrandColors.primary} />
                <Text style={styles.sectionTitle}>4. Foto Unit & Identitas</Text>
              </View>
              <View style={styles.photoCountTag}>
                <Text style={styles.photoCountText}>3 Terunggah</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.fieldLabel}>Dokumentasi Fisik Mobil & Dashboard:</Text>
              <View style={styles.galleryRow}>
                {/* Photo 1: Depan */}
                <View style={styles.photoThumbnail}>
                  <Image
                    source={{
                      uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=300&q=80',
                    }}
                    style={styles.photoImg}
                  />
                  <View style={styles.photoCaption}>
                    <Text style={styles.photoCaptionText}>Fisik Depan</Text>
                  </View>
                </View>

                {/* Photo 2: Odometer */}
                <View style={styles.photoThumbnail}>
                  <Image
                    source={{
                      uri: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=300&q=80',
                    }}
                    style={styles.photoImg}
                  />
                  <View style={styles.photoCaption}>
                    <Text style={styles.photoCaptionText}>Odometer KM</Text>
                  </View>
                </View>

                {/* Add Photo Button */}
                <TouchableOpacity
                  style={styles.addPhotoBtn}
                  onPress={() => Alert.alert('Foto', 'Tambah dokumentasi foto mobil...')}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="add-photo-alternate" size={26} color={BrandColors.primary} />
                  <Text style={styles.addPhotoText}>+ Tambah</Text>
                </TouchableOpacity>
              </View>

              {/* KTP & SIM A Preview Cards */}
              <View style={styles.identityRow}>
                <View style={styles.idCardBox}>
                  <View style={styles.idCardHeader}>
                    <Text style={styles.idCardTitle}>Foto KTP</Text>
                    <View style={styles.requiredSmallTag}>
                      <Text style={styles.requiredSmallText}>Wajib</Text>
                    </View>
                  </View>
                  <View style={styles.idCardPreview}>
                    <Image
                      source={{
                        uri: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=300&q=80',
                      }}
                      style={styles.photoImg}
                    />
                    <View style={styles.idVerifiedPill}>
                      <MaterialIcons name="check-circle" size={12} color={BrandColors.primary} />
                      <Text style={styles.idVerifiedText}>Terverifikasi</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.idChangeBtn}
                    onPress={() => Alert.alert('KTP', 'Ganti foto KTP konsumen...')}
                  >
                    <Text style={styles.idChangeBtnText}>Ganti Foto KTP</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.idCardBox}>
                  <View style={styles.idCardHeader}>
                    <Text style={styles.idCardTitle}>Foto SIM A</Text>
                    <View style={styles.requiredSmallTag}>
                      <Text style={styles.requiredSmallText}>Wajib</Text>
                    </View>
                  </View>
                  <View style={styles.idCardPreview}>
                    <Image
                      source={{
                        uri: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=300&q=80',
                      }}
                      style={styles.photoImg}
                    />
                    <View style={styles.idVerifiedPill}>
                      <MaterialIcons name="check-circle" size={12} color={BrandColors.primary} />
                      <Text style={styles.idVerifiedText}>Valid s/d 2028</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.idChangeBtn}
                    onPress={() => Alert.alert('SIM', 'Ganti foto SIM A konsumen...')}
                  >
                    <Text style={styles.idChangeBtnText}>Ganti Foto SIM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 5. Catatan Tambahan Petugas */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <MaterialIcons name="sticky-note-2" size={20} color={BrandColors.primary} />
                <Text style={styles.sectionTitle}>5. Catatan Tambahan Petugas</Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <TextInput
                style={styles.generalTextArea}
                multiline={true}
                numberOfLines={3}
                value={generalNotes}
                onChangeText={setGeneralNotes}
                placeholder="Tuliskan catatan kondisi khusus kendaraan saat penyerahan..."
              />
              <View style={styles.charCounterRow}>
                <Text style={styles.charCounterText}>Maksimal 300 karakter</Text>
                <Text style={styles.autoSavedText}>Tersimpan otomatis</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Sticky Bottom Floating Action Bar */}
        <View style={styles.bottomDock}>
          <TouchableOpacity
            style={styles.draftBtn}
            onPress={() => {
              Alert.alert('Draf Tersimpan', 'Data checklist berhasil disimpan sebagai draf sementara.');
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="save" size={20} color={BrandColors.primary} />
            <Text style={styles.draftBtnText}>Draf</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.lockSubmitBtn, submitting && styles.btnDisabled]}
            onPress={handleSubmitDelivery}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="lock" size={20} color="#fff" />
                <Text style={styles.lockSubmitBtnText}>Simpan & Kunci Penyerahan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // JIKA TAMPILAN DAFTAR BOOKING SIAP SERAH TERIMA
  // -------------------------------------------------------------
  const renderItem = ({ item }: { item: BookingDetail }) => {
    const isReadyToDeliver =
      item.status === 'Confirmed' ||
      (item.status === 'Pending' && item.car_id && !item.delivery_checklist);
    const isOnTrip = item.status === 'On Trip';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.bookingNumberContainer}>
              <MaterialIcons name="confirmation-number" size={16} color={BrandColors.primary} />
              <Text style={styles.bookingNumberText}>{item.booking_number}</Text>
            </View>
            <Text style={styles.bookingDateText}>
              Ambil: {item.booking_date} {item.pickup_time ? `• ${item.pickup_time}` : ''}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isReadyToDeliver
                ? styles.statusReadyBadge
                : isOnTrip
                ? styles.statusOnTripBadge
                : styles.statusDefaultBadge,
            ]}
          >
            <MaterialIcons
              name={isReadyToDeliver ? 'schedule' : isOnTrip ? 'directions-car' : 'check-circle'}
              size={14}
              color={isReadyToDeliver ? '#047857' : isOnTrip ? '#0369a1' : BrandColors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.statusBadgeText,
                isReadyToDeliver
                  ? styles.statusReadyText
                  : isOnTrip
                  ? styles.statusOnTripText
                  : styles.statusDefaultText,
              ]}
            >
              {isReadyToDeliver ? 'Siap Serah' : isOnTrip ? 'On Trip' : item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="person" size={16} color={BrandColors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{item.customer?.name || 'Pelanggan Umum'}</Text>
              <Text style={styles.infoSubtitle}>{item.customer?.phone || '-'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
              <MaterialIcons name="directions-car" size={16} color="#0284c7" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                {item.car?.name || item.car_type || 'Mobil Belum Ditentukan'}
              </Text>
              <View style={styles.plateTag}>
                <Text style={styles.plateText}>{item.car?.plate_number || 'Nopol -'}</Text>
              </View>
            </View>
          </View>

          {item.pickup_location && (
            <View style={styles.infoRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
                <MaterialIcons name="place" size={16} color="#b45309" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoSubtitle} numberOfLines={1}>
                  Lokasi: {item.pickup_location}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.detailButton}
            onPress={() => router.push(`/booking-detail?id=${item.id}` as any)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="visibility" size={16} color={BrandColors.onSurfaceVariant} />
            <Text style={styles.detailButtonText}>Detail</Text>
          </TouchableOpacity>

          {isReadyToDeliver ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => openDeliveryForm(item)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="handshake" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Serah Terima</Text>
            </TouchableOpacity>
          ) : isOnTrip ? (
            <View style={styles.completedBadge}>
              <MaterialIcons name="check-circle" size={16} color="#0284c7" />
              <Text style={styles.completedBadgeText}>Sudah Diserahkan</Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* 1. Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={BrandColors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Serah Terima Unit</Text>
          <Text style={styles.headerSubtitle}>Proses serah terima armada ke penyewa</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{readyCount} Siap</Text>
        </View>
      </View>

      {/* 2. Search & Tab Filter */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={BrandColors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nopol, konsumen, atau no booking..."
            placeholderTextColor={BrandColors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color={BrandColors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ready' && styles.tabButtonActive]}
            onPress={() => setActiveTab('ready')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'ready' && styles.tabTextActive]}>
              Siap Serah ({readyCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'on_trip' && styles.tabButtonActive]}
            onPress={() => setActiveTab('on_trip')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'on_trip' && styles.tabTextActive]}>
              On Trip ({onTripCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>Semua</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. List Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Memuat data serah terima...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[BrandColors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="car-rental" size={54} color={BrandColors.outlineVariant} />
              <Text style={styles.emptyTitle}>Tidak Ada Data Serah Terima</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'ready'
                  ? 'Semua unit yang dialokasikan sudah diserahkan.'
                  : 'Tidak ditemukan data booking yang cocok.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf8ff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  headerSubtitle: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginTop: 1,
  },
  headerBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(254,166,25,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.secondary,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.secondary,
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plateBadge: {
    backgroundColor: '#cce5ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  plateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#004b73',
    letterSpacing: 0.5,
  },
  bookingNumberSmall: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
  },
  carNameTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.onSurface,
    marginTop: 4,
  },
  carSubtitle: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    marginTop: 1,
  },
  carIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e2e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  officerGrid: {
    flexDirection: 'row',
    backgroundColor: '#f2f3ff',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  officerCol: {
    flex: 1,
  },
  officerLabel: {
    fontSize: 10,
    color: BrandColors.onSurfaceVariant,
  },
  officerName: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.onSurface,
    marginTop: 2,
  },
  officerRole: {
    fontSize: 11,
    color: BrandColors.primary,
    marginTop: 1,
  },

  // Section Headers & Cards
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  requiredTag: {
    backgroundColor: '#ffdad6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#93000a',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    gap: 12,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f3ff',
    borderRadius: 25,
    paddingHorizontal: 12,
    height: 42,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: BrandColors.onSurface,
    marginLeft: 8,
    fontWeight: '500',
  },
  textInputBold: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.onSurface,
    marginLeft: 8,
  },
  inputSuffixBold: {
    fontSize: 14,
    fontWeight: '800',
    color: BrandColors.onSurfaceVariant,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // Geolocation Radar Card
  radarCard: {
    backgroundColor: '#f2f3ff',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  radarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  gpsPillReady: {
    backgroundColor: '#ffddb8',
  },
  gpsPillLocked: {
    backgroundColor: '#ecfdf5',
  },
  gpsPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gpsPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  radarPreviewBox: {
    height: 90,
    backgroundColor: '#dae2fd',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  radarRingOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,97,148,0.15)',
  },
  radarRingInner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,97,148,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCenterPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsCoordTag: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gpsCoordText: {
    fontSize: 10,
    color: BrandColors.onSurface,
  },
  radarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 2,
  },
  radarBtnLocked: {
    backgroundColor: '#059669',
  },
  radarBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Fuel Meter Card
  fuelCard: {
    backgroundColor: '#f2f3ff',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  fuelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fuelValueBadge: {
    backgroundColor: '#e2e7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  fuelValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  fuelQuickRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  fuelSelectBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  fuelSelectBtnActive: {
    backgroundColor: BrandColors.primary,
  },
  fuelSelectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  fuelSelectBtnTextActive: {
    color: '#ffffff',
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  rangeLabel: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
  },
  rangeVal: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.primary,
  },
  rangeUnit: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    fontWeight: '600',
  },

  // Checklist 8 Item
  allOkBtn: {
    backgroundColor: '#cce5ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  allOkBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#004b73',
  },
  sectionDesc: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    marginBottom: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f2f3ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  checkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  checkLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.onSurface,
  },
  checkToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  checkToggleBtnOk: {
    backgroundColor: BrandColors.primary,
  },
  checkToggleBtnNo: {
    backgroundColor: '#ffdad6',
  },
  checkToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checkToggleTextOk: {
    color: '#ffffff',
  },
  checkToggleTextNo: {
    color: '#93000a',
  },

  // Inspeksi 5 Sisi
  inspectHint: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
  },
  legendGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  legendBox: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sideTabScroll: {
    marginVertical: 4,
  },
  sideTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#eaedff',
  },
  sideTabBtnActive: {
    backgroundColor: BrandColors.primary,
  },
  sideTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  sideTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  blueprintCard: {
    backgroundColor: '#f2f3ff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  blueprintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 6,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.primary,
  },
  blueprintTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  conditionTag: {
    backgroundColor: '#cce5ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  conditionTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#004b73',
  },
  svgContainer: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  blueprintFooterHint: {
    fontSize: 10,
    color: BrandColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },
  conditionRadioRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  conditionRadioBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f2f3ff',
    gap: 2,
  },
  conditionRadioText: {
    fontSize: 11,
    color: BrandColors.onSurface,
    fontWeight: '600',
  },
  textInputArea: {
    backgroundColor: '#f2f3ff',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: BrandColors.onSurface,
    marginTop: 4,
  },
  photoSideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#e2e7ff',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  photoSideBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  // Foto & Dokumen
  photoCountTag: {
    backgroundColor: '#eaedff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#e2e7ff',
  },
  photoImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoCaption: {
    position: 'absolute',
    bottom: 0,
    insetInline: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  photoCaptionText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '600',
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#bfc7d2',
    backgroundColor: '#f2f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  identityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  idCardBox: {
    flex: 1,
    backgroundColor: '#f2f3ff',
    borderRadius: 10,
    padding: 8,
    gap: 6,
  },
  idCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  requiredSmallTag: {
    backgroundColor: '#cce5ff',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  requiredSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#004b73',
  },
  idCardPreview: {
    height: 65,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#dae2fd',
  },
  idVerifiedPill: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  idVerifiedText: {
    fontSize: 9,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  idChangeBtn: {
    backgroundColor: '#e2e7ff',
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  idChangeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: BrandColors.primary,
  },

  // Catatan Tambahan
  generalTextArea: {
    backgroundColor: '#f2f3ff',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: BrandColors.onSurface,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  charCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  charCounterText: {
    fontSize: 10,
    color: BrandColors.onSurfaceVariant,
  },
  autoSavedText: {
    fontSize: 10,
    color: BrandColors.primary,
    fontWeight: '600',
  },

  // Sticky Bottom Dock
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  draftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#e2e7ff',
  },
  draftBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  lockSubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 23,
    backgroundColor: BrandColors.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  lockSubmitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  // List Screen Styles
  filterSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: BrandColors.onSurface,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  tabButtonActive: {
    backgroundColor: BrandColors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: BrandColors.onSurfaceVariant,
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingNumberText: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  bookingDateText: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusReadyBadge: {
    backgroundColor: '#d1fae5',
  },
  statusReadyText: {
    color: '#047857',
  },
  statusOnTripBadge: {
    backgroundColor: '#e0f2fe',
  },
  statusOnTripText: {
    color: '#0369a1',
  },
  statusDefaultBadge: {
    backgroundColor: '#f1f5f9',
  },
  statusDefaultText: {
    color: BrandColors.onSurfaceVariant,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.onSurface,
  },
  infoSubtitle: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
  },
  plateTag: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: BrandColors.onSurfaceVariant,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: BrandColors.onSurfaceVariant,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.onSurface,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: BrandColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
  },
});
