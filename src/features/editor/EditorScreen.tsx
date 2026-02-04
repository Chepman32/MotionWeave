import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
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
import { VideoClip, LayoutConfig } from '../../shared/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EditorScreenProps {
  onBack: () => void;
  layout?: LayoutConfig;
}

export const EditorScreen: React.FC<EditorScreenProps> = ({
  onBack,
  layout,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    'layout' | 'effects' | 'audio' | 'export'
  >('layout');

  const defaultLayout: LayoutConfig = layout || {
    type: 'grid',
    rows: 2,
    cols: 2,
    spacing: 8,
    borderRadius: 12,
    aspectRatio: '1:1',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.projectName, { color: colors.textPrimary }]}>
          New Project
        </Text>
        <TouchableOpacity style={styles.exportButton}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            Export
          </Text>
        </TouchableOpacity>
      </View>

      {/* Canvas Area */}
      <View style={styles.canvasContainer}>
        <EditorCanvas
          layout={defaultLayout}
          selectedCell={selectedCell}
          onSelectCell={setSelectedCell}
        />
      </View>

      {/* Timeline Area */}
      <View
        style={[styles.timelineContainer, { backgroundColor: colors.surface }]}
      >
        <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>
          Timeline
        </Text>
        <View style={styles.timelineTracks}>
          <View style={[styles.playhead, { backgroundColor: colors.error }]} />
        </View>
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
          <ToolsContent activeTab={activeTab} />
        </View>
      </View>
    </View>
  );
};

const EditorCanvas: React.FC<{
  layout: LayoutConfig;
  selectedCell: number | null;
  onSelectCell: (cell: number) => void;
}> = ({ layout, selectedCell, onSelectCell }) => {
  const { colors } = useTheme();

  if (layout.type === 'grid' && layout.rows && layout.cols) {
    const cells = [];
    const cellCount = layout.rows * layout.cols;

    for (let i = 0; i < cellCount; i++) {
      cells.push(
        <GridCell
          key={i}
          index={i}
          isSelected={selectedCell === i}
          onSelect={() => onSelectCell(i)}
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
        <View
          style={[
            styles.gridContainer,
            {
              gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
              gap: layout.spacing,
            },
          ]}
        >
          {cells}
        </View>
      </View>
    );
  }

  return <View style={styles.canvas} />;
};

const GridCell: React.FC<{
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  spacing: number;
  borderRadius: number;
}> = ({ index, isSelected, onSelect, spacing, borderRadius }) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95);
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
          styles.gridCell,
          {
            backgroundColor: colors.border,
            borderRadius,
            borderWidth: isSelected ? 2 : 0,
            borderColor: isSelected ? colors.primary : 'transparent',
          },
          animatedStyle,
        ]}
      >
        <Text style={{ fontSize: 32, opacity: 0.3 }}>+</Text>
      </Animated.View>
    </GestureDetector>
  );
};

const ToolsContent: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.toolsContentContainer}>
      <Text style={[styles.toolsPlaceholder, { color: colors.textSecondary }]}>
        {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tools will
        appear here
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
  timelineTracks: {
    flex: 1,
    position: 'relative',
  },
  playhead: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
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
  toolsPlaceholder: {
    ...TYPOGRAPHY.body,
  },
});
