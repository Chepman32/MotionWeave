import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Video from 'react-native-video';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { MenuView, MenuAction, NativeActionEvent } from '@react-native-menu/menu';
import { useTheme } from '../../shared/hooks/useTheme';
import { AppIcon } from '../../shared/components/AppIcon';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import { Project, Folder, MediaClip } from '../../shared/types';
import { normalizeMediaUri } from '../../shared/utils/helpers';

export type ProjectContextActionId =
  | 'preview'
  | 'folder'
  | 'duplicate'
  | 'share'
  | 'remove'
  | 'recover';

interface FoldersAccordionProps {
  projects: Project[];
  folders: Folder[];
  onProjectPress: (project: Project) => void;
  onProjectContextAction: (
    project: Project,
    actionId: ProjectContextActionId,
  ) => void;
  onToggleFolderCollapse: (folderId: string) => void;
}

export const FoldersAccordion: React.FC<FoldersAccordionProps> = ({
  projects,
  folders,
  onProjectPress,
  onProjectContextAction,
  onToggleFolderCollapse,
}) => {
  const { colors } = useTheme();

  // Get projects by folder
  const allProjects = projects.filter(p => !p.folderId);
  const customFolders = folders.filter(f => f.type === 'custom');
  const trashFolder = folders.find(f => f.type === 'trash');

  return (
    <View style={styles.container}>
      {/* All Projects Folder (always visible, never collapsed) */}
      <FolderSection
        title="All Projects"
        icon="apps-outline"
        projects={allProjects}
        isCollapsed={false}
        onToggleCollapse={() => {}}
        onProjectPress={onProjectPress}
        onProjectContextAction={onProjectContextAction}
        trashFolderId={trashFolder?.id}
        colors={colors}
        showChevron={false}
      />

      {/* Custom Folders */}
      {customFolders.map(folder => {
        const folderProjects = projects.filter(p => p.folderId === folder.id);
        return (
          <FolderSection
            key={folder.id}
            title={folder.name}
            icon="folder-outline"
            projects={folderProjects}
            isCollapsed={folder.isCollapsed}
            onToggleCollapse={() => onToggleFolderCollapse(folder.id)}
            onProjectPress={onProjectPress}
            onProjectContextAction={onProjectContextAction}
            trashFolderId={trashFolder?.id}
            colors={colors}
          />
        );
      })}

      {/* Trash Folder (if exists) */}
      {trashFolder && (
        <FolderSection
          title="Trash"
          icon="trash-outline"
          projects={projects.filter(p => p.folderId === trashFolder.id)}
          isCollapsed={trashFolder.isCollapsed}
          onToggleCollapse={() => onToggleFolderCollapse(trashFolder.id)}
          onProjectPress={onProjectPress}
          onProjectContextAction={onProjectContextAction}
          trashFolderId={trashFolder.id}
          colors={colors}
        />
      )}
    </View>
  );
};

