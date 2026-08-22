import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─────────────────────────────────────────────────────────────
// AuraCard — Superficie sobria sin bordes cargados
// ─────────────────────────────────────────────────────────────

interface AuraCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Radio de esquina. Default: 20 */
  radius?: number;
  /** Colores del gradiente interno. Default: oscuro neutro */
  colors?: [string, string, ...string[]];
  /** Aplica indicador de acento lateral */
  accentColor?: string;
  /** Si es true, oculta bordes y biseles. Default: true */
  hideBorder?: boolean;
}

export const AuraCard: React.FC<AuraCardProps> = ({
  children,
  style,
  radius = 20,
  colors = ['#1C222B', '#14181F'],
  accentColor,
  hideBorder = true,
}) => {
  return (
    <View style={[styles.shadowWrap, { borderRadius: radius }, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          { borderRadius: radius },
          !hideBorder && {
            borderTopWidth: 1,
            borderLeftWidth: 0.5,
            borderTopColor: 'rgba(255, 255, 255, 0.08)',
            borderLeftColor: 'rgba(255, 255, 255, 0.04)',
          },
        ]}
      >
        {/* Línea de acento izquierda opcional */}
        {accentColor && (
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: radius / 2,
              bottom: radius / 2,
              width: 3.5,
              backgroundColor: accentColor,
              borderRadius: 2,
            }}
            pointerEvents="none"
          />
        )}

        <View style={styles.content}>{children}</View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  gradient: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});
