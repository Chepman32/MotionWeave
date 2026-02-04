import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import { MediaClip, LayoutConfig, Project } from '../../shared/types';
import { VideoImportService } from '../../processes/video-processing/VideoImportService';
import { ExportModal } from '../export/ExportModal';
import { useProjectStore } from '../../entities/project/store';
import { createNewProject } from '../../entities/project/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    'layout' | 'effects' | 'audio' | 'export'
  >('layout');
  const [isImporting, setIsImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    initializeProject();
  }, []);

  const initializeProject = async () => {
    if (projectId && currentProject) {
      setProject(currentProject);
    } else {
      const newProject = createNewProject('New Project', layout);
      setProject(newProject);
      setCurrentProject(newProject);
    }
  };

  const handlePickMedia = async () => {
    if (!project) return;
    
    try {
      setIsImporting(true);
      const availableSlots = maxItems - project.videos.length;
      
      if (availableSlots <= 0) {
        Alert.alert('Grid Full', `Maximum ${maxItems} items allowed.`);
        return;
      }
      
      const media = await VideoImportService.pickMedia(availableSlots);
      
      if (media.length === 0) {
        return; // User cancelled
      }

      const mediaClips: MediaClip[] = media.map((item, index) => ({
        id: item.id,
        localUri: item.localPath,
        thumbnailUri: item.thumbnailPath,
        type: item.type,
        duration: item.duration,
        startTime: 0,
        endTime: item.duration,
        position: {
          row: Math.floor((project.videos.length + index) / (project.layout.cols || 2)),
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
      }));

      const updatedProject = {
        ...project,
        videos: [...project.videos, ...mediaClips],
        updatedAt: Date.now(),
      };

      setProject(updatedProject);
      await updateProject(project.id, updatedProject);
    } catch (error) {
      console.error('Failed to pick media:', error);
      Alert.alert('Error', 'Failed to import media. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveMedia = async () => {
    if (!project || selectedCell === null) return;
    
    const updatedVideos = project.videos.filter((_, idx) => idx !== selectedCell);
    const updatedProject = { 
      ...project, 
      videos: updatedVideos, 
      updatedAt: Date.now() 
    };
    
    setProject(updatedProject);
    await updateProject(project.id, updatedProject);
    setSelectedCell(null);
  };

  const handleExport = () => {
    if (!project || project.videos.length === 0) {
      Alert.alert('No Media', 'Please add videos or images before exporting.');
      return;
    }
    setShowExportModal(true);
  };

  const handleExportComplete = async (outputPath: string) => {
    if (!project) return;

    const updatedProject = {
      ...project,
      outputPath,
      updatedAt: Date.now(),
    };

    setProject(updatedProject);
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
      Alert.alert('Error', 'Failed to save project.');
    }
  };

  if (!project) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary }}>Loading...</Text>
      </View>
    );
  }

  const maxItems =
    project.layout.type === 'grid'
      ? (project.layout.rows || 2) * (project.layout.cols || 2)
      : 10;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.projectName, { color: colors.textPrimary }]}>
          {project.name}
        </Text>
        <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            Export
          </Text>
        </TouchableOpacity>
      </View>

      {/* Canvas Area */}
      <View style={styles.canvasContainer}>
        <EditorCanvas
          layout={project.layout}
          media={project.videos}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
          onAddMedia={handlePickMedia}
          isImporting={isImporting}
        />
      </View>

      {/* Remove Button - shown when item selected */}
      {selectedCell !== null && project.videos[selectedCell] && (
        <View style={styles.removeButtonContainer}>
          <TouchableOpacity
            onPress={handleRemoveMedia}
            style={[styles.removeButton, { backgroundColor: colors.error }]}
          >
            <Text style={styles.removeButtonIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timeline Area */}
      <View
        style={[styles.timelineContainer, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>
          Timeline - {project.videos.length} item(s)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {project.videos.map((item, index) => {
            const isSelected = selectedCell === index;
            const mediaUri = item.localUri;
            
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedCell(index)}
                style={[
                  styles.timelineClip, 
                  { 
                    backgroundColor: colors.border,
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: colors.primary,
                  }
                ]}
              >
                {item.type === 'video' && mediaUri ? (
                  <Video
                    source={{ uri: mediaUri }}
                    style={styles.timelineThumbnail}
                    resizeMode="cover"
                    paused={true}
                    repeat={false}
                  />
                ) : item.type === 'image' && mediaUri ? (
                  <Image
                    source={{ uri: mediaUri }}
                    style={styles.timelineThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={{ fontSize: 10, color: colors.textPrimary }}>
                    {item.type === 'video' ? '🎬' : '🖼️'}
                  </Text>
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
          <ToolsContent activeTab={activeTab} onSave={handleSave} />
        </View>
      </View>

      {/* Modals */}
      <ExportModal
        isVisible={showExportModal}
        onClose={() => setShowExportModal(false)}
        project={project}
        onExportComplete={handleExportComplete}
      />
    </View>
  );
};

const EditorCanvas: React.FC<{
  layout: LayoutConfig;
  media: MediaClip[];
  selectedCell: number | null;
  onSelectCell: (cell: number) => void;
  onAddMedia: () => void;
  isImporting: boolean;
}> = ({ layout, media, selectedCell, onSelectCell, onAddMedia, isImporting }) => {
  const { colors } = useTheme();

  if (layout.type === 'grid' && layout.rows && layout.cols) {
    const cells = [];
    const cellCount = layout.rows * layout.cols;

    for (let i = 0; i < cellCount; i++) {
      const cellMedia = media.find(
        m => m.position.row * (layout.cols || 2) + m.position.col === i,
      );

      cells.push(
        <GridCell
          key={i}
          index={i}
          isSelected={selectedCell === i}
          media={cellMedia}
          onSelect={() => onSelectCell(i)}
          onAdd={onAddMedia}
          spacing={layout.spacing}
          borderRadius={layout.borderRadius}
        />,
      );
    }

    return (
      <View
        style={[
          styles.canvas,
          {
            aspectRatio:
              layout.aspectRatio === '1:1'
                ? 1
                : layout.aspectRatio === '16:9'
                ? 16 / 9
                : 9 / 16,
          },
        ]}
      >
        <View style={styles.gridContainer}>{cells}</View>
      </View>
    );
  }

  return <View style={styles.canvas} />;
};

const GridCell: React.FC<{
  index: number;
  isSelected: boolean;
  media?: MediaClip;
  onSelect: () => void;
  onAdd: () => void;
  spacing: number;
  borderRadius: number;
}> = ({
  index,
  isSelected,
  media,
  onSelect,
  onAdd,
  spacing,
  borderRadius,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      if (media) {
        runOnJS(onSelect)();
      } else {
        runOnJS(onAdd)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const mediaUri = media?.localUri;

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
          },
          animatedStyle,
        ]}
      >
        {media?.type === 'video' && mediaUri ? (
          <Video
            source={{ uri: mediaUri }}
            style={[styles.cellThumbnail, { borderRadius }]}
            resizeMode="cover"
            paused={true}
            repeat={false}
          />
        ) : media?.type === 'image' && mediaUri ? (
          <Image
            source={{ uri: mediaUri }}
            style={[styles.cellThumbnail, { borderRadius }]}
            resizeMode="cover"
          />
        ) : media ? (
          <Text style={{ fontSize: 32 }}>
            {media.type === 'video' ? '🎬' : '🖼️'}
          </Text>
        ) : (
          <Text style={{ fontSize: 32, opacity: 0.5 }}>+</Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const ToolsContent: React.FC<{ activeTab: string; onSave: () => void }> = ({
  activeTab,
  onSave,
}) => {
  const { colors } = useTheme();

  if (activeTab === 'export') {
    return (
      <View style={styles.toolsContentContainer}>
        <Text style={[styles.toolsText, { color: colors.textSecondary }]}>
          Ready to export your video collage
        </Text>
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
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  canvas: {
    width: '100%',
    maxWidth: SCREEN_WIDTH - SPACING.lg * 2,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    flex: 1,
    minWidth: '45%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    overflow: 'hidden',
  },
  cellThumbnail: {
    width: '100%',
    height: '100%',
  },
  removeButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonIcon: {
    fontSize: 20,
  },
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
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
