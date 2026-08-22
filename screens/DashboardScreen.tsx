import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useSensorStore,
  evaluatePh,
  evaluateTemperature,
  evaluateTurbidity,
  type HistoryRecord,
  type MetricStatus,
  type AppTheme,
} from '../store/useSensorStore';
import { AlertsView } from '../components/AlertsView';
import { ReportsView } from '../components/ReportsView';
import { SettingsView } from '../components/SettingsView';
import { ConfigModal } from '../components/ConfigModal';
import { AuraCard } from '../components/AuraCard';
import { WqiCard } from '../components/WqiCard';
import { SemiCircleGauge } from '../components/SemiCircleGauge';
import { TurbidityMeterCard } from '../components/TurbidityMeterCard';
import { PhLevelGauge } from '../components/PhLevelGauge';
import { TemperatureGauge } from '../components/TemperatureGauge';
import { ConductivityChart } from '../components/ConductivityChart';
import {
  MoonIcon,
  SunIcon,
  MonitorIcon,
  AlertTriangleIcon,
  FileTextIcon,
  BluetoothIcon,
  SettingsIcon,
  HistoryIcon,
  PlayIcon,
  StopIcon,
  SignalIcon,
  BatteryIcon,
  ZapIcon,
  InfoIcon,
  DropletIcon,
  ThermometerIcon,
  WavesIcon,
} from '../components/Icons';

// ─────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────

type NavTab = 'monitor' | 'alertas' | 'informes' | 'ajustes';

// ─────────────────────────────────────────────
// Paleta de tema premium
// ─────────────────────────────────────────────

const DARK_THEME = {
  bg: '#0A0D14',
  card: ['#1C222B', '#14181F'] as [string, string],
  headerBg: 'rgba(12,15,22,0.97)',
  headerBorder: 'rgba(255,255,255,0.06)',
  navBg: '#080C13',
  navBorder: 'rgba(255,255,255,0.06)',
  textPrimary: '#F1F5F9',
  textSecondary: '#64748B',
  textMuted: '#374151',
  accent: '#0EA5E9',
};

const LIGHT_THEME = {
  bg: '#F1F5F9',
  card: ['#FFFFFF', '#F8FAFC'] as [string, string],
  headerBg: '#FFFFFF',
  headerBorder: 'rgba(0,0,0,0.08)',
  navBg: '#FFFFFF',
  navBorder: 'rgba(0,0,0,0.10)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  accent: '#0284C7',
};



// ─────────────────────────────────────────────
// Sub-componente: Barra de navegación inferior Premium
// ─────────────────────────────────────────────

interface NavBarProps {
  active: NavTab;
  onSelect: (tab: NavTab) => void;
  isConnected: boolean;
  isDark: boolean;
  totalAlerts: number;
  bottomPadding: number;
}

interface NavItemDef {
  id: NavTab;
  label: string;
  renderIcon: (color: string) => React.ReactNode;
}

const NAV_ITEMS: NavItemDef[] = [
  {
    id: 'monitor',
    label: 'Monitor',
    renderIcon: (color) => <MonitorIcon size={19} color={color} />,
  },
  {
    id: 'alertas',
    label: 'Alertas',
    renderIcon: (color) => <AlertTriangleIcon size={19} color={color} />,
  },
  {
    id: 'informes',
    label: 'Informes',
    renderIcon: (color) => <FileTextIcon size={19} color={color} />,
  },
  {
    id: 'ajustes',
    label: 'Ajustes',
    renderIcon: (color) => <SettingsIcon size={19} color={color} />,
  },
];

