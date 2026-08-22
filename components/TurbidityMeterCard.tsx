import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuraCard } from './AuraCard';
import { WavesIcon } from './Icons';
import type { MetricStatus } from '../store/useSensorStore';

// ─────────────────────────────────────────────────────────────
// TurbidityMeterCard — Medidor de Turbidez Limpio y Sobrio
// Barra de progreso de un solo color (acento #0EA5E9) con marcadores sutiles
// ─────────────────────────────────────────────────────────────

interface TurbidityMeterCardProps {
  value: number;
  maxThreshold: number;
  status: MetricStatus;
  isDark?: boolean;
}

const STATUS_META = {
  ok: {
    accentColor: '#0EA5E9',
    badgeBg: 'rgba(14,165,233,0.12)',
    badgeText: '#38BDF8',
    badgeBorder: 'rgba(14,165,233,0.25)',
    label: 'NORMAL',
    clarityLabel: 'Agua Cristalina · Potable',
  },
  warning: {
    accentColor: '#FBBF24',
    badgeBg: 'rgba(251,191,36,0.15)',
    badgeText: '#FCD34D',
    badgeBorder: 'rgba(251,191,36,0.3)',
    label: 'PRECAUCIÓN',
    clarityLabel: 'Ligera Turbidez',
  },
  danger: {
    accentColor: '#EF4444',
    badgeBg: 'rgba(239,68,68,0.15)',
    badgeText: '#F87171',
    badgeBorder: 'rgba(239,68,68,0.3)',
    label: 'NO APTA',
    clarityLabel: 'Alta Turbidez · No Apta',
  },
} as const;

export const TurbidityMeterCard: React.FC<TurbidityMeterCardProps> = ({
  value,
  maxThreshold,
  status,
  isDark = true,
}) => {
  const meta = STATUS_META[status];

  // Escala de 0 a 45 NTU
  const MAX_SCALE = 45;
  const clampedVal = Math.min(Math.max(value, 0), MAX_SCALE);
  const progressPercent = Math.min(Math.max((clampedVal / MAX_SCALE) * 100, 2), 100);
  const thresholdPercent = Math.min(Math.max((maxThreshold / MAX_SCALE) * 100, 0), 100);

  return (
    <AuraCard
      accentColor={status !== 'ok' ? meta.accentColor : undefined}
      colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
      radius={20}
      style={{ marginBottom: 12 }}
    >
      <View style={styles.cardPadding}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <WavesIcon size={16} color="#0EA5E9" />
            <Text style={[styles.titleText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Turbidez (NTU)
            </Text>
          </View>

          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: meta.badgeBg,
                borderColor: meta.badgeBorder,
              },
            ]}
          >
            <Text style={[styles.badgeLabel, { color: meta.badgeText }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        {/* Fila de Valor + Estado */}
        <View style={styles.valueRow}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[styles.heroValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {value}
            </Text>
            <Text style={[styles.heroUnit, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              NTU
            </Text>
          </View>

          <Text style={[styles.clarityText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            {meta.clarityLabel}
          </Text>
        </View>

        {/* Barra de progreso sobria de UN SOLO COLOR (Acento #0EA5E9) */}
        <View style={styles.meterContainer}>
          <View style={[styles.trackBackground, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
            {/* Barra de llenado sobria monocromática */}
            <View
              style={[
                styles.fillBar,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: meta.accentColor,
                },
              ]}
            />

            {/* Marcador sutil de límite recomendado */}
            <View
              style={[
                styles.thresholdLine,
                { left: `${thresholdPercent}%` },
              ]}
            />
          </View>

          {/* Marcas de escala */}
          <View style={styles.scaleLabels}>
            <Text style={[styles.scaleText, { color: isDark ? '#64748B' : '#94A3B8' }]}>0</Text>
            <Text style={[styles.scaleText, { color: '#0EA5E9', fontWeight: '600' }]}>
              Límite: {maxThreshold} NTU
            </Text>
            <Text style={[styles.scaleText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              45 NTU
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={[styles.standardText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            Límite óptimo potable: <Text style={{ color: isDark ? '#CBD5E1' : '#475569', fontWeight: '600' }}>≤ {maxThreshold} NTU</Text>
          </Text>
        </View>
      </View>
    </AuraCard>
  );
};

const styles = StyleSheet.create({
  cardPadding: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  heroValue: {
    fontSize: 30,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    lineHeight: 34,
  },
  heroUnit: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  clarityText: {
    fontSize: 10,
    fontWeight: '500',
  },
  meterContainer: {
    marginVertical: 4,
  },
  trackBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  fillBar: {
    height: '100%',
    borderRadius: 4,
  },
  thresholdLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
    marginLeft: -1,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleText: {
    fontSize: 9,
    fontFamily: 'monospace',
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
    marginTop: 8,
  },
  standardText: {
    fontSize: 10,
  },
});
