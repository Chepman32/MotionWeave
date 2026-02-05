import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import Video from 'react-native-video';
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
  const controlsOpacity = useSharedValue(1);

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
}> = ({ layout, clips, isPlaying, soundEnabled }) => {
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
          source={{ uri: normalizeMediaUri(first.localUri) }}
          style={styles.fullscreenMedia}
          resizeMode="cover"
          paused={!isPlaying}
          repeat={true}
          muted={!soundEnabled}
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
});
