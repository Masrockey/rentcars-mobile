import React, { useEffect, useState } from 'react';
import {
  AlertButton,
  AlertOptions,
  Animated,
  Easing,
  Modal,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/brand';

export interface ModernAlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
  type?: 'success' | 'error' | 'warning' | 'info';
}

type AlertListener = (config: ModernAlertConfig | null) => void;

let activeListener: AlertListener | null = null;

/**
 * Controller singleton untuk memicu Modern Alert dari mana saja di dalam aplikasi
 */
export const ModernAlert = {
  /**
   * Menampilkan modal popup modern.
   * Signature kompatibel 100% dengan React Native Alert.alert(...)
   */
  alert(
    title: string = '',
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) {
    if (activeListener) {
      activeListener({
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'Mengerti' }],
        options,
      });
    } else {
      console.warn('[ModernAlert] AlertProvider belum terpasang di root layout.');
    }
  },

  /**
   * Menutup modal popup yang sedang aktif
   */
  dismiss() {
    if (activeListener) {
      activeListener(null);
    }
  },

  /**
   * Digunakan oleh ModernAlertProvider untuk mendaftarkan listener global
   */
  _registerListener(listener: AlertListener) {
    activeListener = listener;
    return () => {
      if (activeListener === listener) {
        activeListener = null;
      }
    };
  },
};

/**
 * Menentukan tipe visual dan ikon modal berdasarkan isi judul atau konfigurasi
 */
function resolveAlertType(title: string, explicitType?: string): 'success' | 'error' | 'warning' | 'info' {
  if (explicitType) {
    return explicitType as any;
  }
  const lower = (title || '').toLowerCase();
  if (
    lower.includes('berhasil') ||
    lower.includes('sukses') ||
    lower.includes('success') ||
    lower.includes('tersimpan') ||
    lower.includes('selesai') ||
    lower.includes('verified')
  ) {
    return 'success';
  }
  if (
    lower.includes('gagal') ||
    lower.includes('error') ||
    lower.includes('ditolak') ||
    lower.includes('salah')
  ) {
    return 'error';
  }
  if (
    lower.includes('perhatian') ||
    lower.includes('peringatan') ||
    lower.includes('warning') ||
    lower.includes('konfirmasi') ||
    lower.includes('hapus') ||
    lower.includes('keluar') ||
    lower.includes('batal')
  ) {
    return 'warning';
  }
  return 'info';
}

/**
 * Provider / Container yang dipasang sekali di `_layout.tsx`
 * untuk me-render semua dialog alert menjadi modal modern.
 */
