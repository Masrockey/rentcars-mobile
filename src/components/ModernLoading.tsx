import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/brand';

export interface ModernLoadingIndicatorProps {
  size?: 'mini' | 'small' | 'medium' | 'large';
  message?: string;
  submessage?: string;
  color?: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Komponen animasi indikator loading bertema otomotif modern.
 * Menggabungkan dual-orbit rotation, pulse halo, dan center automotive badge.
 */
export function ModernLoadingIndicator({
  size = 'medium',
  message,
  submessage,
  color = BrandColors.primary,
  accentColor = BrandColors.secondaryContainer,
  style,
}: ModernLoadingIndicatorProps) {
  const [rotateAnim] = useState(() => new Animated.Value(0));
  const [counterRotateAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [dotAnim] = useState(() => new Animated.Value(0));

  const dims = {
    mini: { outer: 24, inner: 17, icon: 10, stroke: 2 },
    small: { outer: 48, inner: 34, icon: 16, stroke: 2.5 },
    medium: { outer: 72, inner: 52, icon: 24, stroke: 3 },
    large: { outer: 96, inner: 70, icon: 34, stroke: 3.5 },
  }[size];

  useEffect(() => {
    // Rotasi searah jarum jam untuk ring luar
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );

    // Rotasi berlawanan jarum jam untuk ring kedua
    const counterRotateLoop = Animated.loop(
      Animated.timing(counterRotateAnim, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );

    // Pulse bernapas untuk emblem mobil di tengah
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.14,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.94,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    // Animasi titik pesan
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 3,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(dotAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );

    rotateLoop.start();
    counterRotateLoop.start();
    pulseLoop.start();
    dotLoop.start();

    return () => {
      rotateLoop.stop();
      counterRotateLoop.stop();
      pulseLoop.stop();
      dotLoop.stop();
    };
  }, [rotateAnim, counterRotateAnim, pulseAnim, dotAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const counterSpin = counterRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={[styles.indicatorContainer, style]}>
      {/* Container Lingkaran Orbit */}
      <View style={{ width: dims.outer, height: dims.outer, alignItems: 'center', justifyContent: 'center' }}>
        {/* Glow Halo di belakang */}
        <Animated.View
          style={[
            styles.glowHalo,
            {
              width: dims.outer * 1.15,
              height: dims.outer * 1.15,
              borderRadius: (dims.outer * 1.15) / 2,
              backgroundColor: color,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        {/* Ring Luar Berputar (Track Utama) */}
        <Animated.View
          style={[
            styles.outerOrbit,
            {
              width: dims.outer,
              height: dims.outer,
              borderRadius: dims.outer / 2,
              borderWidth: dims.stroke,
              borderColor: 'transparent',
              borderTopColor: color,
              borderRightColor: color,
              transform: [{ rotate: spin }],
            },
          ]}
        />

        {/* Ring Dalam Berlawanan (Aksen Emas / Amber Surya) */}
        <Animated.View
          style={[
            styles.innerOrbit,
            {
              width: dims.inner,
              height: dims.inner,
              borderRadius: dims.inner / 2,
              borderWidth: dims.stroke,
              borderColor: 'transparent',
              borderBottomColor: accentColor,
              borderLeftColor: accentColor,
              transform: [{ rotate: counterSpin }],
            },
          ]}
        />

        {/* Badge Tengah Mobil dengan Animasi Pulse */}
        <Animated.View
          style={[
            styles.centerBadge,
            {
              width: dims.inner - 10,
              height: dims.inner - 10,
              borderRadius: (dims.inner - 10) / 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}>
          <Ionicons name="car-sport" size={dims.icon} color={color} />
        </Animated.View>
      </View>

      {/* Label Pesan */}
      {Boolean(message) && (
        <View style={styles.textWrapper}>
          <Text style={styles.messageText}>{message}</Text>
          {Boolean(submessage) && <Text style={styles.submessageText}>{submessage}</Text>}
        </View>
      )}
    </View>
  );
}

export interface ModernLoadingScreenProps {
  title?: string;
  message?: string;
  showTips?: boolean;
  style?: StyleProp<ViewStyle>;
}

const FLEET_TIPS = [
  'Memastikan unit armada siap beroperasi dengan standar kebersihan terbaik.',
  'Sinkronisasi jadwal serah terima dan pengembalian unit secara real-time.',
  'Lakukan inspeksi checklist bodi dan bahan bakar sebelum unit diserahkan.',
  'PT. Cahaya Auto Nusantara — The Best Partner Rental & Armada Anda.',
];

/**
 * Layar loading layar penuh yang modern dengan tema otomotif,
 * ambient background lighting, serta tips operasional dinamis.
 */
export function ModernLoadingScreen({
  title = 'Memuat Sistem Armada',
  message = 'Sedang menyinkronkan data terbaru...',
  showTips = true,
  style,
}: ModernLoadingScreenProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [fadeAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!showTips) return;
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      setTipIndex((prev) => (prev + 1) % FLEET_TIPS.length);
    }, 3800);

    return () => clearInterval(interval);
  }, [showTips, fadeAnim]);

  return (
    <View style={[styles.fullScreenContainer, style]}>
      {/* Ambient background decoration */}
      <View style={styles.ambientTopGlow} />
      <View style={styles.ambientBottomGlow} />

      {/* Card Konten Loading */}
      <View style={styles.loadingCenterCard}>
        <ModernLoadingIndicator
          size="large"
          color={BrandColors.primary}
          accentColor={BrandColors.secondaryContainer}
        />

        <View style={styles.contentSection}>
          <Text style={styles.screenTitle}>{title}</Text>
          <Text style={styles.screenMessage}>{message}</Text>
        </View>

        {/* Speedline progress track */}
        <View style={styles.speedlineTrack}>
          <AnimatedSpeedline />
        </View>

        {/* Tips Operasional Dinamis */}
        {showTips && (
          <Animated.View style={[styles.tipsContainer, { opacity: fadeAnim }]}>
            <View style={styles.tipsBadge}>
              <MaterialIcons name="lightbulb-outline" size={14} color={BrandColors.secondary} />
              <Text style={styles.tipsBadgeText}>TIPS OPERASIONAL</Text>
            </View>
            <Text style={styles.tipsText}>&ldquo;{FLEET_TIPS[tipIndex]}&rdquo;</Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

/**
 * Komponen animasi garis kecepatan horizontal ala dashboard supercar.
 */
function AnimatedSpeedline() {
  const [slideAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 200],
  });

  return (
    <View style={styles.speedlineBar}>
      <Animated.View
        style={[
          styles.speedlineGlow,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

export interface ModernLoadingOverlayProps {
  visible: boolean;
  title?: string;
  message?: string;
  progress?: number; // 0 - 1
  onCancel?: () => void;
}

/**
 * Modal dialog overlay modern saat melakukan proses asynchronous
 * seperti submit booking, verifikasi, atau upload foto.
 */
export function ModernLoadingOverlay({
  visible,
  title = 'Memproses Permintaan',
  message = 'Mohon tunggu beberapa detik...',
  progress,
  onCancel,
}: ModernLoadingOverlayProps) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <ModernLoadingIndicator
            size="medium"
            color={BrandColors.primary}
            accentColor={BrandColors.secondaryContainer}
          />

          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>

          {typeof progress === 'number' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBase}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, Math.max(0, Math.round(progress * 100)))}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
            </View>
          )}

          {onCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Batal</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  indicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  glowHalo: {
    position: 'absolute',
    opacity: 0.12,
  },
  outerOrbit: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  innerOrbit: {
    position: 'absolute',
    borderStyle: 'dashed',
  },
  centerBadge: {
    backgroundColor: BrandColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  textWrapper: {
    marginTop: 14,
    alignItems: 'center',
    maxWidth: 260,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  submessageText: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 4,
  },

  /* Full Screen styles */
  fullScreenContainer: {
    flex: 1,
    backgroundColor: BrandColors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    position: 'relative',
  },
  ambientTopGlow: {
    position: 'absolute',
    top: -50,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 97, 148, 0.08)',
  },
  ambientBottomGlow: {
    position: 'absolute',
    bottom: -60,
    right: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(254, 166, 25, 0.06)',
  },
  loadingCenterCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 97, 148, 0.08)',
  },
  contentSection: {
    marginTop: 18,
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.onSurface,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  screenMessage: {
    fontSize: 13,
    color: BrandColors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  speedlineTrack: {
    width: '100%',
    height: 4,
    backgroundColor: BrandColors.surfaceContainerHigh,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 22,
    marginBottom: 20,
  },
  speedlineBar: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  speedlineGlow: {
    width: 80,
    height: '100%',
    backgroundColor: BrandColors.primary,
    borderRadius: 2,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  tipsContainer: {
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 6,
  },
  tipsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  tipsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.secondary,
    letterSpacing: 1,
  },
  tipsText: {
    fontSize: 11,
    color: BrandColors.onSurfaceVariant,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },

  /* Modal Overlay styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(19, 27, 46, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.onSurface,
    marginTop: 14,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    color: BrandColors.onSurfaceVariant,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  progressBarBase: {
    flex: 1,
    height: 6,
    backgroundColor: BrandColors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: BrandColors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
    minWidth: 36,
  },
  cancelBtn: {
    marginTop: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.outline,
  },
});
