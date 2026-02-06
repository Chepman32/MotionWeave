import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  LayoutChangeEvent,
} from 'react-native';
import Video, { VideoRef, OnProgressData, OnLoadData } from 'react-native-video';
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
import { AppIcon } from '../../shared/components/AppIcon';
import { LayoutConfig, MediaClip, Project } from '../../shared/types';
import { normalizeMediaUri } from '../../shared/utils/helpers';

interface PreviewScreenProps {
  project: Project;
  onBack: () => void;
  onExport?: () => void;
  soundEnabled?: boolean;
}

export const PreviewScreen: React.FC<PreviewScreenProps> = ({
  project,
  onBack,
  onExport,
  soundEnabled = true,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const controlsOpacity = useSharedValue(1);
  const videoRef = useRef<VideoRef>(null);

  const handleProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
  };

  const handleSeek = (time: number) => {
    const clampedTime = Math.max(0, Math.min(duration, time));
    videoRef.current?.seek(clampedTime);
    setCurrentTime(clampedTime);
  };

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
          <CompositionPreview
            layout={project.layout}
            clips={project.videos}
            isPlaying={isPlaying}
            soundEnabled={soundEnabled}
            videoRef={videoRef}
            onProgress={handleProgress}
            onLoad={handleLoad}
          />
        </View>
      </GestureDetector>

      {/* Top Controls */}
      <Animated.View
        style={[
          styles.topControls,
          { paddingTop: insets.top + SPACING.sm },
          controlsStyle,
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.controlButton}>
          <AppIcon name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Preview</Text>
        {onExport ? (
          <TouchableOpacity onPress={onExport} style={styles.controlButton}>
            <AppIcon name="share-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.controlButton} />
        )}
      </Animated.View>

      {/* Bottom Controls */}
      <Animated.View
        style={[
          styles.bottomControls,
          { paddingBottom: insets.bottom + SPACING.lg },
          controlsStyle,
        ]}
      >
        <PlaybackTimeline
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
        />
        <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
          <AppIcon
            name={isPlaying ? 'pause' : 'play'}
            size={22}
            color="#FFFFFF"
          />
          <Text style={styles.playLabel}>
            {isPlaying ? 'Pause' : 'Play'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const getAspectRatio = (aspectRatio: LayoutConfig['aspectRatio']): number => {
  switch (aspectRatio) {
    case '16:9':
      return 16 / 9;
    case '9:16':
      return 9 / 16;
    case '4:3':
      return 4 / 3;
    case '1:1':
    default:
      return 1;
  }
};

const CompositionPreview: React.FC<{
  layout: LayoutConfig;
  clips: MediaClip[];
  isPlaying: boolean;
  soundEnabled: boolean;
  videoRef?: React.RefObject<VideoRef | null>;
  onProgress?: (data: OnProgressData) => void;
  onLoad?: (data: OnLoadData) => void;
}> = ({ layout, clips, isPlaying, soundEnabled, videoRef, onProgress, onLoad }) => {
  // For preview, show the first clip fullscreen
  const first = clips[0] ?? null;

  if (!first) {
    return (
      <View style={styles.emptyComposition}>
        <AppIcon name="videocam-outline" size={48} color="#FFFFFF" />
        <Text style={styles.emptyText}>No media to preview</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullscreenPreview}>
      {first.type === 'video' ? (
        <Video
          ref={videoRef}
          source={{ uri: normalizeMediaUri(first.localUri) }}
          style={styles.fullscreenMedia}
          resizeMode="cover"
          paused={!isPlaying}
          repeat={true}
          muted={!soundEnabled}
          onProgress={onProgress}
          onLoad={onLoad}
        />
      ) : (
        <Image
          source={{ uri: normalizeMediaUri(first.localUri) }}
          style={styles.fullscreenMedia}
          resizeMode="cover"
        />
      )}
    </View>
  );

};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface PlaybackTimelineProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

const PlaybackTimeline: React.FC<PlaybackTimelineProps> = ({
  currentTime,
  duration,
  onSeek,
}) => {
  const [timelineWidth, setTimelineWidth] = useState(0);
  const seekPosition = useSharedValue(0);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleLayout = (event: LayoutChangeEvent) => {
    setTimelineWidth(event.nativeEvent.layout.width);
  };

  const handleSeekFromPosition = (x: number) => {
    if (timelineWidth > 0 && duration > 0) {
      const seekTime = (x / timelineWidth) * duration;
      onSeek(seekTime);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart((e) => {
      seekPosition.value = e.x;
    })
    .onUpdate((e) => {
      seekPosition.value = Math.max(0, Math.min(timelineWidth, e.x));
      runOnJS(handleSeekFromPosition)(seekPosition.value);
    })
    .onEnd(() => {
      seekPosition.value = 0;
    });

  const tapGesture = Gesture.Tap()
    .onEnd((e) => {
      runOnJS(handleSeekFromPosition)(e.x);
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const playheadStyle = useAnimatedStyle(() => ({
    left: `${progress}%`,
  }));

  return (
    <View style={styles.timelineContainer}>
      <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.timelineTrack} onLayout={handleLayout}>
          <View style={styles.timelineBackground} />
          <View style={[styles.timelineProgress, { width: `${progress}%` }]} />
          <Animated.View style={[styles.playhead, playheadStyle]} />
        </View>
      </GestureDetector>
      <Text style={styles.timeText}>{formatTime(duration)}</Text>
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
  composition: {
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
  },
  cellWrapper: {},
  cell: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  emptyCell: {
    flex: 1,
    backgroundColor: '#000000',
    opacity: 0.2,
  },
  compositionMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  emptyComposition: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  fullscreenPreview: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  fullscreenMedia: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  emptyText: {
    color: '#FFFFFF',
    opacity: 0.7,
    ...TYPOGRAPHY.body,
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
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    gap: SPACING.sm,
  },
  playLabel: {
    ...TYPOGRAPHY.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  timelineTrack: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  timelineBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  timelineProgress: {
    position: 'absolute',
    left: 0,
    top: 20,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  playhead: {
    position: 'absolute',
    top: 15,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginLeft: -7,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
});
