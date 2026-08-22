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

export const PhLevelGauge = React.memo<PhLevelGaugeProps>(({
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
  // Transición ultra-fluida de valor animado con física de resorte (Spring)
  const animVal = useRef(new Animated.Value(value)).current;
  const [displayVal, setDisplayVal] = useState(value);

  useEffect(() => {
    Animated.spring(animVal, {
      toValue: value,
      friction: 8,
      tension: 42,
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
  let badgeBg = isDark ? 'rgba(0,229,255,0.14)' : 'rgba(0,229,255,0.18)';
  let badgeBorder = isDark ? 'rgba(0,229,255,0.35)' : 'rgba(0,229,255,0.45)';

  if (clampedVal < idealMin) {
    classification = 'ÁCIDO';
    accentColor = '#F59E0B';
    badgeBg = isDark ? 'rgba(245,158,11,0.16)' : 'rgba(245,158,11,0.18)';
    badgeBorder = isDark ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.5)';
  } else if (clampedVal > idealMax) {
    classification = 'ALCALINO';
    accentColor = '#A855F7';
    badgeBg = isDark ? 'rgba(168,85,247,0.16)' : 'rgba(168,85,247,0.18)';
    badgeBorder = isDark ? 'rgba(168,85,247,0.4)' : 'rgba(168,85,247,0.5)';
  }

  // Geometría del velocímetro semicircular de 180°
  const baseWidth = 160;
  const scaleFactor = Math.min(width / baseWidth, 2.2);
  const strokeWidth = Math.round(11 * scaleFactor);
  const svgWidth = Math.max(width - 20, 130);
  const radius = (svgWidth - strokeWidth * 2 - 12) / 2;
  const cx = svgWidth / 2;
  const cy = radius + strokeWidth + 6;
  const svgHeight = cy + 14;

  const semicirclePath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  // Ángulo polar del marcador: de PI (0 pH) a 0 (14 pH)
  const theta = Math.PI - progress * Math.PI;
  const arcX = cx + radius * Math.cos(theta);
  const arcY = cy - radius * Math.sin(theta);

  // Coordenadas del pin radial guía indicador
  const innerPinX = cx + (radius - strokeWidth / 2 - 3 * scaleFactor) * Math.cos(theta);
  const innerPinY = cy - (radius - strokeWidth / 2 - 3 * scaleFactor) * Math.sin(theta);
  const outerPinX = cx + (radius + strokeWidth / 2 + 5 * scaleFactor) * Math.cos(theta);
  const outerPinY = cy - (radius + strokeWidth / 2 + 5 * scaleFactor) * Math.sin(theta);

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

            {/* Pista de fondo */}
            <Path
              d={semicirclePath}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Pista activa con gradiente espectral */}
            <Path
              d={semicirclePath}
              fill="none"
              stroke="url(#phSpectralGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={0.92}
            />

            {/* Muesca central neutra de referencia (pH 7.0) */}
            <Line
              x1={cx}
              y1={cy - radius - strokeWidth / 2 - 2}
              x2={cx}
              y2={cy - radius + strokeWidth / 2 + 2}
              stroke={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)'}
              strokeWidth={1.5}
              strokeLinecap="round"
            />

            {/* 1. Pin radial guía estilizado */}
            <Line
              x1={innerPinX}
              y1={innerPinY}
              x2={outerPinX}
              y2={outerPinY}
              stroke={accentColor}
              strokeWidth={2.4 * scaleFactor}
              strokeLinecap="round"
              opacity={0.9}
            />

            {/* 2. Aura de brillo suave (Halo) */}
            <Circle
              cx={arcX}
              cy={arcY}
              r={9.5 * scaleFactor}
              fill={accentColor}
              opacity={0.28}
            />

            {/* 3. Bisel exterior esmaltado (Target Glass Ring) */}
            <Circle
              cx={arcX}
              cy={arcY}
              r={6.2 * scaleFactor}
              fill={isDark ? '#0F172A' : '#FFFFFF'}
              stroke={accentColor}
              strokeWidth={2.2}
            />

            {/* 4. Núcleo vibrante de color (Neon Core) */}
            <Circle
              cx={arcX}
              cy={arcY}
              r={3.2 * scaleFactor}
              fill={accentColor}
            />

            {/* 5. Punto central de destello blanco */}
            <Circle
              cx={arcX}
              cy={arcY}
              r={1.2 * scaleFactor}
              fill="#FFFFFF"
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
});

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
