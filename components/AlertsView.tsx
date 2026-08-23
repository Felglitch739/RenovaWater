import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { useSensorStore, type AlertEvent, type MetricStatus } from '../store/useSensorStore';
import {
  TrashIcon,
  ActivityIcon,
  DropletIcon,
  ThermometerIcon,
  WavesIcon,
  ZapIcon,
  CheckCircleIcon,
} from './Icons';
import { AuraCard } from './AuraCard';

// ─────────────────────────────────────────────
// Configuración de estilos por severidad y por parámetro
// ─────────────────────────────────────────────

type FilterType = 'all' | 'danger' | 'warning' | 'pH' | 'Temperatura' | 'Conductividad' | 'Turbidez';

const SEVERITY_CONFIG: Record<
  Exclude<MetricStatus, 'ok'>,
  {
    color: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    label: string;
  }
> = {
  warning: {
    color: '#FBBF24',
    badgeBg: 'rgba(251,191,36,0.12)',
    badgeText: '#FCD34D',
    badgeBorder: 'rgba(251,191,36,0.25)',
    label: 'PRECAUCIÓN',
  },
  danger: {
    color: '#EF4444',
    badgeBg: 'rgba(239,68,68,0.12)',
    badgeText: '#F87171',
    badgeBorder: 'rgba(239,68,68,0.25)',
    label: 'CRÍTICO',
  },
};

/**
 * Estilos y paleta adaptativa de alto contraste por parámetro para Modo Oscuro y Modo Claro:
 * - pH: Azul (Oscuro: #38BDF8 / Claro: #0284C7)
 * - Temperatura: Rojo (Oscuro: #F87171 / Claro: #DC2626)
 * - Conductividad: Amarillo/Ámbar (Oscuro: #FACC15 / Claro: #D97706)
 * - Turbidez: Verde (Oscuro: #34D399 / Claro: #059669)
 */
