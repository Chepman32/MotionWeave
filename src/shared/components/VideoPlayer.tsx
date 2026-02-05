import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';
import { SPACING } from '../constants/theme';
import { AppIcon } from './AppIcon';

interface VideoPlayerProps {
  uri: string;
  paused?: boolean;
  onProgress?: (progress: number) => void;
  onEnd?: () => void;
  style?: any;
  showControls?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  paused = false,
  onProgress,
  onEnd,
  style,
  showControls = true,
}) => {
  const { colors } = useTheme();
  const videoRef = useRef<VideoRef>(null);
  const [isPlaying, setIsPlaying] = useState(!paused);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const controlsOpacity = useSharedValue(1);

  useEffect(() => {
    setIsPlaying(!paused);
  }, [paused]);

  const handleProgress = (data: any) => {
    setCurrentTime(data.currentTime);
    if (onProgress) {
      const progress = (data.currentTime / duration) * 100;
      onProgress(progress);
    }
  };

  const handleLoad = (data: any) => {
    setDuration(data.duration);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, style]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={styles.video}
        paused={!isPlaying}
        onProgress={handleProgress}
        onLoad={handleLoad}
        onEnd={onEnd}
        resizeMode="cover"
        repeat={false}
      />

      {showControls && (
        <Animated.View style={[styles.controls, controlsStyle]}>
          <TouchableOpacity
            onPress={togglePlayPause}
            style={[styles.playButton, { backgroundColor: colors.primary }]}
          >
            <AppIcon
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.timeContainer}>
            <Text style={[styles.timeText, { color: colors.textPrimary }]}>
              {formatTime(currentTime)}
            </Text>
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {' / '}
            </Text>
            <Text style={[styles.timeText, { color: colors.textPrimary }]}>
              {formatTime(duration)}
            </Text>
          </View>

          <View
            style={[styles.progressBar, { backgroundColor: colors.border }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${(currentTime / duration) * 100}%`,
                },
              ]}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.sm,
  },
  playIcon: {},
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  timeText: {
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
