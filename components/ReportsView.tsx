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
}

const ReportBlock: React.FC<ReportBlockProps> = ({
  label,
  value,
  unit,
  sublabel,
  valueColor = 'text-white',
}) => (
  <View className="w-full border border-zinc-700/60 rounded-xl p-3.5 mb-2 bg-zinc-800/40 flex-row items-center justify-between">
    <View className="flex-1 mr-4">
      <Text className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1 leading-tight">
        {label.replace('\n', ' ')}
      </Text>
      {sublabel ? (
        <Text className="text-zinc-600 text-[10px] leading-tight flex-wrap">
          {sublabel}
        </Text>
      ) : null}
    </View>
    <View className="flex-row items-baseline">
      <Text className={`${valueColor} text-2xl font-bold font-mono`}>{value}</Text>
      {unit ? (
        <Text className="text-zinc-600 text-[10px] ml-1.5 font-medium">{unit}</Text>
      ) : null}
    </View>
  </View>
);

// ─────────────────────────────────────────────
// Sub-componente: Separador con etiqueta
// ─────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <View className="flex-row items-center mb-4 mt-5">
    <View className="flex-1 h-px bg-zinc-800" />
    <Text className="text-zinc-600 text-[10px] uppercase tracking-widest mx-3">{label}</Text>
    <View className="flex-1 h-px bg-zinc-800" />
  </View>
);

// ─────────────────────────────────────────────
// Vista principal: ReportsView
// ─────────────────────────────────────────────

export const ReportsView: React.FC = () => {
  const { historyData, alertLog, totalAlerts, sessionStartTime, isConnected } =
    useSensorStore();

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
        <Text className="text-zinc-300 text-sm font-semibold uppercase tracking-wider">
          Informe de Turno
        </Text>
        <Text className="text-zinc-600 text-[10px] mt-0.5">
          {report.sampleCount > 0
            ? `Basado en ${report.sampleCount} muestras del período actual`
            : 'Sin datos suficientes · Conecte el sensor'}
        </Text>
      </View>

      {/* ── Bloque 1: Resumen de pH ── */}
      <SectionLabel label="Análisis de pH" />
      <View className="flex-col">
        <ReportBlock
          label={'Promedio 24h'}
          value={report.avgPh}
          sublabel="Valor representativo del período"
        />
        <ReportBlock
          label={'Mínimo'}
          value={report.minPh}
          sublabel="Valor más ácido detectado"
          valueColor={
            report.minPh !== '--' && parseFloat(report.minPh) < 6.5
              ? 'text-amber-400'
              : 'text-white'
          }
        />
        <ReportBlock
          label={'Máximo'}
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
      <View className="flex-col">
        <ReportBlock
          label={'Pico de turbidez'}
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
          label={'Tiempo operativo'}
          value={realTimeDuration}
          sublabel={isConnected ? 'Sesión activa' : 'Sensor desconectado'}
          valueColor="text-emerald-400"
        />
      </View>

      {/* ── Bloque 3: Resumen de alertas ── */}
      <SectionLabel label="Alertas y Otros" />
      <View className="border border-zinc-700/60 rounded-xl p-4 bg-zinc-800/40 mb-1 flex-row justify-between items-center">
        <View>
          <Text className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
            Total Alertas
          </Text>
          <View className="flex-row items-baseline">
            <Text
              className={`text-2xl font-bold font-mono ${
                totalAlerts > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {totalAlerts}
            </Text>
          </View>
        </View>

        <View className="items-end">
          <Text className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">
            Densidad prom.
          </Text>
          <Text className="text-white text-lg font-bold font-mono">
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
              ? 'border-zinc-700 bg-zinc-800/60'
              : 'border-zinc-800 opacity-40'
          }`}
        >
          <Text className="text-zinc-400 text-lg mr-3">📥</Text>
          <View>
            <Text className="text-zinc-200 text-sm font-bold">
              Exportar Reporte CSV
            </Text>
            <Text className="text-zinc-500 text-[10px]">
              Descargar historial de muestras
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
