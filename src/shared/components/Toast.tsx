import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../constants/theme';
import { AppIcon, AppIconName } from './AppIcon';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss?: () => void;
}

const TOAST_ICONS: Record<ToastType, AppIconName> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
  warning: 'warning',
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const translateY = useSharedValue(-100);

  useEffect(() => {
    translateY.value = withSpring(0);

    const timeout = setTimeout(() => {
      translateY.value = withSpring(-100);
      if (onDismiss) {
        setTimeout(onDismiss, 300);
      }
    }, duration);

    return () => clearTimeout(timeout);
  }, [duration, onDismiss, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return '#F59E0B';
      default:
        return colors.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: getBackgroundColor() },
        animatedStyle,
      ]}
    >
      <AppIcon
        name={TOAST_ICONS[type]}
        size={20}
        color="#FFFFFF"
        style={styles.icon}
      />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: SPACING.xl,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: '#FFFFFF',
    flex: 1,
  },
});
