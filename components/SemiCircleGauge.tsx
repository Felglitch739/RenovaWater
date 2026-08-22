import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  G,
  Line,
} from 'react-native-svg';
import { AuraCard } from './AuraCard';
import type { MetricStatus } from '../store/useSensorStore';

// ─────────────────────────────────────────────────────────────
// SemiCircleGauge — Medidor semicircular (medio aro 180°)
// Estilo neumórfico IoT con iluminación y aguja/halo de neón
// ─────────────────────────────────────────────────────────────

interface SemiCircleGaugeProps {
  title: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  status: MetricStatus;
  idealRange: string;
  icon?: React.ReactNode;
  isDark?: boolean;
  /** Colores del gradiente de la barra activa */
  gradientColors?: [string, string];
  /** Subtítulo o descripción breve */
  subtitle?: string;
  /** Ancho del componente */
  width?: number;
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

export const SemiCircleGauge = React.memo<SemiCircleGaugeProps>(({
  title,
  value,
  unit,
  min,
  max,
  status,
  idealRange,
  icon,
  isDark = true,
  gradientColors,
  subtitle,
  width = 160,
}) => {
  const meta = STATUS_META[status];

  // Cálculo del porcentaje normalizado (0 a 1)
  const clampedVal = Math.min(Math.max(value, min), max);
  const progress = max > min ? (clampedVal - min) / (max - min) : 0.5;

  // Dimensiones del semicírculo SVG
  const strokeWidth = 10;
  const svgWidth = Math.max(width - 24, 120);
  const radius = (svgWidth - strokeWidth * 2) / 2;
  const cx = svgWidth / 2;
  const cy = radius + strokeWidth + 4;
  const svgHeight = cy + 12;

  // Longitud de la circunferencia del semicírculo: L = π * R
  const arcLength = Math.PI * radius;
  // Offset para simular llenado (de izquierda 180° a derecha 0°)
  const strokeDashoffset = arcLength * (1 - progress);

  // Posición del punto indicador (Thumb) en la punta del arco
  // En ángulo polar: theta va de π (izq) a 0 (der)
  const theta = Math.PI - progress * Math.PI;
  const thumbX = cx + radius * Math.cos(theta);
  const thumbY = cy - radius * Math.sin(theta);

  // Path del semicírculo de 180 grados: desde (cx - radius, cy) hasta (cx + radius, cy)
  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  // Colores activos
  const activeStart = gradientColors ? gradientColors[0] : meta.accentColor;
  const activeEnd = gradientColors ? gradientColors[1] : (status === 'ok' ? '#38BDF8' : meta.accentColor);

  return (
    <AuraCard
      accentColor={meta.accentColor}
      colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
      radius={20}
      style={{ marginBottom: 12 }}
    >
      <View style={styles.cardPadding}>
        {/* Header con título y badge de estado */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
            <Text style={[styles.titleText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {title}
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

        {/* Medidor semicircular (Medio Aro) */}
        <View style={styles.gaugeContainer}>
          <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            <Defs>
              <LinearGradient id={`gaugeGrad-${title}`} x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0%" stopColor={activeStart} stopOpacity="0.7" />
                <Stop offset="100%" stopColor={activeEnd} stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {/* Pista de fondo inactiva (Aro oscuro) */}
            <Path
              d={arcPath}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Arco de progreso activo (Glow sutil + Trazo principal) */}
            <Path
              d={arcPath}
              fill="none"
              stroke={meta.accentColor}
              strokeWidth={strokeWidth + 4}
              strokeOpacity="0.2"
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${arcLength}`}
              strokeDashoffset={strokeDashoffset}
            />

            <Path
              d={arcPath}
              fill="none"
              stroke={`url(#gaugeGrad-${title})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${arcLength}`}
              strokeDashoffset={strokeDashoffset}
            />

            {/* Punto indicador (Thumb) con halo brillante en el extremo del arco */}
            <Circle
              cx={thumbX}
              cy={thumbY}
              r={9}
              fill={meta.accentColor}
              opacity={0.25}
            />
            <Circle
              cx={thumbX}
              cy={thumbY}
              r={5}
              fill={meta.accentColor}
            />
            <Circle
              cx={thumbX}
              cy={thumbY}
              r={2}
              fill="#FFFFFF"
            />

            {/* Marcas de referencia (Ticks de inicio y fin) */}
            <Line
              x1={cx - radius}
              y1={cy + 3}
              x2={cx - radius}
              y2={cy + 7}
              stroke={isDark ? '#475569' : '#94A3B8'}
              strokeWidth="1.5"
            />
            <Line
              x1={cx + radius}
              y1={cy + 3}
              x2={cx + radius}
              y2={cy + 7}
              stroke={isDark ? '#475569' : '#94A3B8'}
              strokeWidth="1.5"
            />
          </Svg>

          {/* Valor numérico dentro del medio aro */}
          <View style={[styles.innerValueWrap, { top: cy - 28 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
              <Text
                style={[
                  styles.heroValue,
                  { color: isDark ? '#F8FAFC' : '#0F172A' },
                ]}
              >
                {value}
              </Text>
              {unit ? (
                <Text style={[styles.heroUnit, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  {unit}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Etiquetas mín y máx al pie del arco */}
          <View style={[styles.minMaxRow, { width: svgWidth - 8 }]}>
            <Text style={[styles.limitText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              {min}{unit ? ` ${unit}` : ''}
            </Text>
            <Text style={[styles.limitText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              {max}{unit ? ` ${unit}` : ''}
            </Text>
          </View>
        </View>

        {/* Footer: rango ideal o descripción */}
        <View style={styles.footerRow}>
          <Text style={[styles.idealRangeText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            Rango óptimo: <Text style={{ color: isDark ? '#CBD5E1' : '#475569', fontWeight: '600' }}>{idealRange}</Text>
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitleText, { color: isDark ? '#475569' : '#94A3B8' }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </AuraCard>
  );
});

const styles = StyleSheet.create({
  cardPadding: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 2,
    marginBottom: 4,
  },
  innerValueWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  heroValue: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: -0.5,
  },
  heroUnit: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 3,
  },
  minMaxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -4,
  },
  limitText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
    marginTop: 6,
  },
  idealRangeText: {
    fontSize: 10,
  },
  subtitleText: {
    fontSize: 9,
    fontStyle: 'italic',
  },
});
