import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
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

const STATUS_CONFIG: Record<
  MetricStatus,
  { borderColor: string; badgeBg: string; badgeText: string; label: string; dotColor: string }
> = {
  ok: {
    borderColor: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    label: 'APT',
    dotColor: 'bg-emerald-400',
  },
  warning: {
    borderColor: 'border-l-amber-400',
    badgeBg: 'bg-amber-400/10',
    badgeText: 'text-amber-400',
    label: 'PRECAUCIÓN',
    dotColor: 'bg-amber-400',
  },
  danger: {
    borderColor: 'border-l-red-500',
    badgeBg: 'bg-red-500/10',
    badgeText: 'text-red-400',
    label: 'NO APTA',
    dotColor: 'bg-red-500',
  },
};

// ─────────────────────────────────────────────
// Sub-componente: MetricCard compacta
// Diseñada para columna estrecha (35%)
// ─────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  status: MetricStatus;
  idealRange: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, status, idealRange }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <View
      className={`bg-zinc-800/80 rounded-xl border-l-4 ${cfg.borderColor} border border-zinc-700/50 p-4 mb-3`}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
          {title}
        </Text>
        <View className={`px-2 py-0.5 rounded ${cfg.badgeBg}`}>
          <Text className={`${cfg.badgeText} text-xs font-bold`}>{cfg.label}</Text>
        </View>
      </View>

      {/* Valor principal */}
      <View className="flex-row items-baseline mb-2">
        <Text className="text-white text-4xl font-bold font-mono tracking-tighter">
          {value}
        </Text>
        <Text className="text-zinc-500 text-sm ml-1.5 font-medium">{unit}</Text>
      </View>

      {/* Rango ideal */}
      <Text className="text-zinc-600 text-xs">Rango: {idealRange}</Text>
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
}

const ChartBar: React.FC<ChartBarProps> = ({ record, maxTurbidity, isLast, threshold }) => {
  // Normalizar la turbidez al espacio de la barra (máx. 100% de altura)
  const heightPercent = maxTurbidity > 0
    ? Math.min((record.turbidity / maxTurbidity) * 100, 100)
    : 10;

  // Color DINÁMICO basado en el umbral del usuario
  // Verde: por debajo del límite (APT)
  // Amarillo: hasta 4x el límite (PRECAUCIÓN)
  // Rojo: más de 4x el límite (NO APTA)
  const barColor =
    record.turbidity <= threshold
      ? '#10b981'   // emerald-500
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
}

const TrendChart: React.FC<TrendChartProps> = ({ data, threshold }) => {
  const maxTurbidity = data.length > 0
    ? Math.max(...data.map((r) => r.turbidity), threshold, 5)
    : 45;

  const lastRecord = data[data.length - 1];
  const firstRecord = data[0];

  return (
    <View className="flex-1">
      {/* Título de la gráfica + leyenda */}
      <View className="flex-row justify-between items-baseline mb-3">
        <Text className="text-zinc-300 text-[10px] font-bold uppercase tracking-wider">
          Tendencia Turbidez
        </Text>
        <View className="flex-row items-center gap-x-2">
          <View className="flex-row items-center">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
            <Text className="text-zinc-600 text-[8px]">≤{threshold}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1" />
            <Text className="text-zinc-600 text-[8px]">≤{threshold * 4}</Text>
          </View>
        </View>
      </View>

      {/* Área de barras */}
      {data.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-zinc-600 text-[9px] uppercase tracking-widest">
            Sin datos · Conectar sensor
          </Text>
        </View>
      ) : (
        <View className="flex-1 flex-row items-end border-b border-zinc-700/50 pb-1">
          {data.map((record, index) => (
            <ChartBar
              key={`${record.time}-${index}`}
              record={record}
              maxTurbidity={maxTurbidity}
              isLast={index === data.length - 1}
              threshold={threshold}
            />
          ))}
        </View>
      )}

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
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, accent = 'text-white' }) => (
  <View className="flex-1 bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3 mx-1">
    <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-1.5">{label}</Text>
    <View className="flex-row items-baseline">
      <Text className={`${accent} text-2xl font-bold font-mono`}>{value}</Text>
      {unit ? <Text className="text-zinc-600 text-xs ml-1">{unit}</Text> : null}
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
}

const NAV_ITEMS: { id: NavTab; icon: string; label: string }[] = [
  { id: 'monitor',  icon: '⬡',  label: 'Monitor'   },
  { id: 'alertas',  icon: '⚠',  label: 'Alertas'   },
  { id: 'informes', icon: '≡',  label: 'Informes'  },
  { id: 'ble',      icon: '⊕',  label: 'BLE'       },
];

