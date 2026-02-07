import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../hooks/useTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: number[];
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  children,
  snapPoints = [0.25, 0.5, 0.9],
}) => {
  const { colors } = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const openSnapPoint = snapPoints.length > 1 ? snapPoints[1] : snapPoints[0] || 0.5;

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(SCREEN_HEIGHT * (1 - openSnapPoint));
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT);
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [backdropOpacity, isVisible, openSnapPoint, translateY]);

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      const newY = SCREEN_HEIGHT * (1 - openSnapPoint) + e.translationY;
      if (newY > 0) {
        translateY.value = newY;
      }
    })
    .onEnd(e => {
      if (e.velocityY > 500 || translateY.value > SCREEN_HEIGHT * 0.6) {
        translateY.value = withSpring(SCREEN_HEIGHT);
        backdropOpacity.value = withTiming(0);
        runOnJS(onClose)();
      } else {
        const closestSnapPoint = snapPoints.reduce((prev, curr) => {
          const prevDist = Math.abs(
            translateY.value - SCREEN_HEIGHT * (1 - prev),
          );
          const currDist = Math.abs(
            translateY.value - SCREEN_HEIGHT * (1 - curr),
          );
          return currDist < prevDist ? curr : prev;
        });
        translateY.value = withSpring(SCREEN_HEIGHT * (1 - closestSnapPoint));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!isVisible && translateY.value >= SCREEN_HEIGHT) {
    return null;
  }

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        >
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={10}
            reducedTransparencyFallbackColor={colors.background}
          />
        </TouchableOpacity>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface },
            sheetStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          {children}
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
});
