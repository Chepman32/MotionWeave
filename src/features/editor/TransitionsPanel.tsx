import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import { MediaClip, TransitionConfig } from '../../shared/types';
import { AppIcon, AppIconName } from '../../shared/components/AppIcon';

interface TransitionsPanelProps {
  selectedClip: MediaClip | null;
  onTransitionChange: (clipId: string, transition: TransitionConfig) => void;
}

const TRANSITION_PRESETS: Array<{
  type: TransitionConfig['type'];
  name: string;
  iconName: AppIconName;
}> = [
  { type: 'none', name: 'None', iconName: 'close-circle-outline' },
  { type: 'slide-up', name: 'Slide Up', iconName: 'arrow-up-circle-outline' },
  { type: 'slide-left', name: 'Slide Left', iconName: 'arrow-back-circle-outline' },
  { type: 'slide-right', name: 'Slide Right', iconName: 'arrow-forward-circle-outline' },
  { type: 'slide-down', name: 'Slide Down', iconName: 'arrow-down-circle-outline' },
  { type: 'fade-in', name: 'Fade In', iconName: 'eye-outline' },
  { type: 'fade-out', name: 'Fade Out', iconName: 'eye-off-outline' },
  { type: 'rotating', name: 'Rotating', iconName: 'sync-circle-outline' },
  { type: 'zoom-in', name: 'Zoom In', iconName: 'add-circle-outline' },
  { type: 'zoom-out', name: 'Zoom Out', iconName: 'remove-circle-outline' },
];

export const TransitionsPanel: React.FC<TransitionsPanelProps> = ({
  selectedClip,
  onTransitionChange,
}) => {
  const { colors } = useTheme();

  const currentTransition = selectedClip?.transition || { type: 'none', duration: 0.5 };
  const [duration, setDuration] = useState(currentTransition.duration);

  const handleTransitionSelect = (type: TransitionConfig['type']) => {
    if (!selectedClip) return;

    onTransitionChange(selectedClip.id, {
      type,
      duration: type === 'none' ? 0 : duration,
    });
  };

  const handleDurationChange = (value: number) => {
    if (!selectedClip) return;

    setDuration(value);
    onTransitionChange(selectedClip.id, {
      ...currentTransition,
      duration: value,
    });
  };

  if (!selectedClip) {
    return (
      <View style={styles.container}>
        <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
          Select a clip to apply transitions
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Transitions</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.presetsScroll}
        contentContainerStyle={styles.presetsContainer}
      >
        {TRANSITION_PRESETS.map(preset => (
          <TransitionPreset
            key={preset.type}
            preset={preset}
            isSelected={currentTransition.type === preset.type}
            onSelect={() => handleTransitionSelect(preset.type)}
            colors={colors}
          />
        ))}
      </ScrollView>

      {currentTransition.type !== 'none' && (
        <View style={styles.durationContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Duration
          </Text>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0.2}
              maximumValue={2.0}
              step={0.1}
              value={duration}
              onValueChange={handleDurationChange}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text
              style={[styles.durationValue, { color: colors.textPrimary }]}
            >
              {duration.toFixed(1)}s
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const TransitionPreset: React.FC<{
  preset: { type: string; name: string; iconName: AppIconName };
  isSelected: boolean;
  onSelect: () => void;
  colors: any;
}> = ({ preset, isSelected, onSelect, colors }) => {
  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.9);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      runOnJS(onSelect)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.preset,
          {
            backgroundColor: isSelected ? colors.primary : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
          },
          animatedStyle,
        ]}
      >
        <AppIcon
          name={preset.iconName}
          size={22}
          color={isSelected ? '#FFFFFF' : colors.textSecondary}
          style={styles.presetIcon}
        />
        <Text
          style={[
            styles.presetName,
            { color: isSelected ? '#FFFFFF' : colors.textPrimary },
          ]}
        >
          {preset.name}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.xs,
  },
  emptyMessage: {
    ...TYPOGRAPHY.body,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  presetsScroll: {
    marginBottom: SPACING.sm,
  },
  presetsContainer: {
    gap: SPACING.xs,
  },
  preset: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  presetIcon: {
    marginBottom: 2,
  },
  presetName: {
    ...TYPOGRAPHY.small,
    fontWeight: '600',
  },
  durationContainer: {
    marginBottom: SPACING.md,
  },
  label: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.xs,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  slider: {
    flex: 1,
  },
  durationValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
});
