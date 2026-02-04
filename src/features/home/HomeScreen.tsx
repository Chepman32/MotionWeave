import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StatusBar,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HomeScreenProps {
  onNavigateToEditor: () => void;
  onNavigateToTemplates: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToEditor,
  onNavigateToTemplates,
}) => {
  const { colors, gradients, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { projects } = useProjectStore();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={[styles.logo, { color: colors.textPrimary }]}>
          MotionWeave
        </Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Text style={{ color: colors.textPrimary }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {projects.length === 0 ? (
          <EmptyState onCreateProject={onNavigateToEditor} />
        ) : (
          <ProjectsGrid projects={projects} viewMode={viewMode} />
        )}
      </ScrollView>

      {/* FAB */}
      <FAB onPress={onNavigateToEditor} />

      {/* Bottom Navigation */}
      <BottomNav
        onNavigateToTemplates={onNavigateToTemplates}
        colors={colors}
      />
    </View>
  );
};

const EmptyState: React.FC<{ onCreateProject: () => void }> = ({
  onCreateProject,
}) => {
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
  projects: any[];
  viewMode: 'grid' | 'list';
}> = ({ projects, viewMode }) => {
  return (
    <View style={styles.projectsGrid}>
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
    </View>
  );
};

const ProjectCard: React.FC<{ project: any; index: number }> = ({
  project,
  index,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
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
        <View
          style={[styles.projectThumbnail, { backgroundColor: colors.border }]}
        >
          <Text style={{ color: colors.textSecondary }}>📹</Text>
        </View>
        <Text style={[styles.projectName, { color: colors.textPrimary }]}>
          {project.name}
        </Text>
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
  }, []);

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

const BottomNav: React.FC<{
  onNavigateToTemplates: () => void;
  colors: any;
}> = ({ onNavigateToTemplates, colors }) => {
  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.surface }]}>
      <TouchableOpacity style={styles.navItem}>
        <Text style={{ fontSize: 24 }}>🏠</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={onNavigateToTemplates}>
        <Text style={{ fontSize: 24 }}>📐</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem}>
        <Text style={{ fontSize: 24 }}>⚙️</Text>
      </TouchableOpacity>
    </View>
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
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectThumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  projectName: {
    ...TYPOGRAPHY.caption,
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
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  navItem: {
    padding: SPACING.sm,
  },
});
