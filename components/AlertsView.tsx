import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSensorStore, type AlertEvent, type MetricStatus } from '../store/useSensorStore';
import {
  TrashIcon,
  ActivityIcon,
  DropletIcon,
  ThermometerIcon,
  WavesIcon,
  CheckCircleIcon,
  FilterIcon,
} from './Icons';
import { AuraCard } from './AuraCard';

// ─────────────────────────────────────────────
// Configuración de estilos y etiquetas por estado
// ─────────────────────────────────────────────

type FilterType = 'all' | 'danger' | 'warning' | 'pH' | 'Temperatura' | 'Turbidez';

const SEVERITY_CONFIG: Record<
  Exclude<MetricStatus, 'ok'>,
  {
    color: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    label: string;
    iconBg: string;
  }
> = {
  warning: {
    color: '#FBBF24',
    badgeBg: 'rgba(251,191,36,0.14)',
    badgeText: '#FCD34D',
    badgeBorder: 'rgba(251,191,36,0.3)',
    label: 'PRECAUCIÓN',
    iconBg: 'rgba(251,191,36,0.12)',
  },
  danger: {
    color: '#EF4444',
    badgeBg: 'rgba(239,68,68,0.14)',
    badgeText: '#F87171',
    badgeBorder: 'rgba(239,68,68,0.3)',
    label: 'CRÍTICO',
    iconBg: 'rgba(239,68,68,0.12)',
  },
};

// ─────────────────────────────────────────────
// Sub-componente: Fila individual de log
// ─────────────────────────────────────────────

interface AlertCardItemProps {
  event: AlertEvent;
  isDark: boolean;
  alertRanges: ReturnType<typeof useSensorStore.getState>['alertRanges'];
}

