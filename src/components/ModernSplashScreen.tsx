import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandColors } from '@/constants/brand';
import { StorageService } from '@/services/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ModernSplashScreenProps {
  /**
   * Dipanggil saat animasi splash screen selesai
   * Parameter isAuthenticated bernilai true jika token login tersimpan
   */
  onFinish?: (isAuthenticated: boolean) => void;
  /**
   * Jika true, splash screen hanya menampilkan animasi tanpa auto redirect ke screen lain
   */
  previewMode?: boolean;
}

/**
 * ModernSplashScreen
 * Splash screen beranimasi premium dengan identitas Rentcars Mobile:
 * - Pulse radar otomotif & gelombang surya keemasan
 * - Entrance spring logo & glassmorphism badge
 * - Staggered fade typography & brand slogan "The Best Partner"
 * - Dynamic progress bar & status sinkronisasi sistem
 * - Seamless handoff dari native Expo splash screen
 */
export function ModernSplashScreen({
  onFinish,
  previewMode = false,
}: ModernSplashScreenProps) {
  // Status dan progress
  const [statusText, setStatusText] = useState('Menginisialisasi sistem operasional...');
  const [progressPercent, setProgressPercent] = useState(0);

  // Nilai Animasi didaftarkan via useState initializer agar kompatibel dengan React 19 compiler
  const [containerOpacity] = useState(() => new Animated.Value(1));
  const [containerScale] = useState(() => new Animated.Value(1));

  // Logo Badge Animations
  const [logoScale] = useState(() => new Animated.Value(0.7));
  const [logoOpacity] = useState(() => new Animated.Value(0));

  // Typography Animations
  const [titleTranslateY] = useState(() => new Animated.Value(24));
  const [titleOpacity] = useState(() => new Animated.Value(0));

  const [subtitleTranslateY] = useState(() => new Animated.Value(16));
  const [subtitleOpacity] = useState(() => new Animated.Value(0));

  // Progress Bar & Status
  const [progressAnim] = useState(() => new Animated.Value(0));
  const [bottomOpacity] = useState(() => new Animated.Value(0));

  // Expanding Pulse Wave Animations (3 Concentric Rings)
  const [ring1Scale] = useState(() => new Animated.Value(1));
  const [ring1Opacity] = useState(() => new Animated.Value(0.6));

  const [ring2Scale] = useState(() => new Animated.Value(1));
  const [ring2Opacity] = useState(() => new Animated.Value(0.5));

  const [ring3Scale] = useState(() => new Animated.Value(1));
  const [ring3Opacity] = useState(() => new Animated.Value(0.4));

  // Shimmer Sweep
  const [shimmerTranslate] = useState(() => new Animated.Value(-120));

  useEffect(() => {
    let isMounted = true;

    // 1. Pastikan native splash screen tertutup mulus begitu animated splash tampil
    SplashScreen.hideAsync().catch(() => { });

    // Loop animasi pulse radar
    const createPulseLoop = (scaleAnim: Animated.Value, opacityAnim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 2.1,
              duration: 2200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 2200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 0,
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: 0,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
        ])
      );
    };

    const pulse1 = createPulseLoop(ring1Scale, ring1Opacity, 0);
    const pulse2 = createPulseLoop(ring2Scale, ring2Opacity, 600);
    const pulse3 = createPulseLoop(ring3Scale, ring3Opacity, 1200);

    pulse1.start();
    pulse2.start();
    pulse3.start();

    // Shimmer sweep across badge
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerTranslate, {
          toValue: 200,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shimmerTranslate, {
          toValue: -120,
          duration: 0,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.delay(1200),
      ])
    );
    shimmerLoop.start();

    // 2. Main Entrance Sequence
    Animated.sequence([
      // Logo spring entrance
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),

      // Title & Slogan Slide Up
      Animated.parallel([
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 450,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 500,
          delay: 100,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 500,
          delay: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),

      // Bottom progress section fade in
      Animated.timing(bottomOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // 3. Progress Simulation & Auth Check Parallel
    let currentAuth = false;

    // Listener progress bar
    const progressListener = progressAnim.addListener(({ value }) => {
      if (isMounted) {
        const percent = Math.round(value * 100);
        setProgressPercent(percent);

        if (percent < 30) {
          setStatusText('Menghubungkan ke Server');
        } else if (percent < 65) {
          setStatusText('Memeriksa sesi pengguna');
        } else if (percent < 90) {
          setStatusText('Menyiapkan sistem operasional...');
        } else {
          setStatusText('Selamat datang!');
        }
      }
    });

    // Jalankan pengecekan otentikasi di background
    const checkAuthPromise = (async () => {
      try {
        const token = await StorageService.getToken();
        currentAuth = Boolean(token);
      } catch {
        currentAuth = false;
      }
    })();

    // Animasi progress bar (durasi ~2 detik agar mulus & responsif)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2100,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start(async () => {
      await checkAuthPromise;

      if (!isMounted) return;

      if (previewMode) {
        if (onFinish) onFinish(currentAuth);
        return;
      }

      // 4. Smooth Exit Animation (Fade out + Scale up)
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 450,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(containerScale, {
          toValue: 1.05,
          duration: 450,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        if (onFinish) {
          onFinish(currentAuth);
        } else {
          // Navigasi otomatis sesuai status otentikasi
          if (currentAuth) {
            router.replace('/welcome');
          } else {
            router.replace('/');
          }
        }
      });
    });

    return () => {
      isMounted = false;
      progressAnim.removeListener(progressListener);
      pulse1.stop();
      pulse2.stop();
      pulse3.stop();
      shimmerLoop.stop();
    };
  }, [
    bottomOpacity,
    containerOpacity,
    containerScale,
    logoOpacity,
    logoScale,
    onFinish,
    previewMode,
    progressAnim,
    ring1Opacity,
    ring1Scale,
    ring2Opacity,
    ring2Scale,
    ring3Opacity,
    ring3Scale,
    shimmerTranslate,
    subtitleOpacity,
    subtitleTranslateY,
    titleOpacity,
    titleTranslateY,
  ]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.rootContainer,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}>
      {/* Background Decorative Ambient Glows */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />
      <View style={styles.ambientSunAccent} />

      {/* Main Center Content */}
      <View style={styles.centerSection}>
        {/* Radar Wave Pulse Rings */}
        <View style={styles.radarContainer}>
          <Animated.View
            style={[
              styles.radarRing,
              {
                borderColor: BrandColors.primaryFixedDim,
                transform: [{ scale: ring1Scale }],
                opacity: ring1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radarRing,
              {
                borderColor: BrandColors.secondaryContainer,
                transform: [{ scale: ring2Scale }],
                opacity: ring2Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.radarRing,
              {
                borderColor: BrandColors.primary,
                transform: [{ scale: ring3Scale }],
                opacity: ring3Opacity,
              },
            ]}
          />
        </View>

        {/* Elevated Logo Card Emblem */}
        <Animated.View
          style={[
            styles.emblemContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
          <View style={styles.emblemInner}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoImage}
              contentFit="contain"
              priority="high"
            />
            {/* Shimmer sweep effect */}
            <Animated.View
              style={[
                styles.shimmerEffect,
                {
                  transform: [{ translateX: shimmerTranslate }],
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* Typography: Company Name */}
        <Animated.View
          style={[
            styles.titleGroup,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}>
          <Text style={styles.companyName}>RENTCARS MOBILE</Text>

          {/* Golden Badge: "THE BEST PARTNER" */}
          <View style={styles.goldBadge}>
            <MaterialIcons name="wb-sunny" size={13} color={BrandColors.secondary} />
            <Text style={styles.goldBadgeText}>THE BEST PARTNER</Text>
          </View>
        </Animated.View>

        {/* Typography: Subtitle / System Tagline */}
        <Animated.View
          style={[
            styles.subtitleGroup,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}>
          <Text style={styles.systemTagline}>
            Portal Operasional &amp; Manajemen Rental
          </Text>
        </Animated.View>
      </View>

      {/* Bottom Progress & System Status Section */}
      <Animated.View style={[styles.bottomSection, { opacity: bottomOpacity }]}>
        {/* Status text with percentage */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{statusText}</Text>
          <Text style={styles.percentLabel}>{progressPercent}%</Text>
        </View>

        {/* Progress Track */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        {/* Security / Quality Assurance Badge */}
        <View style={styles.securityBadge}>
          <MaterialIcons name="verified-user" size={14} color={BrandColors.primary} />
          <Text style={styles.securityText}>CDK Enterprise V1.0.0</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#faf8ff',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 56,
    paddingHorizontal: 24,
    zIndex: 9999,
  },

  /* Ambient Glows */
  ambientGlowTop: {
    position: 'absolute',
    top: -80,
    left: '20%',
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: (SCREEN_WIDTH * 0.9) / 2,
    backgroundColor: 'rgba(0, 97, 148, 0.08)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -100,
    right: -40,
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: (SCREEN_WIDTH * 0.8) / 2,
    backgroundColor: 'rgba(0, 123, 185, 0.06)',
  },
  ambientSunAccent: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.28,
    right: '15%',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(254, 166, 25, 0.09)',
  },

  /* Center Area */
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
  },

  /* Radar Pulse Rings */
  radarContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  radarRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
  },

  /* Emblem Container */
  emblemContainer: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#006194',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 97, 148, 0.12)',
    marginBottom: 26,
    overflow: 'hidden',
  },
  emblemInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoImage: {
    width: 82,
    height: 82,
  },
  shimmerEffect: {
    position: 'absolute',
    width: 45,
    height: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ rotate: '25deg' }],
  },

  /* Typography */
  titleGroup: {
    alignItems: 'center',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.onSurface,
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.secondaryFixed,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 9999,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(254, 166, 25, 0.3)',
  },
  goldBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BrandColors.secondary,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },

  subtitleGroup: {
    alignItems: 'center',
    maxWidth: 280,
  },
  systemTagline: {
    fontSize: 13,
    color: BrandColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Bottom Progress Section */
  bottomSection: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  statusRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    fontWeight: '500',
  },
  percentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: BrandColors.surfaceContainerHigh,
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BrandColors.primary,
    borderRadius: 9999,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 9999,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
});
