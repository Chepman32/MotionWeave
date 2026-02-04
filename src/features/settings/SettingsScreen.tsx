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
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [hapticEnabled, setHapticEnabled] = React.useState(true);
  const [autoSave, setAutoSave] = React.useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.md }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={{ fontSize: 24, color: colors.textPrimary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* App Preferences */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            App Preferences
          </Text>

          <SettingRow
            label="Haptic Feedback"
            value={hapticEnabled}
            onValueChange={setHapticEnabled}
          />

          <SettingRow
            label="Auto-save Projects"
            value={autoSave}
            onValueChange={setAutoSave}
          />
        </View>

        {/* Export Settings */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Export Settings
          </Text>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Default Resolution
            </Text>
            <Text
              style={[styles.settingValue, { color: colors.textSecondary }]}
            >
              1080p
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Default Quality
            </Text>
            <Text
              style={[styles.settingValue, { color: colors.textSecondary }]}
            >
              High
            </Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            About
          </Text>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Version
            </Text>
            <Text
              style={[styles.settingValue, { color: colors.textSecondary }]}
            >
              1.0.0
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Privacy Policy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
              Terms of Service
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    <View style={styles.settingItem}>
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  settingLabel: {
    ...TYPOGRAPHY.body,
  },
  settingValue: {
    ...TYPOGRAPHY.body,
  },
});
