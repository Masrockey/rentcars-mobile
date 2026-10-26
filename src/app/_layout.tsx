import { useState } from 'react';
import Stack from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';

import { ModernSplashScreen } from '@/components/ModernSplashScreen';
import { ModernAlert, ModernAlertProvider } from '@/components/ModernAlertModal';

// Pasang modern alert modal global sebagai pengganti dialog Alert bawaan OS
Alert.alert = (title, message, buttons, options) => {
  ModernAlert.alert(title || '', message || undefined, buttons, options);
};

// Cegah auto-hide native splash agar handoff ke animasi berjalan mulus tanpa kedipan layar
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="booking-detail" />
        <Stack.Screen name="booking-create" />
        <Stack.Screen name="allocation" />
        <Stack.Screen name="delivery" />
        <Stack.Screen name="return" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="splash" />
      </Stack>

      {showSplash && (
        <ModernSplashScreen
          onFinish={() => {
            setShowSplash(false);
          }}
        />
      )}

      {/* Global Modern Alert Modal Popup */}
      <ModernAlertProvider />
    </>
  );
}
