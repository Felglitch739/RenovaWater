import React from 'react';
import { View, Text } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
} from 'react-native-svg';
import type { HistoryRecord } from '../store/useSensorStore';

// ─────────────────────────────────────────────────────────────
// GlowLineChart — Gráfica de línea SVG con efecto neón/glow
// ─────────────────────────────────────────────────────────────
//
// Traza los últimos registros de turbidez como una curva suave
// con un relleno degradado debajo y un punto neón en el extremo.

interface GlowLineChartProps {
  data: HistoryRecord[];
  threshold: number;
  width: number;
  height?: number;
}

const STATUS_COLORS = {
  ok: '#0EA5E9',       // sky-500
  warning: '#FBBF24',  // amber-400
  danger: '#EF4444',   // red-500
};

function getLineColor(value: number, threshold: number): string {
  if (value <= threshold) return STATUS_COLORS.ok;
  if (value <= threshold * 4) return STATUS_COLORS.warning;
  return STATUS_COLORS.danger;
}

export const GlowLineChart: React.FC<GlowLineChartProps> = ({
  data,
  threshold,
  width,
  height = 90,
}) => {
  if (data.length === 0) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#475569', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Sin datos · Conectar sensor
        </Text>
      </View>
    );
  }

  const padX = 4;
  const padY = 8;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const values = data.map((r) => r.turbidity);
  const maxVal = Math.max(...values, threshold, 5);
  const minVal = 0;

  // Normaliza un valor al espacio del gráfico
  const toX = (i: number) => padX + (i / Math.max(data.length - 1, 1)) * chartW;
  const toY = (v: number) => padY + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  // Construir SVG path de línea suave (bezier)
  let pathD = '';
  data.forEach((record, i) => {
    const x = toX(i);
    const y = toY(record.turbidity);
    if (i === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      const prevX = toX(i - 1);
      const prevY = toY(data[i - 1].turbidity);
      const cpX = (prevX + x) / 2;
      pathD += ` C ${cpX} ${prevY}, ${cpX} ${y}, ${x} ${y}`;
    }
  });

  // Path de relleno (cierra el área debajo de la línea)
  const lastX = toX(data.length - 1);
  const firstX = toX(0);
  const fillD = `${pathD} L ${lastX} ${padY + chartH} L ${firstX} ${padY + chartH} Z`;

  // Color del punto final basado en el último valor
  const lastValue = values[values.length - 1];
  const lineColor = getLineColor(lastValue, threshold);

  // Línea horizontal del umbral
  const thresholdY = toY(threshold);

  const firstRecord = data[0];
  const lastRecord = data[data.length - 1];

  return (
    <View>
      {/* Header del gráfico */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: '#64748B', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '700' }}>
          Tendencia turbidez
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: STATUS_COLORS.ok, marginRight: 4,
              shadowColor: STATUS_COLORS.ok, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }} />
            <Text style={{ color: '#475569', fontSize: 8 }}>≤{threshold}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: STATUS_COLORS.warning, marginRight: 4 }} />
            <Text style={{ color: '#475569', fontSize: 8 }}>≤{threshold * 4}</Text>
          </View>
        </View>
      </View>

      {/* SVG del gráfico */}
      <Svg width={width} height={height}>
        <Defs>
          {/* Gradiente fino casi transparente para el área */}
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={lineColor} stopOpacity="0.06" />
            <Stop offset="100%" stopColor={lineColor} stopOpacity="0.00" />
          </LinearGradient>
          {/* Gradiente para la línea */}
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={lineColor} stopOpacity="0.7" />
            <Stop offset="100%" stopColor={lineColor} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Línea horizontal del umbral */}
        {thresholdY > padY && thresholdY < padY + chartH && (
          <Line
            x1={padX}
            y1={thresholdY}
            x2={width - padX}
            y2={thresholdY}
            stroke="rgba(251,191,36,0.20)"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}

        {/* Relleno de área casi transparente */}
        <Path d={fillD} fill="url(#areaGrad)" />

        {/* Línea principal nítida (2dp elegante) */}
        <Path
          d={pathD}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Punto neón final */}
        {data.length > 0 && (
          <>
            {/* Halo difuminado */}
            <Circle
              cx={toX(data.length - 1)}
              cy={toY(lastValue)}
              r={9}
              fill={lineColor}
              opacity={0.18}
            />
            {/* Punto principal */}
            <Circle
              cx={toX(data.length - 1)}
              cy={toY(lastValue)}
              r={4}
              fill={lineColor}
            />
            {/* Centro blanco */}
            <Circle
              cx={toX(data.length - 1)}
              cy={toY(lastValue)}
              r={1.5}
              fill="white"
            />
          </>
        )}
      </Svg>

      {/* Etiquetas de tiempo */}
      {data.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: '#374151', fontSize: 8, fontFamily: 'monospace' }}>{firstRecord.time}</Text>
          <Text style={{ color: '#6B7280', fontSize: 8, fontFamily: 'monospace' }}>{lastRecord.time} ←</Text>
        </View>
      )}
    </View>
  );
};
