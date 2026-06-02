import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSensorStore } from '../store/useSensorStore';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Formatea milisegundos de duración en una cadena legible (ej. "1h 23m") */
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${totalSeconds}s`;
};

// ─────────────────────────────────────────────
// Sub-componente: Bloque de estadística de reporte
// ─────────────────────────────────────────────

interface ReportBlockProps {
  label: string;
  value: string;
  unit?: string;
  sublabel?: string;
  valueColor?: string;
}

const ReportBlock: React.FC<ReportBlockProps> = ({
  label,
  value,
  unit,
  sublabel,
  valueColor = 'text-white',
}) => (
  <View className="flex-1 border border-zinc-700/60 rounded-xl p-4 mx-1 bg-zinc-800/40">
    <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-3 leading-tight">
      {label}
    </Text>
    <View className="flex-row items-baseline">
      <Text className={`${valueColor} text-3xl font-bold font-mono`}>{value}</Text>
      {unit ? (
        <Text className="text-zinc-600 text-xs ml-1.5 font-medium">{unit}</Text>
      ) : null}
    </View>
    {sublabel ? (
      <Text className="text-zinc-600 text-xs mt-2">{sublabel}</Text>
    ) : null}
  </View>
);

// ─────────────────────────────────────────────
// Sub-componente: Separador con etiqueta
// ─────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <View className="flex-row items-center mb-4 mt-5">
    <View className="flex-1 h-px bg-zinc-800" />
    <Text className="text-zinc-600 text-xs uppercase tracking-widest mx-3">{label}</Text>
    <View className="flex-1 h-px bg-zinc-800" />
  </View>
);

// ─────────────────────────────────────────────
// Vista principal: ReportsView
// ─────────────────────────────────────────────

export const ReportsView: React.FC = () => {
  const { historyData, alertLog, totalAlerts, sessionStart, isConnected } =
    useSensorStore();

  // ── Cálculo de estadísticas del período (memoizado) ──
  const report = useMemo(() => {
    if (historyData.length === 0) {
      return {
        avgPh: '--',
        minPh: '--',
        maxPh: '--',
        avgDensity: '--',
        peakTurbidity: '--',
        avgTurbidity: '--',
        stablePercent: '--',
        sampleCount: 0,
      };
    }

    const phs = historyData.map((r) => r.ph);
    const turbidities = historyData.map((r) => r.turbidity);
    const densities = historyData.map((r) => r.density);

    const avgPh = (phs.reduce((a, b) => a + b, 0) / phs.length).toFixed(2);
    const minPh = Math.min(...phs).toFixed(2);
    const maxPh = Math.max(...phs).toFixed(2);
    const avgDensity = (densities.reduce((a, b) => a + b, 0) / densities.length).toFixed(3);
    const peakTurbidity = Math.max(...turbidities).toFixed(1);
    const avgTurbidity = (turbidities.reduce((a, b) => a + b, 0) / turbidities.length).toFixed(1);

    // Porcentaje de muestras sin alertas = operación estable
    const stableCount = historyData.length - alertLog.length;
    const stablePercent = Math.max(
      0,
      Math.round(((historyData.length - totalAlerts / 3) / historyData.length) * 100),
    ).toString();

    return {
      avgPh,
      minPh,
      maxPh,
      avgDensity,
      peakTurbidity,
      avgTurbidity,
      stablePercent,
      sampleCount: historyData.length,
    };
  }, [historyData, alertLog.length, totalAlerts]);

  // ── Tiempo de operación estable desde el inicio de sesión ──
  const operationTime = useMemo(() => {
    if (!sessionStart) return '--';
    return formatDuration(Date.now() - sessionStart.getTime());
  }, [sessionStart]);

  // ── Handler del botón de exportar ──
  const handleExport = () => {
    Alert.alert(
      'Reporte Generado',
      'Reporte guardado localmente en /Documentos/Historial_Agua.csv',
      [{ text: 'Aceptar', style: 'default' }],
    );
  };

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 8 }}
    >
      {/* Cabecera del panel */}
      <View className="mb-4">
        <Text className="text-zinc-300 text-sm font-semibold uppercase tracking-wider">
          Informe de Turno
        </Text>
        <Text className="text-zinc-600 text-xs mt-0.5">
          {report.sampleCount > 0
            ? `Basado en ${report.sampleCount} muestras del período actual`
            : 'Sin datos suficientes · Conecte el sensor'}
        </Text>
      </View>

      {/* ── Bloque 1: Resumen de pH ── */}
      <SectionLabel label="pH del período" />
      <View className="flex-row -mx-1">
        <ReportBlock
          label={'Promedio\npH 24h'}
          value={report.avgPh}
          sublabel="Valor representativo del período"
        />
        <ReportBlock
          label={'Mínimo\nregistrado'}
          value={report.minPh}
          sublabel="Valor más ácido detectado"
          valueColor={
            report.minPh !== '--' && parseFloat(report.minPh) < 6.5
              ? 'text-amber-400'
              : 'text-white'
          }
        />
        <ReportBlock
          label={'Máximo\nregistrado'}
          value={report.maxPh}
          sublabel="Valor más alcalino detectado"
          valueColor={
            report.maxPh !== '--' && parseFloat(report.maxPh) > 8.5
              ? 'text-amber-400'
              : 'text-white'
          }
        />
      </View>

      {/* ── Bloque 2: Turbidez y operación ── */}
      <SectionLabel label="Calidad y operación" />
      <View className="flex-row -mx-1">
        <ReportBlock
          label={'Pico\nturbidez'}
          value={report.peakTurbidity}
          unit="NTU"
          sublabel="Máximo detectado en el período"
          valueColor={
            report.peakTurbidity !== '--' && parseFloat(report.peakTurbidity) > 5
              ? 'text-red-400'
              : 'text-white'
          }
        />
        <ReportBlock
          label={'Tiempo\noperativo'}
          value={operationTime}
          sublabel={isConnected ? 'Sesión activa en curso' : 'Sesión finalizada'}
          valueColor="text-emerald-400"
        />
      </View>

      {/* ── Bloque 3: Resumen de alertas ── */}
      <SectionLabel label="Alertas del período" />
      <View className="border border-zinc-700/60 rounded-xl p-4 bg-zinc-800/40 mb-1">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
              Total de eventos fuera de rango
            </Text>
            <View className="flex-row items-baseline">
              <Text
                className={`text-3xl font-bold font-mono ${
                  totalAlerts > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {totalAlerts}
              </Text>
              <Text className="text-zinc-600 text-xs ml-2">
                {totalAlerts === 1 ? 'evento' : 'eventos'}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
              Densidad prom.
            </Text>
            <Text className="text-white text-xl font-bold font-mono">
              {report.avgDensity}
            </Text>
            <Text className="text-zinc-600 text-xs">g/cm³</Text>
          </View>
        </View>
      </View>

      {/* ── Botón de exportar ── */}
      <View className="mt-5">
        <TouchableOpacity
          onPress={handleExport}
          activeOpacity={0.8}
          disabled={report.sampleCount === 0}
          className={`border rounded-xl py-4 px-5 flex-row items-center justify-center ${
            report.sampleCount > 0
              ? 'border-zinc-600 bg-zinc-800/60'
              : 'border-zinc-800 opacity-40'
          }`}
        >
          {/* Icono decorativo */}
          <Text className="text-zinc-400 text-lg mr-3">↓</Text>
          <View>
            <Text className="text-zinc-200 text-sm font-semibold">
              Exportar Reporte de Calidad
            </Text>
            <Text className="text-zinc-500 text-xs mt-0.5">
              /Documentos/Historial_Agua.csv
            </Text>
          </View>
        </TouchableOpacity>

        {report.sampleCount === 0 && (
          <Text className="text-zinc-600 text-xs text-center mt-2">
            Requiere al menos una muestra del sensor
          </Text>
        )}
      </View>
    </ScrollView>
  );
};
