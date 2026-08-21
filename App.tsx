import { LogBox, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardScreen } from './screens/DashboardScreen';
import './global.css';

LogBox.ignoreLogs(['Cannot record touch end without a touch start']);

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Cannot record touch end without a touch start')) {
      return;
    }
    originalError(...args);
  };
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DashboardScreen />
    </SafeAreaProvider>
  );
}

