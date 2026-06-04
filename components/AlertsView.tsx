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

const AlertRow: React.FC<AlertRowProps & { isDark: boolean; isIndustrial: boolean }> = ({ event, isFirst, isDark, isIndustrial }) => {
  // TypeScript garantiza que status es 'warning' | 'danger' aquí
  const style = ALERT_STYLE[event.status as Exclude<MetricStatus, 'ok'>];

  if (isIndustrial) {
    return (
      <View className={`w-full flex-row items-center py-2 px-3 border-b border-slate-800 bg-[#0f172a]/40`}>
        <View className={`w-1 h-6 rounded-sm mr-3 ${style.dot}`} />
        <Text className="text-slate-500 text-[9px] font-mono w-14">{event.time}</Text>
        <View className="flex-1">
          <Text className="text-slate-300 text-[10px] font-bold uppercase">{event.parameter}</Text>
          <Text className="text-slate-600 text-[8px] font-mono">ERR_OOR_DETECTED</Text>
        </View>
        <View className="items-end">
          <Text style={{ fontFamily: 'monospace' }} className="text-slate-200 text-sm font-bold">{event.value}</Text>
          <Text className={`text-[7px] font-bold ${style.badgeText}`}>{style.label}</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      className={`w-full flex-row items-center justify-between py-4 px-4 ${
        !isFirst ? (isDark ? 'border-t border-zinc-800' : 'border-t border-slate-200') : ''
      }`}
    >
      {/* ... (resto del código del modo dark/light) ... */}
      {/* Lado Izquierdo: Icono + Hora */}
      <View className="flex-row items-center mr-3">
        <View className={`w-2 h-2 rounded-full mr-2.5 ${style.dot}`} />
        <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} text-xs font-mono`}>
          {event.time}
        </Text>
      </View>

      {/* Centro: Parámetro + Descripción (con flex-wrap) */}
      <View className="flex-1 mr-3">
        <Text className={`${isDark ? 'text-zinc-200' : 'text-slate-700'} text-sm font-semibold flex-wrap`}>
          {event.parameter}
          {event.unit ? (
            <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} text-xs font-normal`}> · {event.unit}</Text>
          ) : null}
        </Text>
        <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} text-[10px] mt-0.5 leading-tight flex-wrap`}>
          Detección fuera de rango
        </Text>
      </View>

      {/* Lado Derecho: Valor + Badge */}
      <View className="items-end">
        <Text className={`${isDark ? 'text-white' : 'text-slate-900'} text-base font-bold font-mono`}>
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
  const { alertLog, totalAlerts, clearAlertLog, isConnected, theme } = useSensorStore();
  const isDark = theme === 'dark';
  const isIndustrial = theme === 'industrial';

  return (
    <View className="flex-1">
      {/* Cabecera del panel */}
      <View className="flex-row justify-between items-baseline mb-4">
        <View>
          <Text className={`${isDark ? 'text-zinc-300' : 'text-slate-700'} text-sm font-semibold uppercase tracking-wider`}>
            Log de Alertas
          </Text>
          <Text className={`${isDark ? 'text-zinc-600' : 'text-slate-500'} text-xs mt-0.5`}>
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
            className={`border ${isDark ? 'border-zinc-700' : 'border-slate-300'} rounded-lg px-3 py-1.5`}
          >
            <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-500'} text-xs font-semibold uppercase tracking-wider`}>
              Limpiar
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de alertas o estado vacío */}
      {alertLog.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          {/* Icono visual minimalista */}
          <View className={`w-12 h-12 rounded-full border ${isDark ? 'border-zinc-700' : 'border-slate-200'} items-center justify-center mb-4`}>
            <Text className="text-emerald-400 text-xl">✓</Text>
          </View>
          <Text className={`${isDark ? 'text-zinc-400' : 'text-slate-600'} text-sm font-semibold text-center`}>
            Sistema operando bajo{'\n'}parámetros óptimos
          </Text>
          <Text className={`${isDark ? 'text-zinc-600' : 'text-slate-400'} text-xs text-center mt-2`}>
            {isConnected
              ? 'Monitoreo activo · Sin anomalías detectadas'
              : 'Conecte el sensor para iniciar monitoreo'}
          </Text>
        </View>
      ) : (
        <ScrollView
          className={`flex-1 ${isIndustrial ? 'bg-[#0f172a] border-slate-800' : isDark ? 'bg-zinc-800/50 border-zinc-700/50' : 'bg-white border-slate-200'} border rounded-xl`}
          showsVerticalScrollIndicator={false}
        >
          {alertLog.map((event, index) => (
            <AlertRow key={event.id} event={event} isFirst={index === 0} isDark={isDark} isIndustrial={isIndustrial} />
          ))}

          {/* Footer con total */}
          <View className={`border-t ${isIndustrial ? 'border-slate-800 bg-[#1e293b]/20' : isDark ? 'border-zinc-700/50' : 'border-slate-100'} py-3 px-4`}>
            <Text className={`${isIndustrial ? 'text-slate-600' : isDark ? 'text-zinc-600' : 'text-slate-400'} text-xs text-center font-mono`}>
              {isIndustrial ? 'SYSTEM_LOG_END // READ_ONLY' : `Mostrando ${alertLog.length} evento${alertLog.length !== 1 ? 's' : ''} · Máx. 50 registros`}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};
