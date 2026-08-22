import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, Animated, Easing } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import { AuraCard } from './AuraCard';
import { ThermometerIcon } from './Icons';

// ─────────────────────────────────────────────────────────────
// TemperatureGauge — Radial/Arc Gauge (Círculo incompleto 240°)
// Gradiente azul-rojo con etiqueta de estado centrada debajo del medidor
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

export const TemperatureGauge = React.memo<TemperatureGaugeProps>(({
  value = 24.5,
  min = 0,
  max = 50,
  unit = '°C',
  title = 'TEMPERATURA',
  idealRange = '20.0°C – 35.0°C',
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
      setDisplayVal(parseFloat(v.toFixed(1)));
    });
    return () => animVal.removeListener(id);
  }, [animVal]);

  // Normalizar progreso (0 a 1)
  const clampedVal = Math.min(Math.max(displayVal, min), max);
  const progress = max > min ? (clampedVal - min) / (max - min) : 0.5;

  // Determinar estado, color y etiqueta según los rangos del usuario:
  // - Verde: 20°C a 35°C (Estable / Óptimo)
  // - Ámbar: < 18°C / < 20°C y > 35°C / > 38°C (Advertencia / Precaución)
  // - Rojo: < 10°C y > 45°C (Crítico)
  let accentColor = '#10B981'; // Verde
  let statusLabel = 'ESTABLE';
  let statusBg = 'rgba(16, 185, 129, 0.14)';
  let statusBorder = 'rgba(16, 185, 129, 0.35)';

  if (clampedVal < 10 || clampedVal > 45) {
    accentColor = '#EF4444'; // Rojo
    statusLabel = 'CRÍTICO';
    statusBg = 'rgba(239, 68, 68, 0.16)';
    statusBorder = 'rgba(239, 68, 68, 0.4)';
  } else if (clampedVal < 18 || clampedVal > 38) {
    accentColor = '#FBBF24'; // Ámbar
    statusLabel = 'PRECAUCIÓN';
    statusBg = 'rgba(251, 191, 36, 0.16)';
    statusBorder = 'rgba(251, 191, 36, 0.4)';
  }

  // Parámetros de geometría del arco de 240 grados (apertura inferior de 120°)
  // Escalar el grosor del arco proporcionalmente al ancho del contenedor
  const baseWidth = 160;
  const scaleFactor = Math.min(width / baseWidth, 2.2);
  const strokeWidth = Math.round(10 * scaleFactor);
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

  return (
    <AuraCard
      colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
      radius={20}
      style={[{ marginBottom: 12, flex: 1 }, style]}
    >
      <View style={styles.cardContent}>
        {/* Cabecera limpia sin el badge */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.iconBox}>
              <ThermometerIcon size={14} color="#EF4444" />
            </View>
            <Text style={[styles.titleLabel, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {title}
            </Text>
          </View>
        </View>

        {/* Medidor Radial con Arco Incompleto 240° con Gradiente Azul-Rojo */}
        <View style={styles.gaugeCenterWrap}>
          <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <Defs>
              {/* Gradiente de izquierda a derecha azul-rojo */}
              <LinearGradient id="tempBlueRedGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#0EA5E9" />
                <Stop offset="100%" stopColor="#EF4444" />
              </LinearGradient>
            </Defs>

            {/* Pista de fondo */}
            <Path
              d={fullArcPath}
              fill="none"
              stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Resplandor sutil del arco */}
            <Path
              d={fullArcPath}
              fill="none"
              stroke="url(#tempBlueRedGrad)"
              strokeWidth={strokeWidth + 4 * scaleFactor}
              strokeOpacity="0.25"
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${arcLength}`}
              strokeDashoffset={strokeDashoffset}
            />

            {/* Arco con gradiente azul-rojo de izquierda a derecha */}
            <Path
              d={fullArcPath}
              fill="none"
              stroke="url(#tempBlueRedGrad)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${arcLength} ${arcLength}`}
              strokeDashoffset={strokeDashoffset}
            />

            {/* Indicador Thumb en la posición actual con color dinámico (escalado) */}
            <Circle
              cx={thumbX}
              cy={thumbY}
              r={9 * scaleFactor}
              fill={accentColor}
              opacity={0.3}
            />
            <Circle
              cx={thumbX}
              cy={thumbY}
              r={5 * scaleFactor}
              fill={accentColor}
            />
            <Circle
              cx={thumbX}
              cy={thumbY}
              r={2 * scaleFactor}
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
                    textShadowColor: isDark ? 'rgba(14,165,233,0.35)' : 'transparent',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 8,
                  },
                ]}
              >
                {displayVal.toFixed(1)}
              </Text>
              <Text style={[styles.heroUnit, { color: accentColor }]}>{unit}</Text>
            </View>
            <Text style={[styles.centerHint, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              {statusLabel === 'ESTABLE' ? 'Calibrado' : 'Fuera de rango'}
            </Text>
          </View>

          <View style={[styles.scaleRow, { width: svgSize - 20 }]}>
            <Text style={[styles.scaleText, { color: '#0EA5E9' }]}>
              {min}°
            </Text>
            <Text style={[styles.scaleText, { color: '#EF4444' }]}>
              {max}°
            </Text>
          </View>
        </View>

        {/* Etiqueta de estado centrada abajo del medidor */}
        <View style={styles.badgeCenterWrap}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: statusBg,
                borderColor: statusBorder,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: accentColor }]}>{statusLabel}</Text>
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
});

const styles = StyleSheet.create({
  cardContent: {
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
  gaugeCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 2,
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
    fontWeight: '700',
  },
  badgeCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusText: {
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
  idealRangeText: {
    fontSize: 10,
  },
});
