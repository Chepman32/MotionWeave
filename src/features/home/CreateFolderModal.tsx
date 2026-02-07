import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../../shared/hooks/useTheme';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';

interface CreateFolderModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateFolder: (name: string) => Promise<void>;
  existingFolderNames: string[];
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  onClose,
  onCreateFolder,
  existingFolderNames,
}) => {
  const { colors } = useTheme();
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setFolderName('');
      // Auto-focus after a short delay to ensure modal is fully visible
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible]);

  const handleCreate = async () => {
    const trimmedName = folderName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    if (existingFolderNames.some(name => name.toLowerCase() === trimmedName.toLowerCase())) {
      Alert.alert('Error', 'A folder with this name already exists');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateFolder(trimmedName);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create folder. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <BottomSheet isVisible={visible} onClose={onClose} snapPoints={[0.35]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Create New Folder
        </Text>

        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.textPrimary,
              borderColor: colors.border,
            },
          ]}
          placeholder="Folder name"
          placeholderTextColor={colors.textSecondary}
          value={folderName}
          onChangeText={setFolderName}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleCreate}
          maxLength={50}
        />

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.cancelButton,
              { backgroundColor: colors.background },
            ]}
            onPress={onClose}
            disabled={isCreating}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.createButton,
              { backgroundColor: colors.primary },
              isCreating && { opacity: 0.6 },
            ]}
            onPress={handleCreate}
            disabled={isCreating}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {isCreating ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h3,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  input: {
    ...TYPOGRAPHY.body,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {},
  createButton: {},
  buttonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
});
