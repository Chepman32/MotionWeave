import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import { MediaClip } from '../../shared/types';

interface TimelineComponentProps {
  clips: MediaClip[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onClipSelect: (clipId: string) => void;
  selectedClipId?: string;
}

export const TimelineComponent: React.FC<TimelineComponentProps> = ({
  clips,
  currentTime,
  duration,
  onSeek,
  onClipSelect,
  selectedClipId,
}) => {
  const { colors } = useTheme();
  const [zoom, setZoom] = useState(1);
  const playheadX = useSharedValue(0);

  const handlePlayheadDrag = (translationX: number) => {
    const timelineWidth = 300 * zoom; // Approximate timeline width
    const newTime = (translationX / timelineWidth) * duration;
    const clampedTime = Math.max(0, Math.min(duration, newTime));
    onSeek(clampedTime);
  };

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      playheadX.value = e.translationX;
    })
    .onEnd(e => {
      runOnJS(handlePlayheadDrag)(e.translationX);
      playheadX.value = withSpring(0);
    });

  const pinchGesture = Gesture.Pinch().onUpdate(e => {
    const newZoom = Math.max(0.5, Math.min(4, zoom * e.scale));
    runOnJS(setZoom)(newZoom);
  });

  const playheadStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: playheadX.value }],
  }));

  const playheadPosition = (currentTime / duration) * 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Timeline
        </Text>
        <View style={styles.zoomControls}>
          <TouchableOpacity
            onPress={() => setZoom(Math.max(0.5, zoom - 0.5))}
            style={[styles.zoomButton, { backgroundColor: colors.border }]}
          >
            <Text style={{ color: colors.textPrimary }}>-</Text>
          </TouchableOpacity>
          <Text style={[styles.zoomText, { color: colors.textSecondary }]}>
            {zoom.toFixed(1)}x
          </Text>
          <TouchableOpacity
            onPress={() => setZoom(Math.min(4, zoom + 0.5))}
            style={[styles.zoomButton, { backgroundColor: colors.border }]}
          >
            <Text style={{ color: colors.textPrimary }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <GestureDetector gesture={Gesture.Simultaneous(panGesture, pinchGesture)}>
        <View style={styles.timelineContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tracksScroll}
          >
            <View style={styles.tracks}>
              {clips.map((clip, index) => (
                <TimelineClip
                  key={clip.id}
                  clip={clip}
                  index={index}
                  zoom={zoom}
                  isSelected={selectedClipId === clip.id}
                  onSelect={() => onClipSelect(clip.id)}
                  colors={colors}
                />
              ))}
            </View>
          </ScrollView>

          {/* Playhead */}
          <Animated.View
            style={[
              styles.playhead,
              { backgroundColor: colors.error, left: `${playheadPosition}%` },
              playheadStyle,
            ]}
          >
            <View
              style={[styles.playheadHandle, { backgroundColor: colors.error }]}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.timeMarkers}>
        <Text style={[styles.timeMarker, { color: colors.textSecondary }]}>
          {formatTime(currentTime)}
        </Text>
        <Text style={[styles.timeMarker, { color: colors.textSecondary }]}>
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
};

const TimelineClip: React.FC<{
  clip: MediaClip;
  index: number;
  zoom: number;
  isSelected: boolean;
  onSelect: () => void;
  colors: any;
}> = ({ clip, index, zoom, isSelected, onSelect, colors }) => {
  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      runOnJS(onSelect)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const clipWidth = (clip.duration / 10) * 60 * zoom; // 60px per second at 1x zoom

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.clip,
          {
            width: clipWidth,
            backgroundColor: isSelected ? colors.primary : colors.border,
            borderColor: isSelected ? colors.primary : 'transparent',
          },
          animatedStyle,
        ]}
      >
        <Text style={[styles.clipIndex, { color: colors.textPrimary }]}>
          {index + 1}
        </Text>
        <Text style={[styles.clipDuration, { color: colors.textSecondary }]}>
          {formatTime(clip.duration)}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    height: 150,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  zoomButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    ...TYPOGRAPHY.small,
    minWidth: 40,
    textAlign: 'center',
  },
  timelineContainer: {
    flex: 1,
    position: 'relative',
  },
  tracksScroll: {
    flex: 1,
  },
  tracks: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  clip: {
    height: 60,
    borderRadius: 8,
    padding: SPACING.sm,
    justifyContent: 'space-between',
    borderWidth: 2,
  },
  clipIndex: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  clipDuration: {
    ...TYPOGRAPHY.small,
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 10,
  },
  playheadHandle: {
    position: 'absolute',
    top: -4,
    left: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  timeMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
  },
  timeMarker: {
    ...TYPOGRAPHY.small,
  },
});
