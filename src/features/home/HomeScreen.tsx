import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../shared/hooks/useTheme';
import { useProjectStore } from '../../entities/project/store';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import { AppBottomNav } from '../../shared/components/AppBottomNav';
import { AppIcon } from '../../shared/components/AppIcon';
import { Project } from '../../shared/types';
import { FoldersAccordion, ProjectContextActionId } from './FoldersAccordion';
import { FastPreviewModal } from './FastPreviewModal';
import { FolderSelectorModal } from './FolderSelectorModal';
import { CreateFolderModal } from './CreateFolderModal';

interface HomeScreenProps {
  onNavigateToEditor: () => void;
  onNavigateToTemplates: () => void;
  onNavigateToSettings?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToEditor,
  onNavigateToTemplates,
  onNavigateToSettings,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    projects,
    folders,
    setCurrentProject,
    loadFolders,
    createFolder,
    toggleFolderCollapse,
    moveProjectToFolder,
    duplicateProject,
    moveToTrash,
    recoverFromTrash,
  } = useProjectStore();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [fastPreviewVisible, setFastPreviewVisible] = useState(false);
  const [folderSelectorVisible, setFolderSelectorVisible] = useState(false);
  const [createFolderVisible, setCreateFolderVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fabOpacity = useSharedValue(1);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    fabOpacity.value = withTiming(createFolderVisible ? 0 : 1, {
      duration: 220,
    });
  }, [createFolderVisible, fabOpacity]);

  const fabFadeStyle = useAnimatedStyle(() => ({
    opacity: fabOpacity.value,
  }));

  const handleProjectPress = (project: Project) => {
    setCurrentProject(project);
    onNavigateToEditor();
  };

  const trashFolder = folders.find(f => f.type === 'trash');
  const isProjectInTrash = (project: Project) =>
    Boolean(trashFolder?.id) && project.folderId === trashFolder?.id;

  const handleFastPreview = (project: Project) => {
    setSelectedProject(project);
    setFastPreviewVisible(true);
  };

  const handleMoveToFolder = (project: Project) => {
    setSelectedProject(project);
    setFolderSelectorVisible(true);
  };

  const handleDuplicate = async (project: Project) => {
    setIsProcessing(true);
    try {
      await duplicateProject(project.id);
      Alert.alert('Success', `${project.name} has been duplicated`);
    } catch {
      Alert.alert('Error', 'Failed to duplicate project');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async (project: Project) => {
    Alert.alert(
      'Move to Trash',
      `Are you sure you want to move "${project.name}" to trash?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Trash',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              await moveToTrash(project.id);
            } catch {
              Alert.alert('Error', 'Failed to move project to trash');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  const handleRecover = async (project: Project) => {
    setIsProcessing(true);
    try {
      await recoverFromTrash(project.id);
      Alert.alert('Success', `${project.name} has been recovered`);
    } catch {
      Alert.alert('Error', 'Failed to recover project');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = async (project: Project) => {
    if (project.outputPath) {
      try {
        await Share.share({
          title: project.name,
          message: `Check out my ${project.name} video created with MotionWeave!`,
          url: project.outputPath,
        });
      } catch (error) {
        console.error('Error sharing project:', error);
      }
    } else {
      Alert.alert(
        'Export Required',
        'Please export this project before sharing.',
        [{ text: 'OK' }],
      );
    }
  };

  const handleProjectContextAction = (
    project: Project,
    actionId: ProjectContextActionId,
  ) => {
    switch (actionId) {
      case 'preview':
        handleFastPreview(project);
        return;
      case 'folder':
        handleMoveToFolder(project);
        return;
      case 'duplicate':
        handleDuplicate(project);
        return;
      case 'share':
        handleShare(project);
        return;
      case 'recover':
        handleRecover(project);
        return;
      case 'remove':
        if (isProjectInTrash(project)) {
          handleRecover(project);
        } else {
          handleRemove(project);
        }
    }
  };

  const handleSelectFolder = async (folderId: string | null) => {
    if (!selectedProject) return;

    setIsProcessing(true);
    try {
      await moveProjectToFolder(selectedProject.id, folderId);
    } catch {
      Alert.alert('Error', 'Failed to move project to folder');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder(name);
    } catch (error) {
      throw error;
    }
  };

  const handleCreateNewFolderFromSelector = () => {
    setFolderSelectorVisible(false);
    setCreateFolderVisible(true);
  };

  const handleOpenCreateFolder = () => {
    setCreateFolderVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={[styles.logo, { color: colors.textPrimary }]}>
          MotionWeave
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.newFolderButton, { backgroundColor: colors.surface }]}
            onPress={handleOpenCreateFolder}
            accessibilityRole="button"
            accessibilityLabel="Create folder"
          >
            <AppIcon name="folder-open-outline" size={16} color={colors.primary} />
            <Text style={[styles.newFolderText, { color: colors.textPrimary }]}>
              New Folder
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onNavigateToSettings}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <AppIcon
              name="settings-outline"
              size={22}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <FoldersAccordion
            projects={projects}
            folders={folders}
            onProjectPress={handleProjectPress}
            onProjectContextAction={handleProjectContextAction}
            onToggleFolderCollapse={toggleFolderCollapse}
          />
        )}
      </ScrollView>

      {/* Modals */}
      <FastPreviewModal
        visible={fastPreviewVisible}
        project={selectedProject}
        onClose={() => setFastPreviewVisible(false)}
      />

      <FolderSelectorModal
        visible={folderSelectorVisible}
        onClose={() => setFolderSelectorVisible(false)}
        folders={folders}
        currentFolderId={selectedProject?.folderId || null}
        onSelectFolder={handleSelectFolder}
        onCreateNewFolder={handleCreateNewFolderFromSelector}
      />

      <CreateFolderModal
        visible={createFolderVisible}
        onClose={() => setCreateFolderVisible(false)}
        onCreateFolder={handleCreateFolder}
        existingFolderNames={folders.map(f => f.name)}
      />

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={[styles.processingContainer, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.processingText, { color: colors.textPrimary }]}>
              Processing...
            </Text>
          </View>
        </View>
      )}

      {/* FAB */}
      <Animated.View
        style={fabFadeStyle}
        pointerEvents={createFolderVisible ? 'none' : 'auto'}
      >
        <FAB onPress={onNavigateToEditor} />
      </Animated.View>

      {/* Bottom Navigation */}
      <AppBottomNav
        activeTab="home"
        onSelectTab={tab => {
          if (tab === 'templates') onNavigateToTemplates();
          if (tab === 'settings') onNavigateToSettings?.();
        }}
      />
    </View>
  );
};

const EmptyState: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        Your Canvas Awaits
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        Tap + to create your first video collage
      </Text>
    </View>
  );
};

const FAB: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { gradients } = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 1000 }),
        withTiming(-5, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, [rotation]);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.9);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      runOnJS(onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View style={[styles.fab, animatedStyle]}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  logo: {
    ...TYPOGRAPHY.h2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  newFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 10,
  },
  newFolderText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  settingsButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: SPACING.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingContainer: {
    padding: SPACING.xl,
    borderRadius: 12,
    alignItems: 'center',
    gap: SPACING.md,
  },
  processingText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
});
