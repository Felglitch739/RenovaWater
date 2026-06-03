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
import * as FileSystem from 'expo-file-system';
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
}

const ReportBlock: React.FC<ReportBlockProps> = ({
  label,
  value,
  unit,
  sublabel,
  valueColor,
  isDark,
}) => (
  <View className={`w-full border ${isDark ? 'border-zinc-700/60 bg-zinc-800/40' : 'border-slate-200 bg-white'} rounded-xl p-3.5 mb-2 flex-row items-center justify-between shadow-sm`}>
    <View className="flex-1 mr-4">
      <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-500'} text-[10px] uppercase tracking-widest mb-1 leading-tight font-bold`}>
        {label.replace('\n', ' ')}
      </Text>
      {sublabel ? (
        <Text className={`${isDark ? 'text-zinc-600' : 'text-slate-400'} text-[10px] leading-tight flex-wrap font-medium`}>
          {sublabel}
        </Text>
      ) : null}
    </View>
    <View className="flex-row items-baseline">
      <Text className={`${valueColor || (isDark ? 'text-white' : 'text-slate-900')} text-2xl font-bold font-mono`}>{value}</Text>
      {unit ? (
        <Text className={`${isDark ? 'text-zinc-600' : 'text-slate-400'} text-[10px] ml-1.5 font-bold`}>{unit}</Text>
      ) : null}
    </View>
  </View>
);

// ─────────────────────────────────────────────
// Sub-componente: Separador con etiqueta
// ─────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string; isDark: boolean }> = ({ label, isDark }) => (
  <View className="flex-row items-center mb-4 mt-5">
    <View className={`flex-1 h-px ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
    <Text className={`${isDark ? 'text-zinc-600' : 'text-slate-400'} text-[10px] uppercase tracking-widest mx-3 font-bold`}>{label}</Text>
    <View className={`flex-1 h-px ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
  </View>
);

// ─────────────────────────────────────────────
// Vista principal: ReportsView
// ─────────────────────────────────────────────

export const ReportsView: React.FC = () => {
  const { historyData, alertLog, totalAlerts, sessionStartTime, isConnected, theme } =
    useSensorStore();
  const isDark = theme === 'dark';

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
    if (historyData.length === 0) return;

    try {
      // 1. Generar Contenido CSV
      const header = "Hora,pH,Densidad (g/cm3),Turbidez (NTU)\n";
      const rows = historyData.map(r =>
        `${r.time},${r.ph},${r.density},${r.turbidity}`
      ).join("\n");
      const csvContent = header + rows;

      // 2. Definir nombre del archivo
      const fileName = `Reporte_Turno_${new Date().toISOString().split('T')[0]}.csv`;

      if (Platform.OS === 'android') {
        // En Android, podemos pedir permiso para guardar en una carpeta específica
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permissions.granted) {
          // Crear el archivo en la carpeta elegida
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            'text/csv'
          );

          await FileSystem.writeAsStringAsync(uri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
          Alert.alert("Éxito", "Reporte guardado en el dispositivo");
        } else {
          // Si no dan permiso, usamos el método de compartir como respaldo
          await fallbackShare(csvContent, fileName);
        }
      } else {
        // iOS y otros: compartir es la forma estándar
        await fallbackShare(csvContent, fileName);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo guardar el reporte");
    }
  };

  const fallbackShare = async (content: string, fileName: string) => {
    const fileUri = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
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
      <SectionLabel label="Alertas y Otros" isDark={isDark} />
      <View className={`border ${isDark ? 'border-zinc-700/60 bg-zinc-800/40' : 'border-slate-200 bg-white shadow-sm'} rounded-xl p-4 mb-1 flex-row justify-between items-center`}>
        <View>
          <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-500'} text-[10px] uppercase tracking-widest mb-1 font-bold`}>
            Total Alertas
          </Text>
          <View className="flex-row items-baseline">
            <Text
              className={`text-2xl font-bold font-mono ${
                totalAlerts > 0 ? 'text-amber-500' : 'text-sky-500'
              }`}
            >
              {totalAlerts}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-500'} text-[10px] uppercase tracking-widest mb-1 font-bold`}>
            Densidad prom.
          </Text>
          <Text className={`${isDark ? 'text-white' : 'text-slate-900'} text-lg font-bold font-mono`}>
            {report.avgDensity}
          </Text>
        </View>
      </View>

      {/* ── Botón de exportar ── */}
      <View className="mt-5 mb-5">
        <TouchableOpacity
          onPress={handleExport}
          activeOpacity={0.8}
          disabled={report.sampleCount === 0}
          className={`border rounded-2xl py-4 px-5 flex-row items-center justify-center ${
            report.sampleCount > 0
              ? isDark ? 'border-zinc-700 bg-zinc-800/60' : 'border-slate-300 bg-slate-100 shadow-sm'
              : 'border-zinc-800 opacity-40'
          }`}
        >
          <Text className="text-sky-500 text-lg mr-3">📥</Text>
          <View>
            <Text className={`${isDark ? 'text-zinc-200' : 'text-slate-700'} text-sm font-bold`}>
              Exportar Reporte CSV
            </Text>
            <Text className={`${isDark ? 'text-zinc-500' : 'text-slate-500'} text-[10px] font-medium`}>
              Descargar historial de muestras
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
