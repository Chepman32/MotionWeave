import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import { CustomButton } from '../../shared/components/CustomButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const SCREENS = [
  {
    title: 'Create Stunning Video Collages',
    subtitle: 'Combine multiple videos into one masterpiece',
    emoji: '🎬',
  },
  {
    title: 'Easy Editing',
    subtitle: 'Drag, drop, and customize with intuitive gestures',
    emoji: '✨',
  },
  {
    title: 'Professional Export',
    subtitle: 'Export in high quality up to 4K resolution',
    emoji: '🎯',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onComplete,
}) => {
  const { colors, gradients, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);

  const handleNext = () => {
    if (currentIndex < SCREENS.length - 1) {
      setCurrentIndex(currentIndex + 1);
      translateX.value = withSpring(-(currentIndex + 1) * SCREEN_WIDTH);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      translateX.value = -(currentIndex * SCREEN_WIDTH) + e.translationX;
    })
    .onEnd(e => {
      if (
        e.translationX < -SCREEN_WIDTH / 3 &&
        currentIndex < SCREENS.length - 1
      ) {
        setCurrentIndex(currentIndex + 1);
        translateX.value = withSpring(-(currentIndex + 1) * SCREEN_WIDTH);
      } else if (e.translationX > SCREEN_WIDTH / 3 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        translateX.value = withSpring(-(currentIndex - 1) * SCREEN_WIDTH);
      } else {
        translateX.value = withSpring(-currentIndex * SCREEN_WIDTH);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        opacity={0.1}
      />

      {/* Skip Button */}
      <TouchableOpacity onPress={handleSkip} style={[styles.skipButton, { top: insets.top + SPACING.md }]}>
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>
          Skip
        </Text>
      </TouchableOpacity>

      {/* Screens */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.screensContainer, animatedStyle]}>
          {SCREENS.map((screen, index) => (
            <View key={index} style={styles.screen}>
              <Text style={styles.emoji}>{screen.emoji}</Text>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {screen.title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {screen.subtitle}
              </Text>
            </View>
          ))}
        </Animated.View>
      </GestureDetector>

      {/* Page Indicators */}
      <View style={styles.indicators}>
        {SCREENS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor:
                  index === currentIndex ? colors.primary : colors.border,
                width: index === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <CustomButton onPress={handleNext} variant="primary">
          {currentIndex === SCREENS.length - 1 ? 'Get Started' : 'Next'}
        </CustomButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: SPACING.lg,
    zIndex: 10,
    padding: SPACING.sm,
  },
  skipText: {
    ...TYPOGRAPHY.body,
  },
  screensContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  screen: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emoji: {
    fontSize: 80,
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.h1,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
});
