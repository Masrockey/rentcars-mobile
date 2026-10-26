import { useEffect } from 'react';
import Stack from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  useEffect(() => {
    // Pastikan splash screen tertutup saat aplikasi siap
    SplashScreen.hideAsync().catch(() => {});
  }, []);

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
      </Stack>
    </>
  );
}
