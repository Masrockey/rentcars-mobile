import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ModernLoadingIndicator,
  ModernLoadingOverlay,
  ModernLoadingScreen,
} from '@/components/ModernLoading';
import { ModernSplashScreen } from '@/components/ModernSplashScreen';
import { BrandColors } from '@/constants/brand';

export default function SplashAndLoadingDemoScreen() {
  const [showSplashDemo, setShowSplashDemo] = useState(false);
  const [showFullScreenLoader, setShowFullScreenLoader] = useState(false);
  const [showOverlayLoader, setShowOverlayLoader] = useState(false);
  const [overlayProgress, setOverlayProgress] = useState(0.45);

  if (showSplashDemo) {
    return (
      <ModernSplashScreen
        previewMode
        onFinish={() => setShowSplashDemo(false)}
      />
    );
  }

  if (showFullScreenLoader) {
    return (
      <View style={{ flex: 1 }}>
        <ModernLoadingScreen
          title="Sinkronisasi Data Armada"
          message="Memuat daftar booking dan status unit kendaraan..."
          showTips
        />
        <TouchableOpacity
          style={styles.closeFullScreenBtn}
          onPress={() => setShowFullScreenLoader(false)}
          activeOpacity={0.8}>
          <Ionicons name="close" size={20} color="#ffffff" />
          <Text style={styles.closeFullScreenBtnText}>Tutup Preview</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color={BrandColors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Showcase Splash & Loading</Text>
          <Text style={styles.headerSubtitle}>Rentcars Mobile</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Penjelasan */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBadge}>
            <MaterialIcons name="auto-awesome" size={20} color={BrandColors.secondary} />
          </View>
          <View style={styles.infoTextGroup}>
            <Text style={styles.infoTitle}>Animasi Otomotif Modern</Text>
            <Text style={styles.infoDesc}>
              Desain visual interaktif dengan tema warna biru eksekutif, gelombang radar surya, dan
              smooth loading cluster.
            </Text>
          </View>
        </View>

        {/* Section 1: Splash Screen Interactive Launcher */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="rocket-launch" size={20} color={BrandColors.primary} />
            <Text style={styles.sectionTitle}>1. Animated Splash Screen</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Dilengkapi logo spring entrance, radar pulse 3-layer, shimmer sweep, dan progress bar
            verifikasi sistem armada secara otomatis.
          </Text>

          <TouchableOpacity
            style={styles.actionPrimaryBtn}
            onPress={() => setShowSplashDemo(true)}
            activeOpacity={0.85}>
            <MaterialIcons name="play-circle-outline" size={20} color="#ffffff" />
            <Text style={styles.actionPrimaryBtnText}>Putar Animasi Splash Screen</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Full-Screen Loading Screen */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="hourglass-top" size={20} color={BrandColors.primary} />
            <Text style={styles.sectionTitle}>2. Full-Screen Loading Page</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Digunakan saat transisi halaman atau pengambilan data awal aplikasi, lengkap dengan tips
            operasional armada dinamis.
          </Text>

          <TouchableOpacity
            style={styles.actionSecondaryBtn}
            onPress={() => setShowFullScreenLoader(true)}
            activeOpacity={0.85}>
            <MaterialIcons name="fullscreen" size={20} color={BrandColors.primary} />
            <Text style={styles.actionSecondaryBtnText}>Buka Full-Screen Loading</Text>
          </TouchableOpacity>
        </View>

        {/* Section 3: Modal Overlay Loader */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="layers" size={20} color={BrandColors.primary} />
            <Text style={styles.sectionTitle}>3. Modal Loading Overlay</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Cocok untuk proses async yang memblokir layar seperti: submit booking, unggah foto unit,
            atau verifikasi delivery.
          </Text>

          <TouchableOpacity
            style={styles.actionSecondaryBtn}
            onPress={() => {
              setShowOverlayLoader(true);
              setOverlayProgress(0.2);
              const timer1 = setTimeout(() => setOverlayProgress(0.65), 1000);
              const timer2 = setTimeout(() => setOverlayProgress(1), 2000);
              const timer3 = setTimeout(() => setShowOverlayLoader(false), 2600);
              return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
              };
            }}
            activeOpacity={0.85}>
            <MaterialIcons name="open-in-new" size={20} color={BrandColors.primary} />
            <Text style={styles.actionSecondaryBtnText}>Uji Coba Modal Loading (3 Detik)</Text>
          </TouchableOpacity>
        </View>

        {/* Section 4: Inline Automotive Indicators */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="speed" size={20} color={BrandColors.primary} />
            <Text style={styles.sectionTitle}>4. Inline Automotive Loaders</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Pengganti modern untuk ActivityIndicator bawaan sistem dengan rotasi dual-orbit dan
            emblem mobil bernapas.
          </Text>

          <View style={styles.inlineLoadersRow}>
            <View style={styles.loaderItem}>
              <ModernLoadingIndicator size="small" />
              <Text style={styles.loaderLabel}>Ukuran Kecil</Text>
            </View>

            <View style={styles.loaderItem}>
              <ModernLoadingIndicator size="medium" />
              <Text style={styles.loaderLabel}>Ukuran Sedang</Text>
            </View>

            <View style={styles.loaderItem}>
              <ModernLoadingIndicator size="large" />
              <Text style={styles.loaderLabel}>Ukuran Besar</Text>
            </View>
          </View>

          {/* Loader dengan teks pesan */}
          <View style={styles.boxedInlinePreview}>
            <ModernLoadingIndicator
              size="medium"
              message="Memuat daftar ketersediaan armada..."
              submessage="Menghubungkan ke pusat data CAN"
            />
          </View>
        </View>

        {/* Section 5: Modern Alert Modal Popups */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="notifications-active" size={20} color={BrandColors.primary} />
            <Text style={styles.sectionTitle}>5. Modern Alert Modal Popups</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Pengganti dialog native Alert OS dengan rounded card glassmorphic, ikon dinamis, ambient glow,
            dan tombol modern berdesain selaras dengan Rentcars Mobile.
          </Text>

          <View style={{ gap: 10 }}>
            {/* 1. Berhasil / Success Alert */}
            <TouchableOpacity
              style={[styles.alertDemoBtn, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}
              onPress={() => {
                Alert.alert(
                  'Berhasil',
                  'Alokasi armada mobil dan staf berhasil disimpan.'
                );
              }}
              activeOpacity={0.8}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={[styles.alertDemoBtnText, { color: '#065f46' }]}>
                Uji Popup Berhasil (Sesuai Screenshot)
              </Text>
            </TouchableOpacity>

            {/* 2. Konfirmasi / Warning Alert */}
            <TouchableOpacity
              style={[styles.alertDemoBtn, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}
              onPress={() => {
                Alert.alert(
                  'Konfirmasi Tindakan',
                  'Apakah Anda yakin ingin membatalkan alokasi unit kendaraan ini?',
                  [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Ya, Lanjutkan', style: 'destructive', onPress: () => { } },
                  ]
                );
              }}
              activeOpacity={0.8}>
              <Ionicons name="warning" size={18} color="#d97706" />
              <Text style={[styles.alertDemoBtnText, { color: '#92400e' }]}>
                Uji Popup Konfirmasi (2 Tombol)
              </Text>
            </TouchableOpacity>

            {/* 3. Gagal / Error Alert */}
            <TouchableOpacity
              style={[styles.alertDemoBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
              onPress={() => {
                Alert.alert(
                  'Gagal Memproses Data',
                  'Tidak dapat menghubungkan ke server rental. Silakan periksa kembali koneksi internet Anda.'
                );
              }}
              activeOpacity={0.8}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={[styles.alertDemoBtnText, { color: '#991b1b' }]}>
                Uji Popup Gagal / Validasi
              </Text>
            </TouchableOpacity>

            {/* 4. Info Alert */}
            <TouchableOpacity
              style={[styles.alertDemoBtn, { backgroundColor: '#f0f7ff', borderColor: '#bae6fd' }]}
              onPress={() => {
                Alert.alert(
                  'Informasi Sistem',
                  'Jadwal servis berkala untuk unit Toyota Alphard telah berhasil dijadwalkan ke kalender armada.'
                );
              }}
              activeOpacity={0.8}>
              <Ionicons name="information-circle" size={18} color={BrandColors.primary} />
              <Text style={[styles.alertDemoBtnText, { color: BrandColors.primary }]}>
                Uji Popup Informasi Sistem
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal Loading Overlay Component */}
      <ModernLoadingOverlay
        visible={showOverlayLoader}
        title="Menyimpan Data Booking"
        message="Sedang mengalokasikan unit kendaraan ke sistem..."
        progress={overlayProgress}
        onCancel={() => setShowOverlayLoader(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.surfaceContainerHigh,
    backgroundColor: BrandColors.surfaceContainerLowest,
    gap: 12,
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.onSurface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
    gap: 18,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: BrandColors.surfaceContainerHigh,
  },
  infoBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BrandColors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextGroup: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  infoDesc: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    marginTop: 3,
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BrandColors.onSurface,
  },
  sectionDescription: {
    fontSize: 13,
    color: BrandColors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 16,
  },
  actionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.primary,
    borderRadius: 9999,
    paddingVertical: 14,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  actionSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BrandColors.surfaceContainerHigh,
    borderRadius: 9999,
    paddingVertical: 13,
  },
  actionSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  inlineLoadersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 16,
    marginBottom: 16,
  },
  loaderItem: {
    alignItems: 'center',
    gap: 6,
  },
  loaderLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  boxedInlinePreview: {
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeFullScreenBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(19, 27, 46, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  closeFullScreenBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  alertDemoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  alertDemoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
});