const BottomNav: React.FC<NavBarProps> = ({ active, onSelect, isConnected }) => (
  <View className="flex-row bg-zinc-900 border-t border-zinc-800 px-2 pb-2 pt-2">
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
                  ? 'text-emerald-400'
                  : 'text-zinc-600'
                : isActive
                ? 'text-zinc-100'
                : 'text-zinc-600'
            }
          >
            {item.icon}
          </Text>
          <Text
            className={`text-xs mt-0.5 font-medium ${
              isBle
                ? isConnected
                  ? 'text-emerald-400'
                  : 'text-zinc-600'
                : isActive
                ? 'text-zinc-200'
                : 'text-zinc-600'
            }`}
          >
            {item.label}
          </Text>
          {isActive && !isBle && (
            <View className="absolute bottom-0 w-1 h-1 rounded-full bg-zinc-300" />
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
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, icon, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    className="flex-1 flex-row items-center justify-center border border-zinc-700 rounded-xl py-3 mx-1"
  >
    <Text className="text-zinc-400 text-base mr-2">{icon}</Text>
    <Text className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
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
    connect,
    disconnect,
  } = useSensorStore();

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

  const healthColor = systemHealth > 90 ? 'text-emerald-400' : systemHealth > 70 ? 'text-amber-400' : 'text-red-400';

  return (
    <SafeAreaView className="flex-1 bg-zinc-900">
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      {/* ─── HEADER ─── */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
        <View>
          <Text className="text-white text-xl font-bold tracking-tight">
            InnovaTec
          </Text>
          <Text className="text-zinc-500 text-[9px] font-bold uppercase tracking-[2px]">
            Water Quality Monitor
          </Text>
        </View>

        {/* Salud del Sistema (Nuevo) */}
        {isConnected && (
          <View className="items-end mr-4">
            <Text className="text-zinc-600 text-[8px] font-bold uppercase">Estado</Text>
            <Text className={`${healthColor} text-lg font-mono font-bold`}>{systemHealth}%</Text>
          </View>
        )}

        {/* Indicador de estado compacto */}
        <View className="flex-row items-center bg-zinc-800/80 rounded-xl px-3 py-2 border border-zinc-700/30">
          <View className={`w-2 h-2 rounded-full mr-2 ${connDotColor}`} />
          <View>
            <Text className="text-zinc-300 text-[10px] font-bold">{connLabel}</Text>
            <Text className="text-zinc-600 text-[10px] font-mono">
              {formatTimestamp(lastUpdated)}
            </Text>
          </View>
        </View>
      </View>

      {/* ─── BODY: ENFOQUE MÓVIL (VERTICAL) ─── */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>

        {/* ── SECCIÓN 1: MÉTRICAS ACTUALES ── */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3 px-1">
            <Text className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
              Lecturas en Tiempo Real
            </Text>
            {isConnected && (
              <View className="flex-row items-center bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                <Text className="text-emerald-400 text-[9px] font-bold">FLUJO ESTABLE</Text>
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
              />
            </View>
            <View className="w-1/2 px-1.5">
              <MetricCard
                title="Densidad"
                value={density}
                unit="g/cm³"
                status={densityStatus}
                idealRange={`${alertRanges.density.min}–${alertRanges.density.max}`}
              />
            </View>
            <View className="w-full px-1.5">
              <MetricCard
                title="Turbidez"
                value={turbidity}
                unit="NTU"
                status={turbidityStatus}
                idealRange={`≤ ${alertRanges.turbidity.max} NTU`}
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
                : 'border-emerald-500/30 bg-emerald-500/10'
            }`}
          >
            <Text
              className={`text-xs font-bold uppercase tracking-widest ${
                isConnected ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {isScanning ? 'Sincronizando...' : isConnected ? '⏹ Detener Monitoreo' : '▶ Iniciar Escaneo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── SECCIÓN 2: VISTA DETALLADA (TABS) ── */}
        <View className="flex-1 pb-10">
          <View className="flex-row items-center mb-4">
            <View className="w-1 h-4 bg-zinc-500 rounded-full mr-3" />
            <View>
              <Text className="text-zinc-300 text-sm font-bold">
                {RIGHT_PANEL_HEADER[activeTab].title}
              </Text>
              <Text className="text-zinc-600 text-[10px]">
                {RIGHT_PANEL_HEADER[activeTab].sub}
              </Text>
            </View>
          </View>

          {/* Contenido dinámico */}
          <View className="min-h-[300px]">
            {activeTab === 'monitor' && (
              <>
                <View className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-4 mb-4">
                  <TrendChart data={historyData} threshold={alertRanges.turbidity.max} />
                </View>

                <View className="flex-row -mx-1.5 mb-4">
                  <StatCard
                    label="Prom. pH"
                    value={stats.avgPh}
                    accent={stats.avgPh === '--' ? 'text-zinc-600' : 'text-white'}
                  />
                  <StatCard
                    label="Pico Tur."
                    value={stats.peakTurbidity}
                    unit="NTU"
                    accent={
                      stats.peakTurbidity === '--'
                        ? 'text-zinc-600'
                        : parseFloat(stats.peakTurbidity) > alertRanges.turbidity.max
                        ? 'text-red-400'
                        : 'text-white'
                    }
                  />
                </View>

                <View className="flex-row -mx-1">
                  <ActionButton
                    icon="⚙"
                    label="Límites"
                    onPress={() => setIsConfigOpen(true)}
                  />
                  <ActionButton
                    icon="≡"
                    label="Historial"
                    onPress={() => setActiveTab('informes')}
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
      />

      {/* ─── MODALES ─── */}
      <ConfigModal
        visible={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </SafeAreaView>
  );
};
