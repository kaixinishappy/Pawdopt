import React from 'react';
import { View, StyleSheet, ViewStyle, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, globalStyles } from '../styles/GlobalStyles';

interface GradientCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  gradientColors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
  gradientDirection?: { x: number; y: number };
}

export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  style,
  padding = 16,
  gradientColors = [colors.yellow, colors.red],
  gradientDirection = { x: 1, y: 0 },
}) => {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={gradientColors}
        style={[styles.gradient, { padding }]}
        start={{ x: 0, y: 0 }}
        end={gradientDirection}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    ...globalStyles.shadowStyle,
    marginVertical: 8,
  },
  gradient: {
    borderRadius: 12,
  },
});
