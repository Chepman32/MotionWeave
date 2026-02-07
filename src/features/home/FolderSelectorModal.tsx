import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../shared/hooks/useTheme';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { AppIcon } from '../../shared/components/AppIcon';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import { Folder } from '../../shared/types';

interface FolderSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateNewFolder: () => void;
}

export const FolderSelectorModal: React.FC<FolderSelectorModalProps> = ({
  visible,
  onClose,
  folders,
  currentFolderId,
  onSelectFolder,
  onCreateNewFolder,
}) => {
  const { colors } = useTheme();

  // Filter out trash folders
  const customFolders = folders.filter(f => f.type === 'custom');

  const handleSelectFolder = (folderId: string | null) => {
    onSelectFolder(folderId);
    onClose();
  };

  return (
    <BottomSheet isVisible={visible} onClose={onClose} snapPoints={[0.5, 0.7]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Move to Folder
        </Text>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <FolderItem
            label="Create New Folder"
            icon="add-circle-outline"
            isSelected={false}
            onPress={onCreateNewFolder}
            colors={colors}
            isCreate
          />

          <FolderItem
            label="All Projects"
            icon="apps-outline"
            isSelected={currentFolderId === null}
            onPress={() => handleSelectFolder(null)}
            colors={colors}
          />

          {customFolders.map(folder => (
            <FolderItem
              key={folder.id}
              label={folder.name}
              icon="folder-outline"
              isSelected={currentFolderId === folder.id}
              onPress={() => handleSelectFolder(folder.id)}
              colors={colors}
            />
          ))}
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

const FolderItem: React.FC<{
  label: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
  colors: any;
  isCreate?: boolean;
}> = ({ label, icon, isSelected, onPress, colors, isCreate = false }) => {
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
          styles.folderItem,
          {
            backgroundColor: isSelected ? colors.primary : colors.background,
          },
          animatedStyle,
        ]}
      >
        <AppIcon
          name={icon as any}
          size={22}
          color={isCreate ? colors.primary : isSelected ? '#FFFFFF' : colors.textPrimary}
        />
        <Text
          style={[
            styles.folderLabel,
            {
              color: isCreate ? colors.primary : isSelected ? '#FFFFFF' : colors.textPrimary,
              fontWeight: isCreate ? '600' : '500',
            },
          ]}
        >
          {label}
        </Text>
        {isSelected && (
          <AppIcon
            name="checkmark-circle"
            size={20}
            color="#FFFFFF"
            style={styles.checkIcon}
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  scroll: {
    maxHeight: 400,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xs,
    gap: SPACING.md,
  },
  folderLabel: {
    ...TYPOGRAPHY.body,
    flex: 1,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
});
