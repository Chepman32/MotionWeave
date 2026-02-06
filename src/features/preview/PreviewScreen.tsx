import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  LayoutChangeEvent,
  Dimensions,
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
import { MediaClip, Project } from '../../shared/types';
import { normalizeMediaUri } from '../../shared/utils/helpers';
import { DEFAULT_IMAGE_DURATION_SECONDS } from '../../shared/constants/media';
import {
  computeMediaFrame,
  getClipResizeMode,
  getClipPan,
} from '../../shared/utils/mediaFraming';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PreviewScreenProps {
  project: Project;
  onBack: () => void;
  onExport?: () => void;
  soundEnabled?: boolean;
  isVisible?: boolean;
}

const getClipEffectiveDurationSeconds = (clip: MediaClip): number => {
  if (clip.type === 'image') {
    return clip.duration > 0 ? clip.duration : DEFAULT_IMAGE_DURATION_SECONDS;
  }

  const trimmedDuration = clip.endTime - clip.startTime;
  if (trimmedDuration > 0) return trimmedDuration;
  return clip.duration > 0 ? clip.duration : 0;
};

type TimelineSegment = {
  clip: MediaClip;
  start: number;
  end: number;
  duration: number;
};

export const PreviewScreen: React.FC<PreviewScreenProps> = ({
  project,
  onBack,
  onExport,
  soundEnabled = true,
  isVisible = true,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const controlsOpacity = useSharedValue(1);
  const videoRef = useRef<VideoRef>(null);
  const currentTimeRef = useRef(0);
  const activeClipIdRef = useRef<string | null>(null);
  const activeSegmentRef = useRef<TimelineSegment | null>(null);
  const pendingSeekRef = useRef<{ clipId: string; time: number } | null>(null);
  const didAutoAdvanceRef = useRef<string | null>(null);
  const [containerSize, setContainerSize] = useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  });
  const [mediaAspectRatio, setMediaAspectRatio] = useState(1);

  const segments = useMemo(() => {
    let t = 0;
    const next: TimelineSegment[] = [];

    project.videos.forEach(clip => {
      const segDuration = getClipEffectiveDurationSeconds(clip);
      const start = t;
      const end = start + segDuration;
      t = end;

      next.push({
        clip,
        start,
        end,
        duration: segDuration,
      });
    });

    return next;
  }, [project.videos]);

  const duration = useMemo(() => {
    if (segments.length === 0) return 0;
    return segments[segments.length - 1].end;
  }, [segments]);

  const getSegmentForTime = useCallback(
    (time: number): { segment: TimelineSegment; localTime: number } | null => {
      if (segments.length === 0 || duration <= 0) return null;

      const clampedTime = Math.max(0, Math.min(duration, time));
      const idx = segments.findIndex(seg => clampedTime < seg.end);
      const segment = idx >= 0 ? segments[idx] : segments[segments.length - 1];
      const localTime = Math.max(0, clampedTime - segment.start);
      return { segment, localTime };
    },
    [duration, segments],
  );

  const active = useMemo(() => {
    return getSegmentForTime(currentTime);
  }, [currentTime, getSegmentForTime]);

  const activeSegment = active?.segment ?? null;
  const activeClip = activeSegment?.clip ?? null;

  const clipResizeMode = activeClip ? getClipResizeMode(activeClip) : 'cover';
  const clipPan = activeClip ? getClipPan(activeClip) : { x: 0, y: 0 };

  const mediaFrame = useMemo(
    () =>
      computeMediaFrame(
        Math.max(containerSize.width, 1),
        Math.max(containerSize.height, 1),
        mediaAspectRatio,
        clipResizeMode,
      ),
    [clipResizeMode, mediaAspectRatio, containerSize.width, containerSize.height],
  );

  const handleSeek = useCallback(
    (time: number, options?: { resetAutoAdvance?: boolean }) => {
      if (segments.length === 0 || duration <= 0) return;
      const clampedTime = Math.max(0, Math.min(duration, time));

      if (options?.resetAutoAdvance !== false) {
        didAutoAdvanceRef.current = null;
      }
      setCurrentTime(clampedTime);

      const next = getSegmentForTime(clampedTime);
      if (!next) return;

      if (next.segment.clip.type === 'video') {
        const seekTo =
          next.segment.clip.startTime +
          Math.min(next.localTime, next.segment.duration);

        pendingSeekRef.current = { clipId: next.segment.clip.id, time: seekTo };

        if (activeClipIdRef.current === next.segment.clip.id) {
          videoRef.current?.seek(seekTo);
          pendingSeekRef.current = null;
        }
      } else {
        pendingSeekRef.current = null;
      }
    },
    [duration, getSegmentForTime, segments.length],
  );

  const toggleControls = () => {
    const newValue = showControls ? 0 : 1;
    controlsOpacity.value = withTiming(newValue, { duration: 300 });
    setShowControls(!showControls);
  };

  const togglePlayPause = () => {
    setIsPlaying(p => !p);
  };

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(toggleControls)();
  });

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (!activeClip) {
      setMediaAspectRatio(1);
      return;
    }

    // Use cached aspect ratio if available
    if (activeClip.aspectRatio) {
      setMediaAspectRatio(activeClip.aspectRatio);
      return;
    }

    // Fallback: detect aspect ratio for old clips without cached value
    setMediaAspectRatio(1);

    if (activeClip.type === 'image') {
      const imageUri = normalizeMediaUri(activeClip.localUri);
      let isCancelled = false;

      Image.getSize(
        imageUri,
        (width, height) => {
          if (isCancelled) return;
          if (width > 0 && height > 0) {
            setMediaAspectRatio(width / height);
          }
        },
        () => {
          if (!isCancelled) {
            setMediaAspectRatio(1);
          }
        },
      );

      return () => {
        isCancelled = true;
      };
    }
  }, [activeClip?.id, activeClip?.aspectRatio]);

  useEffect(() => {
    if (!isVisible) {
      setIsPlaying(false);
      return;
    }

    // Autoplay from the beginning whenever the preview is shown.
    handleSeek(0);
    setIsPlaying(true);
  }, [handleSeek, isVisible]);

  useEffect(() => {
    activeClipIdRef.current = activeSegment?.clip.id ?? null;
    activeSegmentRef.current = activeSegment;
    didAutoAdvanceRef.current = null;

    if (!activeSegment || activeSegment.clip.type !== 'video') return;

    const localTime = Math.max(0, currentTimeRef.current - activeSegment.start);
    const seekTo =
      activeSegment.clip.startTime +
      Math.min(localTime, activeSegment.duration);

    pendingSeekRef.current = { clipId: activeSegment.clip.id, time: seekTo };
  }, [activeSegment]);

  const handleVideoLoad = useCallback((data: OnLoadData) => {
    const width = Number(data?.naturalSize?.width || 0);
    const height = Number(data?.naturalSize?.height || 0);
    if (width > 0 && height > 0) {
      setMediaAspectRatio(width / height);
    }

    const pending = pendingSeekRef.current;
    const activeClipId = activeClipIdRef.current;
    if (!pending || !activeClipId || pending.clipId !== activeClipId) return;

    videoRef.current?.seek(pending.time);
    pendingSeekRef.current = null;
  }, []);

  const handleVideoProgress = useCallback(
    (clipId: string, data: OnProgressData) => {
      if (!isPlaying) return;
      if (clipId !== activeClipIdRef.current) return;

      const seg = activeSegmentRef.current;
      if (!seg || seg.clip.id !== clipId) return;

      const localTime = Math.max(0, data.currentTime - seg.clip.startTime);
      const clampedLocal = Math.min(localTime, seg.duration);
      const globalTime = seg.start + clampedLocal;

      setCurrentTime(globalTime);

      if (seg.duration <= 0) return;
      if (didAutoAdvanceRef.current === clipId) return;

      if (clampedLocal >= seg.duration - 0.05) {
        didAutoAdvanceRef.current = clipId;
        handleSeek(seg.end >= duration ? 0 : seg.end, { resetAutoAdvance: false });
      }
    },
    [duration, handleSeek, isPlaying],
  );

  useEffect(() => {
    if (!isPlaying) return;
    if (!activeSegment) return;
    if (activeSegment.clip.type !== 'image') return;
    if (duration <= 0) return;

    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;

      setCurrentTime(prev => {
        const next = prev + dt;
        if (next < duration) return next;
        return duration > 0 ? next % duration : 0;
      });
    }, 250);

    return () => clearInterval(id);
  }, [activeSegment, duration, isPlaying]);

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Video Player Area */}
      <GestureDetector gesture={tapGesture}>
        <View
          style={styles.videoContainer}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setContainerSize({ width, height });
            }
          }}
        >
          {activeClip ? (
            <View
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: mediaFrame.width,
                height: mediaFrame.height,
                marginLeft: -mediaFrame.width / 2,
                marginTop: -mediaFrame.height / 2,
                overflow: 'hidden',
                transform: [
                  { translateX: clipPan.x * mediaFrame.maxPanX },
                  { translateY: clipPan.y * mediaFrame.maxPanY },
                ],
              }}
            >
              {activeClip.type === 'video' ? (
                <Video
                  key={activeClip.id}
                  ref={videoRef}
                  source={{ uri: normalizeMediaUri(activeClip.localUri) }}
                  style={styles.fullscreenMedia}
                  resizeMode="stretch"
                  paused={!isPlaying}
                  repeat={false}
                  muted={!soundEnabled}
                  progressUpdateInterval={250}
                  onLoad={handleVideoLoad}
                  onProgress={data =>
                    handleVideoProgress(activeClip.id, data)
                  }
                />
              ) : (
                <Image
                  key={activeClip.id}
                  source={{ uri: normalizeMediaUri(activeClip.localUri) }}
                  style={styles.fullscreenMedia}
                  resizeMode="stretch"
                />
              )}
            </View>
          ) : (
            <View style={styles.emptyComposition}>
              <AppIcon name="videocam-outline" size={48} color="#FFFFFF" />
              <Text style={styles.emptyText}>No media to preview</Text>
            </View>
          )}
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
    overflow: 'hidden',
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
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  fullscreenMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
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
