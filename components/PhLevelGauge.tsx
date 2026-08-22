import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, Animated, Easing } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Polygon,
  Circle,
  Line,
} from 'react-native-svg';
import { AuraCard } from './AuraCard';
import { DropletIcon } from './Icons';

// ─────────────────────────────────────────────────────────────
// PhLevelGauge — Medidor de pH Espectral Profesional
// Arco de 180° con etiqueta de estado centrada debajo del medidor
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
  style?: StyleProp<ViewStyle>;
}

export const PhLevelGauge: React.FC<PhLevelGaugeProps> = ({
  value = 7.00,
  min = 0,
  max = 14,
  title = 'NIVEL DE pH',
  idealMin = 6.5,
  idealMax = 7.5,
  width = 160,
  isDark = true,
  style,
}) => {
  // Transición suave de valor animado
  const animVal = useRef(new Animated.Value(value)).current;
  const [displayVal, setDisplayVal] = useState(value);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: value,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value]);

  useEffect(() => {
    const id = animVal.addListener(({ value: v }) => {
      setDisplayVal(parseFloat(v.toFixed(2)));
    });
    return () => animVal.removeListener(id);
  }, [animVal]);

  const clampedVal = Math.min(Math.max(displayVal, min), max);
  const progress = (clampedVal - min) / (max - min);

  // Clasificación cualitativa y color dinámico según la escala real de pH
  let classification = 'NEUTRO';
  let accentColor = '#00E5FF';
  let badgeBg = 'rgba(0,229,255,0.14)';
  let badgeBorder = 'rgba(0,229,255,0.35)';

  if (clampedVal < idealMin) {
    classification = 'ÁCIDO';
    accentColor = '#FBBF24';
    badgeBg = 'rgba(251,191,36,0.16)';
    badgeBorder = 'rgba(251,191,36,0.4)';
  } else if (clampedVal > idealMax) {
    classification = 'ALCALINO';
    accentColor = '#C084FC';
    badgeBg = 'rgba(192,132,252,0.16)';
    badgeBorder = 'rgba(192,132,252,0.4)';
  }

  // Geometría del velocímetro semicircular de 180°
  // Escalar el grosor del arco proporcionalmente al ancho del contenedor
  const baseWidth = 160;
  const scaleFactor = Math.min(width / baseWidth, 2.2);
  const strokeWidth = Math.round(11 * scaleFactor);
  const svgWidth = Math.max(width - 20, 130);
  const radius = (svgWidth - strokeWidth * 2 - 12) / 2;
  const cx = svgWidth / 2;
  const cy = radius + strokeWidth + 6;
  const svgHeight = cy + 12;

  const semicirclePath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  // Ángulo polar del marcador: de PI (0 pH) a 0 (14 pH)
  const theta = Math.PI - progress * Math.PI;
  const arcX = cx + radius * Math.cos(theta);
  const arcY = cy - radius * Math.sin(theta);

  // Marcador triangular estilizado (escalado con el contenedor)
  const tipRadius = radius + strokeWidth / 2 + 1;
  const baseRadius = tipRadius + 7.5 * scaleFactor;
  const baseHalfAngle = 0.08;

  const tipX = cx + tipRadius * Math.cos(theta);
  const tipY = cy - tipRadius * Math.sin(theta);
  const base1X = cx + baseRadius * Math.cos(theta + baseHalfAngle);
  const base1Y = cy - baseRadius * Math.sin(theta + baseHalfAngle);
  const base2X = cx + baseRadius * Math.cos(theta - baseHalfAngle);
  const base2Y = cy - baseRadius * Math.sin(theta - baseHalfAngle);

  const trianglePoints = `${tipX.toFixed(2)},${tipY.toFixed(2)} ${base1X.toFixed(2)},${base1Y.toFixed(2)} ${base2X.toFixed(2)},${base2Y.toFixed(2)}`;

  return (
    <AuraCard
      colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
      radius={20}
      style={[{ marginBottom: 12, flex: 1 }, style]}
    >
      <View style={styles.cardPadding}>
        {/* Cabecera: Icono fijo azul */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <DropletIcon size={14} color="#0EA5E9" />
            <Text style={[styles.titleLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {title}
            </Text>
          </View>
        </View>

        {/* Medidor Semicircular de 180° */}
        <View style={styles.speedometerWrap}>
          <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            <Defs>
              <LinearGradient id="phSpectralGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#EF4444" />
                <Stop offset="25%" stopColor="#FBBF24" />
                <Stop offset="50%" stopColor="#00E5FF" />
                <Stop offset="75%" stopColor="#38BDF8" />
                <Stop offset="100%" stopColor="#C084FC" />
              </LinearGradient>
            </Defs>

            <Path
              d={semicirclePath}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            <Path
              d={semicirclePath}
              fill="none"
              stroke="url(#phSpectralGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={0.9}
            />

            <Circle
              cx={arcX}
              cy={arcY}
              r={7 * scaleFactor}
              fill={accentColor}
              opacity={0.35}
            />

            <Polygon
              points={trianglePoints}
              fill={accentColor}
              stroke={isDark ? '#14181F' : '#FFFFFF'}
              strokeWidth={1}
            />

            <Circle cx={arcX} cy={arcY} r={2.5 * scaleFactor} fill="#FFFFFF" />

            <Line
              x1={cx}
              y1={cy - radius - strokeWidth / 2 - 1}
              x2={cx}
              y2={cy - radius + strokeWidth / 2 + 1}
              stroke={isDark ? '#14181F' : '#FFFFFF'}
              strokeWidth={1.5}
              opacity={0.8}
            />
          </Svg>

          <View style={[styles.centerValueBox, { top: cy - 22 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
              <Text
                style={[
                  styles.heroValue,
                  {
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    textShadowColor: isDark ? 'rgba(0,229,255,0.4)' : 'transparent',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 6,
                  },
                ]}
              >
                {displayVal.toFixed(2)}
              </Text>
              <Text style={[styles.heroUnit, { color: accentColor }]}>
                pH
              </Text>
            </View>
          </View>

          <View style={[styles.scaleLabelsRow, { width: svgWidth - 10 }]}>
            <Text style={[styles.scaleNumber, { color: '#EF4444' }]}>0</Text>
            <Text style={[styles.scaleNumber, { color: '#00E5FF' }]}>7.0</Text>
            <Text style={[styles.scaleNumber, { color: '#C084FC' }]}>14</Text>
          </View>
        </View>

        {/* Etiqueta de estado centrada abajo del medidor */}
        <View style={styles.badgeCenterWrap}>
          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: badgeBg,
                borderColor: badgeBorder,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: accentColor }]}>{classification}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerDesc, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            Rango óptimo: <Text style={{ color: isDark ? '#CBD5E1' : '#475569', fontWeight: '600' }}>{idealMin} – {idealMax}</Text>
          </Text>
        </View>
      </View>
    </AuraCard>
  );
};

const styles = StyleSheet.create({
  cardPadding: {
    padding: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  speedometerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 6,
    flex: 1,
  },
  centerValueBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  heroValue: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    lineHeight: 30,
  },
  heroUnit: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
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
  badgeCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
    marginTop: 4,
    alignItems: 'center',
  },
  footerDesc: {
    fontSize: 10,
  },
});
