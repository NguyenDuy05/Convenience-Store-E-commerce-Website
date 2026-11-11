import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider } from './src/context/AuthContext';
import Navigation from './src/navigation';
import SplashView from './src/components/SplashView';

export default function App() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  return (
    <SafeAreaProvider>
      {loaded || error ? (
        <AuthProvider>
          <Navigation />
          <StatusBar style="dark" />
        </AuthProvider>
      ) : <SplashView />}
    </SafeAreaProvider>
  );
}
