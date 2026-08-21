import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  Line,
  G,
} from 'react-native-svg';
import { AuraCard } from './AuraCard';
import { WavesIcon } from './Icons';
import type { MetricStatus } from '../store/useSensorStore';

// ─────────────────────────────────────────────────────────────
// TurbidityMeterCard — Medidor de Claridad Óptica y Turbidez
// Estilo espectral segmentado con indicador de aguja neón
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
    badgeBg: 'rgba(14,165,233,0.15)',
    badgeText: '#38BDF8',
    badgeBorder: 'rgba(14,165,233,0.3)',
    label: 'NORMAL',
    clarityLabel: 'Agua Cristalina · Potable',
  },
  warning: {
    accentColor: '#FBBF24',
    badgeBg: 'rgba(251,191,36,0.15)',
    badgeText: '#FCD34D',
    badgeBorder: 'rgba(251,191,36,0.3)',
    label: 'PRECAUCIÓN',
    clarityLabel: 'Ligera Turbidez · Filtrar',
  },
  danger: {
    accentColor: '#EF4444',
    badgeBg: 'rgba(239,68,68,0.15)',
    badgeText: '#F87171',
    badgeBorder: 'rgba(239,68,68,0.3)',
    label: 'NO APTA',
    clarityLabel: 'Alta Dispersión Óptica · No Apta',
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
  const progress = clampedVal / MAX_SCALE;

  const barHeight = 12;

  return (
    <AuraCard
      accentColor={meta.accentColor}
      colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
      radius={20}
      style={{ marginBottom: 12 }}
    >
      <View style={styles.cardPadding}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={{ marginRight: 6 }}>
              <WavesIcon size={16} color={meta.accentColor} />
            </View>
            <Text style={[styles.titleText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Índice de Turbidez (NTU)
            </Text>
          </View>

          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: meta.badgeBg,
                borderColor: meta.badgeBorder,
                shadowColor: status !== 'ok' ? meta.accentColor : 'transparent',
                shadowOpacity: status !== 'ok' ? 0.5 : 0,
              },
            ]}
          >
            <Text style={[styles.badgeLabel, { color: meta.badgeText }]}>
              {meta.label}
            </Text>
          </View>
        </View>

        {/* Fila del Valor Hero + Estado de Claridad */}
        <View style={styles.valueRow}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[styles.heroValue, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {value}
            </Text>
            <Text style={[styles.heroUnit, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              NTU
            </Text>
          </View>

          {/* Calificación de pureza */}
          <View style={styles.clarityBadge}>
            <Text style={[styles.clarityText, { color: meta.badgeText }]}>
              {meta.clarityLabel}
            </Text>
          </View>
        </View>

        {/* Medidor de Espectro Óptico / Segmentos de Claridad */}
        <View style={styles.meterContainer}>
          <View style={styles.trackContainer}>
            {/* Barra de espectro de 4 zonas con gradiente */}
            <View style={styles.spectrumBar}>
              {/* Zona 1: Cristalina (0-5 NTU) */}
              <View style={[styles.zone, { flex: 5, backgroundColor: '#0EA5E9', borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
              {/* Zona 2: Aceptable (5-15 NTU) */}
              <View style={[styles.zone, { flex: 10, backgroundColor: '#38BDF8' }]} />
              {/* Zona 3: Advertencia (15-30 NTU) */}
              <View style={[styles.zone, { flex: 15, backgroundColor: '#FBBF24' }]} />
              {/* Zona 4: Crítica (>30 NTU) */}
              <View style={[styles.zone, { flex: 15, backgroundColor: '#EF4444', borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
            </View>

            {/* Marcador del Umbral Límite (Línea punteada a 5 NTU) */}
            <View
              style={[
                styles.thresholdMarker,
                { left: `${(maxThreshold / MAX_SCALE) * 100}%` },
              ]}
            >
              <View style={styles.thresholdPin} />
            </View>

            {/* Puntero/Thumb neón de la lectura actual */}
            <View
              style={[
                styles.activeThumb,
                {
                  left: `${Math.min(Math.max(progress * 100, 2), 98)}%`,
                  borderColor: meta.accentColor,
                  shadowColor: meta.accentColor,
                },
              ]}
            >
              <View style={[styles.thumbCenter, { backgroundColor: meta.accentColor }]} />
            </View>
          </View>

          {/* Marcas de escala */}
          <View style={styles.scaleLabels}>
            <Text style={[styles.scaleText, { color: isDark ? '#64748B' : '#94A3B8' }]}>0 NTU</Text>
            <Text style={[styles.scaleText, { color: '#0EA5E9', fontWeight: '700' }]}>
              Límite: {maxThreshold} NTU
            </Text>
            <Text style={[styles.scaleText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              45+ NTU
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={[styles.standardText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            Norma OMS / NOM-127: <Text style={{ color: isDark ? '#CBD5E1' : '#475569', fontWeight: '600' }}>≤ {maxThreshold} NTU</Text>
          </Text>
          <Text style={[styles.sensorTypeText, { color: isDark ? '#475569' : '#94A3B8' }]}>
            Sensor óptico IR 850nm
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
  },
  titleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  heroValue: {
    fontSize: 34,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    lineHeight: 38,
  },
  heroUnit: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
    marginBottom: 4,
  },
  clarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 4,
  },
  clarityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  meterContainer: {
    marginTop: 2,
    marginBottom: 4,
  },
  trackContainer: {
    height: 24,
    justifyContent: 'center',
    position: 'relative',
  },
  spectrumBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    opacity: 0.85,
  },
  zone: {
    height: '100%',
  },
  thresholdMarker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -1,
  },
  thresholdPin: {
    width: 2,
    height: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    opacity: 0.9,
  },
  activeThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0F172A',
    borderWidth: 2,
    marginLeft: -9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  thumbCenter: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
    marginTop: 10,
  },
  standardText: {
    fontSize: 10,
  },
  sensorTypeText: {
    fontSize: 9,
  },
});
