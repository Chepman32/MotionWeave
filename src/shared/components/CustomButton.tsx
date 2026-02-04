import React from 'react';
import { Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { SPACING } from '../constants/theme';

interface CustomButtonProps {
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  onPress,
  variant = 'primary',
  children,
  disabled = false,
  loading = false,
  style,
}) => {
  const { colors, gradients } = useTheme();
  const scale = useSharedValue(1);

  const gesture = Gesture.Tap()
    .enabled(!disabled && !loading)
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      runOnJS(onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const buttonStyle: ViewStyle = {
    ...styles.button,
    opacity: disabled ? 0.5 : 1,
    ...(variant === 'secondary' && {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.primary,
    }),
    ...(variant === 'tertiary' && {
      backgroundColor: 'transparent',
    }),
  };

  const textStyle: TextStyle = {
    ...styles.text,
    color: variant === 'primary' ? '#FFFFFF' : colors.primary,
  };

  if (variant === 'primary') {
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[animatedStyle, style]}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={buttonStyle}
          >
            <Text style={textStyle}>{children}</Text>
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[buttonStyle, animatedStyle, style]}>
        <Text style={textStyle}>{children}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
