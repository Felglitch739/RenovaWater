import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ─────────────────────────────────────────────────────────────
// AuraCard — Superficie premium neumorfica con bisel iluminado
// ─────────────────────────────────────────────────────────────

interface AuraCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Radio de esquina. Default: 20 */
  radius?: number;
  /** Colores del gradiente interno. Default: oscuro neutro */
  colors?: [string, string, ...string[]];
  /** Aplica borde izquierdo de color de acento (ej. status) */
  accentColor?: string;
}

export const AuraCard: React.FC<AuraCardProps> = ({
  children,
  style,
  radius = 20,
  colors = ['#1C222B', '#14181F'],
  accentColor,
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
          {
            borderTopWidth: 1.5,
            borderLeftWidth: 0.5,
            borderTopColor: 'rgba(255, 255, 255, 0.10)',
            borderLeftColor: 'rgba(255, 255, 255, 0.06)',
          },
        ]}
      >
        {/* Capa: borde inferior oscuro (sombra base) */}
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: radius,
              borderBottomWidth: 2,
              borderRightWidth: 1,
              borderBottomColor: 'rgba(0,0,0,0.55)',
              borderRightColor: 'rgba(0,0,0,0.30)',
            },
          ]}
          pointerEvents="none"
        />

        {/* Línea de acento izquierda (status color) */}
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
              shadowColor: accentColor,
              shadowOpacity: 0.7,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
              elevation: 4,
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
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  gradient: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
});
