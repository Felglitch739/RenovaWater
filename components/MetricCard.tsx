import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { MetricStatus } from '../store/useSensorStore';

// ─────────────────────────────────────────────
// MetricCard Premium (componente autónomo)
// Usa AuraCard internamente vía LinearGradient
// ─────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  status: MetricStatus;
  idealRange: string;
}

const STATUS_META = {
  ok: {
    accentColor: '#0EA5E9',
    badgeBg: 'rgba(14,165,233,0.15)',
    badgeText: '#38BDF8',
    badgeBorder: 'rgba(14,165,233,0.3)',
    label: 'NORMAL',
  },
  warning: {
    accentColor: '#FBBF24',
    badgeBg: 'rgba(251,191,36,0.15)',
    badgeText: '#FCD34D',
    badgeBorder: 'rgba(251,191,36,0.3)',
    label: 'ALERTA',
  },
  danger: {
    accentColor: '#EF4444',
    badgeBg: 'rgba(239,68,68,0.15)',
    badgeText: '#F87171',
    badgeBorder: 'rgba(239,68,68,0.3)',
    label: 'CRÍTICO',
  },
} as const;

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  status,
  idealRange,
}) => {
  const meta = STATUS_META[status];

  return (
    <View style={styles.shadowWrap}>
      <LinearGradient
        colors={['#1C222B', '#14181F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Borde inferior oscuro */}
        <View style={[StyleSheet.absoluteFillObject, styles.bottomBorder]} pointerEvents="none" />

        {/* Barra de acento (status) */}
        <View style={[styles.accentBar, {
          backgroundColor: meta.accentColor,
          shadowColor: meta.accentColor,
        }]} pointerEvents="none" />

        {/* Contenido */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.titleLabel}>{title}</Text>
            <View style={[styles.badge, { backgroundColor: meta.badgeBg, borderColor: meta.badgeBorder,
              shadowColor: status !== 'ok' ? meta.accentColor : 'transparent',
              shadowOpacity: status !== 'ok' ? 0.4 : 0, }]}>
              <Text style={[styles.badgeText, { color: meta.badgeText }]}>{meta.label}</Text>
            </View>
          </View>

          {/* Valor hero */}
          <View style={styles.valueRow}>
            <Text style={styles.valueText}>{value}</Text>
            {unit ? <Text style={styles.unitText}>{unit}</Text> : null}
          </View>

          {/* Rango de referencia */}
          <Text style={styles.rangeText}>Rango ref: {idealRange}</Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  gradient: {
    borderRadius: 20,
    overflow: 'hidden',
    borderTopWidth: 1.5,
    borderLeftWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.10)',
    borderLeftColor: 'rgba(255,255,255,0.06)',
  },
  bottomBorder: {
    borderRadius: 20,
    borderBottomWidth: 2,
    borderRightWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.55)',
    borderRightColor: 'rgba(0,0,0,0.30)',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 3.5,
    borderRadius: 2,
    shadowOpacity: 0.7,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  valueText: {
    color: '#F1F5F9',
    fontSize: 38,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    lineHeight: 42,
  },
  unitText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
    marginBottom: 4,
  },
  rangeText: {
    color: '#374151',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
