import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, THEMES, ThemeName, TYPOGRAPHY } from '../../shared/constants/theme';
import { AppIcon } from '../../shared/components/AppIcon';
import { AppBottomNav } from '../../shared/components/AppBottomNav';
import { useThemeStore } from '../../shared/stores/themeStore';
import { usePreferencesStore } from '../../shared/stores/preferencesStore';
import { triggerHaptic } from '../../shared/utils/haptics';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigateToHome?: () => void;
  onNavigateToTemplates?: () => void;
}

const THEME_OPTIONS: Array<{
  key: ThemeName;
  label: string;
  description: string;
}> = [
  { key: 'light', label: 'Light', description: 'Clean and bright' },
  { key: 'dark', label: 'Dark', description: 'Easy on the eyes' },
  { key: 'solar', label: 'Solar', description: 'Warm, sunny tones' },
  { key: 'mono', label: 'Mono', description: 'Minimal grayscale' },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onNavigateToHome,
  onNavigateToTemplates,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const selectedTheme = useThemeStore(state => state.theme);
  const setTheme = useThemeStore(state => state.setTheme);
  const soundEnabled = usePreferencesStore(state => state.soundEnabled);
  const hapticsEnabled = usePreferencesStore(state => state.hapticsEnabled);
  const setSoundEnabled = usePreferencesStore(state => state.setSoundEnabled);
  const setHapticsEnabled = usePreferencesStore(
    state => state.setHapticsEnabled,
  );

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
          Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: SPACING.xxxl }}
      >
        {/* Theme */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Theme
          </Text>

          {THEME_OPTIONS.map(option => {
            const isSelected = selectedTheme === option.key;
            const swatch = THEMES[option.key].colors.primary;

            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => {
                  triggerHaptic('selection');
                  setTheme(option.key);
                }}
                style={[styles.themeRow, { borderBottomColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={`Theme: ${option.label}`}
                accessibilityState={{ selected: isSelected }}
              >
                <View
                  style={[
                    styles.themeSwatch,
                    { backgroundColor: swatch, borderColor: colors.border },
                  ]}
                />
                <View style={styles.themeText}>
                  <Text
                    style={[styles.themeLabel, { color: colors.textPrimary }]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.themeDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                <AppIcon
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Preferences */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Preferences
          </Text>

          <SettingRow
            label="Sound"
            value={soundEnabled}
            onValueChange={setSoundEnabled}
          />

          <SettingRow
            label="Haptics"
            value={hapticsEnabled}
            onValueChange={setHapticsEnabled}
          />
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            About
          </Text>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Version
            </Text>
            <Text
              style={[styles.settingValue, { color: colors.textSecondary }]}
            >
              1.0.0
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Terms of Service
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AppBottomNav
        activeTab="settings"
        onSelectTab={tab => {
          if (tab === 'home') onNavigateToHome?.();
          if (tab === 'templates') onNavigateToTemplates?.();
        }}
      />
    </View>
  );
};

const SettingRow: React.FC<{
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}> = ({ label, value, onValueChange }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
      <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
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
  content: {
    flex: 1,
  },
  section: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 12,
    padding: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.md,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.md,
  },
  themeSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  themeText: {
    flex: 1,
  },
  themeLabel: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  themeDescription: {
    ...TYPOGRAPHY.small,
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  settingLabel: {
    ...TYPOGRAPHY.body,
  },
  settingValue: {
    ...TYPOGRAPHY.body,
  },
});
