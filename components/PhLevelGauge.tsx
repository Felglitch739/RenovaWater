import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Polygon,
  Circle,
  Line,
  G,
} from 'react-native-svg';
import { AuraCard } from './AuraCard';
import { DropletIcon } from './Icons';

// ─────────────────────────────────────────────────────────────
// PhLevelGauge — Semicircle Speedometer con puntero triangular
// Arco de 180° exacto con marcador triangular apuntando al valor
// ─────────────────────────────────────────────────────────────

export interface PhLevelGaugeProps {
  value: number;
  min?: number;
  max?: number;
  title?: string;
  idealMin?: number;
  idealMax?: number;
  width?: number;
  isDark?: boolean;
}

export const PhLevelGauge: React.FC<PhLevelGaugeProps> = ({
  value = 7.35,
  min = 0,
  max = 14,
  title = 'NIVEL DE pH',
  idealMin = 6.5,
  idealMax = 8.5,
  width = 160,
  isDark = true,
}) => {
  // Normalizar valor entre 0 y 14
  const clampedVal = Math.min(Math.max(value, min), max);
  const progress = (clampedVal - min) / (max - min);

  // Clasificación cualitativa
  let classification = 'NEUTRO';
  let badgeColor = '#00E5FF';
  let badgeBg = 'rgba(0,229,255,0.14)';
  let badgeBorder = 'rgba(0,229,255,0.35)';

  if (clampedVal < idealMin) {
    classification = 'ÁCIDO';
    badgeColor = '#FBBF24';
    badgeBg = 'rgba(251,191,36,0.18)';
    badgeBorder = 'rgba(251,191,36,0.4)';
  } else if (clampedVal > idealMax) {
    classification = 'ALCALINO';
    badgeColor = '#C084FC';
    badgeBg = 'rgba(192,132,252,0.18)';
    badgeBorder = 'rgba(192,132,252,0.4)';
  }

  // Geometría del velocímetro semicircular exacto de 180°
  const strokeWidth = 12;
  const svgWidth = Math.max(width - 20, 130);
  const radius = (svgWidth - strokeWidth * 2 - 12) / 2;
  const cx = svgWidth / 2;
  const cy = radius + strokeWidth + 8;
  const svgHeight = cy + 14;

  // Arco exacto de 180° (desde la izquierda cx-radius hasta la derecha cx+radius)
  const arcLength = Math.PI * radius;
  const activeOffset = arcLength * (1 - progress);
  const semicirclePath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  // Ángulo polar actual del puntero: de PI (0 pH) a 0 (14 pH)
  const theta = Math.PI - progress * Math.PI;

  // Posición del punto en el centro del arco
  const arcX = cx + radius * Math.cos(theta);
  const arcY = cy - radius * Math.sin(theta);

  // Cálculo del puntero triangular (Marker Triangle)
  // La punta (Tip) toca el borde exterior del arco
  // La base del triángulo se extiende hacia afuera (radio + offset)
  const tipRadius = radius + strokeWidth / 2 + 1;
  const baseRadius = tipRadius + 8;
  const baseHalfAngle = 0.08; // ancho angular de la base

  const tipX = cx + tipRadius * Math.cos(theta);
  const tipY = cy - tipRadius * Math.sin(theta);

  const base1X = cx + baseRadius * Math.cos(theta + baseHalfAngle);
  const base1Y = cy - baseRadius * Math.sin(theta + baseHalfAngle);

  const base2X = cx + baseRadius * Math.cos(theta - baseHalfAngle);
  const base2Y = cy - baseRadius * Math.sin(theta - baseHalfAngle);

  const trianglePoints = `${tipX.toFixed(2)},${tipY.toFixed(2)} ${base1X.toFixed(2)},${base1Y.toFixed(2)} ${base2X.toFixed(2)},${base2Y.toFixed(2)}`;

  return (
    <AuraCard
      accentColor={badgeColor}
      colors={isDark ? ['#1E293B', '#111827'] : ['#FFFFFF', '#F8FAFC']}
      radius={22}
      style={{ marginBottom: 12 }}
    >
      <View style={styles.cardPadding}>
        {/* Cabecera */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.iconCircle}>
              <DropletIcon size={14} color={badgeColor} />
            </View>
            <Text style={[styles.titleLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {title}
            </Text>
          </View>

          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: badgeBg,
                borderColor: badgeBorder,
                shadowColor: badgeColor,
                shadowOpacity: 0.6,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: badgeColor }]}>{classification}</Text>
          </View>
        </View>

        {/* Velocímetro Semicircular de 180° */}
        <View style={styles.speedometerWrap}>
          <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            <Defs>
              {/* Gradiente espectral continuo para pH (Ácido -> Neutro -> Alcalino) */}
              <LinearGradient id="phSpeedometerGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#EF4444" />
                <Stop offset="25%" stopColor="#FBBF24" />
                <Stop offset="50%" stopColor="#00E5FF" />
                <Stop offset="75%" stopColor="#38BDF8" />
                <Stop offset="100%" stopColor="#C084FC" />
              </LinearGradient>
            </Defs>

            {/* Pista de fondo inactiva con transparencia sutil */}
            <Path
              d={semicirclePath}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Pista activa con espectro multicolor de pH */}
            <Path
              d={semicirclePath}
              fill="none"
              stroke="url(#phSpeedometerGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={0.88}
            />

            {/* Capa de resplandor neón LED debajo de la posición actual */}
            <Circle
              cx={arcX}
              cy={arcY}
              r={9}
              fill={badgeColor}
              opacity={0.3}
            />

            {/* Marcador Triangular (Puntero apuntando al arco) */}
            <Polygon
              points={trianglePoints}
              fill={badgeColor}
              stroke={isDark ? '#0F172A' : '#FFFFFF'}
              strokeWidth={1}
            />

            {/* Pequeño punto focal iluminado en la punta del puntero */}
            <Circle
              cx={arcX}
              cy={arcY}
              r={3.5}
              fill="#FFFFFF"
            />

            {/* Marca de referencia central (7.0 pH) */}
            <Line
              x1={cx}
              y1={cy - radius - strokeWidth / 2 - 2}
              x2={cx}
              y2={cy - radius + strokeWidth / 2 + 2}
              stroke={isDark ? '#0F172A' : '#FFFFFF'}
              strokeWidth={1.5}
              opacity={0.75}
            />
          </Svg>

          {/* Valor numérico hero en el centro del semicírculo */}
          <View style={[styles.centerValueBox, { top: cy - 24 }]}>
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
            <Text style={[styles.unitSubtext, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              pH
            </Text>
          </View>

          {/* Calibración de escala (0, 7.0, 14) */}
          <View style={[styles.scaleLabelsRow, { width: svgWidth - 12 }]}>
            <Text style={[styles.scaleNumber, { color: '#EF4444' }]}>0</Text>
            <Text style={[styles.scaleNumber, { color: '#00E5FF' }]}>7.0</Text>
            <Text style={[styles.scaleNumber, { color: '#C084FC' }]}>14</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerDesc, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            Rango neutro: <Text style={{ color: isDark ? '#E2E8F0' : '#334155', fontWeight: '600' }}>{idealMin} – {idealMax}</Text>
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
    marginBottom: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    marginRight: 6,
  },
  titleLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 20,
    borderWidth: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  speedometerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  centerValueBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: -0.5,
  },
  unitSubtext: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: -2,
  },
  scaleLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -2,
    paddingHorizontal: 4,
  },
  scaleNumber: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
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
  footerDesc: {
    fontSize: 10,
  },
});
