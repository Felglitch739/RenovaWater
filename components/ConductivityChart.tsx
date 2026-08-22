import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  G,
} from 'react-native-svg';
import { AuraCard } from './AuraCard';
import { ZapIcon } from './Icons';

// ─────────────────────────────────────────────────────────────
// ConductivityChart — Spline Area Chart / Sparkline Suavizado
// Curvas interpoladas (sin picos duros) con degradado neón Cyan
// ─────────────────────────────────────────────────────────────

export interface DataPoint {
  time?: string;
  value: number;
}

export interface ConductivityChartProps {
  data?: number[] | DataPoint[];
  currentValue?: number;
  unit?: string;
  title?: string;
  subtitle?: string;
  trendLabel?: string;
  width?: number;
  height?: number;
  isDark?: boolean;
  accentColor?: string;
}

/**
 * Calcula un path SVG con curvas cúbicas Bezier suavizadas (Spline)
 * a través de un conjunto de puntos (x, y) normalizados.
 */
function buildSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    // Factor de tensión para la interpolación Catmull-Rom a Bezier cúbica
    const tension = 0.2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

export const ConductivityChart: React.FC<ConductivityChartProps> = ({
  data = [340, 355, 370, 362, 380, 395, 410, 405, 418, 425, 420],
  currentValue,
  unit = 'µS/cm',
  title = 'CONDUCTIVIDAD ELÉCTRICA',
  subtitle = 'Iones disueltos en tiempo real',
  trendLabel = '+2.4% vs sesión anterior',
  width = 340,
  height = 130,
  isDark = true,
  accentColor = '#EAB308',
}) => {
  // Extraer valores numéricos
  const rawValues: number[] = data.map((d) => (typeof d === 'number' ? d : d.value));
  const latestVal = currentValue !== undefined ? currentValue : rawValues[rawValues.length - 1] ?? 420;

  // Transición suave de valor animado
  const animVal = useRef(new Animated.Value(latestVal)).current;
  const [displayVal, setDisplayVal] = useState(latestVal);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: latestVal,
      duration: 550,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [latestVal]);

  useEffect(() => {
    const id = animVal.addListener(({ value: v }) => {
      setDisplayVal(Math.round(v));
    });
    return () => animVal.removeListener(id);
  }, [animVal]);

  const padLeft = 8;
  const padRight = 8;
  const padTop = 12;
  const padBottom = 16;

  const chartW = Math.max(width - 64, 140);
  const chartH = height;

  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const maxVal = Math.max(...rawValues, latestVal, 10);
  const minVal = Math.min(...rawValues, latestVal, 0);
  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;

  // Mapear puntos a coordenadas de pantalla
  const points = rawValues.map((val, idx) => {
    const x = padLeft + (idx / Math.max(rawValues.length - 1, 1)) * plotW;
    const y = padTop + plotH - ((val - minVal) / range) * plotH;
    return { x, y };
  });

  // Generar curva suavizada (Spline)
  const linePath = buildSplinePath(points);

  // Path de relleno degradado que cierra hasta la base
  const firstPoint = points[0] ?? { x: padLeft, y: padTop + plotH };
  const lastPoint = points[points.length - 1] ?? { x: padLeft + plotW, y: padTop + plotH };
  const areaPath = `${linePath} L ${lastPoint.x} ${padTop + plotH} L ${firstPoint.x} ${padTop + plotH} Z`;

  return (
    <AuraCard
      accentColor={accentColor}
      colors={isDark ? ['#1C222B', '#14181F'] : ['#FFFFFF', '#F8FAFC']}
      radius={20}
      style={{ marginBottom: 12 }}
    >
      <View style={styles.cardPadding}>
        {/* Cabecera: Título + Badge de Medida */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.iconCircle}>
              <ZapIcon size={14} color={accentColor} />
            </View>
            <View>
              <Text style={[styles.titleText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                {title}
              </Text>
              <Text style={[styles.subtitleText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                {subtitle}
              </Text>
            </View>
          </View>

          {/* Badge de tendencia / estabilidad */}
          <View style={styles.trendBadge}>
            <Text style={styles.trendText}>TELEMETRÍA</Text>
          </View>
        </View>

        {/* Hero Value con Glow LED */}
        <View style={styles.valueRow}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text
              style={[
                styles.heroNumber,
                {
                  color: isDark ? '#F8FAFC' : '#0F172A',
                  textShadowColor: isDark ? 'rgba(234,179,8,0.4)' : 'transparent',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 10,
                },
              ]}
            >
              {displayVal}
            </Text>
            <Text style={[styles.heroUnit, { color: accentColor }]}>{unit}</Text>
          </View>
          <Text style={[styles.trendSubtitle, { color: '#10B981' }]}>{trendLabel}</Text>
        </View>

        {/* Spline Area Chart SVG */}
        <View style={styles.chartWrap}>
          <Svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
            <Defs>
              {/* Degradado fino casi transparente para el área bajo la curva */}
              <LinearGradient id="conductivityAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={accentColor} stopOpacity="0.08" />
                <Stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
              </LinearGradient>

              {/* Trazo sobrio fino amarillo neón */}
              <LinearGradient id="conductivityLineGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#F59E0B" stopOpacity="0.9" />
                <Stop offset="100%" stopColor="#FACC15" stopOpacity="1" />
              </LinearGradient>
            </Defs>

            {/* Líneas sutiles de cuadrícula de referencia */}
            <Line
              x1={padLeft}
              y1={padTop + plotH * 0.25}
              x2={padLeft + plotW}
              y2={padTop + plotH * 0.25}
              stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}
              strokeDasharray="3,4"
              strokeWidth="1"
            />
            <Line
              x1={padLeft}
              y1={padTop + plotH * 0.75}
              x2={padLeft + plotW}
              y2={padTop + plotH * 0.75}
              stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}
              strokeDasharray="3,4"
              strokeWidth="1"
            />

            {/* Relleno degradado casi transparente */}
            <Path d={areaPath} fill="url(#conductivityAreaGrad)" />

            {/* Trazo nítido de la línea curvada (2dp elegante) */}
            <Path
              d={linePath}
              fill="none"
              stroke="url(#conductivityLineGrad)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Punto indicador neón en el extremo más reciente */}
            {points.length > 0 && (
              <>
                {/* Halo de difusión externa */}
                <Circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r={10}
                  fill={accentColor}
                  opacity={0.25}
                />
                {/* Punto sólido */}
                <Circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r={5}
                  fill={accentColor}
                />
                {/* Núcleo blanco brillante */}
                <Circle
                  cx={lastPoint.x}
                  cy={lastPoint.y}
                  r={2}
                  fill="#FFFFFF"
                />
              </>
            )}
          </Svg>
        </View>

        {/* Footer con información de rango y pureza */}
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
            Agua potable recomendada: <Text style={{ color: isDark ? '#CBD5E1' : '#334155', fontWeight: '600' }}>100 – 500 µS/cm</Text>
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
  iconCircle: {
    marginRight: 8,
  },
  titleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  subtitleText: {
    fontSize: 9,
    marginTop: 1,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 16,
    backgroundColor: 'rgba(234,179,8,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
  },
  trendText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#EAB308',
    letterSpacing: 0.8,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  heroNumber: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
    lineHeight: 36,
  },
  heroUnit: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
    marginBottom: 4,
  },
  trendSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  chartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 8,
    marginTop: 2,
  },
  footerText: {
    fontSize: 10,
  },
});