const BottomNav: React.FC<NavBarProps> = ({
  active,
  onSelect,
  isConnected,
  isDark,
  totalAlerts,
  bottomPadding,
}) => {
  const T = isDark ? DARK_THEME : LIGHT_THEME;
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
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.id;
        const isAlert = item.id === 'alertas';

        const iconColor = isActive
          ? '#38BDF8'
          : isDark ? '#64748B' : '#94A3B8';

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onSelect(item.id)}
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
                backgroundColor: isActive ? 'rgba(14,165,233,0.14)' : 'transparent',
                borderColor: isActive ? 'rgba(14,165,233,0.3)' : 'transparent',
              }}
            >
              {item.renderIcon(iconColor)}

              <Text style={{
                fontSize: 10,
                marginTop: 3,
                fontWeight: '600',
                color: isActive ? '#38BDF8' : isDark ? '#64748B' : '#94A3B8',
                letterSpacing: 0.2,
              }}>
                {item.label}
              </Text>

              {/* Badge de Alertas activas */}
              {isAlert && totalAlerts > 0 && (
                <View style={{
                  position: 'absolute', top: -4, right: -4,
                  backgroundColor: '#EF4444', borderRadius: 10,
                  paddingHorizontal: 5, paddingVertical: 2,
                  minWidth: 16, alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1.5, borderColor: T.navBg,
                  shadowColor: '#EF4444', shadowOpacity: 0.7, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
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
};



// ─────────────────────────────────────────────
// Pantalla principal: DashboardScreen
// ─────────────────────────────────────────────

export const DashboardScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('monitor');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const {
    ph,
    temperature,
    turbidity,
    isConnected,
    isScanning,
    alertRanges,
    visibleMeters,
    historyData,
    totalAlerts,
    theme,
    connectionMode,
    connectedDeviceName,
    setTheme,
    connect,
    disconnect,
  } = useSensorStore();

  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const horizontalScrollRef = useRef<ScrollView>(null);

  // Status bar & safe insets
  const topPadding =
    Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 20) + 8;
  const bottomPadding = Math.max(insets.bottom, 8);

  // Paleta activa según tema
  const isDark = theme === 'dark';
  const T = isDark ? DARK_THEME : LIGHT_THEME;

  // Iniciar simulación o escaneo al montar, limpiar al desmontar
  useEffect(() => {
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Evaluar estados usando los rangos del store (dinámicos)
  const phStatus = evaluatePh(ph, alertRanges.ph);
  const tempStatus = evaluateTemperature(temperature, alertRanges.temperature);
  const turbidityStatus = evaluateTurbidity(turbidity, alertRanges.turbidity);


  // ─── Control de Tabs y Gestos Swipe Horizontal ───
  const NAV_TABS: NavTab[] = ['monitor', 'alertas', 'informes', 'ajustes'];

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    const index = NAV_TABS.indexOf(tab);
    if (index !== -1 && horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
    }
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (NAV_TABS[index] && NAV_TABS[index] !== activeTab) {
      setActiveTab(NAV_TABS[index]);
    }
  };

  const gaugeWidth = (screenWidth - 44) / 2;

  // Verificar si hay al menos un medidor activo
  const hasVisibleMeters =
    visibleMeters.wqi ||
    visibleMeters.ph ||
    visibleMeters.temperature ||
    visibleMeters.conductivity ||
    visibleMeters.turbidity;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />

      {/* ─── HEADER PREMIUM ─── */}
      <View
        style={{
          paddingTop: topPadding,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: T.headerBg,
          borderBottomWidth: 1,
          borderBottomColor: T.headerBorder,
        }}
      >
        <View className="flex-row items-center justify-between">
          {/* Logo & Identidad de Marca */}
          <View className="flex-row items-center flex-1 mr-2">
            <View
              style={{
                width: 46,
                height: 46,
                backgroundColor: isDark
                  ? 'rgba(14, 165, 233, 0.12)'
                  : 'rgba(14, 165, 233, 0.08)',
                borderColor: isDark
                  ? 'rgba(14, 165, 233, 0.35)'
                  : 'rgba(14, 165, 233, 0.25)',
                borderRadius: 14,
                borderTopWidth: 1,
                borderLeftWidth: 0.5,
                borderTopColor: 'rgba(255,255,255,0.12)',
                borderLeftColor: 'rgba(255,255,255,0.06)',
                shadowColor: '#0EA5E9',
                shadowOpacity: isDark ? 0.35 : 0.15,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
              }}
              className="border items-center justify-center mr-3 p-1.5"
            >
              <Image
                source={require('../assets/TPH_Monitor_Icon.png')}
                style={{ width: 34, height: 34 }}
                resizeMode="contain"
              />
            </View>

            {/* Texto de la Marca & Estado */}
            <View>
              <View className="flex-row items-center">
                <Text style={{
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  fontSize: 16,
                  fontWeight: '800',
                  letterSpacing: -0.3,
                }}>
                  TPH Monitor
                </Text>
                <View style={{
                  marginLeft: 6,
                  paddingHorizontal: 5,
                  paddingVertical: 1,
                  borderRadius: 6,
                  backgroundColor: 'rgba(14,165,233,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(14,165,233,0.25)',
                }}>
                  <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0EA5E9', letterSpacing: 0.5 }}>
                    {connectionMode === 'bluetooth' ? 'ESP32 BLE' : 'SIMULACIÓN'}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center mt-0.5">
                <View style={{
                  width: 6, height: 6, borderRadius: 3, marginRight: 6,
                  backgroundColor: isScanning ? '#FBBF24' : isConnected ? '#10B981' : '#374151',
                  shadowColor: isConnected ? '#10B981' : 'transparent',
                  shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
                }} />
                <Text style={{ color: T.textSecondary, fontSize: 10, fontWeight: '500' }}>
                  {isConnected
                    ? (connectionMode === 'bluetooth'
                        ? (connectedDeviceName ? `Enlace BLE: ${connectedDeviceName}` : 'Telemetría ESP32 activa')
                        : 'Simulación de pH activa')
                    : (isScanning ? 'Escaneando dispositivos...' : 'Monitoreo en espera')}
                </Text>
              </View>
            </View>
          </View>

          {/* Lado Derecho: Selector de Tema */}
          <View className="flex-row items-center">
            {/* Selector de Tema (Oscuro / Claro) */}
            <TouchableOpacity
              onPress={() => {
                const next: AppTheme = theme === 'dark' ? 'light' : 'dark';
                setTheme(next);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: isDark ? '#27272a' : '#ffffff',
                borderWidth: 1,
                borderColor: isDark ? '#3f3f46' : '#cbd5e1',
              }}
              activeOpacity={0.65}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <View style={{ marginRight: 6 }}>
                {isDark ? (
                  <MoonIcon size={14} color="#38bdf8" />
                ) : (
                  <SunIcon size={14} color="#f59e0b" />
                )}
              </View>
              <Text style={{ fontSize: 10, fontWeight: '600', color: isDark ? '#d4d4d8' : '#334155' }}>
                {isDark ? 'Oscuro' : 'Claro'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── BODY SWIPEABLE HORIZONTAL PAGER ─── */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal={true}
        pagingEnabled={true}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={{ flex: 1 }}
      >
        {/* ─── PÁGINA 0: MONITOR ─── */}
        <View style={{ width: screenWidth, flex: 1 }}>
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
            {/* ── SECCIÓN 1: MEDIDORES DE CALIDAD EN TIEMPO REAL ── */}
            <View style={{ marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 2 }}>
                <Text style={{ color: T.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Medidores Analíticos en Tiempo Real
                </Text>
                {isConnected && (
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
                    backgroundColor: 'rgba(14,165,233,0.12)',
                    borderWidth: 1, borderColor: 'rgba(14,165,233,0.25)',
                  }}>
                    <View style={{
                      width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10B981',
                      marginRight: 5,
                      shadowColor: '#10B981', shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
                    }} />
                    <Text style={{ color: '#0EA5E9', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 }}>
                      SONDA pH-4502C ACTIVA
                    </Text>
                  </View>
                )}
              </View>

              {/* Mensaje cuando no hay medidores activos */}
              {!hasVisibleMeters && (
                <AuraCard colors={T.card} radius={20} style={{ marginBottom: 12 }}>
                  <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                    <InfoIcon size={26} color="#0EA5E9" />
                    <Text style={{ color: isDark ? '#F1F5F9' : '#0F172A', fontSize: 13, fontWeight: '700', marginTop: 8 }}>
                      Sin Medidores Activos
                    </Text>
                    <Text style={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 4, maxWidth: 240 }}>
                      Has ocultado todos los instrumentos. Personalízalos desde Ajustes.
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleSelectTab('ajustes')}
                      activeOpacity={0.75}
                      style={{
                        marginTop: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: 'rgba(14,165,233,0.12)',
                        borderWidth: 1,
                        borderColor: 'rgba(14,165,233,0.3)',
                      }}
                    >
                      <Text style={{ color: '#0EA5E9', fontSize: 11, fontWeight: '700' }}>
                        Ir a Ajustes
                      </Text>
                    </TouchableOpacity>
                  </View>
                </AuraCard>
              )}

              {/* 1. Tarjeta de Calidad Global WQI (Condicional) */}
              {visibleMeters.wqi && (
                <WqiCard
                  ph={ph}
                  temperature={temperature}
                  turbidity={turbidity}
                  isConnected={isConnected}
                  isDark={isDark}
                />
              )}

              {/* 2. Fila: Medidores Visuales (pH y Temperatura) adaptativos */}
              {(visibleMeters.ph || visibleMeters.temperature) && (
                <View style={{ flexDirection: 'row', marginHorizontal: -6, alignItems: 'stretch' }}>
                  {visibleMeters.ph && (
                    <View style={{ width: visibleMeters.temperature ? '50%' : '100%', paddingHorizontal: 6, flex: 1 }}>
                      <PhLevelGauge
                        value={ph}
                        idealMin={alertRanges.ph.min}
                        idealMax={alertRanges.ph.max}
                        width={visibleMeters.temperature ? gaugeWidth : screenWidth - 32}
                        isDark={isDark}
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}
                  {visibleMeters.temperature && (
                    <View style={{ width: visibleMeters.ph ? '50%' : '100%', paddingHorizontal: 6, flex: 1 }}>
                      <TemperatureGauge
                        value={temperature}
                        min={0}
                        max={50}
                        status={tempStatus}
                        idealRange={`${alertRanges.temperature.min}–${alertRanges.temperature.max}°C`}
                        width={visibleMeters.ph ? gaugeWidth : screenWidth - 32}
                        isDark={isDark}
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}
                </View>
              )}

              {/* 3. Gráfico Spline Area Chart (Conductividad) (Condicional) */}
              {visibleMeters.conductivity && (
                <ConductivityChart
                  data={historyData.length > 0 ? historyData.map((h) => Math.round(300 + h.ph * 15 + h.temperature * 4 + h.turbidity * 2)) : undefined}
                  currentValue={Math.round(300 + ph * 15 + temperature * 4 + turbidity * 2)}
                  width={screenWidth}
                  isDark={isDark}
                />
              )}

              {/* 4. Medidor de Claridad Óptica y Turbidez (Condicional) */}
              {visibleMeters.turbidity && (
                <TurbidityMeterCard
                  value={turbidity}
                  maxThreshold={alertRanges.turbidity.max}
                  status={turbidityStatus}
                  isDark={isDark}
                />
              )}

              {/* Botón de acción principal (BLE/Simular) */}
              <TouchableOpacity
                onPress={isConnected ? disconnect : connect}
                activeOpacity={0.75}
                style={[{
                  marginTop: 2, paddingVertical: 14, borderRadius: 20,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1,
                }, isConnected
                  ? { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' }
                  : { borderColor: 'rgba(14,165,233,0.3)', backgroundColor: 'rgba(14,165,233,0.08)' }
                ]}
              >
                <View style={{ marginRight: 8 }}>
                  {isConnected ? <StopIcon size={14} color="#ef4444" /> : <PlayIcon size={14} color="#0ea5e9" />}
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.3, color: isConnected ? '#EF4444' : '#0EA5E9' }}>
                  {isScanning ? 'Sincronizando telemetría...' : isConnected ? 'Detener monitoreo' : 'Iniciar escaneo y telemetría'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Espacio inferior para no quedar tras la navbar */}
            <View style={{ paddingBottom: 100 }} />
          </ScrollView>
        </View>

        {/* ─── PÁGINA 1: ALERTAS Y LOGS ─── */}
        <View style={{ width: screenWidth, flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <AlertsView />
        </View>

        {/* ─── PÁGINA 2: INFORMES ─── */}
        <View style={{ width: screenWidth, flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <ReportsView />
        </View>

        {/* ─── PÁGINA 3: AJUSTES ─── */}
        <View style={{ width: screenWidth, flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <SettingsView />
        </View>
      </ScrollView>

      {/* ─── BARRA DE NAVEGACIÓN INFERIOR ─── */}
      <BottomNav
        active={activeTab}
        onSelect={handleSelectTab}
        isConnected={isConnected}
        isDark={isDark}
        totalAlerts={totalAlerts}
        bottomPadding={bottomPadding}
      />

      {/* ─── MODAL DE CONFIGURACIÓN ─── */}
      <ConfigModal
        visible={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </View>
  );
};
