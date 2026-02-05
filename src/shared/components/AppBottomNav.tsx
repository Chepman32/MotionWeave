import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { SPACING } from '../constants/theme';
import { AppIcon, AppIconName } from './AppIcon';
import { triggerHaptic } from '../utils/haptics';

export type AppBottomNavTab = 'home' | 'templates' | 'settings';

interface AppBottomNavProps {
  activeTab: AppBottomNavTab;
  onSelectTab: (tab: AppBottomNavTab) => void;
}

const TABS: Array<{
  key: AppBottomNavTab;
  icon: AppIconName;
  iconOutline: AppIconName;
  accessibilityLabel: string;
}> = [
  {
    key: 'home',
    icon: 'home',
    iconOutline: 'home-outline',
    accessibilityLabel: 'Home',
  },
  {
    key: 'templates',
    icon: 'grid',
    iconOutline: 'grid-outline',
    accessibilityLabel: 'Templates',
  },
  {
    key: 'settings',
    icon: 'settings',
    iconOutline: 'settings-outline',
    accessibilityLabel: 'Settings',
  },
];

export const AppBottomNav: React.FC<AppBottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: SPACING.sm + insets.bottom,
        },
      ]}
    >
      {TABS.map(tab => {
        const isActive = tab.key === activeTab;
        const iconName = isActive ? tab.icon : tab.iconOutline;
        const iconColor = isActive ? colors.primary : colors.textSecondary;

        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => {
              triggerHaptic('selection');
              onSelectTab(tab.key);
            }}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={tab.accessibilityLabel}
            accessibilityState={{ selected: isActive }}
            hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
          >
            <AppIcon name={iconName} size={26} color={iconColor} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  item: {
    padding: SPACING.sm,
  },
});
