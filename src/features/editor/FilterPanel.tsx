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
import { FilterConfig } from '../../shared/types';
import { AppIcon, AppIconName } from '../../shared/components/AppIcon';

interface FilterPanelProps {
  currentFilter: FilterConfig;
  onFilterChange: (filter: FilterConfig) => void;
}

const FILTER_PRESETS: Array<{
  type: FilterConfig['type'];
  name: string;
  iconName: AppIconName;
}> = [
  { type: 'none', name: 'None', iconName: 'close-circle-outline' },
  { type: 'vivid', name: 'Vivid', iconName: 'color-palette-outline' },
  { type: 'bw', name: 'B&W', iconName: 'contrast' },
  { type: 'vintage', name: 'Vintage', iconName: 'camera-outline' },
  { type: 'cinematic', name: 'Cinematic', iconName: 'film-outline' },
  { type: 'cool', name: 'Cool', iconName: 'snow-outline' },
  { type: 'warm', name: 'Warm', iconName: 'flame-outline' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  currentFilter,
  onFilterChange,
}) => {
  const { colors } = useTheme();
  const [intensity, setIntensity] = useState(currentFilter.intensity);

  const handleFilterSelect = (type: FilterConfig['type']) => {
    onFilterChange({
      type,
      intensity: type === 'none' ? 0 : intensity,
    });
  };

  const handleIntensityChange = (value: number) => {
    setIntensity(value);
    onFilterChange({
      ...currentFilter,
      intensity: value,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Filters</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.presetsScroll}
        contentContainerStyle={styles.presetsContainer}
      >
        {FILTER_PRESETS.map(preset => (
          <FilterPreset
            key={preset.type}
            preset={preset}
            isSelected={currentFilter.type === preset.type}
            onSelect={() => handleFilterSelect(preset.type)}
            colors={colors}
          />
        ))}
      </ScrollView>

      {currentFilter.type !== 'none' && (
        <View style={styles.intensityContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Intensity
          </Text>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={intensity}
              onValueChange={handleIntensityChange}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <Text
              style={[styles.intensityValue, { color: colors.textPrimary }]}
            >
              {Math.round(intensity * 100)}%
            </Text>
          </View>
        </View>
      )}

      <View style={styles.advancedContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Advanced
        </Text>
        <AdvancedControl
          label="Brightness"
          value={0}
          onChange={() => {}}
          colors={colors}
        />
        <AdvancedControl
          label="Contrast"
          value={0}
          onChange={() => {}}
          colors={colors}
        />
        <AdvancedControl
          label="Saturation"
          value={0}
          onChange={() => {}}
          colors={colors}
        />
      </View>
    </View>
  );
};

const FilterPreset: React.FC<{
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

const AdvancedControl: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  colors: any;
}> = ({ label, value, onChange, colors }) => {
  return (
    <View style={styles.controlRow}>
      <Text style={[styles.controlLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Slider
        style={styles.controlSlider}
        minimumValue={-100}
        maximumValue={100}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
      />
      <Text style={[styles.controlValue, { color: colors.textPrimary }]}>
        {value > 0 ? '+' : ''}
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.md,
  },
  presetsScroll: {
    marginBottom: SPACING.lg,
  },
  presetsContainer: {
    gap: SPACING.sm,
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
  intensityContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.caption,
    marginBottom: SPACING.sm,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  slider: {
    flex: 1,
  },
  intensityValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  advancedContainer: {
    gap: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  controlLabel: {
    ...TYPOGRAPHY.caption,
    width: 80,
  },
  controlSlider: {
    flex: 1,
  },
  controlValue: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
});
