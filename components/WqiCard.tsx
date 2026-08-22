import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { AuraCard } from './AuraCard';
import { ActivityIcon, CheckCircleIcon, AlertTriangleIcon } from './Icons';

// ─────────────────────────────────────────────────────────────
// WqiCard — Water Quality Index (Índice Global de Calidad de Agua)
// ─────────────────────────────────────────────────────────────

export interface WqiCardProps {
  ph: number;
  temperature: number;
  turbidity: number;
  conductivity?: number;
  isConnected: boolean;
  isDark?: boolean;
}

export interface WqiEvaluation {
  score: number;
  status: 'ÓPTIMA' | 'BUENA' | 'PRECAUCIÓN' | 'CRÍTICA';
  color: string;
  badgeBg: string;
  badgeBorder: string;
  headline: string;
  description: string;
}

/**
 * Calcula el WQI ponderado normalizado (0 - 100) basado en estándares de agua potable
 */
export function calculateWQI(
  ph: number,
  temp: number,
  turbidity: number,
  isConnected: boolean
): WqiEvaluation {
  if (!isConnected) {
    return {
      score: 0,
      status: 'PRECAUCIÓN',
      color: '#94A3B8',
      badgeBg: 'rgba(148, 163, 184, 0.12)',
      badgeBorder: 'rgba(148, 163, 184, 0.25)',
      headline: 'Sin Telemetría',
      description: 'Inicie el escaneo para calcular el índice en tiempo real.',
    };
  }

  // 1. Puntuación de pH (óptimo 7.0 - 7.8, peso 35%)
  let phScore = 100;
  if (ph < 6.5) {
    phScore = Math.max(0, 100 - (6.5 - ph) * 45);
  } else if (ph > 8.5) {
    phScore = Math.max(0, 100 - (ph - 8.5) * 45);
  } else if (ph < 7.0) {
    phScore = 85 + ((ph - 6.5) / 0.5) * 15;
  } else if (ph > 7.8) {
    phScore = 85 + ((8.5 - ph) / 0.7) * 15;
  }

  // 2. Puntuación de Turbidez (óptimo <= 1 NTU, límite 5 NTU, peso 40%)
  let turScore = 100;
  if (turbidity <= 1.0) {
    turScore = 100;
  } else if (turbidity <= 5.0) {
    turScore = 100 - ((turbidity - 1.0) / 4.0) * 30; // 70 a 100
  } else {
    turScore = Math.max(0, 70 - ((turbidity - 5.0) / 40.0) * 70);
  }

  // 3. Puntuación de Temperatura (óptimo 18 - 28°C, peso 25%)
  let tempScore = 100;
  if (temp < 10) {
    tempScore = Math.max(0, 50 - (10 - temp) * 5);
  } else if (temp > 45) {
    tempScore = Math.max(0, 50 - (temp - 45) * 5);
  } else if (temp < 18) {
    tempScore = 70 + ((temp - 10) / 8) * 25;
  } else if (temp > 35) {
    tempScore = 70 + ((45 - temp) / 10) * 25;
  } else {
    tempScore = 100;
  }

  // Promedio ponderado
  const totalScore = Math.round(phScore * 0.35 + turScore * 0.40 + tempScore * 0.25);
  const clampedScore = Math.min(Math.max(totalScore, 0), 100);

  if (clampedScore >= 88) {
    return {
      score: clampedScore,
      status: 'ÓPTIMA',
      color: '#10B981',
      badgeBg: 'rgba(16, 185, 129, 0.14)',
      badgeBorder: 'rgba(16, 185, 129, 0.35)',
      headline: 'Agua Potable Purificada',
      description: 'Todos los parámetros fisicoquímicos en rango ideal.',
    };
  } else if (clampedScore >= 70) {
    return {
      score: clampedScore,
      status: 'BUENA',
      color: '#0EA5E9',
      badgeBg: 'rgba(14, 165, 233, 0.14)',
      badgeBorder: 'rgba(14, 165, 233, 0.35)',
      headline: 'Calidad Aceptable',
      description: 'Muestra apta bajo norma con variación leve.',
    };
  } else if (clampedScore >= 50) {
    return {
      score: clampedScore,
      status: 'PRECAUCIÓN',
      color: '#FBBF24',
      badgeBg: 'rgba(251, 191, 36, 0.16)',
      badgeBorder: 'rgba(251, 191, 36, 0.35)',
      headline: 'Atención Requerida',
      description: 'Desviación en pH o turbidez por encima del límite.',
    };
  } else {
    return {
      score: clampedScore,
      status: 'CRÍTICA',
      color: '#EF4444',
      badgeBg: 'rgba(239, 68, 68, 0.16)',
      badgeBorder: 'rgba(239, 68, 68, 0.35)',
      headline: 'Agua No Apta',
      description: 'Anomalía severa detectada. Filtración requerida.',
    };
  }
}

