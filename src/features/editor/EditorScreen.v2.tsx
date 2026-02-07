import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
  StatusBar,
  Image,
  Modal,
  LayoutChangeEvent,
} from 'react-native';
import Video, { VideoRef, OnProgressData, OnLoadData } from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useFrameCallback,
  useAnimatedRef,
  useAnimatedReaction,
  scrollTo,
  LinearTransition,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import {
  MediaClip,
  LayoutConfig,
  Project,
  TransformConfig,
} from '../../shared/types';
import { VideoImportService } from '../../processes/video-processing/VideoImportService';
import { ExportModal } from '../export/ExportModal';
import { useProjectStore } from '../../entities/project/store';
import { createNewProject } from '../../entities/project/utils';
import { AppIcon } from '../../shared/components/AppIcon';
import { PreviewScreen } from '../preview/PreviewScreen';
import { usePreferencesStore } from '../../shared/stores/preferencesStore';
import { normalizeMediaUri } from '../../shared/utils/helpers';
import { DEFAULT_IMAGE_DURATION_SECONDS } from '../../shared/constants/media';
import {
  clampNormalizedPan,
  computeMediaFrame,
  getClipPan,
  getClipResizeMode,
} from '../../shared/utils/mediaFraming';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedAppIcon = Animated.createAnimatedComponent(AppIcon);
const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const PIXELS_PER_SECOND = 40;
const MIN_CLIP_DURATION = 0.5;
const TRIM_HANDLE_WIDTH = 24;
const TIMELINE_CLIP_HEIGHT = 56;
const PLAYHEAD_COLOR = '#FFFFFF';
const SELECTED_COLOR = '#FFD700';

type TimelineSegment = {
  clip: MediaClip;
  start: number;
  end: number;
  duration: number;
};

const getClipEffectiveDuration = (clip: MediaClip): number => {
  const trimmed = clip.endTime - clip.startTime;
  if (trimmed > 0) return trimmed;
  if (clip.type === 'image') {
    return clip.duration > 0 ? clip.duration : DEFAULT_IMAGE_DURATION_SECONDS;
  }
  return clip.duration > 0 ? clip.duration : 0;
};

interface EditorScreenV2Props {
  onBack: () => void;
  layout?: LayoutConfig;
  projectId?: string;
}

