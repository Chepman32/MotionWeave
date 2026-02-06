import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import { MediaClip, LayoutConfig, Project } from '../../shared/types';
import { VideoImportService } from '../../processes/video-processing/VideoImportService';
import { ExportModal } from '../export/ExportModal';
import { useProjectStore } from '../../entities/project/store';
import { createNewProject } from '../../entities/project/utils';
import { AppIcon } from '../../shared/components/AppIcon';
import { PreviewScreen } from '../preview/PreviewScreen';
import { usePreferencesStore } from '../../shared/stores/preferencesStore';
import { normalizeMediaUri } from '../../shared/utils/helpers';
import { DEFAULT_IMAGE_DURATION_SECONDS } from '../../shared/constants/media';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedAppIcon = Animated.createAnimatedComponent(AppIcon);

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
  const [isAssetsExpanded, setIsAssetsExpanded] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<
    'layout' | 'effects' | 'audio' | 'export'
  >('layout');
  const [, setIsImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const soundEnabled = usePreferencesStore(state => state.soundEnabled);

  const historyRef = useRef<Project[]>([]);
  const historyIndexRef = useRef(-1);
  const [, setHistoryVersion] = useState(0);

  const assetsExpandedProgress = useSharedValue(0);
  const assetsChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${assetsExpandedProgress.value * 180}deg` }],
  }));

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
          },
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

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const handleTimelineZoomOut = () => {
    setTimelineZoom(z => clamp(parseFloat((z - 0.2).toFixed(2)), 0.8, 2));
  };

  const handleTimelineZoomIn = () => {
    setTimelineZoom(z => clamp(parseFloat((z + 0.2).toFixed(2)), 0.8, 2));
  };

  const timelineClipWidth = Math.round(60 * timelineZoom);
  const timelineClipHeight = 40;
  const timelineContainerHeight = Math.max(
    100,
    timelineClipHeight + SPACING.md * 2 + SPACING.sm + 14,
  );

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
              <SelectedClipPreview clip={selectedClip} />
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
              />
            </Animated.View>
          )}
        </View>
      </View>

      {/* Timeline Controls */}
      <View style={styles.removeButtonContainer}>
        <View style={styles.timelineControlsRow}>
          <TouchableOpacity
            onPress={handleTimelineZoomOut}
            style={[
              styles.timelineControlButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Timeline zoom out"
          >
            <Text
              style={[styles.timelineControlIcon, { color: colors.textPrimary }]}
            >
              −
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTimelineZoomIn}
            style={[
              styles.timelineControlButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Timeline zoom in"
          >
            <Text
              style={[styles.timelineControlIcon, { color: colors.textPrimary }]}
            >
              +
            </Text>
          </TouchableOpacity>

          {/* Remove Button - shown when item selected */}
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

      {/* Timeline Area */}
      <View
        style={[
          styles.timelineContainer,
          { backgroundColor: colors.surface, height: timelineContainerHeight },
        ]}
      >
        <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>
          Timeline - {project.videos.length} item(s)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {project.videos.map(item => {
            const isSelected = selectedClipId === item.id;
            const thumbnailUri = item.thumbnailUri
              ? normalizeMediaUri(item.thumbnailUri)
              : null;
            const localUri = normalizeMediaUri(item.localUri);
            const showThumbnailImage =
              item.type === 'video' &&
              !!thumbnailUri &&
              item.thumbnailUri !== item.localUri;
            
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedClipId(item.id)}
                style={[
                  styles.timelineClip, 
                  { 
                    backgroundColor: colors.border,
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: colors.primary,
                    width: timelineClipWidth,
                    height: timelineClipHeight,
                  }
                ]}
              >
                {item.type === 'video' && showThumbnailImage ? (
                  <Image
                    source={{ uri: thumbnailUri! }}
                    style={styles.timelineThumbnail}
                    resizeMode="cover"
                  />
                ) : item.type === 'video' && localUri ? (
                  <Video
                    source={{ uri: localUri }}
                    style={styles.timelineThumbnail}
                    resizeMode="cover"
                    paused={true}
                    repeat={false}
                  />
                ) : item.type === 'image' && (thumbnailUri || localUri) ? (
                  <Image
                    source={{ uri: thumbnailUri || localUri }}
                    style={styles.timelineThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <AppIcon
                    name={item.type === 'video' ? 'film-outline' : 'image-outline'}
                    size={16}
                    color={colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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

const EditorCanvas: React.FC<{
  layout: LayoutConfig;
  media: MediaClip[];
  selectedClipId: string | null;
  onSelectClipId: (clipId: string) => void;
  onAddMedia: () => void;
}> = ({
  layout,
  media,
  selectedClipId,
  onSelectClipId,
  onAddMedia,
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
  spacing: number;
  borderRadius: number;
}> = ({
  isSelected,
  media,
  onSelectMedia,
  onAdd,
  spacing,
  borderRadius,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const mediaId = media?.id ?? null;

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      if (mediaId) {
        runOnJS(onSelectMedia)(mediaId);
      } else {
        runOnJS(onAdd)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const localUri = media?.localUri ? normalizeMediaUri(media.localUri) : null;
  const thumbnailUri = media?.thumbnailUri
    ? normalizeMediaUri(media.thumbnailUri)
    : null;
  const showThumbnailImage =
    media?.type === 'video' &&
    !!thumbnailUri &&
    media.thumbnailUri !== media.localUri;

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
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
        {media?.type === 'video' && showThumbnailImage ? (
          <Image
            source={{ uri: thumbnailUri! }}
            style={[styles.cellThumbnail, { borderRadius }]}
            resizeMode="cover"
          />
        ) : media?.type === 'video' && localUri ? (
          <Video
            source={{ uri: localUri }}
            style={[styles.cellThumbnail, { borderRadius }]}
            resizeMode="cover"
            paused={true}
            repeat={false}
          />
        ) : media?.type === 'image' && (thumbnailUri || localUri) ? (
          <Image
            source={{ uri: (thumbnailUri || localUri)! }}
            style={[styles.cellThumbnail, { borderRadius }]}
            resizeMode="cover"
          />
        ) : media ? (
          <AppIcon
            name={media.type === 'video' ? 'film-outline' : 'image-outline'}
            size={28}
            color={colors.textSecondary}
          />
        ) : (
          <Text style={{ fontSize: 32, opacity: 0.5 }}>+</Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const SelectedClipPreview: React.FC<{ clip: MediaClip | null }> = ({ clip }) => {
  const { colors } = useTheme();
  const soundEnabled = usePreferencesStore(state => state.soundEnabled);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
  }, [clip?.id]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        if (clip?.type === 'video') {
          setIsPlaying(p => !p);
        }
      }}
      style={[styles.previewContainer, { backgroundColor: '#000000' }]}
      accessibilityRole={clip?.type === 'video' ? 'button' : undefined}
      accessibilityLabel={
        clip?.type === 'video' ? 'Play or pause preview' : undefined
      }
    >
      {clip ? (
        <>
          {clip.type === 'video' ? (
            <Video
              source={{ uri: normalizeMediaUri(clip.localUri) }}
              style={styles.previewMedia}
              resizeMode="contain"
              paused={!isPlaying}
              repeat={true}
              muted={!soundEnabled}
            />
          ) : (
            <Image
              source={{ uri: normalizeMediaUri(clip.localUri) }}
              style={styles.previewMedia}
              resizeMode="contain"
            />
          )}
          {clip.type === 'video' && (
            <View style={styles.previewVideoBadge}>
              <Text style={styles.previewVideoBadgeText}>VIDEO</Text>
            </View>
          )}
          {clip.type === 'video' && (
            <View style={styles.previewPlayOverlay} pointerEvents="none">
              <View style={styles.previewPlayButton}>
                <AppIcon
                  name={isPlaying ? 'pause' : 'play'}
                  size={20}
                  color="#FFFFFF"
                />
              </View>
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
    </TouchableOpacity>
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
  projectName: {
    ...TYPOGRAPHY.h3,
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
  undoRedoIcon: {
    fontSize: 18,
    fontWeight: '700',
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
  assetsAccordionChevron: {},
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
  timelineControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineControlIcon: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonIcon: {},
  timelineContainer: {
    height: 100,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  timelineLabel: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.sm,
  },
  timelineClip: {
    width: 60,
    height: 40,
    borderRadius: 4,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  timelineThumbnail: {
    width: '100%',
    height: '100%',
  },
  previewContainer: {
    flex: 1,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
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
  previewPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
