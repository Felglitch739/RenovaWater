import React, { useState, useCallback } from 'react';
import { LogBox, Platform, View, Text, TouchableOpacity, InteractionManager } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { MonitorScreen } from './screens/MonitorScreen';
import { AlertsView } from './components/AlertsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

import { useSensorStore } from './store/useSensorStore';
import { MonitorIcon, AlertTriangleIcon, FileTextIcon, SettingsIcon } from './components/Icons';
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

const Tab = createBottomTabNavigator();

const DARK_THEME = { navBg: '#080C13', navBorder: 'rgba(255,255,255,0.06)' };
const LIGHT_THEME = { navBg: '#FFFFFF', navBorder: 'rgba(0,0,0,0.10)' };

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, totalAlerts } = useSensorStore();
  const isDark = theme === 'dark';
  const T = isDark ? DARK_THEME : LIGHT_THEME;
  const bottomPadding = Math.max(insets.bottom, 12);

  return (
    <View
      style={{
        paddingBottom: bottomPadding,
        backgroundColor: T.navBg,
        borderTopWidth: 1,
        borderTopColor: T.navBorder,
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingTop: 8,
        alignItems: 'center',
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 16,
      }}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;
        const isAlert = route.name === 'Alertas';
        const iconColor = isFocused ? '#38BDF8' : isDark ? '#64748B' : '#94A3B8';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        let IconComponent = MonitorIcon;
        if (route.name === 'Alertas') IconComponent = AlertTriangleIcon;
        if (route.name === 'Informes') IconComponent = FileTextIcon;
        if (route.name === 'Ajustes') IconComponent = SettingsIcon;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 }}
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                alignItems: 'center',
                borderWidth: 1,
                minWidth: 64,
                position: 'relative',
                backgroundColor: isFocused ? 'rgba(14,165,233,0.14)' : 'transparent',
                borderColor: isFocused ? 'rgba(14,165,233,0.3)' : 'transparent',
              }}
            >
              <IconComponent size={19} color={iconColor} />

              <Text style={{
                fontSize: 10,
                marginTop: 3,
                fontWeight: '600',
                color: isFocused ? '#38BDF8' : isDark ? '#64748B' : '#94A3B8',
                letterSpacing: 0.2,
              }}>
                {label as string}
              </Text>

              {isAlert && totalAlerts > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -4,
                  backgroundColor: '#EF4444', borderRadius: 10,
                  paddingHorizontal: 5, paddingVertical: 2,
                  minWidth: 16, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1.5, borderColor: T.navBg,
                }}>
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: 'bold', lineHeight: 11 }}>
                    {totalAlerts > 99 ? '99+' : totalAlerts}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AlertsScreen() {
  const [isReady, setIsReady] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
      });
      return () => task.cancel();
    }, [])
  );
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      {isReady ? <AlertsView /> : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{color: '#94A3B8'}}>Cargando Alertas...</Text></View>}
    </View>
  );
}

function ReportsScreen() {
  const [isReady, setIsReady] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
      });
      return () => task.cancel();
    }, [])
  );
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      {isReady ? <ReportsView /> : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{color: '#94A3B8'}}>Cargando Informes...</Text></View>}
    </View>
  );
}

function SettingsScreen() {
  const [isReady, setIsReady] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        setIsReady(true);
      });
      return () => task.cancel();
    }, [])
  );
  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
      {isReady ? <SettingsView /> : <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{color: '#94A3B8'}}>Cargando Ajustes...</Text></View>}
    </View>
  );
}

export default function App() {
  const { theme } = useSensorStore();
  const isDark = theme === 'dark';

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={{
        dark: isDark,
        colors: {
          primary: '#0EA5E9',
          background: isDark ? '#0A0D14' : '#F1F5F9',
          card: isDark ? '#080C13' : '#FFFFFF',
          text: isDark ? '#F1F5F9' : '#0F172A',
          border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)',
          notification: '#EF4444',
        },
        fonts: {
          regular: { fontFamily: '', fontWeight: 'normal' as const },
          medium: { fontFamily: '', fontWeight: 'normal' as const },
          bold: { fontFamily: '', fontWeight: 'bold' as const },
          heavy: { fontFamily: '', fontWeight: 'bold' as const },
        }
      }}>
        <Tab.Navigator
          tabBar={props => <CustomTabBar {...props} />}
          screenOptions={{ headerShown: false, lazy: true }}
        >
          <Tab.Screen name="Monitor" component={MonitorScreen} />
          <Tab.Screen name="Alertas" component={AlertsScreen} />
          <Tab.Screen name="Informes" component={ReportsScreen} />
          <Tab.Screen name="Ajustes" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
