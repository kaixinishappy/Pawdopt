import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/GlobalStyles';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradientColors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
}

interface BackButtonProps {
  onPress: () => void;
  color?: string;
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
  textStyle,
  gradientColors = [colors.yellow, colors.red],
}) => {
  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        style={[styles.button, styles[size], disabled && styles.disabled, style]}
        onPress={onPress}
        disabled={disabled}
      >
        <LinearGradient
          colors={gradientColors}
          style={[styles.gradient, styles[size]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.text, styles.gradientText, textStyle]}>
            {title}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[variant],
        styles[size],
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

export const BackButton: React.FC<BackButtonProps> = ({
  onPress,
  color = colors.orange,
  size = 24,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.backButtonContainer, style]}
    >
      <Ionicons name="chevron-back" size={size} color={color} style={textStyle} />
    </TouchableOpacity>
  );
};

export const GradientButton: React.FC<GradientButtonProps> = ({ 
  onPress, 
  title, 
  style, 
  textStyle 
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.gradientButtonWrapper, style]}>
      <LinearGradient
        colors={[colors.yellow, colors.red]}
        style={styles.gradientButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[styles.gradientButtonText, textStyle]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  primary: {
    backgroundColor: colors.red,
  },
  secondary: {
    backgroundColor: colors.orange,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.red,
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  medium: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  large: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.red,
  },
  gradientText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  // BackButton styles
  backButtonContainer: {
    alignSelf: 'flex-start',
    padding: 5,
  },
  // GradientButton styles
  gradientButtonWrapper: {
    width: '100%',
    borderRadius: 50,
    overflow: 'hidden',
  },
  gradientButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  gradientButtonText: {
    fontWeight: 'bold',
    fontSize: 20,
    color: colors.white,
  },
});
