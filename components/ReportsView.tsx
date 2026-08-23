import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSensorStore } from '../store/useSensorStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ShareIcon, ThermometerIcon, DropletIcon, WavesIcon } from './Icons';
import { AuraCard } from './AuraCard';

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
}) => {
  return (
    <AuraCard
      colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
      radius={16}
      style={{ marginBottom: 8 }}
    >
      <View style={styles.blockInner}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={[styles.blockLabel, { color: isDark ? '#E2E8F0' : '#0F172A' }]}>
            {label}
          </Text>
          {sublabel ? (
            <Text style={[styles.blockSublabel, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              {sublabel}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            style={[
              styles.blockValue,
              { color: valueColor || (isDark ? '#F8FAFC' : '#0F172A') },
            ]}
          >
            {value}
          </Text>
          {unit ? (
            <Text style={[styles.blockUnit, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {unit}
            </Text>
          ) : null}
        </View>
      </View>
    </AuraCard>
  );
};

// ─────────────────────────────────────────────
// Sub-componente: Separador con etiqueta
// ─────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string; isDark: boolean }> = ({ label, isDark }) => (
  <View style={styles.sectionLabelRow}>
    <View style={[styles.sectionLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]} />
    <Text style={[styles.sectionText, { color: isDark ? '#94A3B8' : '#64748B' }]}>{label}</Text>
    <View style={[styles.sectionLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' }]} />
  </View>
);

// ─────────────────────────────────────────────
// Vista principal: ReportsView
// ─────────────────────────────────────────────

import { useShallow } from 'zustand/react/shallow';

export const ReportsView: React.FC = () => {
  const { historyData, alertLog, totalAlerts, sessionStartTime, isConnected, theme, alertRanges } =
    useSensorStore(useShallow(state => ({
      historyData: state.historyData,
      alertLog: state.alertLog,
      totalAlerts: state.totalAlerts,
      sessionStartTime: state.sessionStartTime,
      isConnected: state.isConnected,
      theme: state.theme,
      alertRanges: state.alertRanges,
    })));
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
        avgTemperature: '--',
        minTemperature: '--',
        maxTemperature: '--',
        peakTurbidity: '--',
        avgTurbidity: '--',
        stablePercent: '--',
        sampleCount: 0,
      };
    }

    const phs = historyData.map((r) => r.ph);
    const turbidities = historyData.map((r) => r.turbidity);
    const temperatures = historyData.map((r) => r.temperature);

    const avgPh = (phs.reduce((a, b) => a + b, 0) / phs.length).toFixed(2);
    const minPh = Math.min(...phs).toFixed(2);
    const maxPh = Math.max(...phs).toFixed(2);

    const avgTemperature = (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(1);
    const minTemperature = Math.min(...temperatures).toFixed(1);
    const maxTemperature = Math.max(...temperatures).toFixed(1);

    const peakTurbidity = Math.max(...turbidities).toFixed(1);
    const avgTurbidity = (turbidities.reduce((a, b) => a + b, 0) / turbidities.length).toFixed(1);

    const stablePercent = Math.max(
      0,
      Math.round(((historyData.length - totalAlerts / 3) / historyData.length) * 100),
    ).toString();

    return {
      avgPh,
      minPh,
      maxPh,
      avgTemperature,
      minTemperature,
      maxTemperature,
      peakTurbidity,
      avgTurbidity,
      stablePercent,
      sampleCount: historyData.length,
    };
  }, [historyData, alertLog.length, totalAlerts]);

  // ── Handler del botón de exportar ──
  const handleExport = async () => {
    try {
      const dataToExport = [...historyData];

      if (dataToExport.length === 0) {
        Alert.alert(
          'Historial vacío',
          'No hay muestras aún. Inicie el monitoreo para recolectar datos.',
          [{ text: 'Entendido' }],
        );
        return;
      }

      const header = 'Hora,pH,Temperatura (C),Turbidez (NTU)\n';
      const rows = dataToExport
        .map((r) => `${r.time},${r.ph},${r.temperature},${r.turbidity}`)
        .join('\n');
      const csvContent = header + rows;

      const fileName = `Reporte_TPH_Calidad_${new Date().getTime()}.csv`;
      const fileUri = FileSystem.cacheDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      const isSharingAvailable = await Sharing.isAvailableAsync();

      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Descargar reporte analítico de calidad',
        });
      } else {
        if (Platform.OS === 'android') {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const uri = await FileSystem.StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              fileName,
              'text/csv',
            );
            await FileSystem.writeAsStringAsync(uri, csvContent);
            Alert.alert('Éxito', 'Reporte guardado exitosamente.');
          }
        }
      }
    } catch (error: any) {
      console.error('Export Error:', error);
      Alert.alert(
        'Error al exportar',
        `No se pudo completar la operación.\n\nDetalle: ${error.message || 'Error desconocido'}`,
        [{ text: 'Entendido' }],
      );
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Cabecera del panel */}
      <View style={{ marginBottom: 14 }}>
        <Text style={[styles.headerTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
          Informe Analítico del Período
        </Text>
        <Text style={[styles.headerSubtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
          {report.sampleCount > 0
            ? `Basado en ${report.sampleCount} muestras de telemetría recopiladas`
            : 'Sin datos suficientes · Inicie el escaneo de la sonda'}
        </Text>
      </View>

      {/* ── Bloque 1: Resumen de pH ── */}
      <SectionLabel label="Análisis de pH" isDark={isDark} />
      <View style={{ flexDirection: 'column' }}>
        <ReportBlock
          label="Promedio de pH"
          value={report.avgPh}
          sublabel="Representativo de la muestra"
          isDark={isDark}
        />
        <ReportBlock
          label="pH Mínimo Registrado"
          value={report.minPh}
          sublabel="Muestra con mayor acidez"
          isDark={isDark}
          valueColor={
            report.minPh !== '--' && parseFloat(report.minPh) < alertRanges.ph.min
              ? '#FBBF24'
              : undefined
          }
        />
        <ReportBlock
          label="pH Máximo Registrado"
          value={report.maxPh}
          sublabel="Muestra con mayor alcalinidad"
          isDark={isDark}
          valueColor={
            report.maxPh !== '--' && parseFloat(report.maxPh) > alertRanges.ph.max
              ? '#FBBF24'
              : undefined
          }
        />
      </View>

      {/* ── Bloque 2: Temperatura ── */}
      <SectionLabel label="Análisis Térmico" isDark={isDark} />
      <View style={{ flexDirection: 'column' }}>
        <ReportBlock
          label="Temperatura Promedio"
          value={report.avgTemperature}
          unit="°C"
          sublabel="Media del agua evaluada"
          isDark={isDark}
        />
        <ReportBlock
          label="Temperatura Mínima"
          value={report.minTemperature}
          unit="°C"
          sublabel="Punto térmico más frío"
          isDark={isDark}
          valueColor={
            report.minTemperature !== '--' && parseFloat(report.minTemperature) < alertRanges.temperature.min
              ? '#38BDF8'
              : undefined
          }
        />
        <ReportBlock
          label="Temperatura Máxima"
          value={report.maxTemperature}
          unit="°C"
          sublabel="Punto térmico más cálido"
          isDark={isDark}
          valueColor={
            report.maxTemperature !== '--' && parseFloat(report.maxTemperature) > alertRanges.temperature.max
              ? '#EF4444'
              : undefined
          }
        />
      </View>

      {/* ── Bloque 3: Turbidez y operación ── */}
      <SectionLabel label="Calidad Óptica y Tiempo Operativo" isDark={isDark} />
      <View style={{ flexDirection: 'column' }}>
        <ReportBlock
          label="Pico de Turbidez"
          value={report.peakTurbidity}
          unit="NTU"
          sublabel="Máxima dispersión óptica detectada"
          isDark={isDark}
          valueColor={
            report.peakTurbidity !== '--' && parseFloat(report.peakTurbidity) > alertRanges.turbidity.max
              ? '#EF4444'
              : undefined
          }
        />
        <ReportBlock
          label="Tiempo Operativo Continuo"
          value={realTimeDuration}
          sublabel={isConnected ? 'Sesión de telemetría activa' : 'Sensor desconectado'}
          isDark={isDark}
          valueColor="#0EA5E9"
        />
      </View>

      {/* ── Bloque 4: Resumen de alertas ── */}
      <SectionLabel label="Auditoría de Calidad" isDark={isDark} />
      <AuraCard
        colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
        radius={16}
        style={{ marginBottom: 12 }}
      >
        <View style={styles.auditRow}>
          <View>
            <Text style={[styles.auditLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Incidencias Detectadas
            </Text>
            <Text
              style={[
                styles.auditValue,
                { color: totalAlerts > 0 ? '#FBBF24' : '#10B981' },
              ]}
            >
              {totalAlerts}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.auditLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Índice de Estabilidad
            </Text>
            <Text style={[styles.auditValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {report.stablePercent}%
            </Text>
          </View>
        </View>
      </AuraCard>

      {/* ── Botón de exportar ── */}
      <View style={{ marginTop: 12, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={handleExport}
          activeOpacity={0.75}
          disabled={report.sampleCount === 0}
          style={[
            styles.exportBtn,
            report.sampleCount > 0
              ? { borderColor: 'rgba(14,165,233,0.3)', backgroundColor: 'rgba(14,165,233,0.1)' }
              : { borderColor: 'rgba(255,255,255,0.06)', opacity: 0.4, backgroundColor: 'rgba(255,255,255,0.03)' },
          ]}
        >
          <ShareIcon size={16} color="#0EA5E9" />
          <Text style={styles.exportBtnText}>
            Exportar Reporte CSV Completo
          </Text>
        </TouchableOpacity>
        {report.sampleCount === 0 && (
          <Text style={[styles.exportDisabledHint, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            Inicie el monitoreo para habilitar la exportación de datos
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  blockInner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  blockSublabel: {
    fontSize: 10,
    marginTop: 2,
  },
  blockValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  blockUnit: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 14,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginHorizontal: 10,
  },
  auditRow: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  auditValue: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 18,
  },
  exportBtnText: {
    color: '#0EA5E9',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  exportDisabledHint: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
});
