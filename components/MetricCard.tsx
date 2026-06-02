import React from 'react';
import { View, Text } from 'react-native';
import type { MetricStatus } from '../store/useSensorStore';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  status: MetricStatus;
  idealRange: string;
}

const STATUS_STYLES = {
  ok: {
    border: 'border-l-emerald-500',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    label: 'APT',
  },
  warning: {
    border: 'border-l-amber-500',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    label: 'PRECAUCIÓN',
  },
  danger: {
    border: 'border-l-red-500',
    badgeBg: 'bg-red-500/10',
    badgeText: 'text-red-400',
    label: 'NO APTA',
  },
} as const;

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  status,
  idealRange,
}) => {
  const style = STATUS_STYLES[status];

  return (
    <View className={`bg-zinc-800 rounded-lg border-l-4 ${style.border} p-5 mb-4`}>
      {/* Cabecera: Título + Badge de estado */}
      <View className="flex-row justify-between items-start mb-4">
        <Text className="text-zinc-400 text-sm font-semibold uppercase tracking-widest">
          {title}
        </Text>
        <View className={`px-2.5 py-1 rounded-md ${style.badgeBg}`}>
          <Text className={`${style.badgeText} text-xs font-bold`}>
            {style.label}
          </Text>
        </View>
      </View>

      {/* Valor principal: grande y monoespaciado para estabilidad visual */}
      <View className="flex-row items-baseline mb-3">
        <Text className="text-white text-5xl font-bold tracking-tighter font-mono">
          {value}
        </Text>
        <Text className="text-zinc-500 text-base ml-1.5 font-medium">
          {unit}
        </Text>
      </View>

      {/* Meta-info */}
      <View className="flex-row justify-between items-center">
        <Text className="text-zinc-500 text-xs">
          Rango ideal: {idealRange}
        </Text>
      </View>
    </View>
  );
};
