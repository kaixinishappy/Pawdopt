import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, globalStyles } from '../styles/GlobalStyles';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  backgroundColor?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 16,
  backgroundColor = colors.white,
}) => {
  return (
    <View style={[styles.card, { padding, backgroundColor }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    ...globalStyles.shadowStyle,
    marginVertical: 8,
  },
});
