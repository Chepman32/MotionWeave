import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PreviewScreenProps {
  onBack: () => void;
  onExport: () => void;
}

export const PreviewScreen: React.FC<PreviewScreenProps> = ({
  onBack,
  onExport,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsOpacity = useSharedValue(1);

  const toggleControls = () => {
    const newValue = showControls ? 0 : 1;
    controlsOpacity.value = withTiming(newValue, { duration: 300 });
    setShowControls(!showControls);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(toggleControls)();
  });

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Video Player Area */}
      <GestureDetector gesture={tapGesture}>
        <View style={styles.videoContainer}>
          <View style={styles.videoPlaceholder}>
            <Text style={styles.placeholderText}>Video Preview</Text>
          </View>
        </View>
      </GestureDetector>

      {/* Top Controls */}
      <Animated.View style={[styles.topControls, controlsStyle]}>
        <TouchableOpacity onPress={onBack} style={styles.controlButton}>
          <Text style={styles.controlIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Preview</Text>
        <TouchableOpacity onPress={onExport} style={styles.controlButton}>
          <Text style={styles.controlIcon}>↗</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Controls */}
      <Animated.View style={[styles.bottomControls, controlsStyle]}>
        {/* Timeline */}
        <View style={styles.timeline}>
          <View
            style={[
              styles.timelineProgress,
              { backgroundColor: colors.primary },
            ]}
          />
        </View>

        {/* Playback Controls */}
        <View style={styles.playbackControls}>
          <Text style={styles.timeText}>0:00</Text>

          <View style={styles.centerControls}>
            <TouchableOpacity style={styles.skipButton}>
              <Text style={styles.controlIcon}>⏮</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={togglePlayPause}
              style={styles.playButton}
            >
              <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton}>
              <Text style={styles.controlIcon}>⏭</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.timeText}>0:00</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    width: SCREEN_WIDTH * 0.9,
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 18,
    opacity: 0.5,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: '#FFFFFF',
  },
  controlButton: {
    padding: SPACING.sm,
  },
  controlIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  timeline: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: SPACING.md,
  },
  timelineProgress: {
    height: '100%',
    width: '30%',
    borderRadius: 2,
  },
  playbackControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  skipButton: {
    padding: SPACING.sm,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
});