export const WqiCard: React.FC<WqiCardProps> = ({
  ph,
  temperature,
  turbidity,
  isConnected,
  isDark = true,
}) => {
  const evalResult = calculateWQI(ph, temperature, turbidity, isConnected);

  // Animación suave de transición de score
  const animScore = useRef(new Animated.Value(evalResult.score)).current;
  const [displayScore, setDisplayScore] = useState(evalResult.score);

  useEffect(() => {
    Animated.timing(animScore, {
      toValue: evalResult.score,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [evalResult.score]);

  useEffect(() => {
    const listenerId = animScore.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });
    return () => animScore.removeListener(listenerId);
  }, [animScore]);

  // Dimensiones del anillo circular de progreso SVG
  const circleSize = 74;
  const strokeW = 6.5;
  const radius = (circleSize - strokeW * 2) / 2;
  const cx = circleSize / 2;
  const cy = circleSize / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = displayScore / 100;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <AuraCard
      colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
      radius={20}
      style={{ marginBottom: 12 }}
    >
      <View style={styles.cardPadding}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.iconCircle}>
              <ActivityIcon size={14} color={evalResult.color} />
            </View>
            <Text style={[styles.titleText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              ÍNDICE GLOBAL DE CALIDAD (WQI)
            </Text>
          </View>

          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: evalResult.badgeBg,
                borderColor: evalResult.badgeBorder,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: evalResult.color }]}>
              {evalResult.status}
            </Text>
          </View>
        </View>

        {/* Contenido principal: Anillo SVG + Diagnóstico */}
        <View style={styles.mainContentRow}>
          {/* Anillo de Score SVG con Glow */}
          <View style={styles.ringWrap}>
            <Svg width={circleSize} height={circleSize}>
              <Defs>
                <LinearGradient id="wqiRingGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor={evalResult.color} stopOpacity="0.9" />
                  <Stop offset="100%" stopColor={evalResult.color} stopOpacity="1" />
                </LinearGradient>
              </Defs>

              {/* Anillo de pista de fondo */}
              <Circle
                cx={cx}
                cy={cy}
                r={radius}
                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                strokeWidth={strokeW}
                fill="none"
              />

              {/* Anillo de progreso activo */}
              {isConnected && (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  stroke="url(#wqiRingGrad)"
                  strokeWidth={strokeW}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              )}
            </Svg>

            {/* Número central en monospace */}
            <View style={styles.centerScoreWrap}>
              <Text
                style={[
                  styles.scoreNumber,
                  {
                    color: isDark ? '#F8FAFC' : '#0F172A',
                    textShadowColor: isDark ? `${evalResult.color}55` : 'transparent',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  },
                ]}
              >
                {isConnected ? displayScore : '--'}
              </Text>
              {isConnected && (
                <Text style={[styles.scorePercent, { color: evalResult.color }]}>%</Text>
              )}
            </View>
          </View>

          {/* Información y descripción */}
          <View style={styles.infoCol}>
            <Text style={[styles.headlineText, { color: isDark ? '#F1F5F9' : '#0F172A' }]}>
              {evalResult.headline}
            </Text>
            <Text style={[styles.descText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              {evalResult.description}
            </Text>

            {/* Micro chips de estado individual de los 3 parámetros clave */}
            {isConnected && (
              <View style={styles.chipsRow}>
                <View style={[styles.paramChip, { backgroundColor: isDark ? 'rgba(14,165,233,0.1)' : 'rgba(14,165,233,0.08)' }]}>
                  <Text style={[styles.paramChipText, { color: '#0EA5E9' }]}>pH {ph}</Text>
                </View>
                <View style={[styles.paramChip, { backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)' }]}>
                  <Text style={[styles.paramChipText, { color: '#EF4444' }]}>{temperature}°C</Text>
                </View>
                <View style={[styles.paramChip, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)' }]}>
                  <Text style={[styles.paramChipText, { color: '#10B981' }]}>{turbidity} NTU</Text>
                </View>
              </View>
            )}
          </View>
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
    marginBottom: 10,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    marginRight: 6,
  },
  titleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mainContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  centerScoreWrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: -0.5,
  },
  scorePercent: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 1,
  },
  infoCol: {
    flex: 1,
  },
  headlineText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  descText: {
    fontSize: 10,
    lineHeight: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
  },
  paramChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paramChipText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
});
