import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import Video from 'react-native-video';
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
import { MediaClip, Project } from '../../shared/types';
import { normalizeMediaUri } from '../../shared/utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const { projects, setCurrentProject } = useProjectStore();

  const handleProjectPress = (project: Project) => {
    setCurrentProject(project);
    onNavigateToEditor();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={[styles.logo, { color: colors.textPrimary }]}>
          MotionWeave
        </Text>
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

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <ProjectsGrid projects={projects} onProjectPress={handleProjectPress} />
        )}
      </ScrollView>

      {/* FAB */}
      <FAB onPress={onNavigateToEditor} />

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

const ProjectsGrid: React.FC<{
  projects: Project[];
  onProjectPress: (project: Project) => void;
}> = ({ projects, onProjectPress }) => {
  return (
    <View style={styles.projectsGrid}>
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          project={project}
          onPress={() => onProjectPress(project)}
        />
      ))}
    </View>
  );
};

const ProjectPreview: React.FC<{ clip: MediaClip | null }> = ({ clip }) => {
  const { colors } = useTheme();

  if (!clip) {
    return (
      <View
        style={[styles.projectThumbnail, { backgroundColor: colors.border }]}
      >
        <AppIcon name="videocam-outline" size={22} color={colors.textSecondary} />
      </View>
    );
  }

  const thumbnailUri = clip.thumbnailUri ? normalizeMediaUri(clip.thumbnailUri) : null;
  const mediaUri = normalizeMediaUri(clip.localUri);

  if (!mediaUri) {
    return (
      <View
        style={[styles.projectThumbnail, { backgroundColor: colors.border }]}
      >
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

const ProjectCard: React.FC<{ project: Project; onPress: () => void }> = ({
  project,
  onPress,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const firstClip = project.videos[0] ?? null;

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      runOnJS(onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.projectCard,
          { backgroundColor: colors.surface },
          animatedStyle,
        ]}
      >
        <ProjectPreview clip={firstClip} />
      </Animated.View>
    </GestureDetector>
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
  projectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  projectCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2,
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
});