export function ModernAlertProvider() {
  const [config, setConfig] = useState<ModernAlertConfig | null>(null);

  // Animasi modal (React 19 compiler safe via useState initializer)
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const [cardScale] = useState(() => new Animated.Value(0.85));
  const [cardTranslateY] = useState(() => new Animated.Value(25));
  const [iconScale] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const unregister = ModernAlert._registerListener((newConfig) => {
      if (newConfig) {
        setConfig(newConfig);

        // Reset animasi
        backdropOpacity.setValue(0);
        cardScale.setValue(0.85);
        cardTranslateY.setValue(25);
        iconScale.setValue(0);

        // Jalankan entrance animation
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.ease),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.spring(cardScale, {
            toValue: 1,
            friction: 7,
            tension: 65,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(cardTranslateY, {
            toValue: 0,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.sequence([
            Animated.delay(100),
            Animated.spring(iconScale, {
              toValue: 1,
              friction: 5,
              tension: 60,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
        ]).start();
      } else {
        // Exit animation
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.ease),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(cardScale, {
            toValue: 0.9,
            duration: 180,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start(() => {
          setConfig(null);
        });
      }
    });

    return () => {
      unregister();
    };
  }, [backdropOpacity, cardScale, cardTranslateY, iconScale]);

  if (!config) {
    return null;
  }

  const alertType = resolveAlertType(config.title, config.type);

  // Tema warna & ikon berdasarkan tipe
  const typeStyles = {
    success: {
      accentColor: '#10b981',
      badgeBg: '#ecfdf5',
      badgeBorder: '#a7f3d0',
      iconName: 'checkmark-circle' as const,
      iconFamily: 'ionicons',
    },
    error: {
      accentColor: '#ef4444',
      badgeBg: '#fef2f2',
      badgeBorder: '#fecaca',
      iconName: 'alert-circle' as const,
      iconFamily: 'ionicons',
    },
    warning: {
      accentColor: BrandColors.secondaryContainer,
      badgeBg: '#fffbeb',
      badgeBorder: '#fde68a',
      iconName: 'warning' as const,
      iconFamily: 'ionicons',
    },
    info: {
      accentColor: BrandColors.primary,
      badgeBg: '#f0f7ff',
      badgeBorder: '#bae6fd',
      iconName: 'information-circle' as const,
      iconFamily: 'ionicons',
    },
  }[alertType];

  const handleDismiss = () => {
    if (config.options?.onDismiss) {
      config.options.onDismiss();
    }
    ModernAlert.dismiss();
  };

  const handleButtonPress = (btn: AlertButton) => {
    ModernAlert.dismiss();
    if (btn.onPress) {
      btn.onPress();
    }
  };

  const buttons = config.buttons && config.buttons.length > 0 ? config.buttons : [{ text: 'OK' }];
  const isMultipleButtons = buttons.length >= 2;

  return (
    <Modal transparent animationType="none" visible onRequestClose={handleDismiss}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            if (config.options?.cancelable !== false) {
              handleDismiss();
            }
          }}
        />

        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
            },
          ]}>
          {/* Ambient Top Glow Card */}
          <View
            style={[
              styles.cardTopGlow,
              { backgroundColor: typeStyles.accentColor },
            ]}
          />

          {/* Icon Badge */}
          <Animated.View
            style={[
              styles.badgeOuter,
              {
                backgroundColor: typeStyles.badgeBg,
                borderColor: typeStyles.badgeBorder,
                transform: [{ scale: iconScale }],
              },
            ]}>
            <Ionicons name={typeStyles.iconName} size={36} color={typeStyles.accentColor} />
          </Animated.View>

          {/* Title & Message */}
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>{config.title}</Text>
            {Boolean(config.message) && (
              <Text style={styles.messageText}>{config.message}</Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={isMultipleButtons ? styles.buttonRow : styles.buttonSingle}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isPrimary = !isCancel && (index === buttons.length - 1 || btn.isPreferred);

              let btnStyle: StyleProp<ViewStyle> = styles.btnPrimary;
              let btnTextStyle: StyleProp<TextStyle> = styles.btnTextPrimary;

              if (isCancel) {
                btnStyle = styles.btnSecondary;
                btnTextStyle = styles.btnTextSecondary;
              } else if (isDestructive) {
                btnStyle = styles.btnDestructive;
                btnTextStyle = styles.btnTextDestructive;
              } else if (isPrimary) {
                btnStyle = [styles.btnPrimary, { backgroundColor: typeStyles.accentColor }];
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.btnBase, btnStyle, isMultipleButtons && { flex: 1 }]}
                  activeOpacity={0.8}
                  onPress={() => handleButtonPress(btn)}>
                  <Text style={[styles.btnTextBase, btnTextStyle]}>{btn.text || 'OK'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Company Micro Footer */}
          <View style={styles.cardFooter}>
            <MaterialIcons name="security" size={12} color={BrandColors.outline} />
            <Text style={styles.cardFooterText}>PT. Cahaya Auto Nusantara</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    zIndex: 99999,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingTop: 30,
    paddingBottom: 18,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#0b192c',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 97, 148, 0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  cardTopGlow: {
    position: 'absolute',
    top: -55,
    width: 140,
    height: 70,
    borderRadius: 70,
    opacity: 0.16,
  },
  badgeOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 22,
    width: '100%',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#131b2e',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  buttonSingle: {
    width: '100%',
  },
  buttonRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  btnBase: {
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnPrimary: {
    backgroundColor: BrandColors.primary,
    shadowColor: BrandColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnDestructive: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnTextBase: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnTextPrimary: {
    color: '#ffffff',
  },
  btnTextSecondary: {
    color: '#475569',
  },
  btnTextDestructive: {
    color: '#ffffff',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 16,
    opacity: 0.7,
  },
  cardFooterText: {
    fontSize: 11,
    color: BrandColors.outline,
    fontWeight: '500',
  },
});
