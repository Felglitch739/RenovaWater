import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSensorStore, type AlertEvent, type MetricStatus } from '../store/useSensorStore';

// ─────────────────────────────────────────────
// Configuración visual por status
// ─────────────────────────────────────────────

const ALERT_STYLE: Record<
  Exclude<MetricStatus, 'ok'>,
  { dot: string; badge: string; badgeText: string; label: string }
> = {
  warning: {
    dot: 'bg-amber-400',
    badge: 'bg-amber-400/10',
    badgeText: 'text-amber-400',
    label: 'PRECAUCIÓN',
  },
  danger: {
    dot: 'bg-red-500',
    badge: 'bg-red-500/10',
    badgeText: 'text-red-400',
    label: 'FUERA DE RANGO',
  },
};

// ─────────────────────────────────────────────
// Sub-componente: Fila individual de alerta
// ─────────────────────────────────────────────

interface AlertRowProps {
  event: AlertEvent;
  isFirst: boolean;
}

const AlertRow: React.FC<AlertRowProps> = ({ event, isFirst }) => {
  // TypeScript garantiza que status es 'warning' | 'danger' aquí
  const style = ALERT_STYLE[event.status as Exclude<MetricStatus, 'ok'>];

  return (
    <View
      className={`w-full flex-row items-center justify-between py-4 px-4 ${
        !isFirst ? 'border-t border-zinc-800' : ''
      }`}
    >
      {/* Lado Izquierdo: Icono + Hora */}
      <View className="flex-row items-center mr-3">
        <View className={`w-2 h-2 rounded-full mr-2.5 ${style.dot}`} />
        <Text className="text-zinc-500 text-xs font-mono">
          {event.time}
        </Text>
      </View>

      {/* Centro: Parámetro + Descripción (con flex-wrap) */}
      <View className="flex-1 mr-3">
        <Text className="text-zinc-200 text-sm font-semibold flex-wrap">
          {event.parameter}
          {event.unit ? (
            <Text className="text-zinc-500 text-xs font-normal"> · {event.unit}</Text>
          ) : null}
        </Text>
        <Text className="text-zinc-500 text-[10px] mt-0.5 leading-tight flex-wrap">
          Detección fuera de rango
        </Text>
      </View>

      {/* Lado Derecho: Valor + Badge */}
      <View className="items-end">
        <Text className="text-white text-base font-bold font-mono">
          {event.value}
        </Text>
        <View className={`mt-1 px-1.5 py-0.5 rounded ${style.badge}`}>
          <Text className={`text-[9px] font-bold ${style.badgeText}`}>
            {style.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// Vista principal: AlertsView
// ─────────────────────────────────────────────

export const AlertsView: React.FC = () => {
  const { alertLog, totalAlerts, clearAlertLog, isConnected } = useSensorStore();

  return (
    <View className="flex-1">
      {/* Cabecera del panel */}
      <View className="flex-row justify-between items-baseline mb-4">
        <View>
          <Text className="text-zinc-300 text-sm font-semibold uppercase tracking-wider">
            Log de Alertas
          </Text>
          <Text className="text-zinc-600 text-xs mt-0.5">
            {totalAlerts > 0
              ? `${totalAlerts} evento${totalAlerts !== 1 ? 's' : ''} detectado${totalAlerts !== 1 ? 's' : ''} en sesión`
              : 'Sin eventos en la sesión actual'}
          </Text>
        </View>

        {/* Botón de limpiar log */}
        {alertLog.length > 0 && (
          <TouchableOpacity
            onPress={clearAlertLog}
            activeOpacity={0.75}
            className="border border-zinc-700 rounded-lg px-3 py-1.5"
          >
            <Text className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
              Limpiar
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de alertas o estado vacío */}
      {alertLog.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          {/* Icono visual minimalista */}
          <View className="w-12 h-12 rounded-full border border-zinc-700 items-center justify-center mb-4">
            <Text className="text-emerald-400 text-xl">✓</Text>
          </View>
          <Text className="text-zinc-400 text-sm font-semibold text-center">
            Sistema operando bajo{'\n'}parámetros óptimos
          </Text>
          <Text className="text-zinc-600 text-xs text-center mt-2">
            {isConnected
              ? 'Monitoreo activo · Sin anomalías detectadas'
              : 'Conecte el sensor para iniciar monitoreo'}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-xl"
          showsVerticalScrollIndicator={false}
        >
          {alertLog.map((event, index) => (
            <AlertRow key={event.id} event={event} isFirst={index === 0} />
          ))}

          {/* Footer con total */}
          <View className="border-t border-zinc-700/50 py-3 px-4">
            <Text className="text-zinc-600 text-xs text-center">
              Mostrando {alertLog.length} evento{alertLog.length !== 1 ? 's' : ''} · Máx. 50 registros
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};
