import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSensorStore } from '../store/useSensorStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Formatea milisegundos de duración en una cadena legible (ej. "1h 23m") */
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
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
  isDark: boolean;
  isIndustrial: boolean;
}

const ReportBlock: React.FC<ReportBlockProps> = ({
  label,
  value,
  unit,
  sublabel,
  valueColor,
  isDark,
  isIndustrial,
}) => {
  // Directriz SCADA: Geometría rígida y colores técnicos
  const containerStyle = isIndustrial
    ? "bg-[#0f172a]/80 border-slate-800 rounded-sm"
    : "bg-[#1a2436] border-slate-700 rounded-md";

  return (
    <View className={`w-full border-b ${containerStyle} py-3 px-4 flex-row items-center justify-between mb-1`}>
      <View className="flex-1 mr-4">
        <Text style={{ fontFamily: 'monospace' }} className="text-[#7e8b9b] text-[9px] uppercase tracking-[2px] font-bold">
          {label.replace('\n', '_')}
        </Text>
        {sublabel ? (
          <Text className="text-slate-500 text-[8px] mt-0.5 uppercase">
            {sublabel}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-baseline">
        <Text style={{ fontFamily: 'monospace' }} className={`${valueColor || 'text-[#FFFFFF]'} text-xl font-bold`}>
          {value}
        </Text>
        {unit ? (
          <Text className="text-slate-500 text-[9px] ml-1.5 font-bold uppercase">{unit}</Text>
        ) : null}
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// Sub-componente: Separador con etiqueta
// ─────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string; isDark: boolean; isIndustrial: boolean }> = ({ label, isDark, isIndustrial }) => (
  <View className="flex-row items-center mb-4 mt-5">
    <View className={`flex-1 h-px ${isIndustrial ? 'bg-slate-800' : isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
    <Text className={`${isIndustrial ? 'text-slate-500' : isDark ? 'text-zinc-600' : 'text-slate-400'} text-[10px] uppercase tracking-widest mx-3 font-bold`}>{label}</Text>
    <View className={`flex-1 h-px ${isIndustrial ? 'bg-slate-800' : isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
  </View>
);

// ─────────────────────────────────────────────
// Vista principal: ReportsView
// ─────────────────────────────────────────────

export const ReportsView: React.FC = () => {
  const { historyData, alertLog, totalAlerts, sessionStartTime, isConnected, theme } =
    useSensorStore();
  const isDark = theme === 'dark';
  const isIndustrial = theme === 'industrial';

  const [realTimeDuration, setRealTimeDuration] = useState<string>('--');

  // --- Timer en Tiempo Real ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isConnected && sessionStartTime) {
      interval = setInterval(() => {
        setRealTimeDuration(formatDuration(Date.now() - sessionStartTime));
      }, 1000);
    } else {
      setRealTimeDuration('--');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, sessionStartTime]);

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

  // ── Handler del botón de exportar ──
  const handleExport = async () => {
    try {
      let dataToExport = [...historyData];

      // VALIDACIÓN: Si no hay datos, generar datos ficticios para probar
      if (dataToExport.length === 0) {
        Alert.alert(
          "Historial Vacío",
          "No hay muestras reales aún. Se generará un reporte de prueba con datos ficticios.",
          [{ text: "Continuar" }]
        );
        dataToExport = [
          { time: "08:00:00", ph: 7.2, density: 1.002, turbidity: 2.5 },
          { time: "09:00:00", ph: 7.5, density: 1.005, turbidity: 4.8 },
          { time: "10:00:00", ph: 8.1, density: 1.012, turbidity: 15.2 },
        ];
      }

      // 1. Generar Contenido CSV
      const header = "Hora,pH,Densidad (g/cm3),Turbidez (NTU)\n";
      const rows = dataToExport.map(r =>
        `${r.time},${r.ph},${r.density},${r.turbidity}`
      ).join("\n");
      const csvContent = header + rows;

      // 2. Definir nombre del archivo
      const fileName = `Reporte_TPH_${new Date().getTime()}.csv`;

      // Intentar guardar primero con el método de compartir (más compatible en Expo Go)
      const fileUri = FileSystem.cacheDirectory + fileName;

      // Simplificación Senior: Eliminamos objetos de codificación externos que causan el error de 'undefined'
      // Expo maneja UTF-8 por defecto al pasarle un string directamente.
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Descargar Reporte de Calidad',
        });
      } else {
        // Si fallan los métodos modernos, intentar el SAF de Android
        if (Platform.OS === 'android') {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const uri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'text/csv'
            );
            await FileSystem.writeAsStringAsync(uri, csvContent);
            Alert.alert("Éxito", "Reporte guardado exitosamente en la carpeta seleccionada.");
          }
        } else {
          throw new Error("La función de compartir no está disponible en este dispositivo.");
        }
      }
    } catch (error: any) {
      console.error("Export Error:", error);
      Alert.alert(
        "Error de Exportación",
        `No se pudo completar la operación.\n\nDetalle: ${error.message || 'Error desconocido'}`,
        [{ text: "Entendido" }]
      );
    }
  };

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 8 }}
    >
      {/* Cabecera del panel */}
      <View className="mb-4">
        <Text className={`${isDark ? 'text-zinc-300' : 'text-slate-700'} text-sm font-bold uppercase tracking-wider`}>
          Informe de Turno
        </Text>
        <Text className={`${isDark ? 'text-zinc-600' : 'text-slate-500'} text-[10px] mt-0.5 font-medium`}>
          {report.sampleCount > 0
            ? `Basado en ${report.sampleCount} muestras del período actual`
            : 'Sin datos suficientes · Conecte el sensor'}
        </Text>
      </View>

      {/* ── Bloque 1: Resumen de pH ── */}
      <SectionLabel label="Análisis de pH" isDark={isDark} />
      <View className="flex-col">
        <ReportBlock
          label={'Promedio 24h'}
          value={report.avgPh}
          sublabel="Valor representativo del período"
          isDark={isDark}
        />
        <ReportBlock
          label={'Mínimo'}
          value={report.minPh}
          sublabel="Valor más ácido detectado"
          isDark={isDark}
          valueColor={
            report.minPh !== '--' && parseFloat(report.minPh) < 6.5
              ? 'text-amber-500'
              : undefined
          }
        />
        <ReportBlock
          label={'Máximo'}
          value={report.maxPh}
          sublabel="Valor más alcalino detectado"
          isDark={isDark}
          valueColor={
            report.maxPh !== '--' && parseFloat(report.maxPh) > 8.5
              ? 'text-amber-500'
              : undefined
          }
        />
      </View>

      {/* ── Bloque 2: Turbidez y operación ── */}
      <SectionLabel label="Calidad y operación" isDark={isDark} />
      <View className="flex-col">
        <ReportBlock
          label={'Pico de turbidez'}
          value={report.peakTurbidity}
          unit="NTU"
          sublabel="Máximo detectado en el período"
          isDark={isDark}
          valueColor={
            report.peakTurbidity !== '--' && parseFloat(report.peakTurbidity) > 5
              ? 'text-red-500'
              : undefined
          }
        />
        <ReportBlock
          label={'Tiempo operativo'}
          value={realTimeDuration}
          sublabel={isConnected ? 'Sesión activa' : 'Sensor desconectado'}
          isDark={isDark}
          valueColor="text-sky-500"
        />
      </View>

      {/* ── Bloque 3: Resumen de alertas ── */}
      <SectionLabel label="Alertas y Otros" isDark={isDark} isIndustrial={isIndustrial} />
      <View className={`border ${isIndustrial ? 'border-slate-800 bg-[#0f172a]/80' : isDark ? 'border-zinc-700/60 bg-zinc-800/40' : 'border-slate-200 bg-white shadow-sm'} rounded-sm p-4 mb-1 flex-row justify-between items-center`}>
        <View>
          <Text style={isIndustrial ? { fontFamily: 'monospace' } : undefined} className={`${isIndustrial ? 'text-[#7e8b9b] text-[9px] uppercase tracking-[2px]' : isDark ? 'text-zinc-500' : 'text-slate-500'} text-[10px] uppercase tracking-widest mb-1 font-bold`}>
            {isIndustrial ? 'TOTAL_ALERTS_LOG' : 'Total Alertas'}
          </Text>
          <View className="flex-row items-baseline">
            <Text
              style={isIndustrial ? { fontFamily: 'monospace' } : undefined}
              className={`text-2xl font-bold ${isIndustrial ? '' : 'font-mono'} ${
                totalAlerts > 0 ? 'text-amber-500' : 'text-sky-500'
              }`}
            >
              {totalAlerts}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text style={isIndustrial ? { fontFamily: 'monospace' } : undefined} className={`${isIndustrial ? 'text-[#7e8b9b] text-[9px] uppercase tracking-[2px]' : isDark ? 'text-zinc-500' : 'text-slate-500'} text-[10px] uppercase tracking-widest mb-1 font-bold`}>
            {isIndustrial ? 'AVG_DENSITY' : 'Densidad prom.'}
          </Text>
          <Text style={isIndustrial ? { fontFamily: 'monospace' } : undefined} className={`${isIndustrial ? 'text-[#FFFFFF]' : isDark ? 'text-white' : 'text-slate-900'} text-lg font-bold ${isIndustrial ? '' : 'font-mono'}`}>
            {report.avgDensity}
          </Text>
        </View>
      </View>

      {/* ── Botón de exportar: COMANDO TÉCNICO ── */}
      <View className="mt-8 mb-10">
        <TouchableOpacity
          onPress={handleExport}
          activeOpacity={0.7}
          disabled={report.sampleCount === 0}
          className={`border ${report.sampleCount > 0 ? 'border-sky-500/50 bg-[#0f172a]' : 'border-slate-800 opacity-30'} py-4 flex-row items-center justify-center rounded-sm`}
        >
          <Text className="text-sky-500 text-lg mr-3">⤓</Text>
          <Text style={{ fontFamily: 'monospace' }} className="text-sky-500 text-xs font-bold tracking-[2px]">
            EXPORT_REPORT_CSV
          </Text>
        </TouchableOpacity>
        {report.sampleCount === 0 && (
          <Text className="text-slate-600 text-[8px] text-center mt-2 font-mono uppercase tracking-widest">
            ERROR: NO_SENSOR_DATA_FOUND
          </Text>
        )}
      </View>
    </ScrollView>
  );
};
