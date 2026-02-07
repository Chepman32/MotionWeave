import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../hooks/useTheme';
import { AppIcon, AppIconName } from './AppIcon';
import { SPACING, TYPOGRAPHY } from '../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ContextMenuItem {
  id: string;
  label: string;
  icon: AppIconName;
  iconColor?: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ContextMenuProps {
  visible: boolean;
  items: ContextMenuItem[];
  onClose: () => void;
  title?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  items,
  onClose,
  title,
}) => {
  const { colors } = useTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20 });
      backdropOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT);
      backdropOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [backdropOpacity, translateY, visible]);

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd(e => {
      if (e.velocityY > 500 || translateY.value > 100) {
        translateY.value = withSpring(SCREEN_HEIGHT);
        backdropOpacity.value = withTiming(0);
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20 });
      }
    });

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible && translateY.value >= SCREEN_HEIGHT) {
    return null;
  }

  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        >
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={10}
            reducedTransparencyFallbackColor={colors.background}
          />
        </TouchableOpacity>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.menu,
            { backgroundColor: colors.surface },
            menuStyle,
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {title && (
            <Text style={[styles.title, { color: colors.textSecondary }]}>
              {title}
            </Text>
          )}

          <View style={styles.itemsContainer}>
            {items.map((item, index) => (
              <MenuItem
                key={item.id}
                item={item}
                isLast={index === items.length - 1}
                colors={colors}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.background }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: colors.textPrimary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </>
  );
};

const MenuItem: React.FC<{
  item: ContextMenuItem;
  isLast: boolean;
  colors: any;
}> = ({ item, isLast, colors }) => {
  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onEnd(() => {
      scale.value = withSpring(1);
      runOnJS(item.onPress)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = item.iconColor || (item.destructive ? colors.error : colors.textPrimary);
  const textColor = item.destructive ? colors.error : colors.textPrimary;

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        style={[
          styles.menuItem,
          {
            borderBottomWidth: isLast ? 0 : 1,
            borderBottomColor: colors.border,
          },
          animatedStyle,
        ]}
      >
        <AppIcon name={item.icon} size={22} color={iconColor} />
        <Text style={[styles.menuItemText, { color: textColor }]}>
          {item.label}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  itemsContainer: {
    marginBottom: SPACING.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  menuItemText: {
    ...TYPOGRAPHY.body,
    fontWeight: '500',
  },
  cancelButton: {
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
});
