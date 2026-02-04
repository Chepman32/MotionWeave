import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {
  Canvas,
  Group,
  RoundedRect,
  useFont,
} from '@shopify/react-native-skia';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../shared/hooks/useTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const { colors, gradients } = useTheme();
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Phase 1: Entrance (0-0.5s)
    logoOpacity.value = withTiming(1, { duration: 300 });
    logoScale.value = withSpring(1, { damping: 15, stiffness: 100 });

    // Phase 2-4: Complete animation sequence
    progress.value = withDelay(
      500,
      withSequence(
        // Fragmentation phase
        withTiming(0.3, { duration: 800, easing: Easing.out(Easing.ease) }),
        // Reassembly phase
        withTiming(0.7, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        // Solidification
        withTiming(1, { duration: 400 }, () => {
          runOnJS(onComplete)();
        }),
      ),
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <View style={styles.logo}>
          <View
            style={[styles.logoBlock, { backgroundColor: colors.surface }]}
          />
          <View
            style={[
              styles.logoBlock,
              { backgroundColor: colors.surface, marginLeft: 8 },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBlock: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
});