const AlertCardItem: React.FC<AlertCardItemProps> = ({ event, isDark, alertRanges }) => {
  const sev = SEVERITY_CONFIG[event.status as Exclude<MetricStatus, 'ok'>] || SEVERITY_CONFIG.warning;

  // Icono y desviación según el parámetro
  let paramIcon = <ActivityIcon size={16} color={sev.color} />;
  let deviationText = 'Fuera del rango óptimo';

  if (event.parameter === 'pH') {
    paramIcon = <DropletIcon size={16} color={sev.color} />;
    if (event.value < alertRanges.ph.min) {
      deviationText = `Bajo mínimo (${alertRanges.ph.min} pH)`;
    } else if (event.value > alertRanges.ph.max) {
      deviationText = `Sobre máximo (${alertRanges.ph.max} pH)`;
    }
  } else if (event.parameter === 'Temperatura') {
    paramIcon = <ThermometerIcon size={16} color={sev.color} />;
    if (event.value < alertRanges.temperature.min) {
      deviationText = `Bajo mínimo (${alertRanges.temperature.min}°C)`;
    } else if (event.value > alertRanges.temperature.max) {
      deviationText = `Sobre máximo (${alertRanges.temperature.max}°C)`;
    }
  } else if (event.parameter === 'Turbidez') {
    paramIcon = <WavesIcon size={16} color={sev.color} />;
    deviationText = `Sobre umbral (máx ${alertRanges.turbidity.max} NTU)`;
  }

  return (
    <View style={[styles.logItemContainer, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
      {/* Icono del parámetro con halo de color */}
      <View
        style={[
          styles.paramIconBox,
          {
            backgroundColor: sev.iconBg,
            borderColor: sev.badgeBorder,
          },
        ]}
      >
        {paramIcon}
      </View>

      {/* Info central */}
      <View style={styles.logInfoCenter}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.paramTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
            {event.parameter}
          </Text>
          <View style={[styles.timeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Text style={[styles.timeText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {event.time}
            </Text>
          </View>
        </View>

        <Text style={[styles.deviationDesc, { color: isDark ? '#64748B' : '#94A3B8' }]}>
          {deviationText}
        </Text>
      </View>

      {/* Valor registrado y badge de gravedad */}
      <View style={styles.logRightColumn}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={[styles.logValueText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {event.value}
          </Text>
          {event.unit ? (
            <Text style={[styles.logUnitText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {event.unit}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.severityPill,
            {
              backgroundColor: sev.badgeBg,
              borderColor: sev.badgeBorder,
              shadowColor: sev.color,
              shadowOpacity: event.status === 'danger' ? 0.4 : 0.15,
            },
          ]}
        >
          <Text style={[styles.severityLabel, { color: sev.badgeText }]}>
            {sev.label}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// Vista principal: AlertsView (Pantalla de Logs)
// ─────────────────────────────────────────────

export const AlertsView: React.FC = () => {
  const { alertLog, totalAlerts, clearAlertLog, isConnected, theme, alertRanges } = useSensorStore();
  const isDark = theme === 'dark';

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Cálculos de estadísticas del log
  const stats = useMemo(() => {
    const dangerCount = alertLog.filter((e) => e.status === 'danger').length;
    const warningCount = alertLog.filter((e) => e.status === 'warning').length;
    return { dangerCount, warningCount, totalCount: alertLog.length };
  }, [alertLog]);

  // Filtrado de eventos
  const filteredLogs = useMemo(() => {
    if (activeFilter === 'all') return alertLog;
    if (activeFilter === 'danger') return alertLog.filter((e) => e.status === 'danger');
    if (activeFilter === 'warning') return alertLog.filter((e) => e.status === 'warning');
    return alertLog.filter((e) => e.parameter === activeFilter);
  }, [alertLog, activeFilter]);

  const handleConfirmClear = () => {
    Alert.alert(
      'Limpiar registro de logs',
      '¿Desea eliminar todos los eventos de alerta registrados en la sesión actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: clearAlertLog },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* ── SECCIÓN 1: Cabecera con Resumen y Estado en Vivo ── */}
      <View style={styles.topHeader}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.mainHeading, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              Registro de Telemetría y Logs
            </Text>
            {isConnected && (
              <View style={styles.livePulseWrap}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveText}>EN VIVO</Text>
              </View>
            )}
          </View>
          <Text style={[styles.subHeading, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            {stats.totalCount > 0
              ? `${stats.totalCount} incidencias detectadas en la sesión activa`
              : 'Monitoreo de calidad de agua en tiempo real'}
          </Text>
        </View>

        {/* Botón de limpiar registros */}
        {alertLog.length > 0 && (
          <TouchableOpacity
            onPress={handleConfirmClear}
            activeOpacity={0.75}
            style={styles.clearBtn}
          >
            <TrashIcon size={13} color="#F87171" />
            <Text style={styles.clearBtnText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── SECCIÓN 2: Mini Resumen Métrico ── */}
      <View style={styles.summaryBar}>
        <View style={[styles.statChip, { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }]}>
          <Text style={[styles.statChipLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>Total</Text>
          <Text style={[styles.statChipValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {stats.totalCount}
          </Text>
        </View>

        <View style={[styles.statChip, { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }]}>
          <Text style={[styles.statChipLabel, { color: '#F87171' }]}>Críticos</Text>
          <Text style={[styles.statChipValue, { color: '#EF4444' }]}>
            {stats.dangerCount}
          </Text>
        </View>

        <View style={[styles.statChip, { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0' }]}>
          <Text style={[styles.statChipLabel, { color: '#FCD34D' }]}>Alertas</Text>
          <Text style={[styles.statChipValue, { color: '#FBBF24' }]}>
            {stats.warningCount}
          </Text>
        </View>
      </View>

      {/* ── SECCIÓN 3: Barra de Filtros Interactivos ── */}
      {alertLog.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={{ paddingRight: 8 }}
        >
          <TouchableOpacity
            onPress={() => setActiveFilter('all')}
            style={[
              styles.filterPill,
              activeFilter === 'all'
                ? styles.filterPillActive
                : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === 'all' ? '#0EA5E9' : isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              Todos ({stats.totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('danger')}
            style={[
              styles.filterPill,
              activeFilter === 'danger'
                ? { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.35)' }
                : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === 'danger' ? '#EF4444' : isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              Críticos ({stats.dangerCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('warning')}
            style={[
              styles.filterPill,
              activeFilter === 'warning'
                ? { backgroundColor: 'rgba(251,191,36,0.15)', borderColor: 'rgba(251,191,36,0.35)' }
                : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === 'warning' ? '#FBBF24' : isDark ? '#94A3B8' : '#64748B' },
              ]}
            >
              Precaución ({stats.warningCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('pH')}
            style={[
              styles.filterPill,
              activeFilter === 'pH'
                ? styles.filterPillActive
                : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
            ]}
          >
            <Text style={[styles.filterText, { color: activeFilter === 'pH' ? '#0EA5E9' : isDark ? '#94A3B8' : '#64748B' }]}>
              pH
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('Temperatura')}
            style={[
              styles.filterPill,
              activeFilter === 'Temperatura'
                ? styles.filterPillActive
                : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
            ]}
          >
            <Text style={[styles.filterText, { color: activeFilter === 'Temperatura' ? '#0EA5E9' : isDark ? '#94A3B8' : '#64748B' }]}>
              Temperatura
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('Turbidez')}
            style={[
              styles.filterPill,
              activeFilter === 'Turbidez'
                ? styles.filterPillActive
                : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
            ]}
          >
            <Text style={[styles.filterText, { color: activeFilter === 'Turbidez' ? '#0EA5E9' : isDark ? '#94A3B8' : '#64748B' }]}>
              Turbidez
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── SECCIÓN 4: Lista de Registros o Estado Vacío ── */}
      {alertLog.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AuraCard
            colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
            radius={24}
            style={{ marginBottom: 16 }}
          >
            <View style={styles.emptyIconBox}>
              <CheckCircleIcon size={36} color="#10B981" />
            </View>
          </AuraCard>

          <Text style={[styles.emptyTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
            Sistema Operando con Parámetros Óptimos
          </Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            {isConnected
              ? 'Todos los sensores (pH, Temperatura y Turbidez) se encuentran dentro de las normas.'
              : 'Conecte la sonda BLE para registrar eventos de calidad de agua.'}
          </Text>

          <View style={[styles.rangeSummaryCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
            <Text style={[styles.rangeSummaryTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Límites activos en monitoreo:
            </Text>
            <Text style={[styles.rangeSummaryItem, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              • pH: {alertRanges.ph.min} – {alertRanges.ph.max}
            </Text>
            <Text style={[styles.rangeSummaryItem, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              • Temp: {alertRanges.temperature.min}°C – {alertRanges.temperature.max}°C
            </Text>
            <Text style={[styles.rangeSummaryItem, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              • Turbidez: ≤ {alertRanges.turbidity.max} NTU
            </Text>
          </View>
        </View>
      ) : filteredLogs.length === 0 ? (
        <View style={styles.noFilterResults}>
          <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontSize: 13, textAlign: 'center' }}>
            No hay eventos con el filtro seleccionado
          </Text>
        </View>
      ) : (
        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={20}
          style={{ flex: 1, marginBottom: 12 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {filteredLogs.map((event) => (
              <AlertCardItem
                key={event.id}
                event={event}
                isDark={isDark}
                alertRanges={alertRanges}
              />
            ))}

            {/* Pie de lista */}
            <View style={styles.listFooter}>
              <Text style={[styles.footerCountText, { color: isDark ? '#475569' : '#94A3B8' }]}>
                {`Mostrando ${filteredLogs.length} de ${alertLog.length} eventos registrados`}
              </Text>
            </View>
          </ScrollView>
        </AuraCard>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mainHeading: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  livePulseWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  livePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  subHeading: {
    fontSize: 11,
    marginTop: 2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearBtnText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },
  summaryBar: {
    flexDirection: 'row',
    marginBottom: 10,
    marginHorizontal: -3,
  },
  statChip: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statChipValue: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  filterScroll: {
    maxHeight: 38,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: 'rgba(14,165,233,0.15)',
    borderColor: 'rgba(14,165,233,0.35)',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  logItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  paramIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logInfoCenter: {
    flex: 1,
    marginRight: 8,
  },
  paramTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  timeBadge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  deviationDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  logRightColumn: {
    alignItems: 'flex-end',
  },
  logValueText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  logUnitText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  severityPill: {
    marginTop: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  severityLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyIconBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  rangeSummaryCard: {
    padding: 12,
    borderRadius: 14,
    width: '100%',
    maxWidth: 280,
  },
  rangeSummaryTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  rangeSummaryItem: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  noFilterResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  listFooter: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    marginTop: 4,
  },
  footerCountText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
