import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import {
  useSensorStore,
  evaluatePh,
  evaluateDensity,
  evaluateTurbidity,
  type HistoryRecord,
  type MetricStatus,
} from '../store/useSensorStore';
import { AlertsView } from '../components/AlertsView';
import { ReportsView } from '../components/ReportsView';
import { ConfigModal } from '../components/ConfigModal';

// ─────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────

type NavTab = 'monitor' | 'alertas' | 'informes' | 'ble';

/** Devuelve el título y subtítulo de la columna derecha según la pestaña activa */
const RIGHT_PANEL_HEADER: Record<NavTab, { title: string; sub: string }> = {
  monitor:  { title: 'Historial de Calidad',   sub: 'Turbidez · últimas 24 muestras' },
  alertas:  { title: 'Log de Alertas',          sub: 'Eventos fuera de rango en sesión' },
  informes: { title: 'Informe de Turno',        sub: 'Resumen analítico del período' },
  ble:      { title: 'Conexión Bluetooth BLE',  sub: 'Dispositivos emparejados' },
};

// ─────────────────────────────────────────────
// Constantes de estilos funcionales (status → color)
// Definidas fuera del componente para evitar re-renders
// ─────────────────────────────────────────────

const MetricCard: React.FC<MetricCardProps & { theme: AppTheme }> = ({ title, value, unit, status, idealRange, theme }) => {
  const isDark = theme === 'dark';
  const okText = 'text-sky-500';
  const okBadge = isDark ? 'bg-sky-500/10' : 'bg-sky-500/5';
  const okBorder = 'border-l-sky-500';

  const STATUS_CONFIG: Record<
    MetricStatus,
    { borderColor: string; badgeBg: string; badgeText: string; label: string; dotColor: string }
  > = {
    ok: {
      borderColor: okBorder,
      badgeBg: okBadge,
      badgeText: okText,
      label: 'APT',
      dotColor: 'bg-sky-500',
    },
    warning: {
      borderColor: 'border-l-amber-400',
      badgeBg: isDark ? 'bg-amber-400/10' : 'bg-amber-400/5',
      badgeText: 'text-amber-500',
      label: 'PRECAUCIÓN',
      dotColor: 'bg-amber-400',
    },
    danger: {
      borderColor: 'border-l-red-500',
      badgeBg: isDark ? 'bg-red-500/10' : 'bg-red-500/5',
      badgeText: 'text-red-500',
      label: 'NO APTA',
      dotColor: 'bg-red-500',
    },
  };

  const cfg = STATUS_CONFIG[status];
  const cardColor = isDark ? 'bg-zinc-800/80' : 'bg-white';
  const borderColor = isDark ? 'border-zinc-700/50' : 'border-slate-200';
  const titleColor = isDark ? 'text-zinc-400' : 'text-slate-500';
  const valueColor = isDark ? 'text-white' : 'text-slate-900';
  const unitColor = isDark ? 'text-zinc-500' : 'text-slate-400';

  return (
    <View
      className={`${cardColor} rounded-xl border-l-4 ${cfg.borderColor} border ${borderColor} p-4 mb-3 shadow-sm`}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className={`${titleColor} text-[10px] font-bold uppercase tracking-widest`}>
          {title}
        </Text>
        <View className={`px-2 py-0.5 rounded ${cfg.badgeBg}`}>
          <Text className={`${cfg.badgeText} text-[9px] font-bold`}>{cfg.label}</Text>
        </View>
      </View>

      {/* Valor principal */}
      <View className="flex-row items-baseline mb-2">
        <Text className={`${valueColor} text-3xl font-bold font-mono tracking-tighter`}>
          {value}
        </Text>
        <Text className={`${unitColor} text-[10px] ml-1.5 font-bold uppercase`}>{unit}</Text>
      </View>

      {/* Rango ideal */}
      <Text className={`${unitColor} text-[9px] font-medium`}>Rango: {idealRange}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// Sub-componente: Barra individual del histograma
// ─────────────────────────────────────────────

interface ChartBarProps {
  record: HistoryRecord;
  maxTurbidity: number;
  isLast: boolean;
  threshold: number; // Umbral configurado por el usuario
  theme: AppTheme;
}

const ChartBar: React.FC<ChartBarProps> = ({ record, maxTurbidity, isLast, threshold, theme }) => {
  // Normalizar la turbidez al espacio de la barra (máx. 100% de altura)
  const heightPercent = maxTurbidity > 0
    ? Math.min((record.turbidity / maxTurbidity) * 100, 100)
    : 10;

  // Color DINÁMICO basado en el tema
  const isDark = theme === 'dark';
  const okColor = '#0EA5E9'; // TPH Cyan siempre para el estado OK

  const barColor =
    record.turbidity <= threshold
      ? okColor
      : record.turbidity <= threshold * 4
      ? '#fbbf24'   // amber-400
      : '#ef4444';  // red-500

  return (
    <View className="flex-1 items-center justify-end" style={{ height: 80 }}>
      <View
        style={{
          width: isLast ? 6 : 4,
          height: `${Math.max(heightPercent, 8)}%`,
          backgroundColor: barColor,
          borderRadius: 3,
          opacity: isLast ? 1 : 0.55,
        }}
      />
    </View>
  );
};

// ─────────────────────────────────────────────
// Sub-componente: Gráfica de tendencias (pure RN Views)
// ─────────────────────────────────────────────

interface TrendChartProps {
  data: HistoryRecord[];
  threshold: number; // Recibe el límite actual
  theme: AppTheme;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, threshold, theme }) => {
  const maxTurbidity = data.length > 0
    ? Math.max(...data.map((r) => r.turbidity), threshold, 5)
    : 45;

  const lastRecord = data[data.length - 1];
  const firstRecord = data[0];

  const okColor = 'bg-sky-500'; // TPH Cyan

  const isDark = theme === 'dark';
  const legendColor = isDark ? 'text-zinc-600' : 'text-slate-400';
  const axisColor = isDark ? 'border-zinc-700/50' : 'border-slate-200';

      {/* Etiquetas de tiempo */}
      {data.length > 1 && (
        <View className="flex-row justify-between mt-1">
          <Text className="text-zinc-600 text-[8px] font-mono">{firstRecord?.time}</Text>
          <Text className="text-zinc-400 text-[8px] font-mono">{lastRecord?.time} ←</Text>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────
// Sub-componente: Micro-tarjeta de estadística
// ─────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  accent?: string; // clase de texto de color
  isDark: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, accent = 'text-white', isDark }) => (
  <View className={`flex-1 ${isDark ? 'bg-zinc-800/60' : 'bg-white'} border ${isDark ? 'border-zinc-700/50' : 'border-slate-200'} rounded-xl p-3 mx-1 shadow-sm`}>
    <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-500'} text-[9px] uppercase tracking-widest mb-1.5 font-bold`}>{label}</Text>
    <View className="flex-row items-baseline">
      <Text className={`${accent} text-2xl font-bold font-mono`}>{value}</Text>
      {unit ? <Text className={`${isDark ? 'text-zinc-600' : 'text-slate-400'} text-[10px] ml-1 font-bold`}>{unit}</Text> : null}
    </View>
  </View>
);

// ─────────────────────────────────────────────
// Sub-componente: Barra de navegación inferior
// ─────────────────────────────────────────────

interface NavBarProps {
  active: NavTab;
  onSelect: (tab: NavTab) => void;
  isConnected: boolean;
  isDark: boolean;
}

const NAV_ITEMS: { id: NavTab; icon: string; label: string }[] = [
  { id: 'monitor',  icon: '⬡',  label: 'Monitor'   },
  { id: 'alertas',  icon: '⚠',  label: 'Alertas'   },
  { id: 'informes', icon: '≡',  label: 'Informes'  },
  { id: 'ble',      icon: '⊕',  label: 'BLE'       },
];

const BottomNav: React.FC<NavBarProps> = ({ active, onSelect, isConnected, isDark }) => (
  <View className={`flex-row ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'} border-t px-2 pb-2 pt-2`}>
    {NAV_ITEMS.map((item) => {
      const isActive = active === item.id;
      const isBle = item.id === 'ble';

      return (
        <TouchableOpacity
          key={item.id}
          onPress={() => onSelect(item.id)}
          activeOpacity={0.7}
          className="flex-1 items-center py-1.5"
        >
          <Text
            style={{ fontSize: 18 }}
            className={
              isBle
                ? isConnected
                  ? 'text-sky-500'
                  : isDark ? 'text-zinc-600' : 'text-slate-300'
                : isActive
                ? isDark ? 'text-zinc-100' : 'text-sky-600'
                : isDark ? 'text-zinc-600' : 'text-slate-300'
            }
          >
            {item.icon}
          </Text>
          <Text
            className={`text-[10px] mt-0.5 font-bold uppercase tracking-tighter ${
              isBle
                ? isConnected
                  ? 'text-sky-500'
                  : isDark ? 'text-zinc-600' : 'text-slate-300'
                : isActive
                ? isDark ? 'text-zinc-200' : 'text-sky-600'
                : isDark ? 'text-zinc-600' : 'text-slate-300'
            }`}
          >
            {item.label}
          </Text>
          {isActive && !isBle && (
            <View className={`absolute bottom-0 w-1 h-1 rounded-full ${isDark ? 'bg-zinc-300' : 'bg-sky-600'}`} />
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

// ─────────────────────────────────────────────
// Sub-componente: Botón de acción utilitario
// ─────────────────────────────────────────────

interface ActionButtonProps {
  label: string;
  icon: string;
  onPress: () => void;
  isDark: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, icon, onPress, isDark }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    className={`flex-1 flex-row items-center justify-center border ${isDark ? 'border-zinc-700 bg-zinc-800/40' : 'border-slate-200 bg-white'} rounded-xl py-3 mx-1 shadow-sm`}
  >
    <Text className="text-sky-500 text-base mr-2">{icon}</Text>
    <Text className={`${isDark ? 'text-zinc-400' : 'text-slate-600'} text-[10px] font-bold uppercase tracking-wider`}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────
// Helpers de timestamp
// ─────────────────────────────────────────────

const formatTimestamp = (date: Date | null): string => {
  if (!date) return '--:--:--';
  return date.toLocaleTimeString('es-MX', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// ─────────────────────────────────────────────
// Pantalla principal: DashboardScreen
// ─────────────────────────────────────────────

export const DashboardScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('monitor');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const {
    ph,
    density,
    turbidity,
    lastUpdated,
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

  // Colores según tema (Inspirados en el Logo TPH: Azules y Cianes)
  const isDark = theme === 'dark';

  // Paleta TPH
  const tphBlue = '#075985'; // sky-800
  const tphCyan = '#0EA5E9'; // sky-500
  const tphLightBlue = '#E0F2FE'; // sky-100

  const brandPrimary = tphCyan;
  const brandBg = isDark ? 'bg-sky-500/10' : 'bg-sky-500/5';
  const brandText = isDark ? 'text-sky-400' : 'text-sky-600';
  const brandBorder = isDark ? 'border-sky-500/30' : 'border-sky-200';

  const bgColor = isDark ? 'bg-zinc-900' : 'bg-slate-50';
  const cardColor = isDark ? 'bg-zinc-800/80' : 'bg-white';
  const borderColor = isDark ? 'border-zinc-700/50' : 'border-slate-200';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-zinc-500' : 'text-slate-500';
  const headerBorder = isDark ? 'border-zinc-800' : 'border-slate-200';
  const navBg = isDark ? 'bg-zinc-900' : 'bg-white';
  const navBorder = isDark ? 'border-zinc-800' : 'border-slate-200';

  // Iniciar simulación al montar, limpiar al desmontar
  useEffect(() => {
    connect();
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Evaluar estados usando los rangos del store (dinámicos)
  const phStatus     = evaluatePh(ph, alertRanges.ph);
  const densityStatus = evaluateDensity(density, alertRanges.density);
  const turbidityStatus = evaluateTurbidity(turbidity, alertRanges.turbidity);

  // Estadísticas derivadas del historial (memoizadas)
  const stats = useMemo(() => {
    if (historyData.length === 0) {
      return { avgPh: '--', peakTurbidity: '--', alerts: totalAlerts.toString() };
    }
    const avgPh = (
      historyData.reduce((sum, r) => sum + r.ph, 0) / historyData.length
    ).toFixed(2);
    const peakTurbidity = Math.max(...historyData.map((r) => r.turbidity)).toFixed(1);
    return { avgPh, peakTurbidity, alerts: totalAlerts.toString() };
  }, [historyData, totalAlerts]);

  // Color e indicador de estado de conexión
  const connDotColor = isScanning
    ? 'bg-amber-400'
    : isConnected
    ? 'bg-emerald-400'
    : 'bg-zinc-600';

  const connLabel = isScanning
    ? 'Sincronizando...'
    : isConnected
    ? 'Sensor activo'
    : 'Sin conexión';

  // Calcular Salud del Sistema (0-100) basado en alertas/historial
  const systemHealth = useMemo(() => {
    if (!isConnected || historyData.length === 0) return 100;
    const alertRatio = totalAlerts / (historyData.length * 3); // 3 parámetros por muestra
    return Math.max(0, Math.round((1 - alertRatio) * 100));
  }, [isConnected, historyData.length, totalAlerts]);

  const healthColor = systemHealth > 90 ? 'text-emerald-500' : systemHealth > 70 ? 'text-amber-500' : 'text-red-500';

  return (
    <SafeAreaView className={`flex-1 ${bgColor}`}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? "#09090b" : "#f8fafc"} />

      {/* ─── HEADER ─── */}
      <View className={`flex-row items-center justify-between px-5 pt-4 pb-3 border-b ${headerBorder}`}>
        <View className="flex-row items-center">
          <Image
            source={require('../assets/TPH_Monitor_Icon.png')}
            className="w-10 h-10 mr-3"
            resizeMode="contain"
          />
          <View>
            <Image
              source={isDark ? require('../assets/TPH_Monitor_Textlogo.png') : require('../assets/TPH_MonitorLogo.png')}
              className="w-32 h-6"
              resizeMode="contain"
              style={{ tintColor: isDark ? undefined : '#075985' }}
            />
            <Text className={`${subTextColor} text-[8px] font-bold uppercase tracking-[1px] mt-0.5`}>
              Water Quality Monitor
            </Text>
          </View>
        </View>

        {/* Salud del Sistema */}
        {isConnected && (
          <View className="items-end mr-4">
            <Text className={`${subTextColor} text-[8px] font-bold uppercase`}>Salud</Text>
            <Text className={`${healthColor} text-lg font-mono font-bold`}>{systemHealth}%</Text>
          </View>
        )}

        {/* Selector de Tema */}
        <TouchableOpacity
          onPress={() => setTheme(isDark ? 'light' : 'dark')}
          className={`p-2 rounded-xl ${isDark ? 'bg-zinc-800' : 'bg-slate-100'} border ${borderColor}`}
          activeOpacity={0.7}
        >
          <Text className="text-lg">{isDark ? '🌙' : '☀️'}</Text>
        </TouchableOpacity>
      </View>

      {/* ─── BODY: ENFOQUE MÓVIL ─── */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>

        {/* ── SECCIÓN 1: MÉTRICAS ACTUALES ── */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3 px-1">
            <Text className={`${subTextColor} text-[10px] font-bold uppercase tracking-widest`}>
              Lecturas en Tiempo Real
            </Text>
            {isConnected && (
              <View className={`flex-row items-center ${brandBg} px-2 py-0.5 rounded-full`}>
                <View className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5" />
                <Text className={`${brandText} text-[9px] font-bold`}>SISTEMA ACTIVO</Text>
              </View>
            )}
          </View>

          {/* Grid de Métricas: 2 columnas para mobile */}
          <View className="flex-row flex-wrap -mx-1.5">
            <View className="w-1/2 px-1.5">
              <MetricCard
                title="pH"
                value={ph}
                unit=""
                status={phStatus}
                idealRange={`${alertRanges.ph.min}–${alertRanges.ph.max}`}
                theme={theme}
              />
            </View>
            <View className="w-1/2 px-1.5">
              <MetricCard
                title="Densidad"
                value={density}
                unit="g/cm³"
                status={densityStatus}
                idealRange={`${alertRanges.density.min}–${alertRanges.density.max}`}
                theme={theme}
              />
            </View>
            <View className="w-full px-1.5">
              <MetricCard
                title="Turbidez"
                value={turbidity}
                unit="NTU"
                status={turbidityStatus}
                idealRange={`≤ ${alertRanges.turbidity.max} NTU`}
                theme={theme}
              />
            </View>
          </View>

          {/* Botón de acción principal (BLE/Simular) */}
          <TouchableOpacity
            onPress={isConnected ? disconnect : connect}
            activeOpacity={0.75}
            className={`mt-2 py-3.5 rounded-2xl items-center border ${
              isConnected
                ? 'border-red-500/30 bg-red-500/10'
                : `${brandBorder} ${brandBg}`
            }`}
          >
            <Text
              className={`text-xs font-bold uppercase tracking-widest ${
                isConnected ? 'text-red-400' : brandText
              }`}
            >
              {isScanning ? 'Sincronizando...' : isConnected ? '⏹ Detener Monitoreo' : '▶ Iniciar Escaneo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── SECCIÓN 2: VISTA DETALLADA (TABS) ── */}
        <View className="flex-1 pb-10">
          <View className="flex-row items-center mb-4">
            <View className={`w-1 h-4 ${isDark ? 'bg-zinc-500' : 'bg-slate-400'} rounded-full mr-3`} />
            <View>
              <Text className={`${isDark ? 'text-zinc-300' : 'text-slate-700'} text-sm font-bold`}>
                {RIGHT_PANEL_HEADER[activeTab].title}
              </Text>
              <Text className={`${subTextColor} text-[10px]`}>
                {RIGHT_PANEL_HEADER[activeTab].sub}
              </Text>
            </View>
          </View>

          {/* Contenido dinámico */}
          <View className="min-h-[300px]">
            {activeTab === 'monitor' && (
              <>
                <View className={`${cardColor} border ${borderColor} rounded-2xl p-4 mb-4 shadow-sm`}>
                  <TrendChart data={historyData} threshold={alertRanges.turbidity.max} theme={theme} />
                </View>

                <View className="flex-row -mx-1.5 mb-4">
                  <StatCard
                    label="Prom. pH"
                    value={stats.avgPh}
                    accent={stats.avgPh === '--' ? subTextColor : textColor}
                    isDark={isDark}
                  />
                  <StatCard
                    label="Pico Tur."
                    value={stats.peakTurbidity}
                    unit="NTU"
                    accent={
                      stats.peakTurbidity === '--'
                        ? subTextColor
                        : parseFloat(stats.peakTurbidity) > alertRanges.turbidity.max
                        ? 'text-red-500'
                        : textColor
                    }
                    isDark={isDark}
                  />
                </View>

                <View className="flex-row -mx-1">
                  <ActionButton
                    icon="⚙"
                    label="Límites"
                    onPress={() => setIsConfigOpen(true)}
                    isDark={isDark}
                  />
                  <ActionButton
                    icon="≡"
                    label="Historial"
                    onPress={() => setActiveTab('informes')}
                    isDark={isDark}
                  />
                </View>
              </>
            )}

            {activeTab === 'alertas' && <AlertsView />}
            {activeTab === 'informes' && <ReportsView />}
            {activeTab === 'ble' && (
              <View className="items-center justify-center py-10 bg-zinc-800/20 rounded-3xl border border-zinc-800/50">
                <Text className="text-zinc-500 text-3xl mb-4">⊕</Text>
                <Text className="text-zinc-400 text-sm font-bold">Panel Bluetooth</Text>
                <Text className="text-zinc-600 text-xs text-center mt-2 px-10">
                  {isConnected
                    ? 'Sensor conectado vía BLE\nRecibiendo paquetes de datos...'
                    : 'Buscando dispositivos cercanos\nAsegúrese que el sensor esté encendido'}
                </Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* ─── BARRA DE NAVEGACIÓN INFERIOR ─── */}
      <BottomNav
        active={activeTab}
        onSelect={setActiveTab}
        isConnected={isConnected}
        isDark={isDark}
      />

      {/* ─── MODALES ─── */}
      <ConfigModal
        visible={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </SafeAreaView>
  );
};
