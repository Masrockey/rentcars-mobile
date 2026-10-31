import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModernLoadingIndicator, ModernLoadingOverlay } from '@/components/ModernLoading';
import { BrandColors } from '@/constants/brand';
import { AuthError, AuthService } from '@/services/auth';
import { StorageService } from '@/services/storage';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load saved credentials jika remember me aktif
  useEffect(() => {
    (async () => {
      const saved = await StorageService.getRememberMe();
      setRememberMe(saved.enabled);
      if (saved.enabled && saved.identifier) {
        setIdentifier(saved.identifier);
      }
    })();
  }, []);

  const handleLogin = async () => {
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Harap masukkan Email, Username, atau No. HP.');
      return;
    }
    if (!password) {
      setErrorMessage('Harap masukkan kata sandi Anda.');
      return;
    }

    try {
      setLoading(true);
      await AuthService.login(identifier, password);

      // Simpan preferensi remember me
      await StorageService.setRememberMe(rememberMe, identifier.trim());

      // Arahkan ke halaman bertuliskan welcome sesuai instruksi user
      router.replace('/welcome');
    } catch (err: any) {
      const msg = err instanceof AuthError ? err.message : (err?.message || 'Gagal login.');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricPress = () => {
    Alert.alert(
      'Masuk via Biometrik',
      'Fitur biometrik dapat diaktifkan setelah Anda berhasil masuk ke akun pertama kali.',
      [{ text: 'OK' }]
    );
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Lupa Kata Sandi',
      'Silakan hubungi Administrator atau IT Support Rentcars Mobile untuk reset kata sandi Anda.',
      [{ text: 'Tutup' }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Subtle Ambient Glow Effect */}
          <View pointerEvents="none" style={styles.ambientGlow} />

          {/* Header & Brand Presentation */}
          <View style={styles.headerContainer}>
            {/* Logo Brand */}
            <View style={styles.fleetSymbolWrapper}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>

            {/* Company Identity */}
            <Text style={styles.companyTitle}>RENTCARS MOBILE</Text>
            <Text style={styles.companySubtitle}>THE BEST PARTNER</Text>
          </View>

          {/* Welcome / Context Banner */}
          <View style={styles.welcomeBanner}>
            <View style={styles.welcomeIconBadge}>
              <MaterialIcons name="security" size={20} color={BrandColors.onPrimaryFixedVariant} />
            </View>
            <View style={styles.welcomeTextGroup}>
              <Text style={styles.welcomeTitle}>Selamat Datang</Text>
              <Text style={styles.welcomeSubtitle}>Portal Operasional Armada &amp; Rental</Text>
            </View>
          </View>

          {/* Login Form Container Card */}
          <View style={styles.formCard}>
            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <MaterialIcons name="error-outline" size={18} color={BrandColors.error} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Input 1: Identity / Credential */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email, Username, atau No. HP</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="alternate-email"
                  size={20}
                  color={BrandColors.outline}
                  style={styles.inputIconLeft}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="admin@cahayaauto.co.id"
                  placeholderTextColor="#9ca5af"
                  value={identifier}
                  onChangeText={setIdentifier}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Input 2: Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kata Sandi</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={BrandColors.outline}
                  style={styles.inputIconLeft}
                />
                <TextInput
                  style={[styles.textInput, styles.passwordInput]}
                  placeholder="••••••••••••"
                  placeholderTextColor="#9ca5af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={20}
                    color={BrandColors.outline}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me & Forgot Password Row */}
            <View style={styles.rowBetween}>
              <Pressable
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                  {rememberMe && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                </View>
                <Text style={styles.checkboxLabel}>Ingat Saya</Text>
              </Pressable>

              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                <Text style={styles.forgotPasswordText}>Lupa Kata Sandi?</Text>
              </TouchableOpacity>
            </View>

            {/* Primary Login Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ModernLoadingIndicator size="mini" color="#ffffff" accentColor="#ffddb8" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Masuk ke Sistem</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={BrandColors.onPrimary} />
                </>
              )}
            </TouchableOpacity>

            {/* Alternative Biometric Access & Animation Showcase */}
            <View style={styles.biometricContainer}>
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricPress}
                activeOpacity={0.75}>
                <MaterialIcons name="fingerprint" size={18} color={BrandColors.primary} />
                <Text style={styles.biometricText}>Masuk Cepat via Biometrik</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Metadata */}
          <View style={styles.footerContainer}>
            <View style={styles.versionBadge}>
              <MaterialIcons name="verified" size={14} color={BrandColors.onSurfaceVariant} />
              <Text style={styles.versionText}>CDK Enterprise V1.0.0</Text>
            </View>
            <Text style={styles.copyrightText}>
              © 2026 Rentcars Mobile. Hak Cipta Dilindungi.
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modern Loading Overlay Saat Proses Login */}
      <ModernLoadingOverlay
        visible={loading}
        title="Otentikasi Akun"
        message="Sedang memverifikasi kredensial ke sistem armada CAN..."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    position: 'relative',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    top: -40,
    left: '25%',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(0, 97, 148, 0.08)',
  },

  /* Header & Brand */
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },
  fleetSymbolWrapper: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: BrandColors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  logoImage: {
    width: 52,
    height: 52,
  },
  companyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.onSurface,
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  companySubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: BrandColors.secondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  /* Welcome Banner */
  welcomeBanner: {
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  welcomeIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BrandColors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTextGroup: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.onSurface,
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: BrandColors.onSurfaceVariant,
    marginTop: 2,
  },

  /* Form Card */
  formCard: {
    backgroundColor: BrandColors.surfaceContainerLowest,
    borderRadius: 28,
    padding: 22,
    shadowColor: '#131b2e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.errorContainer,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: BrandColors.onErrorContainer,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.surfaceContainerLow,
    borderRadius: 9999,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIconLeft: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.onSurface,
    height: '100%',
  },
  passwordInput: {
    paddingRight: 8,
  },
  eyeButton: {
    padding: 4,
  },

  /* Row Between */
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: BrandColors.outlineVariant,
    backgroundColor: BrandColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  checkboxLabel: {
    fontSize: 13,
    color: BrandColors.onSurfaceVariant,
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },

  /* Buttons */
  primaryButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: 9999,
    height: 52,
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
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.onPrimary,
  },
  biometricContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BrandColors.surfaceContainerLow,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  biometricText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  /* Footer */
  footerContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 8,
    gap: 8,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BrandColors.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
    color: BrandColors.onSurfaceVariant,
  },
  copyrightText: {
    fontSize: 11,
    color: BrandColors.outline,
    textAlign: 'center',
  },
});
