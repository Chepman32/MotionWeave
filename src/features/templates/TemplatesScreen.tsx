import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { Template } from '../../shared/types';
import { AppBottomNav } from '../../shared/components/AppBottomNav';
import { AppIcon } from '../../shared/components/AppIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Classic 2x2',
    category: 'grid',
    layout: {
      type: 'grid',
      rows: 2,
      cols: 2,
      spacing: 8,
      borderRadius: 12,
      aspectRatio: '1:1',
    },
    isPremium: false,
  },
  {
    id: '2',
    name: 'Instagram Grid',
    category: 'social',
    layout: {
      type: 'grid',
      rows: 2,
      cols: 2,
      spacing: 4,
      borderRadius: 8,
      aspectRatio: '1:1',
    },
    isPremium: false,
  },
  {
    id: '3',
    name: 'Stories Split',
    category: 'social',
    layout: {
      type: 'grid',
      rows: 1,
      cols: 2,
      spacing: 8,
      borderRadius: 12,
      aspectRatio: '9:16',
    },
    isPremium: false,
  },
  {
    id: '4',
    name: 'Classic 3x3',
    category: 'grid',
    layout: {
      type: 'grid',
      rows: 3,
      cols: 3,
      spacing: 8,
      borderRadius: 12,
      aspectRatio: '1:1',
    },
    isPremium: false,
  },
  {
    id: '5',
    name: 'Hexagon Grid',
    category: 'creative',
    layout: {
      type: 'freeform',
      spacing: 8,
      borderRadius: 12,
      aspectRatio: '1:1',
    },
    isPremium: true,
  },
  {
    id: '6',
    name: 'Diagonal Split',
    category: 'creative',
    layout: {
      type: 'freeform',
      spacing: 8,
      borderRadius: 12,
      aspectRatio: '16:9',
    },
    isPremium: true,
  },
];

interface TemplatesScreenProps {
  onBack: () => void;
  onSelectTemplate: (template: Template) => void;
  onNavigateToSettings?: () => void;
}

export const TemplatesScreen: React.FC<TemplatesScreenProps> = ({
  onBack,
  onSelectTemplate,
  onNavigateToSettings,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');

  const categories = ['all', 'social', 'grid', 'cinematic', 'creative'];

  const filteredTemplates =
    selectedCategory === 'all'
      ? TEMPLATES
      : TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <AppIcon
            name="chevron-back"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Templates
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map(category => (
          <CategoryChip
            key={category}
            label={category}
            isActive={selectedCategory === category}
            onPress={() => setSelectedCategory(category)}
          />
        ))}
      </ScrollView>

      {/* Templates Grid */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.templatesGrid}>
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onPress={() => onSelectTemplate(template)}
            />
          ))}
        </View>
      </ScrollView>

      <AppBottomNav
        activeTab="templates"
        onSelectTab={tab => {
          if (tab === 'home') onBack();
          if (tab === 'settings') onNavigateToSettings?.();
        }}
      />
    </View>
  );
};

const CategoryChip: React.FC<{
  label: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ label, isActive, onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.categoryChip,
        {
          backgroundColor: isActive ? colors.primary : colors.surface,
        },
      ]}
    >
      <Text
        style={[
          styles.categoryChipText,
          { color: isActive ? '#FFFFFF' : colors.textPrimary },
        ]}
      >
        {label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
    </TouchableOpacity>
  );
};

const TemplateCard: React.FC<{
  template: Template;
  onPress: () => void;
}> = ({ template, onPress }) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

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
          styles.templateCard,
          { backgroundColor: colors.surface },
          animatedStyle,
        ]}
      >
        {/* Template Preview */}
        <View
          style={[styles.templatePreview, { backgroundColor: colors.border }]}
        >
          <TemplatePreview layout={template.layout} />
          {template.isPremium && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>PRO</Text>
            </View>
          )}
        </View>

        {/* Template Info */}
        <View style={styles.templateInfo}>
          <Text style={[styles.templateName, { color: colors.textPrimary }]}>
            {template.name}
          </Text>
          <Text style={[styles.templateMeta, { color: colors.textSecondary }]}>
            {template.layout.rows && template.layout.cols
              ? `${template.layout.rows}x${template.layout.cols}`
              : 'Custom'}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const TemplatePreview: React.FC<{ layout: any }> = ({ layout }) => {
  const { colors } = useTheme();

  if (layout.type === 'grid' && layout.rows && layout.cols) {
    const cells = [];
    for (let i = 0; i < layout.rows * layout.cols; i++) {
      cells.push(
        <View
          key={i}
          style={[
            styles.previewCell,
            {
              backgroundColor: colors.primary,
              opacity: 0.3 + i * 0.1,
            },
          ]}
        />,
      );
    }

    return (
      <View
        style={[
          styles.previewGrid,
          {
            gap: layout.spacing / 2,
          },
        ]}
      >
        {cells}
      </View>
    );
  }

  return (
    <View style={styles.previewGrid}>
      <View
        style={[
          styles.previewCell,
          { backgroundColor: colors.primary, opacity: 0.5 },
        ]}
      />
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
  backButton: {
    padding: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h2,
  },
  categoryScroll: {
    maxHeight: 60,
  },
  categoryContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  categoryChipText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  templateCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  templatePreview: {
    width: '100%',
    aspectRatio: 1,
    padding: SPACING.md,
  },
  previewGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  previewCell: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 4,
  },
  premiumBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: '#FFD700',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  templateInfo: {
    padding: SPACING.md,
  },
  templateName: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateMeta: {
    ...TYPOGRAPHY.small,
  },
});
