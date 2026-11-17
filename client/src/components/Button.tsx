import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { theme } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: (event?: any) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  style,
  textStyle,
  children,
  hitSlop,
}) => {
  const isInteractive = !disabled && !loading;

  // Determine spinner color based on variant
  const getSpinnerColor = () => {
    switch (variant) {
      case 'primary':
        return theme.colors.primaryContrast;
      case 'danger':
        return theme.colors.error;
      case 'secondary':
      case 'ghost':
      default:
        return theme.colors.ink;
    }
  };

  const containerStyles = [
    styles.base,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.textBase,
    styles[`textSize_${size}`],
    styles[`textVariant_${variant}`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyles}
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      activeOpacity={variant === 'primary' ? 0.8 : 0.65}
      hitSlop={hitSlop}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getSpinnerColor()} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          {title ? <Text style={textStyles}>{title}</Text> : null}
          {children}
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.sm,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.55,
  },
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },

  // Size variations
  size_sm: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: theme.radii.sm,
  },
  size_md: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: theme.radii.sm,
  },
  size_lg: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: theme.radii.md,
  },

  // Variant backgrounds & borders
  variant_primary: {
    backgroundColor: theme.colors.primary,
    borderWidth: 0,
  },
  variant_secondary: {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  variant_danger: {
    backgroundColor: theme.colors.errorBackground,
    borderColor: theme.colors.errorBorder,
    borderWidth: 1,
  },

  // Text variations
  textBase: {
    fontWeight: '500',
    textAlign: 'center',
  },
  textSize_sm: {
    fontSize: 13,
    lineHeight: 18,
  },
  textSize_md: {
    fontSize: 14,
    lineHeight: 20,
  },
  textSize_lg: {
    fontSize: 15,
    lineHeight: 22,
  },

  textVariant_primary: {
    color: theme.colors.primaryContrast,
  },
  textVariant_secondary: {
    color: theme.colors.ink,
  },
  textVariant_ghost: {
    color: theme.colors.ink,
  },
  textVariant_danger: {
    color: theme.colors.error,
  },
});