export const EditorScreenV2: React.FC<EditorScreenV2Props> = ({
  onBack,
  layout,
  projectId,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { currentProject, setCurrentProject, addProject, updateProject } =
    useProjectStore();

  const [project, setProject] = useState<Project | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [timelineScale, setTimelineScale] = useState(1);
  const [isAssetsExpanded, setIsAssetsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'layout' | 'effects' | 'audio' | 'export'
  >('layout');
  const [, setIsImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [clipViewportAspectRatios, setClipViewportAspectRatios] = useState<
    Record<string, number>
  >({});
  const soundEnabled = usePreferencesStore(state => state.soundEnabled);

  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<VideoRef>(null);
  const currentTimeRef = useRef(0);
  const activeClipIdRef = useRef<string | null>(null);
  const activeSegmentRef = useRef<TimelineSegment | null>(null);
  const pendingSeekRef = useRef<{ clipId: string; time: number } | null>(null);
  const didAutoAdvanceRef = useRef<string | null>(null);

  const historyRef = useRef<Project[]>([]);
  const historyIndexRef = useRef(-1);
  const [, setHistoryVersion] = useState(0);

  const assetsExpandedProgress = useSharedValue(0);
  const assetsChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${assetsExpandedProgress.value * 180}deg` }],
  }));

  // Timeline segments & playback logic
  const segments = useMemo(() => {
    if (!project) return [];
    let t = 0;
    const segs: TimelineSegment[] = [];
    project.videos.forEach(clip => {
      const d = getClipEffectiveDuration(clip);
      segs.push({ clip, start: t, end: t + d, duration: d });
      t += d;
    });
    return segs;
  }, [project]);

  const totalDuration = useMemo(() => {
    if (segments.length === 0) return 0;
    return segments[segments.length - 1].end;
  }, [segments]);

  const getSegmentForTime = useCallback(
    (time: number): { segment: TimelineSegment; localTime: number } | null => {
      if (segments.length === 0 || totalDuration <= 0) return null;
      const clamped = Math.max(0, Math.min(totalDuration, time));
      const idx = segments.findIndex(seg => clamped < seg.end);
      const segment = idx >= 0 ? segments[idx] : segments[segments.length - 1];
      const localTime = Math.max(0, clamped - segment.start);
      return { segment, localTime };
    },
    [totalDuration, segments],
  );

  const activePlayback = useMemo(
    () => getSegmentForTime(currentTime),
    [currentTime, getSegmentForTime],
  );
  const activeSegment = activePlayback?.segment ?? null;

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

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

  const handleVideoLoad = useCallback(() => {
    const pending = pendingSeekRef.current;
    const activeId = activeClipIdRef.current;
    if (!pending || !activeId || pending.clipId !== activeId) return;
    videoRef.current?.seek(pending.time);
    pendingSeekRef.current = null;
  }, []);

  const handleTimelineSeek = useCallback(
    (time: number, resetAutoAdvance = true) => {
      if (segments.length === 0 || totalDuration <= 0) return;
      const clamped = Math.max(0, Math.min(totalDuration, time));
      if (resetAutoAdvance) didAutoAdvanceRef.current = null;
      setCurrentTime(clamped);

      const next = getSegmentForTime(clamped);
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
    [totalDuration, getSegmentForTime, segments.length],
  );

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

      if (seg.duration <= 0 || didAutoAdvanceRef.current === clipId) return;
      if (clampedLocal >= seg.duration - 0.05) {
        didAutoAdvanceRef.current = clipId;
        handleTimelineSeek(seg.end >= totalDuration ? 0 : seg.end, false);
      }
    },
    [totalDuration, isPlaying, handleTimelineSeek],
  );

  // Image playback timer
  useEffect(() => {
    if (!isPlaying || !activeSegment || activeSegment.clip.type !== 'image') return;
    if (totalDuration <= 0) return;

    let rafId = 0;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;

      setCurrentTime(prev => {
        const next = prev + dt;
        if (next >= totalDuration) return 0;
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [activeSegment, totalDuration, isPlaying]);

  useEffect(() => {
    if (totalDuration <= 0) {
      if (currentTime !== 0) {
        setCurrentTime(0);
      }
      return;
    }
    if (currentTime > totalDuration) {
      setCurrentTime(totalDuration);
    }
  }, [currentTime, totalDuration]);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  useEffect(() => {
    if (project) return;

    const initializeProject = async () => {
      if (projectId && currentProject) {
        setProject(currentProject);
        historyRef.current = [currentProject];
        historyIndexRef.current = 0;
        setHistoryVersion(v => v + 1);
      } else {
        const newProject = createNewProject('', layout);
        setProject(newProject);
        setCurrentProject(newProject);
        historyRef.current = [newProject];
        historyIndexRef.current = 0;
        setHistoryVersion(v => v + 1);
      }
    };

    initializeProject().catch(error =>
      console.error('Failed to initialize project:', error),
    );
  }, [project, projectId, currentProject, layout, setCurrentProject]);

  const handlePickMedia = async () => {
    if (!project) return;

    try {
      setIsImporting(true);

      const media = await VideoImportService.pickMedia();
      
      if (media.length === 0) {
        return; // User cancelled
      }

      const mediaClips: MediaClip[] = media.map((item, index) => {
        const effectiveDuration =
          item.type === 'image'
            ? item.duration > 0
              ? item.duration
              : DEFAULT_IMAGE_DURATION_SECONDS
            : item.duration;

        const aspectRatio =
          item.width > 0 && item.height > 0
            ? item.width / item.height
            : undefined;

        return {
          id: item.id,
          localUri: item.localPath,
          thumbnailUri: item.thumbnailPath,
          type: item.type,
          duration: effectiveDuration,
          startTime: 0,
          endTime: effectiveDuration,
          position: {
            row: Math.floor(
              (project.videos.length + index) / (project.layout.cols || 2),
            ),
            col: (project.videos.length + index) % (project.layout.cols || 2),
          },
          transform: {
            scale: 1,
            translateX: 0,
            translateY: 0,
            rotation: 0,
            resizeMode: 'cover',
          },
          aspectRatio,
          filters: [],
          volume: 1.0,
        };
      });

      const updatedProject = {
        ...project,
        videos: [...project.videos, ...mediaClips],
        updatedAt: Date.now(),
      };

      commitProject(updatedProject);
      setSelectedClipId(mediaClips[0]?.id ?? null);
      handleTimelineSeek(totalDuration);
      await updateProject(project.id, updatedProject);
    } catch (error) {
      console.error('Failed to pick media:', error);
      Alert.alert('Error', 'Failed to import media. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveMedia = async () => {
    if (!project || !selectedClipId) return;

    const updatedVideos = project.videos.filter(v => v.id !== selectedClipId);
    const updatedProject = {
      ...project,
      videos: updatedVideos,
      updatedAt: Date.now(),
    };

    commitProject(updatedProject);
    await updateProject(project.id, updatedProject);
    setSelectedClipId(null);
  };

  const handleExport = () => {
    if (!project || project.videos.length === 0) {
      Alert.alert('No Media', 'Please add videos or images before exporting.');
      return;
    }
    setShowExportModal(true);
  };

  const handleOpenPreview = () => {
    if (!project || project.videos.length === 0) {
      Alert.alert('No Media', 'Please add videos or images to preview.');
      return;
    }
    setIsPreviewVisible(true);
  };

  const handleReportClipViewportAspectRatio = useCallback(
    (clipId: string, aspectRatio: number) => {
      if (!clipId) return;
      if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return;

      setClipViewportAspectRatios(prev => {
        const current = prev[clipId];
        if (current && Math.abs(current - aspectRatio) < 0.01) {
          return prev;
        }
        return {
          ...prev,
          [clipId]: aspectRatio,
        };
      });
    },
    [],
  );

  const handleExportComplete = async (outputPath: string) => {
    if (!project) return;

    const updatedProject = {
      ...project,
      outputPath,
      updatedAt: Date.now(),
    };

    commitProject(updatedProject);
    await updateProject(project.id, updatedProject);
  };

  const handleSave = async () => {
    if (!project) return;

    try {
      if (project.videos.length === 0) {
        Alert.alert('Empty Project', 'Please add media before saving.');
        return;
      }

      await addProject(project);
      Alert.alert('Success', 'Project saved successfully!');
    } catch (error) {
      console.error('Failed to save project:', error);
      Alert.alert('Error', 'Failed to save project.');
    }
  };

  const commitProject = useCallback((nextProject: Project) => {
    setProject(nextProject);

    const nextHistory = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    nextHistory.push(nextProject);
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setHistoryVersion(v => v + 1);
  }, []);

  const handleTrimClip = useCallback(
    (clipId: string, newStartTime: number, newEndTime: number) => {
      if (!project) return;

      const targetClip = project.videos.find(v => v.id === clipId);
      if (!targetClip) return;

      const clampedStart = Math.max(
        0,
        Math.min(newStartTime, targetClip.duration - MIN_CLIP_DURATION),
      );
      const clampedEnd = Math.max(
        clampedStart + MIN_CLIP_DURATION,
        Math.min(newEndTime, targetClip.duration),
      );

      if (
        Math.abs(clampedStart - targetClip.startTime) < 0.001 &&
        Math.abs(clampedEnd - targetClip.endTime) < 0.001
      ) {
        return;
      }

      const updatedVideos = project.videos.map(v =>
        v.id === clipId
          ? { ...v, startTime: clampedStart, endTime: clampedEnd }
          : v,
      );
      const updatedProject = {
        ...project,
        videos: updatedVideos,
        updatedAt: Date.now(),
      };
      commitProject(updatedProject);
      updateProject(project.id, updatedProject);
    },
    [project, commitProject, updateProject],
  );

  const handleReorderClip = useCallback(
    (clipId: string, toIndex: number) => {
      if (!project) return;
      const fromIndex = project.videos.findIndex(v => v.id === clipId);
      if (fromIndex < 0) return;

      const boundedToIndex = Math.max(
        0,
        Math.min(project.videos.length - 1, toIndex),
      );
      if (fromIndex === boundedToIndex) return;

      const reordered = [...project.videos];
      const [movedClip] = reordered.splice(fromIndex, 1);
      if (!movedClip) return;
      reordered.splice(boundedToIndex, 0, movedClip);

      const updatedProject = {
        ...project,
        videos: reordered,
        updatedAt: Date.now(),
      };

      commitProject(updatedProject);
      setSelectedClipId(clipId);
      updateProject(project.id, updatedProject);
    },
    [project, commitProject, updateProject],
  );

  const handleUpdateClipTransform = useCallback(
    (clipId: string, transformUpdates: Partial<TransformConfig>) => {
      if (!project) return;
      const targetClip = project.videos.find(v => v.id === clipId);
      if (!targetClip) return;

      const nextTransform: TransformConfig = {
        ...targetClip.transform,
        ...transformUpdates,
      };

      nextTransform.translateX = clampNormalizedPan(nextTransform.translateX);
      nextTransform.translateY = clampNormalizedPan(nextTransform.translateY);

      if (nextTransform.resizeMode !== 'contain') {
        nextTransform.resizeMode = 'cover';
      }

      if (nextTransform.resizeMode === 'contain') {
        nextTransform.translateX = 0;
        nextTransform.translateY = 0;
      }

      const prevResizeMode = getClipResizeMode(targetClip);
      const nextResizeMode = nextTransform.resizeMode ?? 'cover';

      if (
        Math.abs(nextTransform.translateX - targetClip.transform.translateX) <
          0.001 &&
        Math.abs(nextTransform.translateY - targetClip.transform.translateY) <
          0.001 &&
        nextResizeMode === prevResizeMode
      ) {
        return;
      }

      const updatedVideos = project.videos.map(v =>
        v.id === clipId ? { ...v, transform: nextTransform } : v,
      );

      const updatedProject = {
        ...project,
        videos: updatedVideos,
        updatedAt: Date.now(),
      };

      commitProject(updatedProject);
      updateProject(project.id, updatedProject);
    },
    [project, commitProject, updateProject],
  );

  useEffect(() => {
    if (!project || !selectedClipId) return;
    const stillExists = project.videos.some(v => v.id === selectedClipId);
    if (!stillExists) {
      setSelectedClipId(null);
    }
  }, [project, selectedClipId]);

  if (!project) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary }}>Loading...</Text>
      </View>
    );
  }


  const selectedClip = selectedClipId
    ? project.videos.find(v => v.id === selectedClipId) || null
    : null;

  const canUndo = historyIndexRef.current > 0;
  const canRedo =
    historyIndexRef.current >= 0 &&
    historyIndexRef.current < historyRef.current.length - 1;

  const handleUndo = async () => {
    if (!project) return;
    if (historyIndexRef.current <= 0) return;

    historyIndexRef.current -= 1;
    const prevProject = historyRef.current[historyIndexRef.current];
    setProject(prevProject);
    setHistoryVersion(v => v + 1);

    try {
      await updateProject(prevProject.id, prevProject);
    } catch (error) {
      console.error('Failed to persist undo:', error);
    }
  };

  const handleRedo = async () => {
    if (!project) return;
    if (historyIndexRef.current < 0) return;
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    historyIndexRef.current += 1;
    const nextProject = historyRef.current[historyIndexRef.current];
    setProject(nextProject);
    setHistoryVersion(v => v + 1);

    try {
      await updateProject(nextProject.id, nextProject);
    } catch (error) {
      console.error('Failed to persist redo:', error);
    }
  };

  const toggleAssetsExpanded = () => {
    const next = !isAssetsExpanded;
    setIsAssetsExpanded(next);
    assetsExpandedProgress.value = withSpring(next ? 1 : 0, {
      damping: 18,
      stiffness: 180,
    });
  };

  const handleBackPress = async () => {
    if (!project) {
      onBack();
      return;
    }

    try {
      if (project.videos.length > 0) {
        await updateProject(project.id, project);
      }
    } catch (error) {
      console.error('Failed to autosave project on exit:', error);
    } finally {
      onBack();
    }
  };

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const handleTimelineZoomOut = () => {
    setTimelineScale(prev =>
      clamp(Number((prev - 0.25).toFixed(2)), 0.5, 3),
    );
  };

  const handleTimelineZoomIn = () => {
    setTimelineScale(prev =>
      clamp(Number((prev + 0.25).toFixed(2)), 0.5, 3),
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <AppIcon
            name="chevron-back"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <View style={styles.undoRedoContainer}>
          <TouchableOpacity
            onPress={handleUndo}
            disabled={!canUndo}
            style={[
              styles.undoRedoButton,
              {
                opacity: canUndo ? 1 : 0.3,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Undo"
          >
            <AppIcon name="arrow-undo" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRedo}
            disabled={!canRedo}
            style={[
              styles.undoRedoButton,
              {
                opacity: canRedo ? 1 : 0.3,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Redo"
          >
            <AppIcon name="arrow-redo" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.topRightActions}>
          <TouchableOpacity
            onPress={handleOpenPreview}
            style={[
              styles.previewButton,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: project.videos.length > 0 ? 1 : 0.4,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Video Preview"
          >
            <AppIcon name="play-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.previewButtonText, { color: colors.primary }]}>
              Preview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>
              Export
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Assets Area (Accordion) */}
      <View style={styles.assetsContainer}>
        <TouchableOpacity
          onPress={toggleAssetsExpanded}
          activeOpacity={0.8}
          style={[
            styles.assetsAccordionHeader,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.assetsAccordionHeaderLeft}>
            <Text
              style={[styles.assetsAccordionTitle, { color: colors.textPrimary }]}
            >
              Assets
            </Text>
            <Text
              style={[
                styles.assetsAccordionSubtitle,
                { color: colors.textSecondary },
              ]}
            >
              {project.videos.length} assets ·{' '}
              {isAssetsExpanded ? 'Preview' : 'Grid'}
            </Text>
          </View>
          <AnimatedAppIcon
            name="chevron-down"
            size={18}
            color={colors.textSecondary}
            style={assetsChevronStyle}
          />
        </TouchableOpacity>

        <View style={styles.assetsContent}>
          {isAssetsExpanded ? (
            <Animated.View
              key="preview"
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(150)}
              style={styles.assetsContentInner}
            >
              <PlaybackPreview
                activeSegment={activeSegment}
                isPlaying={isPlaying}
                soundEnabled={soundEnabled}
                videoRef={videoRef}
                onVideoLoad={handleVideoLoad}
                onVideoProgress={handleVideoProgress}
                selectedClip={selectedClip}
              />
            </Animated.View>
          ) : (
            <Animated.View
              key="grid"
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(150)}
              style={styles.assetsContentInner}
            >
              <EditorCanvas
                layout={project.layout}
                media={project.videos}
                selectedClipId={selectedClipId}
                onSelectClipId={setSelectedClipId}
                onAddMedia={handlePickMedia}
                onUpdateMediaTransform={handleUpdateClipTransform}
                onReportClipViewportAspectRatio={
                  handleReportClipViewportAspectRatio
                }
              />
            </Animated.View>
          )}
        </View>
      </View>

      {/* Timeline Controls Row */}
      <View style={styles.removeButtonContainer}>
        <View style={styles.timelineControlsRow}>
          <TouchableOpacity
            onPress={handleTimelineZoomOut}
            style={[
              styles.timelineScaleButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Zoom timeline out"
          >
            <Text
              style={[styles.timelineScaleButtonText, { color: colors.textPrimary }]}
            >
              −
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleTimelineZoomIn}
            style={[
              styles.timelineScaleButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Zoom timeline in"
          >
            <Text
              style={[styles.timelineScaleButtonText, { color: colors.textPrimary }]}
            >
              +
            </Text>
          </TouchableOpacity>
          {selectedClipId && selectedClip && (
            <TouchableOpacity
              onPress={handleRemoveMedia}
              style={[styles.removeButton, { backgroundColor: colors.error }]}
              accessibilityRole="button"
              accessibilityLabel="Remove selected item"
            >
              <AppIcon name="trash-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* iOS Photos-style Timeline */}
      <PhotosTimeline
        segments={segments}
        totalDuration={totalDuration}
        currentTime={currentTime}
        isPlaying={isPlaying}
        selectedClipId={selectedClipId}
        onClipSelect={setSelectedClipId}
        onSeek={handleTimelineSeek}
        onTogglePlay={togglePlayPause}
        onTrim={handleTrimClip}
        onReorder={handleReorderClip}
        timelineScale={timelineScale}
        colors={colors}
      />

      {/* Tools Drawer */}
      <View style={[styles.toolsDrawer, { backgroundColor: colors.surface }]}>
        <View style={styles.toolsTabs}>
          {(['layout', 'effects', 'audio', 'export'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.toolTab,
                activeTab === tab && { borderBottomColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.toolTabText,
                  {
                    color:
                      activeTab === tab ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.toolsContent}>
          <ToolsContent
            activeTab={activeTab}
            onSave={handleSave}
            onPreview={handleOpenPreview}
          />
        </View>
      </View>

      {/* Modals */}
      <ExportModal
        isVisible={showExportModal}
        onClose={() => setShowExportModal(false)}
        project={project}
        onExportComplete={handleExportComplete}
      />

      <Modal
        visible={isPreviewVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setIsPreviewVisible(false)}
      >
        <PreviewScreen
          project={project}
          clipViewportAspectRatios={clipViewportAspectRatios}
          isVisible={isPreviewVisible}
          onBack={() => setIsPreviewVisible(false)}
          onExport={() => {
            setIsPreviewVisible(false);
            handleExport();
          }}
          soundEnabled={soundEnabled}
        />
      </Modal>
    </View>
  );
};

// ── iOS Photos-style Timeline ──────────────────────────────────────

interface PhotosTimelineProps {
  segments: TimelineSegment[];
  totalDuration: number;
  currentTime: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  onClipSelect: (id: string) => void;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onTrim: (clipId: string, startTime: number, endTime: number) => void;
  onReorder: (clipId: string, toIndex: number) => void;
  timelineScale: number;
  colors: any;
}

const PhotosTimeline: React.FC<PhotosTimelineProps> = ({
  segments,
  totalDuration,
  currentTime,
  isPlaying,
  selectedClipId,
  onClipSelect,
  onSeek,
  onTogglePlay,
  onTrim,
  onReorder,
  timelineScale,
  colors,
}) => {
  const timelineScrollRef = useAnimatedRef<any>();
  const scrollOffset = useSharedValue(0);
  const playheadTime = useSharedValue(currentTime);
  const isPlayingShared = useSharedValue(isPlaying);
  const totalDurationShared = useSharedValue(totalDuration);
  const totalContentWidthShared = useSharedValue(0);
  const trackViewportWidthShared = useSharedValue(0);
  const playheadDragStartX = useSharedValue(0);
  const isReorderingClipShared = useSharedValue(false);
  const [liveOrderIds, setLiveOrderIds] = useState<string[] | null>(null);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const pixelsPerSecond = useMemo(
    () => PIXELS_PER_SECOND * timelineScale,
    [timelineScale],
  );

  const baseOrderIds = useMemo(
    () => segments.map(seg => seg.clip.id),
    [segments],
  );

  const segmentsById = useMemo(
    () => new Map(segments.map(seg => [seg.clip.id, seg])),
    [segments],
  );

  const orderedSegments = useMemo(() => {
    const ids = liveOrderIds ?? baseOrderIds;
    const ordered = ids
      .map(id => segmentsById.get(id))
      .filter((seg): seg is TimelineSegment => !!seg);
    return ordered.length === segments.length ? ordered : segments;
  }, [liveOrderIds, baseOrderIds, segmentsById, segments]);

  useEffect(() => {
    if (!draggingClipId) {
      setLiveOrderIds(null);
    }
  }, [segments, draggingClipId]);

  const totalContentWidth = useMemo(() => {
    return segments.reduce(
      (sum, seg) => sum + seg.duration * pixelsPerSecond,
      0,
    );
  }, [segments, pixelsPerSecond]);

  const seekToContentX = useCallback(
    (contentX: number) => {
      if (totalContentWidth <= 0 || totalDuration <= 0) return;
      const clampedX = Math.max(0, Math.min(totalContentWidth, contentX));
      const time = (clampedX / totalContentWidth) * totalDuration;
      onSeek(Math.max(0, Math.min(totalDuration, time)));
    },
    [totalContentWidth, totalDuration, onSeek],
  );

  const handleClipPress = useCallback(
    (segment: TimelineSegment) => {
      onClipSelect(segment.clip.id);
      onSeek(segment.start);
    },
    [onClipSelect, onSeek],
  );

  const handleClipDragStart = useCallback(
    (clipId: string) => {
      setDraggingClipId(clipId);
      setLiveOrderIds(prev => prev ?? baseOrderIds);
    },
    [baseOrderIds],
  );

  const handleClipDragMove = useCallback(
    (clipId: string, draggedCenterX: number) => {
      if (segments.length <= 1 || totalContentWidth <= 0) return;

      setLiveOrderIds(prevOrder => {
        const order = prevOrder ?? baseOrderIds;
        const fromIndex = order.indexOf(clipId);
        if (fromIndex < 0) return order;

        const clampedCenter = Math.max(
          0,
          Math.min(totalContentWidth, draggedCenterX),
        );

        let accumulatedX = 0;
        let toIndex = order.length - 1;
        for (let i = 0; i < order.length; i += 1) {
          const seg = segmentsById.get(order[i]);
          if (!seg) continue;
          const segWidth = seg.duration * pixelsPerSecond;
          const centerX = accumulatedX + segWidth / 2;
          if (clampedCenter < centerX) {
            toIndex = i;
            break;
          }
          accumulatedX += segWidth;
        }

        if (toIndex === fromIndex) return order;

        const next = [...order];
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, clipId);
        return next;
      });
    },
    [segments.length, totalContentWidth, baseOrderIds, segmentsById, pixelsPerSecond],
  );

  const handleClipDragEnd = useCallback(
    (clipId: string) => {
      setDraggingClipId(null);

      setLiveOrderIds(prevOrder => {
        const finalOrder = prevOrder ?? baseOrderIds;
        const fromIndex = baseOrderIds.indexOf(clipId);
        const toIndex = finalOrder.indexOf(clipId);

        if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
          onReorder(clipId, toIndex);
        }

        return null;
      });
    },
    [baseOrderIds, onReorder],
  );

  useEffect(() => {
    if (!isPlaying) {
      playheadTime.value = currentTime;
      return;
    }

    const drift = currentTime - playheadTime.value;
    if (Math.abs(drift) > 0.25) {
      playheadTime.value = currentTime;
      return;
    }

    if (drift > 0) {
      playheadTime.value = currentTime;
    }
  }, [currentTime, isPlaying, playheadTime]);

  useEffect(() => {
    isPlayingShared.value = isPlaying;
  }, [isPlaying, isPlayingShared]);

  useEffect(() => {
    totalDurationShared.value = totalDuration;
  }, [totalDuration, totalDurationShared]);

  useEffect(() => {
    totalContentWidthShared.value = totalContentWidth;
  }, [totalContentWidth, totalContentWidthShared]);

  const handleTrackLayout = useCallback(
    (event: LayoutChangeEvent) => {
      trackViewportWidthShared.value = event.nativeEvent.layout.width;
    },
    [trackViewportWidthShared],
  );

  useFrameCallback(({ timeSincePreviousFrame }) => {
    if (!isPlayingShared.value) return;
    if (totalDurationShared.value <= 0) return;
    const dtMs = timeSincePreviousFrame ?? 0;
    if (dtMs <= 0) return;

    const next = playheadTime.value + dtMs / 1000;
    playheadTime.value = Math.min(totalDurationShared.value, next);
  }, true);

  useAnimatedReaction(
    () => {
      if (isReorderingClipShared.value) return null;
      if (totalDurationShared.value <= 0) return null;
      if (totalContentWidthShared.value <= 0) return null;
      if (trackViewportWidthShared.value <= 0) return null;

      const playheadX =
        (playheadTime.value / totalDurationShared.value) *
        totalContentWidthShared.value;
      const maxOffset = Math.max(
        0,
        totalContentWidthShared.value - trackViewportWidthShared.value,
      );
      return Math.max(
        0,
        Math.min(maxOffset, playheadX - trackViewportWidthShared.value / 2),
      );
    },
    (targetOffset, prevOffset) => {
      if (targetOffset == null) return;
      if (
        prevOffset != null &&
        Math.abs(targetOffset - prevOffset) < 0.5
      ) {
        return;
      }

      scrollOffset.value = targetOffset;
      scrollTo(timelineScrollRef, targetOffset, 0, false);
    },
  );

  const playheadAnimatedStyle = useAnimatedStyle(() => {
    if (totalDurationShared.value <= 0 || totalContentWidthShared.value <= 0) {
      return { transform: [{ translateX: 0 }] };
    }
    const x =
      (playheadTime.value / totalDurationShared.value) *
      totalContentWidthShared.value;
    return { transform: [{ translateX: x }] };
  });

  const trackTapGesture = Gesture.Tap().onEnd(e => {
    runOnJS(seekToContentX)(e.x + scrollOffset.value);
  });

  const playheadPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(totalDuration > 0 && totalContentWidth > 0)
        .onStart(() => {
          if (
            totalDurationShared.value <= 0 ||
            totalContentWidthShared.value <= 0
          ) {
            playheadDragStartX.value = 0;
            return;
          }

          playheadDragStartX.value =
            (playheadTime.value / totalDurationShared.value) *
            totalContentWidthShared.value;
        })
        .onUpdate(event => {
          if (
            totalDurationShared.value <= 0 ||
            totalContentWidthShared.value <= 0
          ) {
            return;
          }

          const nextX = Math.max(
            0,
            Math.min(
              totalContentWidthShared.value,
              playheadDragStartX.value + event.translationX,
            ),
          );

          playheadTime.value =
            (nextX / totalContentWidthShared.value) * totalDurationShared.value;
          runOnJS(seekToContentX)(nextX);
        }),
    [
      playheadDragStartX,
      playheadTime,
      seekToContentX,
      totalContentWidth,
      totalContentWidthShared,
      totalDuration,
      totalDurationShared,
    ],
  );

  return (
    <View style={[tlStyles.container, { backgroundColor: colors.surface }]}>
      {/* Play button */}
      <TouchableOpacity
        onPress={onTogglePlay}
        style={[tlStyles.playButton, { backgroundColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
      >
        <AppIcon
          name={isPlaying ? 'pause' : 'play'}
          size={20}
          color={colors.textPrimary}
        />
      </TouchableOpacity>

      {/* Timeline track */}
      <View style={tlStyles.trackOuter} onLayout={handleTrackLayout}>
        <GestureDetector gesture={trackTapGesture}>
          <Animated.ScrollView
            ref={timelineScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={tlStyles.trackScroll}
            contentContainerStyle={{ minWidth: '100%' }}
            scrollEventThrottle={16}
            onScroll={event => {
              scrollOffset.value = event.nativeEvent.contentOffset.x;
            }}
          >
            <View style={[tlStyles.trackInner, { width: Math.max(totalContentWidth, 1) }]}>
              {(() => {
                let segmentStartX = 0;
                return orderedSegments.map(seg => {
                  const isSelected = selectedClipId === seg.clip.id;
                  const clipPixelWidth = seg.duration * pixelsPerSecond;
                  const currentSegmentStartX = segmentStartX;
                  segmentStartX += clipPixelWidth;

                  return (
                    <TimelineClipItem
                      key={seg.clip.id}
                      clip={seg.clip}
                      segmentStartX={currentSegmentStartX}
                      width={clipPixelWidth}
                      isSelected={isSelected}
                      onSelect={() => handleClipPress(seg)}
                      onTrim={onTrim}
                      onDragStart={handleClipDragStart}
                      onDragMove={handleClipDragMove}
                      onDragEnd={handleClipDragEnd}
                      isReorderingShared={isReorderingClipShared}
                      pixelsPerSecond={pixelsPerSecond}
                      colors={colors}
                    />
                  );
                });
              })()}

              {/* Playhead */}
              <GestureDetector gesture={playheadPanGesture}>
                <Animated.View style={[tlStyles.playhead, playheadAnimatedStyle]}>
                  <View style={tlStyles.playheadDot} />
                  <View style={tlStyles.playheadLine} />
                </Animated.View>
              </GestureDetector>
            </View>
          </Animated.ScrollView>
        </GestureDetector>
      </View>
    </View>
  );
};

// ── Single timeline clip with trim handles ────────────────────────

const TimelineClipItem: React.FC<{
  clip: MediaClip;
  segmentStartX: number;
  width: number;
  pixelsPerSecond: number;
  isSelected: boolean;
  onSelect: () => void;
  onTrim: (clipId: string, startTime: number, endTime: number) => void;
  onDragStart: (clipId: string) => void;
  onDragMove: (clipId: string, draggedCenterX: number) => void;
  onDragEnd: (clipId: string) => void;
  isReorderingShared: SharedValue<boolean>;
  colors: any;
}> = ({
  clip,
  segmentStartX,
  width,
  pixelsPerSecond,
  isSelected,
  onSelect,
  onTrim,
  onDragStart,
  onDragMove,
  onDragEnd,
  isReorderingShared,
  colors,
}) => {
  const thumbnailUri = clip.thumbnailUri
    ? normalizeMediaUri(clip.thumbnailUri)
    : null;
  const localUri = normalizeMediaUri(clip.localUri);
  const showThumbnailImage =
    clip.type === 'video' && !!thumbnailUri && clip.thumbnailUri !== clip.localUri;
  const resizeMode = getClipResizeMode(clip);
  const clipPan = getClipPan(clip);
  const [clipSize, setClipSize] = useState({
    width: Math.max(1, width),
    height: TIMELINE_CLIP_HEIGHT,
  });
  const [mediaAspectRatio, setMediaAspectRatio] = useState(1);
  const aspectProbeUri = useMemo(() => {
    if (clip.type === 'image') {
      return thumbnailUri || localUri;
    }
    if (showThumbnailImage) {
      return thumbnailUri;
    }
    return null;
  }, [clip.type, thumbnailUri, localUri, showThumbnailImage]);

  const mediaFrame = useMemo(
    () =>
      computeMediaFrame(
        clipSize.width,
        clipSize.height,
        mediaAspectRatio,
        resizeMode,
      ),
    [clipSize.width, clipSize.height, mediaAspectRatio, resizeMode],
  );

  // Trim handle drag state
  const leftDelta = useSharedValue(0);
  const rightDelta = useSharedValue(0);
  const trimStart = useSharedValue(clip.startTime);
  const trimEnd = useSharedValue(clip.endTime);
  const dragStart = useSharedValue(clip.startTime);
  const dragEnd = useSharedValue(clip.endTime);
  const dragTranslateX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  useEffect(() => {
    trimStart.value = clip.startTime;
    trimEnd.value = clip.endTime;
    leftDelta.value = 0;
    rightDelta.value = 0;
  }, [clip.startTime, clip.endTime, trimStart, trimEnd, leftDelta, rightDelta]);

  useEffect(() => {
    // Use cached aspect ratio if available
    if (clip.aspectRatio) {
      setMediaAspectRatio(clip.aspectRatio);
      return;
    }

    // Fallback: detect aspect ratio for old clips without cached value
    if (!aspectProbeUri) {
      setMediaAspectRatio(1);
      return;
    }

    let isCancelled = false;

    Image.getSize(
      aspectProbeUri,
      (mediaWidth, mediaHeight) => {
        if (isCancelled) return;
        if (mediaWidth > 0 && mediaHeight > 0) {
          setMediaAspectRatio(mediaWidth / mediaHeight);
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
  }, [clip.id, clip.aspectRatio, aspectProbeUri]);

  const handleTimelineVideoLoad = useCallback((data: OnLoadData) => {
    const mediaWidth = Number(data?.naturalSize?.width || 0);
    const mediaHeight = Number(data?.naturalSize?.height || 0);
    if (mediaWidth > 0 && mediaHeight > 0) {
      setMediaAspectRatio(mediaWidth / mediaHeight);
    }
  }, []);

  const commitTrim = useCallback(
    (newStart: number, newEnd: number) => {
      onTrim(clip.id, newStart, newEnd);
    },
    [clip.id, onTrim],
  );

  const leftPan = Gesture.Pan()
    .onStart(() => {
      dragStart.value = trimStart.value;
      dragEnd.value = trimEnd.value;
      rightDelta.value = 0;
    })
    .onUpdate(e => {
      const proposedStart = dragStart.value + e.translationX / pixelsPerSecond;
      const maxStart = dragEnd.value - MIN_CLIP_DURATION;
      const clampedStart = Math.max(0, Math.min(maxStart, proposedStart));
      leftDelta.value = clampedStart - dragStart.value;
    })
    .onFinalize(() => {
      const nextStart = Math.max(
        0,
        Math.min(dragEnd.value - MIN_CLIP_DURATION, dragStart.value + leftDelta.value),
      );
      trimStart.value = nextStart;
      runOnJS(commitTrim)(nextStart, trimEnd.value);
    });

  const rightPan = Gesture.Pan()
    .onStart(() => {
      dragStart.value = trimStart.value;
      dragEnd.value = trimEnd.value;
      leftDelta.value = 0;
    })
    .onUpdate(e => {
      const proposedEnd = dragEnd.value + e.translationX / pixelsPerSecond;
      const minEnd = dragStart.value + MIN_CLIP_DURATION;
      const clampedEnd = Math.max(minEnd, Math.min(clip.duration, proposedEnd));
      rightDelta.value = clampedEnd - dragEnd.value;
    })
    .onFinalize(() => {
      const nextEnd = Math.max(
        dragStart.value + MIN_CLIP_DURATION,
        Math.min(clip.duration, dragEnd.value + rightDelta.value),
      );
      trimEnd.value = nextEnd;
      runOnJS(commitTrim)(trimStart.value, nextEnd);
    });

  const movePan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      isDragging.value = true;
      isReorderingShared.value = true;
      runOnJS(onDragStart)(clip.id);
    })
    .onUpdate(e => {
      dragTranslateX.value = e.translationX;
      runOnJS(onDragMove)(clip.id, segmentStartX + width / 2 + e.translationX);
    })
    .onFinalize(() => {
      if (!isDragging.value) return;
      dragTranslateX.value = 0;
      isDragging.value = false;
      isReorderingShared.value = false;
      runOnJS(onDragEnd)(clip.id);
    });

  const clipAnimatedStyle = useAnimatedStyle(() => ({
    width: Math.max(
      1,
      width +
        (rightDelta.value - leftDelta.value) * pixelsPerSecond,
    ),
    transform: [
      {
        translateX:
          leftDelta.value * pixelsPerSecond + dragTranslateX.value,
      },
      { scale: isDragging.value ? 1.02 : 1 },
    ],
    zIndex: isDragging.value ? 40 : 1,
    elevation: isDragging.value ? 40 : 1,
    opacity: isDragging.value ? 0.92 : 1,
  }), [width, pixelsPerSecond]);

  const clipLayoutTransition = useMemo(
    () =>
      LinearTransition.springify()
        .damping(20)
        .stiffness(220),
    [],
  );

  return (
    <GestureDetector gesture={movePan}>
      <AnimatedTouchableOpacity
        layout={clipLayoutTransition}
        activeOpacity={0.9}
        onPress={onSelect}
        onLayout={event => {
          const { width: layoutWidth, height: layoutHeight } =
            event.nativeEvent.layout;
          if (layoutWidth > 0 && layoutHeight > 0) {
            setClipSize({ width: layoutWidth, height: layoutHeight });
          }
        }}
        style={[
          tlStyles.clipContainer,
          clipAnimatedStyle,
          {
            borderColor: isSelected ? SELECTED_COLOR : 'transparent',
            borderWidth: isSelected ? 3 : 0,
            backgroundColor: colors.border,
          },
        ]}
      >
        {/* Thumbnail */}
        <View
          style={[
            tlStyles.clipMediaFrame,
            {
              width: mediaFrame.width,
              height: mediaFrame.height,
              marginLeft: -mediaFrame.width / 2,
              marginTop: -mediaFrame.height / 2,
              transform: [
                { translateX: clipPan.x * mediaFrame.maxPanX },
                { translateY: clipPan.y * mediaFrame.maxPanY },
              ],
            },
          ]}
        >
          {clip.type === 'video' && showThumbnailImage ? (
            <Image
              source={{ uri: thumbnailUri! }}
              style={tlStyles.clipMediaContent}
              resizeMode="stretch"
            />
          ) : clip.type === 'image' && (thumbnailUri || localUri) ? (
            <Image
              source={{ uri: (thumbnailUri || localUri)! }}
              style={tlStyles.clipMediaContent}
              resizeMode="stretch"
            />
          ) : clip.type === 'video' && localUri ? (
            <Video
              source={{ uri: localUri }}
              style={tlStyles.clipMediaContent}
              resizeMode="stretch"
              paused={true}
              repeat={false}
              onLoad={handleTimelineVideoLoad}
            />
          ) : (
            <View style={tlStyles.clipPlaceholder}>
              <AppIcon
                name={clip.type === 'video' ? 'film-outline' : 'image-outline'}
                size={18}
                color={colors.textSecondary}
              />
            </View>
          )}
        </View>

        {/* Trim handles - only on selected clip */}
        {isSelected && (
          <>
            <GestureDetector gesture={leftPan}>
              <Animated.View style={tlStyles.trimHandleLeft}>
                <AppIcon name="chevron-back" size={18} color="#000" />
              </Animated.View>
            </GestureDetector>
            <GestureDetector gesture={rightPan}>
              <Animated.View style={tlStyles.trimHandleRight}>
                <AppIcon name="chevron-forward" size={18} color="#000" />
              </Animated.View>
            </GestureDetector>
          </>
        )}
      </AnimatedTouchableOpacity>
    </GestureDetector>
  );
};

// ── Timeline styles ───────────────────────────────────────────────

const tlStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  trackOuter: {
    flex: 1,
    height: TIMELINE_CLIP_HEIGHT + 16,
    justifyContent: 'center',
  },
  trackScroll: {
    flex: 1,
  },
  trackInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TIMELINE_CLIP_HEIGHT,
    position: 'relative',
  },
  clipContainer: {
    height: TIMELINE_CLIP_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 2,
    position: 'relative',
  },
  clipMediaFrame: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    overflow: 'hidden',
  },
  clipMediaContent: {
    width: '100%',
    height: '100%',
  },
  clipThumbnail: {
    width: '100%',
    height: '100%',
  },
  clipPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trimHandleLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: TRIM_HANDLE_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.85)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  trimHandleRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: TRIM_HANDLE_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.85)',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  playhead: {
    position: 'absolute',
    top: -6,
    bottom: -6,
    width: 28,
    left: 0,
    zIndex: 20,
    elevation: 20,
    alignItems: 'center',
    marginLeft: -14,
  },
  playheadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PLAYHEAD_COLOR,
    marginTop: -2,
    alignSelf: 'center',
  },
  playheadLine: {
    flex: 1,
    width: 2,
    backgroundColor: PLAYHEAD_COLOR,
    alignSelf: 'center',
  },
});

// ── Editor Canvas ─────────────────────────────────────────────────

const EditorCanvas: React.FC<{
  layout: LayoutConfig;
  media: MediaClip[];
  selectedClipId: string | null;
  onSelectClipId: (clipId: string) => void;
  onAddMedia: () => void;
  onUpdateMediaTransform: (
    clipId: string,
    transformUpdates: Partial<TransformConfig>,
  ) => void;
  onReportClipViewportAspectRatio: (clipId: string, aspectRatio: number) => void;
}> = ({
  layout,
  media,
  selectedClipId,
  onSelectClipId,
  onAddMedia,
  onUpdateMediaTransform,
  onReportClipViewportAspectRatio,
}) => {
  if (layout.type === 'grid' && layout.rows && layout.cols) {
    const cells = [];
    // Calculate dynamic rows based on media count (minimum of layout.rows)
    const cols = layout.cols || 2;
    const minRows = layout.rows || 2;
    const neededRows = Math.ceil((media.length + 1) / cols); // +1 for add button
    const actualRows = Math.max(minRows, neededRows);
    const cellCount = actualRows * cols;

    for (let i = 0; i < cellCount; i++) {
      const cellMedia = media.find(
        m => m.position.row * (layout.cols || 2) + m.position.col === i,
      );

      cells.push(
        <GridCell
          key={i}
          isSelected={cellMedia?.id === selectedClipId}
          media={cellMedia}
          onSelectMedia={onSelectClipId}
          onAdd={onAddMedia}
          onUpdateMediaTransform={onUpdateMediaTransform}
          onReportViewportAspectRatio={onReportClipViewportAspectRatio}
          spacing={layout.spacing}
          borderRadius={layout.borderRadius}
        />,
      );
    }

    return (
      <ScrollView
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gridContainer}>{cells}</View>
      </ScrollView>
    );
  }

  return <View style={styles.canvas} />;
};

const GridCell: React.FC<{
  isSelected: boolean;
  media?: MediaClip;
  onSelectMedia: (clipId: string) => void;
  onAdd: () => void;
  onUpdateMediaTransform: (
    clipId: string,
    transformUpdates: Partial<TransformConfig>,
  ) => void;
  onReportViewportAspectRatio: (clipId: string, aspectRatio: number) => void;
  spacing: number;
  borderRadius: number;
}> = ({
  isSelected,
  media,
  onSelectMedia,
  onAdd,
  onUpdateMediaTransform,
  onReportViewportAspectRatio,
  spacing,
  borderRadius,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const mediaId = media?.id ?? null;
  const [cellSize, setCellSize] = useState({ width: 100, height: 100 });
  const [mediaAspectRatio, setMediaAspectRatio] = useState(1);
  const panX = useSharedValue(media?.transform.translateX ?? 0);
  const panY = useSharedValue(media?.transform.translateY ?? 0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const maxPanX = useSharedValue(0);
  const maxPanY = useSharedValue(0);

  const localUri = media?.localUri ? normalizeMediaUri(media.localUri) : null;
  const thumbnailUri = media?.thumbnailUri
    ? normalizeMediaUri(media.thumbnailUri)
    : null;
  const showThumbnailImage =
    media?.type === 'video' &&
    !!thumbnailUri &&
    media.thumbnailUri !== media.localUri;
  const resizeMode = media ? getClipResizeMode(media) : 'cover';
  const aspectProbeUri = useMemo(() => {
    if (!media) return null;
    if (media.type === 'image') return thumbnailUri || localUri;
    if (showThumbnailImage) return thumbnailUri;
    return null;
  }, [media, thumbnailUri, localUri, showThumbnailImage]);

  const mediaFrame = useMemo(() => {
    const containerWidth = Math.max(cellSize.width, 1);
    const containerHeight = Math.max(cellSize.height, 1);
    const safeAspect = mediaAspectRatio > 0 ? mediaAspectRatio : 1;
    const containerAspect = containerWidth / containerHeight;

    let width = containerWidth;
    let height = containerHeight;

    if (resizeMode === 'cover') {
      if (safeAspect > containerAspect) {
        height = containerHeight;
        width = height * safeAspect;
      } else {
        width = containerWidth;
        height = width / safeAspect;
      }
    } else {
      if (safeAspect > containerAspect) {
        width = containerWidth;
        height = width / safeAspect;
      } else {
        height = containerHeight;
        width = height * safeAspect;
      }
    }

    return {
      width,
      height,
      maxPanX: Math.max(0, (width - containerWidth) / 2),
      maxPanY: Math.max(0, (height - containerHeight) / 2),
    };
  }, [cellSize.width, cellSize.height, mediaAspectRatio, resizeMode]);

  useEffect(() => {
    panX.value = media?.transform.translateX ?? 0;
    panY.value = media?.transform.translateY ?? 0;
  }, [media?.id, media?.transform.translateX, media?.transform.translateY, panX, panY]);

  useEffect(() => {
    maxPanX.value = mediaFrame.maxPanX;
    maxPanY.value = mediaFrame.maxPanY;
  }, [mediaFrame.maxPanX, mediaFrame.maxPanY, maxPanX, maxPanY]);

  useEffect(() => {
    if (!media) {
      setMediaAspectRatio(1);
      return;
    }

    // Use cached aspect ratio if available
    if (media.aspectRatio) {
      setMediaAspectRatio(media.aspectRatio);
      return;
    }

    // Fallback: detect aspect ratio for old clips without cached value
    if (!aspectProbeUri) {
      setMediaAspectRatio(1);
      return;
    }

    let isCancelled = false;

    Image.getSize(
      aspectProbeUri,
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
  }, [media?.id, media?.aspectRatio, aspectProbeUri]);

  const handleVideoLoad = useCallback((data: OnLoadData) => {
    const width = Number(data?.naturalSize?.width || 0);
    const height = Number(data?.naturalSize?.height || 0);
    if (width > 0 && height > 0) {
      setMediaAspectRatio(width / height);
    }
  }, []);

  const commitPan = useCallback(
    (nextPanX: number, nextPanY: number) => {
      if (!mediaId) return;
      onUpdateMediaTransform(mediaId, {
        translateX: nextPanX,
        translateY: nextPanY,
      });
    },
    [mediaId, onUpdateMediaTransform],
  );

  const handleToggleResizeMode = useCallback(() => {
    if (!mediaId) return;
    if (resizeMode === 'cover') {
      panX.value = 0;
      panY.value = 0;
      onUpdateMediaTransform(mediaId, {
        resizeMode: 'contain',
        translateX: 0,
        translateY: 0,
      });
    } else {
      onUpdateMediaTransform(mediaId, {
        resizeMode: 'cover',
      });
    }
  }, [mediaId, resizeMode, onUpdateMediaTransform, panX, panY]);

  const panGesture = Gesture.Pan()
    .enabled(
      !!mediaId &&
        isSelected &&
        resizeMode === 'cover' &&
        (mediaFrame.maxPanX > 0 || mediaFrame.maxPanY > 0),
    )
    .onStart(() => {
      scale.value = withSpring(1);
      panStartX.value = panX.value;
      panStartY.value = panY.value;
    })
    .onUpdate(event => {
      const nextPanX =
        maxPanX.value > 0
          ? Math.max(
              -1,
              Math.min(1, panStartX.value + event.translationX / maxPanX.value),
            )
          : 0;
      const nextPanY =
        maxPanY.value > 0
          ? Math.max(
              -1,
              Math.min(1, panStartY.value + event.translationY / maxPanY.value),
            )
          : 0;
      panX.value = nextPanX;
      panY.value = nextPanY;
    })
    .onFinalize(() => {
      runOnJS(commitPan)(panX.value, panY.value);
    });

  const handleCellPress = useCallback(() => {
    scale.value = withSpring(1);
    if (mediaId) {
      onSelectMedia(mediaId);
    } else {
      onAdd();
    }
  }, [mediaId, onAdd, onSelectMedia, scale]);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      runOnJS(handleCellPress)();
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const mediaPanStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: panX.value * maxPanX.value },
      { translateY: panY.value * maxPanY.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        onLayout={event => {
          const { width, height } = event.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setCellSize({ width, height });
            if (mediaId) {
              onReportViewportAspectRatio(mediaId, width / height);
            }
          }
        }}
        style={[
          styles.gridCell,
          {
            backgroundColor: media ? colors.surface : colors.border,
            borderRadius,
            borderWidth: isSelected ? 2 : 0,
            borderColor: isSelected ? colors.primary : 'transparent',
            margin: spacing / 2,
          },
          animatedStyle,
        ]}
      >
        {media ? (
          <>
            <Animated.View
              style={[
                styles.cellMediaFrame,
                {
                  borderRadius,
                  width: mediaFrame.width,
                  height: mediaFrame.height,
                  marginLeft: -mediaFrame.width / 2,
                  marginTop: -mediaFrame.height / 2,
                },
                mediaPanStyle,
              ]}
            >
              {media.type === 'video' && showThumbnailImage ? (
                <Image
                  source={{ uri: thumbnailUri! }}
                  style={styles.cellMedia}
                  resizeMode="stretch"
                />
              ) : media.type === 'video' && localUri ? (
                <Video
                  source={{ uri: localUri }}
                  style={styles.cellMedia}
                  resizeMode="stretch"
                  paused={true}
                  repeat={false}
                  onLoad={handleVideoLoad}
                />
              ) : media.type === 'image' && (thumbnailUri || localUri) ? (
                <Image
                  source={{ uri: (thumbnailUri || localUri)! }}
                  style={styles.cellMedia}
                  resizeMode="stretch"
                />
              ) : (
                <View style={tlStyles.clipPlaceholder}>
                  <AppIcon
                    name={media.type === 'video' ? 'film-outline' : 'image-outline'}
                    size={28}
                    color={colors.textSecondary}
                  />
                </View>
              )}
            </Animated.View>

            <TouchableOpacity
              onPress={handleToggleResizeMode}
              style={[
                styles.resizeModeButton,
                {
                  borderColor:
                    resizeMode === 'contain'
                      ? colors.primary
                      : 'rgba(255,255,255,0.35)',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                resizeMode === 'cover'
                  ? 'Switch to fit mode without crop'
                  : 'Switch to crop mode with pan'
              }
            >
              <AppIcon
                name="resize-outline"
                size={14}
                color={resizeMode === 'contain' ? colors.primary : '#4EA7FF'}
              />
            </TouchableOpacity>
          </>
        ) : (
          <Text style={{ fontSize: 32, opacity: 0.5 }}>+</Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const PlaybackPreview: React.FC<{
  activeSegment: TimelineSegment | null;
  isPlaying: boolean;
  soundEnabled: boolean;
  videoRef: React.RefObject<VideoRef | null>;
  onVideoLoad: () => void;
  onVideoProgress: (clipId: string, data: OnProgressData) => void;
  selectedClip: MediaClip | null;
}> = ({
  activeSegment,
  isPlaying,
  soundEnabled,
  videoRef,
  onVideoLoad,
  onVideoProgress,
  selectedClip,
}) => {
  const { colors } = useTheme();
  const [previewSize, setPreviewSize] = useState({
    width: SCREEN_WIDTH - SPACING.lg * 2,
    height: 220,
  });
  const [mediaAspectRatio, setMediaAspectRatio] = useState(1);

  // Show activeSegment clip during playback, otherwise show selected clip
  const displayClip = activeSegment?.clip ?? selectedClip;
  const displayResizeMode = displayClip ? getClipResizeMode(displayClip) : 'cover';
  const displayPan = displayClip ? getClipPan(displayClip) : { x: 0, y: 0 };

  useEffect(() => {
    if (!displayClip) {
      setMediaAspectRatio(1);
      return;
    }

    // Use cached aspect ratio if available
    if (displayClip.aspectRatio) {
      setMediaAspectRatio(displayClip.aspectRatio);
      return;
    }

    // Fallback: detect aspect ratio for old clips without cached value
    setMediaAspectRatio(1);

    if (displayClip.type === 'image') {
      const imageUri = normalizeMediaUri(displayClip.localUri);
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
  }, [displayClip?.id, displayClip?.aspectRatio]);

  const previewMediaFrame = useMemo(
    () =>
      computeMediaFrame(
        Math.max(previewSize.width, 1),
        Math.max(previewSize.height, 1),
        mediaAspectRatio,
        displayResizeMode,
      ),
    [displayResizeMode, mediaAspectRatio, previewSize.height, previewSize.width],
  );

  const handlePreviewVideoLoad = useCallback(
    (data: OnLoadData) => {
      const width = Number(data?.naturalSize?.width || 0);
      const height = Number(data?.naturalSize?.height || 0);
      if (width > 0 && height > 0) {
        setMediaAspectRatio(width / height);
      }
      onVideoLoad();
    },
    [onVideoLoad],
  );

  return (
    <View
      style={[styles.previewContainer, { backgroundColor: '#000000' }]}
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) {
          setPreviewSize({ width, height });
        }
      }}
    >
      {displayClip ? (
        <>
          <View
            style={[
              styles.previewMediaFrame,
              {
                width: previewMediaFrame.width,
                height: previewMediaFrame.height,
                marginLeft: -previewMediaFrame.width / 2,
                marginTop: -previewMediaFrame.height / 2,
                transform: [
                  { translateX: displayPan.x * previewMediaFrame.maxPanX },
                  { translateY: displayPan.y * previewMediaFrame.maxPanY },
                ],
              },
            ]}
          >
            {displayClip.type === 'video' ? (
              <Video
                key={displayClip.id}
                ref={activeSegment?.clip.id === displayClip.id ? videoRef : undefined}
                source={{ uri: normalizeMediaUri(displayClip.localUri) }}
                style={styles.previewMediaContent}
                resizeMode="stretch"
                paused={!isPlaying}
                repeat={false}
                muted={!soundEnabled}
                progressUpdateInterval={33}
                onLoad={handlePreviewVideoLoad}
                onProgress={data => onVideoProgress(displayClip.id, data)}
              />
            ) : (
              <Image
                key={displayClip.id}
                source={{ uri: normalizeMediaUri(displayClip.localUri) }}
                style={styles.previewMediaContent}
                resizeMode="stretch"
              />
            )}
          </View>
          {displayClip.type === 'video' && (
            <View style={styles.previewVideoBadge}>
              <Text style={styles.previewVideoBadgeText}>VIDEO</Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.previewPlaceholder}>
          <Text
            style={[styles.previewPlaceholderText, { color: colors.textSecondary }]}
          >
            Select an item on the timeline to preview
          </Text>
        </View>
      )}
    </View>
  );
};

const ToolsContent: React.FC<{
  activeTab: string;
  onSave: () => void;
  onPreview: () => void;
}> = ({ activeTab, onSave, onPreview }) => {
  const { colors } = useTheme();

  if (activeTab === 'export') {
    return (
      <View style={styles.toolsContentContainer}>
        <Text style={[styles.toolsText, { color: colors.textSecondary }]}>
          Ready to export your video collage
        </Text>
        <TouchableOpacity
          onPress={onPreview}
          style={[
            styles.previewActionButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Video Preview"
        >
          <AppIcon name="play-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.previewActionText, { color: colors.primary }]}>
            Video Preview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.saveButtonText}>Save Project</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.toolsContentContainer}>
      <Text style={[styles.toolsText, { color: colors.textSecondary }]}>
        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tools coming
        soon
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  exportButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewButtonText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
  },
  undoRedoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  undoRedoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assetsContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  assetsAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 2,
  },
  assetsAccordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  assetsAccordionTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    marginRight: SPACING.sm,
  },
  assetsAccordionSubtitle: {
    ...TYPOGRAPHY.small,
  },
  assetsContent: {
    flex: 1,
    marginTop: SPACING.md,
    minHeight: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  assetsContentInner: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  canvas: {
    flex: 1,
    width: '100%',
    maxWidth: SCREEN_WIDTH - SPACING.lg * 2,
  },
  canvasContent: {
    flexGrow: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    flex: 1,
    minWidth: '45%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cellThumbnail: {
    width: '100%',
    height: '100%',
  },
  cellMediaFrame: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    overflow: 'hidden',
  },
  cellMedia: {
    width: '100%',
    height: '100%',
  },
  resizeModeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  removeButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  timelineControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timelineScaleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineScaleButtonText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewMediaFrame: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    overflow: 'hidden',
  },
  previewMediaContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  previewPlaceholder: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  previewPlaceholderText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
  previewVideoBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  previewVideoBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toolsDrawer: {
    height: 200,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  toolsTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  toolTab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  toolTabText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  toolsContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  toolsContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolsText: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  previewActionButton: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  previewActionText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
