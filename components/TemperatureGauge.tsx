import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
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
import { ThermometerIcon } from './Icons';

// ─────────────────────────────────────────────────────────────
// TemperatureGauge — Radial/Arc Gauge (Círculo incompleto 240°)
// Estilo Dark / Neon Dashboard con resplandor LED Cyan & Ámbar
// ─────────────────────────────────────────────────────────────

export interface TemperatureGaugeProps {
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  title?: string;
  subtitle?: string;
  idealRange?: string;
  status?: 'ok' | 'warning' | 'danger';
  width?: number;
  isDark?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const TemperatureGauge: React.FC<TemperatureGaugeProps> = ({
  value = 24.5,
  min = 0,
  max = 50,
  unit = '°C',
  title = 'TEMPERATURA',
  subtitle = 'Sonda térmica NTC 10k',
  idealRange = '18.0°C – 28.0°C',
  status = 'ok',
  width = 160,
  isDark = true,
  style,
}) => {
  // Normalizar progreso (0 a 1)
  const clampedVal = Math.min(Math.max(value, min), max);
  const progress = max > min ? (clampedVal - min) / (max - min) : 0.5;

  // Parámetros de geometría del arco de 240 grados (apertura inferior de 120°)
  const strokeWidth = 10;
  const svgSize = Math.max(width - 20, 130);
  const radius = (svgSize - strokeWidth * 2 - 8) / 2;
  const cx = svgSize / 2;
  const cy = svgSize / 2 - 2;

  // Ángulo total del arco: 240° = (4/3) * PI rad
  const totalAngleRad = (240 * Math.PI) / 180;
  const startAngleRad = (150 * Math.PI) / 180;
  const endAngleRad = (390 * Math.PI) / 180;

  // Longitud total del arco de 240°
  const arcLength = radius * totalAngleRad;
  const strokeDashoffset = arcLength * (1 - progress);

  // Coordenadas de inicio y fin del arco completo
  const startX = cx + radius * Math.cos(startAngleRad);
  const startY = cy + radius * Math.sin(startAngleRad);
  const endX = cx + radius * Math.cos(endAngleRad);
  const endY = cy + radius * Math.sin(endAngleRad);

  // Path SVG para un arco de 240°
  const fullArcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`;

  // Posición del punto indicador (Thumb) en el valor actual
  const currentAngleRad = startAngleRad + progress * totalAngleRad;
  const thumbX = cx + radius * Math.cos(currentAngleRad);
  const thumbY = cy + radius * Math.sin(currentAngleRad);

  // Color de acento según estado
  const accentColor =
    status === 'danger' ? '#EF4444' : status === 'warning' ? '#FBBF24' : '#00E5FF';
  const glowColor =
    status === 'danger' ? '#F87171' : status === 'warning' ? '#FCD34D' : '#38BDF8';

  const statusLabel =
    status === 'danger' ? 'CRÍTICO' : status === 'warning' ? 'ALERTA' : 'ESTABLE';
  const statusBg =
    status === 'danger'
      ? 'rgba(239,68,68,0.18)'
      : status === 'warning'
      ? 'rgba(251,191,36,0.18)'
      : 'rgba(0,229,255,0.14)';
  const statusBorder =
    status === 'danger'
      ? 'rgba(239,68,68,0.4)'
      : status === 'warning'
      ? 'rgba(251,191,36,0.4)'
      : 'rgba(0,229,255,0.35)';

  return (
    <AuraCard
      accentColor={accentColor}
      colors={isDark ? ['#1E293B', '#111827'] : ['#FFFFFF', '#F8FAFC']}
      radius={22}
      style={[{ marginBottom: 12, flex: 1 }, style]}
    >
      <View style={styles.cardContent}>
        {/* Cabecera: Etiqueta descriptiva + Badge de Estado */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.iconBox}>
              <ThermometerIcon size={14} color={accentColor} />
            </View>
            <Text style={[styles.titleLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {title}
            </Text>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: statusBg,
                borderColor: statusBorder,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: glowColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Medidor Radial con Arco Incompleto 240° */}
        <View style={styles.gaugeCenterWrap}>
          <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <Defs>
              <LinearGradient id="tempNeonGrad" x1="0" y1="1" x2="1" y2="0">
                <Stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
                <Stop offset="70%" stopColor="#38BDF8" stopOpacity="1" />
                <Stop offset="100%" stopColor={accentColor} stopOpacity="1" />
              </LinearGradient>
            </Defs>

            <Path
              d={fullArcPath}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            <Path
              d={fullArcPath}
              fill="none"
              stroke={accentColor}
              strokeWidth={strokeWidth + 5}
              strokeOpacity="0.22"
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${arcLength}`}
              strokeDashoffset={strokeDashoffset}
            />

            <Path
              d={fullArcPath}
              fill="none"
              stroke="url(#tempNeonGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${arcLength}`}
              strokeDashoffset={strokeDashoffset}
            />

            <Circle
              cx={thumbX}
              cy={thumbY}
              r={10}
              fill={accentColor}
              opacity={0.25}
            />
            <Circle
              cx={thumbX}
              cy={thumbY}
              r={5.5}
              fill={accentColor}
            />
            <Circle
              cx={thumbX}
              cy={thumbY}
              r={2}
              fill="#FFFFFF"
            />
          </Svg>

          <View style={styles.centerValueWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
              <Text
                style={[
                  styles.heroValue,
                  {
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    textShadowColor: isDark ? 'rgba(0,229,255,0.45)' : 'transparent',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  },
                ]}
              >
                {value}
              </Text>
              <Text style={[styles.heroUnit, { color: accentColor }]}>{unit}</Text>
            </View>
            <Text style={[styles.centerHint, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              {status === 'ok' ? 'Calibrado' : 'Fuera de rango'}
            </Text>
          </View>

          <View style={[styles.scaleRow, { width: svgSize - 20 }]}>
            <Text style={[styles.scaleText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              {min}°
            </Text>
            <Text style={[styles.scaleText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              {max}°
            </Text>
          </View>
        </View>

        {/* Footer descriptivo */}
        <View style={styles.footerRow}>
          <Text style={[styles.idealRangeText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            Rango ideal: <Text style={{ color: isDark ? '#E2E8F0' : '#334155', fontWeight: '600' }}>{idealRange}</Text>
          </Text>
        </View>
      </View>
    </AuraCard>
  );
};

const styles = StyleSheet.create({
  cardContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
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
  iconBox: {
    marginRight: 6,
  },
  titleLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  gaugeCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
    flex: 1,
  },
  centerValueWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '32%',
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: -0.5,
  },
  heroUnit: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 3,
    marginBottom: 2,
  },
  centerHint: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: -2,
    letterSpacing: 0.3,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -16,
    paddingHorizontal: 8,
  },
  scaleText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idealRangeText: {
    fontSize: 10,
  },
});