const FolderSection: React.FC<{
  title: string;
  icon: string;
  projects: Project[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onProjectPress: (project: Project) => void;
  onProjectContextAction: (
    project: Project,
    actionId: ProjectContextActionId,
  ) => void;
  trashFolderId?: string;
  colors: any;
  showChevron?: boolean;
}> = ({
  title,
  icon,
  projects,
  isCollapsed,
  onToggleCollapse,
  onProjectPress,
  onProjectContextAction,
  trashFolderId,
  colors,
  showChevron = true,
}) => {
  const [contentHeight, setContentHeight] = useState(0);
  const animatedHeight = useSharedValue(isCollapsed ? 0 : 1);
  const chevronRotation = useSharedValue(isCollapsed ? 0 : 90);

  React.useEffect(() => {
    if (contentHeight > 0) {
      animatedHeight.value = withTiming(isCollapsed ? 0 : 1, { duration: 300 });
      chevronRotation.value = withTiming(isCollapsed ? 0 : 90, { duration: 300 });
    }
  }, [isCollapsed, contentHeight, animatedHeight, chevronRotation]);

  const contentStyle = useAnimatedStyle(() => {
    if (contentHeight === 0) {
      return {
        height: undefined,
        opacity: 1,
      };
    }
    return {
      height: interpolate(animatedHeight.value, [0, 1], [0, contentHeight]),
      opacity: animatedHeight.value,
      overflow: 'hidden',
    };
  });

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const handleLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && contentHeight === 0) {
      setContentHeight(height);
    }
  };

  return (
    <View style={styles.folderSection}>
      <TouchableOpacity
        style={[styles.folderHeader, { backgroundColor: colors.surface }]}
        onPress={onToggleCollapse}
        activeOpacity={0.7}
      >
        <AppIcon name={icon as any} size={20} color={colors.textPrimary} />
        <Text style={[styles.folderTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{projects.length}</Text>
        </View>
        {showChevron && (
          <Animated.View style={chevronStyle}>
            <AppIcon name="chevron-forward" size={18} color={colors.textSecondary} />
          </Animated.View>
        )}
      </TouchableOpacity>

      <Animated.View style={contentStyle}>
        <View onLayout={handleLayout}>
          {projects.length === 0 ? (
            <View style={styles.emptyFolder}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No projects in this folder
              </Text>
            </View>
          ) : (
            <View style={styles.projectsGrid}>
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onPress={() => onProjectPress(project)}
                  onContextAction={actionId =>
                    onProjectContextAction(project, actionId)
                  }
                  isInTrash={project.folderId === trashFolderId}
                  colors={colors}
                />
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const ProjectCard: React.FC<{
  project: Project;
  onPress: () => void;
  onContextAction: (actionId: ProjectContextActionId) => void;
  isInTrash: boolean;
  colors: any;
}> = ({ project, onPress, onContextAction, isInTrash, colors }) => {
  const firstClip = project.videos[0] ?? null;

  const menuActions: MenuAction[] = [
    {
      id: 'preview',
      title: 'Fast Preview',
      image: 'eye',
    },
    {
      id: 'folder',
      title: 'Move to Folder',
      image: 'folder',
    },
    {
      id: 'duplicate',
      title: 'Duplicate',
      image: 'plus.square.on.square',
    },
    {
      id: 'share',
      title: 'Share',
      image: 'square.and.arrow.up',
    },
    {
      id: isInTrash ? 'recover' : 'remove',
      title: isInTrash ? 'Recover' : 'Remove',
      image: isInTrash ? 'arrow.uturn.backward' : 'trash',
      attributes: { destructive: !isInTrash },
    },
  ];

  const handlePressAction = ({ nativeEvent }: NativeActionEvent) => {
    onContextAction(nativeEvent.event as ProjectContextActionId);
  };

  return (
    <MenuView
      title={project.name}
      shouldOpenOnLongPress={true}
      actions={menuActions}
      onPressAction={handlePressAction}
      style={styles.projectCard}
    >
      <TouchableOpacity
        style={[styles.projectCardInner, { backgroundColor: colors.surface }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <ProjectPreview clip={firstClip} colors={colors} />
      </TouchableOpacity>
    </MenuView>
  );
};

const ProjectPreview: React.FC<{ clip: MediaClip | null; colors: any }> = ({
  clip,
  colors,
}) => {
  if (!clip) {
    return (
      <View style={[styles.projectThumbnail, { backgroundColor: colors.border }]}>
        <AppIcon name="videocam-outline" size={22} color={colors.textSecondary} />
      </View>
    );
  }

  const thumbnailUri = clip.thumbnailUri ? normalizeMediaUri(clip.thumbnailUri) : null;
  const mediaUri = normalizeMediaUri(clip.localUri);

  if (!mediaUri) {
    return (
      <View style={[styles.projectThumbnail, { backgroundColor: colors.border }]}>
        <AppIcon name="image-outline" size={22} color={colors.textSecondary} />
      </View>
    );
  }

  const showThumbnailImage =
    clip.type === 'video' && !!thumbnailUri && clip.thumbnailUri !== clip.localUri;

  return (
    <View style={[styles.projectThumbnail, { backgroundColor: colors.border }]}>
      {clip.type === 'video' ? (
        showThumbnailImage ? (
          <Image
            source={{ uri: thumbnailUri as string }}
            style={styles.projectThumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <Video
            source={{ uri: mediaUri }}
            style={styles.projectThumbnailImage}
            resizeMode="cover"
            paused={true}
            repeat={false}
            muted={true}
            pointerEvents="none"
          />
        )
      ) : (
        <Image
          source={{ uri: thumbnailUri || mediaUri }}
          style={styles.projectThumbnailImage}
          resizeMode="cover"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  folderSection: {
    marginBottom: SPACING.sm,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  folderTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    ...TYPOGRAPHY.small,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyFolder: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.caption,
  },
  projectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
  },
  projectCard: {
    width: '48.5%',
    marginBottom: SPACING.md,
  },
  projectCardInner: {
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectThumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectThumbnailImage: {
    width: '100%',
    height: '100%',
  },
});
