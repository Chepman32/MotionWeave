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
} from 'react-native';
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
import { VideoClip, LayoutConfig, Project } from '../../shared/types';
import { VideoPickerModal } from './VideoPickerModal';
import { ExportModal } from '../export/ExportModal';
import { ImportedVideo } from '../../processes/video-processing/VideoImportService';
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
  const [showVideoPicker, setShowVideoPicker] = useState(false);
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

  const handleVideosSelected = async (videos: ImportedVideo[]) => {
    if (!project) return;

    const videoClips: VideoClip[] = videos.map((video, index) => ({
      id: video.id,
      localUri: video.localPath,
      duration: video.duration,
      startTime: 0,
      endTime: video.duration,
      position: {
        row: Math.floor(index / (project.layout.cols || 2)),
        col: index % (project.layout.cols || 2),
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
      videos: [...project.videos, ...videoClips],
      updatedAt: Date.now(),
    };

    setProject(updatedProject);
    await updateProject(project.id, updatedProject);
  };

  const handleExport = () => {
    if (!project || project.videos.length === 0) {
      Alert.alert('No Videos', 'Please add videos before exporting.');
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
        Alert.alert('Empty Project', 'Please add videos before saving.');
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

  const maxVideos =
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
          videos={project.videos}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
          onAddVideo={() => setShowVideoPicker(true)}
        />
      </View>

      {/* Timeline Area */}
      <View
        style={[styles.timelineContainer, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>
          Timeline - {project.videos.length} video(s)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {project.videos.map((video, index) => (
            <View
              key={video.id}
              style={[styles.timelineClip, { backgroundColor: colors.border }]}
            >
              <Text style={{ fontSize: 10, color: colors.textPrimary }}>
                {index + 1}
              </Text>
            </View>
          ))}
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
      <VideoPickerModal
        isVisible={showVideoPicker}
        onClose={() => setShowVideoPicker(false)}
        onVideosSelected={handleVideosSelected}
        maxVideos={maxVideos}
      />

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
  videos: VideoClip[];
  selectedCell: number | null;
  onSelectCell: (cell: number) => void;
  onAddVideo: () => void;
}> = ({ layout, videos, selectedCell, onSelectCell, onAddVideo }) => {
  const { colors } = useTheme();

  if (layout.type === 'grid' && layout.rows && layout.cols) {
    const cells = [];
    const cellCount = layout.rows * layout.cols;

    for (let i = 0; i < cellCount; i++) {
      const hasVideo = videos.some(
        v => v.position.row * (layout.cols || 2) + v.position.col === i,
      );

      cells.push(
        <GridCell
          key={i}
          index={i}
          isSelected={selectedCell === i}
          hasVideo={hasVideo}
          onSelect={() => onSelectCell(i)}
          onAdd={onAddVideo}
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
  hasVideo: boolean;
  onSelect: () => void;
  onAdd: () => void;
  spacing: number;
  borderRadius: number;
}> = ({
  index,
  isSelected,
  hasVideo,
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
      if (hasVideo) {
        runOnJS(onSelect)();
      } else {
        runOnJS(onAdd)();
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.gridCell,
          {
            backgroundColor: hasVideo ? colors.primary : colors.border,
            borderRadius,
            borderWidth: isSelected ? 2 : 0,
            borderColor: isSelected ? colors.primary : 'transparent',
            opacity: hasVideo ? 0.8 : 0.3,
          },
          animatedStyle,
        ]}
      >
        <Text style={{ fontSize: 32, opacity: hasVideo ? 0 : 0.5 }}>+</Text>
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