function getParameterStyle(param: string, isDark: boolean) {
  switch (param) {
    case 'pH':
      return {
        color: isDark ? '#38BDF8' : '#0284C7',
        iconBg: isDark ? 'rgba(14, 165, 233, 0.20)' : '#E0F2FE',
        iconBorder: isDark ? 'rgba(14, 165, 233, 0.45)' : '#7DD3FC',
        tagBg: isDark ? 'rgba(14, 165, 233, 0.14)' : '#F0F9FF',
        tagBorder: isDark ? 'rgba(14, 165, 233, 0.30)' : '#BAE6FD',
        tagText: isDark ? '#38BDF8' : '#0369A1',
        renderIcon: (c: string) => <DropletIcon size={16} color={c} />,
      };
    case 'Temperatura':
      return {
        color: isDark ? '#F87171' : '#DC2626',
        iconBg: isDark ? 'rgba(239, 68, 68, 0.20)' : '#FEE2E2',
        iconBorder: isDark ? 'rgba(239, 68, 68, 0.45)' : '#FCA5A5',
        tagBg: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEF2F2',
        tagBorder: isDark ? 'rgba(239, 68, 68, 0.30)' : '#FECACA',
        tagText: isDark ? '#F87171' : '#991B1B',
        renderIcon: (c: string) => <ThermometerIcon size={16} color={c} />,
      };
    case 'Conductividad':
      return {
        color: isDark ? '#FACC15' : '#D97706',
        iconBg: isDark ? 'rgba(234, 179, 8, 0.22)' : '#FEF3C7',
        iconBorder: isDark ? 'rgba(234, 179, 8, 0.50)' : '#FDE68A',
        tagBg: isDark ? 'rgba(234, 179, 8, 0.14)' : '#FFFBEB',
        tagBorder: isDark ? 'rgba(234, 179, 8, 0.30)' : '#FDE68A',
        tagText: isDark ? '#FACC15' : '#92400E',
        renderIcon: (c: string) => <ZapIcon size={16} color={c} />,
      };
    case 'Turbidez':
      return {
        color: isDark ? '#34D399' : '#059669',
        iconBg: isDark ? 'rgba(16, 185, 129, 0.20)' : '#D1FAE5',
        iconBorder: isDark ? 'rgba(16, 185, 129, 0.45)' : '#6EE7B7',
        tagBg: isDark ? 'rgba(16, 185, 129, 0.14)' : '#ECFDF5',
        tagBorder: isDark ? 'rgba(16, 185, 129, 0.30)' : '#A7F3D0',
        tagText: isDark ? '#34D399' : '#065F46',
        renderIcon: (c: string) => <WavesIcon size={16} color={c} />,
      };
    default:
      return {
        color: isDark ? '#38BDF8' : '#0284C7',
        iconBg: isDark ? 'rgba(14, 165, 233, 0.20)' : '#E0F2FE',
        iconBorder: isDark ? 'rgba(14, 165, 233, 0.45)' : '#7DD3FC',
        tagBg: isDark ? 'rgba(14, 165, 233, 0.14)' : '#F0F9FF',
        tagBorder: isDark ? 'rgba(14, 165, 233, 0.30)' : '#BAE6FD',
        tagText: isDark ? '#38BDF8' : '#0369A1',
        renderIcon: (c: string) => <ActivityIcon size={16} color={c} />,
      };
  }
}

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
  const paramStyle = getParameterStyle(event.parameter, isDark);

  let deviationText = 'Fuera del rango óptimo';

  if (event.parameter === 'pH') {
    if (event.value < alertRanges.ph.min) {
      deviationText = `Bajo mínimo (${alertRanges.ph.min} pH)`;
    } else if (event.value > alertRanges.ph.max) {
      deviationText = `Sobre máximo (${alertRanges.ph.max} pH)`;
    }
  } else if (event.parameter === 'Temperatura') {
    if (event.value < alertRanges.temperature.min) {
      deviationText = `Bajo mínimo (${alertRanges.temperature.min}°C)`;
    } else if (event.value > alertRanges.temperature.max) {
      deviationText = `Sobre máximo (${alertRanges.temperature.max}°C)`;
    }
  } else if (event.parameter === 'Turbidez') {
    deviationText = `Sobre límite (${alertRanges.turbidity.max} NTU)`;
  } else if (event.parameter === 'Conductividad') {
    if (alertRanges.conductivity && event.value < alertRanges.conductivity.min) {
      deviationText = `Bajo mínimo (${alertRanges.conductivity.min} µS/cm)`;
    } else if (alertRanges.conductivity && event.value > alertRanges.conductivity.max) {
      deviationText = `Sobre máximo (${alertRanges.conductivity.max} µS/cm)`;
    } else {
      deviationText = 'Fuera del rango estándar potable';
    }
  }

  return (
    <View style={[styles.logItemContainer, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
      {/* Icono del parámetro con caja de alto contraste adaptativa */}
      <View
        style={[
          styles.paramIconBox,
          {
            backgroundColor: paramStyle.iconBg,
            borderColor: paramStyle.iconBorder,
          },
        ]}
      >
        {paramStyle.renderIcon(paramStyle.color)}
      </View>

      {/* Info central */}
      <View style={styles.logInfoCenter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <Text style={[styles.paramTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
            {event.parameter}
          </Text>

          {/* Micro Tag para acentuar el parámetro con alto contraste */}
          <View
            style={[
              styles.paramBadgePill,
              {
                backgroundColor: paramStyle.tagBg,
                borderColor: paramStyle.tagBorder,
              },
            ]}
          >
            <Text style={[styles.paramBadgeText, { color: paramStyle.tagText }]}>
              {event.parameter.toUpperCase()}
            </Text>
          </View>

          <View style={[styles.timeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.timeText, { color: isDark ? '#94A3B8' : '#475569' }]}>
              {event.time}
            </Text>
          </View>
        </View>

        <Text style={[styles.deviationDesc, { color: isDark ? '#64748B' : '#475569' }]}>
          {deviationText}
        </Text>
      </View>

      {/* Valor registrado y badge */}
      <View style={styles.logRightColumn}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={[styles.logValueText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {event.value}
          </Text>
          {event.unit ? (
            <Text style={[styles.logUnitText, { color: isDark ? '#94A3B8' : '#475569' }]}>
              {event.unit}
            </Text>
          ) : null}
        </View>

        <View
          style={[
            styles.severityPill,
            {
              backgroundColor: isDark ? sev.badgeBg : (event.status === 'danger' ? '#FEE2E2' : '#FEF3C7'),
              borderColor: isDark ? sev.badgeBorder : (event.status === 'danger' ? '#FCA5A5' : '#FDE68A'),
            },
          ]}
        >
          <Text style={[styles.severityLabel, { color: isDark ? sev.badgeText : (event.status === 'danger' ? '#DC2626' : '#D97706') }]}>
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
  const { alertLog, clearAlertLog, isConnected, theme, alertRanges, visibleMeters } = useSensorStore(
    useShallow((state) => ({
      alertLog: state.alertLog,
      clearAlertLog: state.clearAlertLog,
      isConnected: state.isConnected,
      theme: state.theme,
      alertRanges: state.alertRanges,
      visibleMeters: state.visibleMeters,
    }))
  );
  const isDark = theme === 'dark';

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Reset filter if the currently active parameter-filter was disabled in Settings
  useEffect(() => {
    const paramMap: Record<string, boolean> = {
      pH: visibleMeters.ph,
      Temperatura: visibleMeters.temperature,
      Conductividad: visibleMeters.conductivity,
      Turbidez: visibleMeters.turbidity,
    };
    if (activeFilter in paramMap && !paramMap[activeFilter]) {
      setActiveFilter('all');
    }
  }, [visibleMeters, activeFilter]);

  // Filtrar logs únicamente de los medidores que el usuario TIENE ACTIVOS en Ajustes
  const activeAlertLog = useMemo(() => {
    return alertLog.filter((event) => {
      if (event.parameter === 'pH') return visibleMeters.ph;
      if (event.parameter === 'Temperatura') return visibleMeters.temperature;
      if (event.parameter === 'Conductividad') return visibleMeters.conductivity;
      if (event.parameter === 'Turbidez') return visibleMeters.turbidity;
      return true;
    });
  }, [alertLog, visibleMeters]);

  const stats = useMemo(() => {
    const dangerCount = activeAlertLog.filter((e) => e.status === 'danger').length;
    const warningCount = activeAlertLog.filter((e) => e.status === 'warning').length;
    return { dangerCount, warningCount, totalCount: activeAlertLog.length };
  }, [activeAlertLog]);

  const filteredLogs = useMemo(() => {
    if (activeFilter === 'all') return activeAlertLog;
    if (activeFilter === 'danger') return activeAlertLog.filter((e) => e.status === 'danger');
    if (activeFilter === 'warning') return activeAlertLog.filter((e) => e.status === 'warning');
    return activeAlertLog.filter((e) => e.parameter === activeFilter);
  }, [activeAlertLog, activeFilter]);

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
      {/* ── Cabecera limpia ── */}
      <View style={styles.topHeader}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.mainHeading, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              Registro de Alertas y Logs
            </Text>
            {isConnected && (
              <View style={styles.livePulseWrap}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveText}>EN VIVO</Text>
              </View>
            )}
          </View>
          <Text style={[styles.subHeading, { color: isDark ? '#64748B' : '#64748B' }]}>
            {stats.totalCount > 0
              ? `${stats.totalCount} incidencias activas`
              : 'Sin anomalías registradas'}
          </Text>
        </View>

        {activeAlertLog.length > 0 && (
          <TouchableOpacity
            onPress={handleConfirmClear}
            activeOpacity={0.75}
            style={styles.clearBtn}
          >
            <TrashIcon size={12} color="#F87171" />
            <Text style={styles.clearBtnText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Mini Resumen Métrico ── */}
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
          <Text style={[styles.statChipLabel, { color: isDark ? '#FCD34D' : '#D97706' }]}>Alertas</Text>
          <Text style={[styles.statChipValue, { color: isDark ? '#FBBF24' : '#D97706' }]}>
            {stats.warningCount}
          </Text>
        </View>
      </View>

      {/* ── Barra de Filtros en Scroll Horizontal Nativo ── */}
      {activeAlertLog.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={{ paddingRight: 12, alignItems: 'center' }}
        >
          <TouchableOpacity
            onPress={() => setActiveFilter('all')}
            style={[
              styles.filterPill,
              activeFilter === 'all'
                ? styles.filterPillActive
                : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1' },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === 'all' ? (isDark ? '#38BDF8' : '#0284C7') : isDark ? '#94A3B8' : '#475569' },
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
                ? { backgroundColor: isDark ? 'rgba(239,68,68,0.20)' : '#FEE2E2', borderColor: isDark ? 'rgba(239,68,68,0.45)' : '#FCA5A5' }
                : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1' },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === 'danger' ? (isDark ? '#F87171' : '#DC2626') : isDark ? '#94A3B8' : '#475569' },
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
                ? { backgroundColor: isDark ? 'rgba(251,191,36,0.20)' : '#FEF3C7', borderColor: isDark ? 'rgba(251,191,36,0.45)' : '#FDE68A' }
                : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1' },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === 'warning' ? (isDark ? '#FBBF24' : '#D97706') : isDark ? '#94A3B8' : '#475569' },
              ]}
            >
              Precaución ({stats.warningCount})
            </Text>
          </TouchableOpacity>

          {/* Solo mostrar filtros de parámetros activos en Ajustes */}
          {visibleMeters.ph && (
            <TouchableOpacity
              onPress={() => setActiveFilter('pH')}
              style={[
                styles.filterPill,
                activeFilter === 'pH'
                  ? { backgroundColor: isDark ? 'rgba(14,165,233,0.20)' : '#E0F2FE', borderColor: isDark ? 'rgba(14,165,233,0.45)' : '#7DD3FC' }
                  : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1' },
              ]}
            >
              <Text style={[styles.filterText, { color: activeFilter === 'pH' ? (isDark ? '#38BDF8' : '#0284C7') : isDark ? '#94A3B8' : '#475569' }]}>
                pH
              </Text>
            </TouchableOpacity>
          )}

          {visibleMeters.temperature && (
            <TouchableOpacity
              onPress={() => setActiveFilter('Temperatura')}
              style={[
                styles.filterPill,
                activeFilter === 'Temperatura'
                  ? { backgroundColor: isDark ? 'rgba(239,68,68,0.20)' : '#FEE2E2', borderColor: isDark ? 'rgba(239,68,68,0.45)' : '#FCA5A5' }
                  : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1' },
              ]}
            >
              <Text style={[styles.filterText, { color: activeFilter === 'Temperatura' ? (isDark ? '#F87171' : '#DC2626') : isDark ? '#94A3B8' : '#475569' }]}>
                Temperatura
              </Text>
            </TouchableOpacity>
          )}

          {visibleMeters.conductivity && (
            <TouchableOpacity
              onPress={() => setActiveFilter('Conductividad')}
              style={[
                styles.filterPill,
                activeFilter === 'Conductividad'
                  ? { backgroundColor: isDark ? 'rgba(234,179,8,0.22)' : '#FEF3C7', borderColor: isDark ? 'rgba(234,179,8,0.50)' : '#FDE68A' }
                  : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1' },
              ]}
            >
              <Text style={[styles.filterText, { color: activeFilter === 'Conductividad' ? (isDark ? '#FACC15' : '#D97706') : isDark ? '#94A3B8' : '#475569' }]}>
                Conductividad
              </Text>
            </TouchableOpacity>
          )}

          {visibleMeters.turbidity && (
            <TouchableOpacity
              onPress={() => setActiveFilter('Turbidez')}
              style={[
                styles.filterPill,
                activeFilter === 'Turbidez'
                  ? { backgroundColor: isDark ? 'rgba(16,185,129,0.20)' : '#D1FAE5', borderColor: isDark ? 'rgba(16,185,129,0.45)' : '#6EE7B7' }
                  : { backgroundColor: isDark ? '#1C222B' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1' },
              ]}
            >
              <Text style={[styles.filterText, { color: activeFilter === 'Turbidez' ? (isDark ? '#34D399' : '#059669') : isDark ? '#94A3B8' : '#475569' }]}>
                Turbidez
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ── Lista de Registros o Estado Vacío ── */}
      {filteredLogs.length === 0 ? (
        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={20}
          style={{ flex: 1, marginBottom: 16 }}
        >
          <View style={styles.emptyContainer}>
            <View style={[
              styles.emptyIconCircle,
              { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#D1FAE5' },
            ]}>
              <CheckCircleIcon size={36} color="#10B981" />
            </View>

            <Text style={[styles.emptyTitle, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              Sistema Operando en Rango Óptimo
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#64748B' : '#64748B' }]}>
              {isConnected
                ? activeAlertLog.length === 0
                  ? 'Todas las lecturas activas cumplen con los umbrales configurados.'
                  : 'No se encontraron registros con el filtro seleccionado.'
                : 'Inicie la telemetría para comenzar el registro de incidencias.'}
            </Text>
          </View>
        </AuraCard>
      ) : (
        <AuraCard
          colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
          radius={20}
          style={{ flex: 1, marginBottom: 16 }}
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

            <View style={styles.listFooter}>
              <Text style={[styles.footerCountText, { color: isDark ? '#475569' : '#94A3B8' }]}>
                {`Mostrando ${filteredLogs.length} de ${activeAlertLog.length} eventos activos`}
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
    marginBottom: 10,
  },
  mainHeading: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  livePulseWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
  },
  livePulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.4,
  },
  subHeading: {
    fontSize: 11,
    marginTop: 2,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    color: '#F87171',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  summaryBar: {
    flexDirection: 'row',
    marginBottom: 8,
    marginHorizontal: -2,
  },
  statChip: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statChipLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statChipValue: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  filterScroll: {
    maxHeight: 34,
    marginBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderColor: 'rgba(14,165,233,0.3)',
  },
  filterText: {
    fontSize: 10,
    fontWeight: '700',
  },
  logItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  paramIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logInfoCenter: {
    flex: 1,
    marginRight: 6,
  },
  paramTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  paramBadgePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 4,
  },
  paramBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  deviationDesc: {
    fontSize: 10,
    marginTop: 1,
  },
  logRightColumn: {
    alignItems: 'flex-end',
  },
  logValueText: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  logUnitText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  severityPill: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  severityLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 260,
  },
  listFooter: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    marginTop: 2,
  },
  footerCountText: {
    fontSize: 9,
    fontFamily: 'monospace',
  },
});
