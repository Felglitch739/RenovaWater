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
import { ConfigModal } from '../components/ConfigModal';
import { AuraCard } from '../components/AuraCard';
import { GlowLineChart } from '../components/GlowLineChart';
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

type NavTab = 'monitor' | 'alertas' | 'informes' | 'ble';

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
// Sub-componente: Micro-tarjeta de estadística Premium
// ─────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
  isDark: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, valueColor, isDark }) => {
  const T = isDark ? DARK_THEME : LIGHT_THEME;
  return (
    <AuraCard colors={T.card} radius={16} style={{ flex: 1, marginHorizontal: 3 }}>
      <View style={{ padding: 12 }}>
        <Text style={{
          color: T.textSecondary,
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{
            color: valueColor ?? T.textPrimary,
            fontSize: 20,
            fontWeight: 'bold',
            fontFamily: 'monospace',
          }}>
            {value}
          </Text>
          {unit ? (
            <Text style={{ color: T.textSecondary, fontSize: 10, marginLeft: 3, marginBottom: 2 }}>
              {unit}
            </Text>
          ) : null}
        </View>
      </View>
    </AuraCard>
  );
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
    id: 'ble',
    label: 'Bluetooth',
    renderIcon: (color) => <BluetoothIcon size={19} color={color} />,
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
        const isBle = item.id === 'ble';
        const isAlert = item.id === 'alertas';

        const iconColor = isActive
          ? '#38BDF8'
          : isBle && isConnected
          ? '#10B981'
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

              {/* Indicador de BLE Conectado con glow */}
              {isBle && isConnected && (
                <View style={{
                  position: 'absolute', top: 6, right: 8,
                  width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#10B981',
                  shadowColor: '#10B981', shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
                }} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────
// Sub-componente: Botón de acción utilitario
// ─────────────────────────────────────────────

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isDark: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, icon, onPress, isDark }) => {
  const T = isDark ? DARK_THEME : LIGHT_THEME;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ flex: 1, marginHorizontal: 4 }}>
      <AuraCard colors={T.card} radius={16}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8 }}>
          <View style={{ marginRight: 8 }}>{icon}</View>
          <Text style={{ color: T.textPrimary, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 }}>
            {label}
          </Text>
        </View>
      </AuraCard>
    </TouchableOpacity>
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
    historyData,
    totalAlerts,
    theme,
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

  // Iniciar simulación al montar, limpiar al desmontar
  useEffect(() => {
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Evaluar estados usando los rangos del store (dinámicos)
  const phStatus = evaluatePh(ph, alertRanges.ph);
  const tempStatus = evaluateTemperature(temperature, alertRanges.temperature);
  const turbidityStatus = evaluateTurbidity(turbidity, alertRanges.turbidity);

  // Estadísticas derivadas del historial (memoizadas)
  const stats = useMemo(() => {
    if (historyData.length === 0) {
      return { avgPh: '--', avgTemp: '--', peakTurbidity: '--', alerts: totalAlerts.toString() };
    }
    const avgPh = (
      historyData.reduce((sum, r) => sum + r.ph, 0) / historyData.length
    ).toFixed(2);
    const avgTemp = (
      historyData.reduce((sum, r) => sum + r.temperature, 0) / historyData.length
    ).toFixed(1);
    const peakTurbidity = Math.max(...historyData.map((r) => r.turbidity)).toFixed(1);
    return { avgPh, avgTemp, peakTurbidity, alerts: totalAlerts.toString() };
  }, [historyData, totalAlerts]);

  // Calcular Salud del Sistema (0-100) basado en alertas/historial
  const systemHealth = useMemo(() => {
    if (!isConnected || historyData.length === 0) return 100;
    const alertRatio = totalAlerts / (historyData.length * 3); // 3 parámetros por muestra
    return Math.max(0, Math.round((1 - alertRatio) * 100));
  }, [isConnected, historyData.length, totalAlerts]);

  // ─── Control de Tabs y Gestos Swipe Horizontal ───
  const NAV_TABS: NavTab[] = ['monitor', 'alertas', 'informes', 'ble'];

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
                shadowOpacity: isDark ? 0.3 : 0.15,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }}
              className="items-center justify-center p-1 mr-3"
            >
              <Image
                source={require('../assets/TPH_Monitor_Icon.png')}
                style={{ width: 36, height: 36 }}
                resizeMode="contain"
              />
            </View>

            {/* Texto de la Marca & Estado */}
            <View className="justify-center">
              <View className="flex-row items-center">
                <Text style={{ color: T.textPrimary, fontSize: 18, fontWeight: 'bold', letterSpacing: -0.5 }}>
                  T.P.H
                </Text>
                <Text style={{ color: '#0EA5E9', fontSize: 18, fontWeight: '900', letterSpacing: -0.5, marginLeft: 4 }}>
                  MONITOR
                </Text>
                <View style={{
                  marginLeft: 8,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: 'rgba(14,165,233,0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(14,165,233,0.25)',
                }}>
                  <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#0EA5E9', letterSpacing: 0.5 }}>IoT</Text>
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
                  {isConnected ? 'Telemetría H2O activa' : 'Monitoreo de calidad de agua'}
                </Text>
              </View>
            </View>
          </View>

          {/* Lado Derecho: Salud del Sistema & Selector de Tema */}
          <View className="flex-row items-center">
            {isConnected && (
              <View
                style={{
                  marginRight: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  backgroundColor: isDark ? 'rgba(30,38,52,0.9)' : 'rgba(241,245,249,0.9)',
                  borderWidth: 1,
                  borderColor: T.headerBorder,
                  alignItems: 'flex-end',
                }}
              >
                <Text style={{ color: T.textSecondary, fontSize: 8, fontWeight: '600' }}>
                  Salud
                </Text>
                <Text style={{
                  color: systemHealth > 90 ? '#10B981' : systemHealth > 70 ? '#FBBF24' : '#EF4444',
                  fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold', lineHeight: 18,
                }}>
                  {systemHealth}%
                </Text>
              </View>
            )}

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
                    <Text style={{ color: '#0EA5E9', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 }}>SONDA ACTIVA</Text>
                  </View>
                )}
              </View>

              {/* Fila 1: Medidores Visuales Neón (pH Semicircle Speedometer y Temperature Radial Gauge) */}
              <View style={{ flexDirection: 'row', marginHorizontal: -6 }}>
                <View style={{ width: '50%', paddingHorizontal: 6 }}>
                  <PhLevelGauge
                    value={ph}
                    idealMin={alertRanges.ph.min}
                    idealMax={alertRanges.ph.max}
                    width={gaugeWidth}
                    isDark={isDark}
                  />
                </View>
                <View style={{ width: '50%', paddingHorizontal: 6 }}>
                  <TemperatureGauge
                    value={temperature}
                    min={0}
                    max={50}
                    status={tempStatus}
                    idealRange={`${alertRanges.temperature.min}–${alertRanges.temperature.max}°C`}
                    width={gaugeWidth}
                    isDark={isDark}
                  />
                </View>
              </View>

              {/* Fila 2: Gráfico Spline Area Chart (Conductividad y Sólidos Disueltos) */}
              <ConductivityChart
                data={historyData.length > 0 ? historyData.map((h) => Math.round(300 + h.ph * 15 + h.temperature * 4 + h.turbidity * 2)) : undefined}
                currentValue={Math.round(300 + ph * 15 + temperature * 4 + turbidity * 2)}
                width={screenWidth}
                isDark={isDark}
              />

              {/* Fila 3: Medidor de Claridad Óptica y Turbidez (Estilo Espectral Segmentado) */}
              <TurbidityMeterCard
                value={turbidity}
                maxThreshold={alertRanges.turbidity.max}
                status={turbidityStatus}
                isDark={isDark}
              />

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

            {/* ── SECCIÓN 2: TENDENCIAS & ESTADÍSTICAS ── */}
            <View style={{ paddingBottom: 100 }}>
              <Text style={{ color: T.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, paddingHorizontal: 2 }}>
                Tendencia Óptica de Turbidez
              </Text>

              {/* Gráfico de línea SVG con glow */}
              <AuraCard colors={T.card} radius={20} style={{ marginBottom: 12 }}>
                <View style={{ padding: 16 }}>
                  <GlowLineChart
                    data={historyData}
                    threshold={alertRanges.turbidity.max}
                    width={screenWidth - 64}
                    height={100}
                  />
                </View>
              </AuraCard>

              {/* Estadísticas rápidas (3 micro cards) */}
              <View style={{ flexDirection: 'row', marginHorizontal: -3, marginBottom: 12 }}>
                <StatCard
                  label="Promedio pH"
                  value={stats.avgPh}
                  valueColor={stats.avgPh === '--' ? T.textMuted : T.textPrimary}
                  isDark={isDark}
                />
                <StatCard
                  label="Temp Prom"
                  value={stats.avgTemp}
                  unit="°C"
                  valueColor={stats.avgTemp === '--' ? T.textMuted : T.textPrimary}
                  isDark={isDark}
                />
                <StatCard
                  label="Pico NTU"
                  value={stats.peakTurbidity}
                  unit="NTU"
                  valueColor={
                    stats.peakTurbidity === '--'
                      ? T.textMuted
                      : parseFloat(stats.peakTurbidity) > alertRanges.turbidity.max
                      ? '#EF4444'
                      : T.textPrimary
                  }
                  isDark={isDark}
                />
              </View>

              {/* Botones de acción */}
              <View style={{ flexDirection: 'row', marginHorizontal: -4 }}>
                <ActionButton icon={<SettingsIcon size={16} color="#0ea5e9" />} label="Límites" onPress={() => setIsConfigOpen(true)} isDark={isDark} />
                <ActionButton icon={<HistoryIcon size={16} color="#0ea5e9" />} label="Historial" onPress={() => handleSelectTab('informes')} isDark={isDark} />
              </View>
            </View>
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

        {/* ─── PÁGINA 3: BLE ─── */}
        <View style={{ width: screenWidth, flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <ScrollView className="flex-1 pb-10" showsVerticalScrollIndicator={false}>
            <View className="mb-4">
              <Text style={{ color: isDark ? '#E2E8F0' : '#0F172A', fontSize: 14, fontWeight: '600' }}>
                Conectividad Bluetooth y Sensores
              </Text>
              <Text style={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: 12, marginTop: 2 }}>
                Emparejamiento de telemetría directa BLE ESP32
              </Text>
            </View>

            {/* Tarjeta de Dispositivo con AuraCard */}
            <AuraCard colors={T.card} radius={20} style={{ marginBottom: 16 }}>
              <View style={{ padding: 18 }}>
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center">
                    <View className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-500/20 items-center justify-center mr-3">
                      <BluetoothIcon size={20} color="#0ea5e9" />
                    </View>
                    <View>
                      <Text style={{ color: isDark ? '#F1F5F9' : '#0F172A', fontWeight: 'bold', fontSize: 15 }}>
                        TPH Sensor Array V2
                      </Text>
                      <Text style={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: 11, fontFamily: 'monospace' }}>
                        MAC: C4:4F:33:1A:89:B2
                      </Text>
                    </View>
                  </View>
                  <View className={`px-2.5 py-1 rounded-full ${isConnected ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-zinc-700/20 border border-zinc-700/40'}`}>
                    <Text className={`text-[10px] font-semibold ${isConnected ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {isConnected ? 'Enlazado' : 'Desconectado'}
                    </Text>
                  </View>
                </View>

                {/* Métricas de Enlace */}
                <View className="flex-row -mx-1 mb-4">
                  <View style={{ flex: 1, marginHorizontal: 3, padding: 10, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }}>
                    <View className="flex-row items-center mb-1">
                      <SignalIcon size={12} color="#0ea5e9" />
                      <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 9, fontWeight: '600', marginLeft: 4 }}>Señal RSSI</Text>
                    </View>
                    <Text style={{ color: isConnected ? '#38BDF8' : isDark ? '#64748B' : '#94A3B8', fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {isConnected ? '-64 dBm' : '--'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 3, padding: 10, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }}>
                    <View className="flex-row items-center mb-1">
                      <BatteryIcon size={12} color="#10b981" />
                      <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 9, fontWeight: '600', marginLeft: 4 }}>Batería Sonda</Text>
                    </View>
                    <Text style={{ color: isConnected ? '#10B981' : isDark ? '#64748B' : '#94A3B8', fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {isConnected ? '89%' : '--'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 3, padding: 10, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }}>
                    <View className="flex-row items-center mb-1">
                      <ZapIcon size={12} color="#c084fc" />
                      <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 9, fontWeight: '600', marginLeft: 4 }}>Muestreo</Text>
                    </View>
                    <Text style={{ color: isConnected ? '#C084FC' : isDark ? '#64748B' : '#94A3B8', fontSize: 13, fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {isConnected ? '0.5 Hz' : '--'}
                    </Text>
                  </View>
                </View>

                {/* Botón de Conectar / Escanear */}
                <TouchableOpacity
                  onPress={isConnected ? disconnect : connect}
                  activeOpacity={0.75}
                  style={[
                    { paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
                    isConnected
                      ? { borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.08)' }
                      : { borderColor: 'rgba(14,165,233,0.3)', backgroundColor: 'rgba(14,165,233,0.08)' }
                  ]}
                >
                  <View className="mr-2">
                    {isConnected ? <StopIcon size={14} color="#ef4444" /> : <PlayIcon size={14} color="#0ea5e9" />}
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: isConnected ? '#EF4444' : '#0EA5E9' }}>
                    {isScanning ? 'Sincronizando vía BLE...' : isConnected ? 'Desconectar sonda BLE' : 'Escanear y conectar sonda'}
                  </Text>
                </TouchableOpacity>
              </View>
            </AuraCard>

            {/* Info Box */}
            <AuraCard colors={T.card} radius={18} style={{ marginBottom: 40 }}>
              <View style={{ padding: 16 }}>
                <View className="flex-row items-center mb-2">
                  <InfoIcon size={16} color="#0ea5e9" />
                  <Text style={{ color: isDark ? '#F1F5F9' : '#0F172A', fontWeight: 'bold', fontSize: 12, marginLeft: 6 }}>
                    Guía de Telemetría ESP32
                  </Text>
                </View>
                <Text style={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: 11, lineHeight: 18 }}>
                  1. Asegúrese de que el módulo ESP32 del TPH Monitor esté encendido.{'\n'}
                  2. La sonda realiza lecturas de pH, Temperatura y Turbidez simultáneamente.{'\n'}
                  3. Deslice horizontalmente entre pantallas para ver el registro de logs y reportes analíticos.
                </Text>
              </View>
            </AuraCard>
          </ScrollView>
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
