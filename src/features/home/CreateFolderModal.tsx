import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useTheme } from '../../shared/hooks/useTheme';
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
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
      return () => clearTimeout(focusTimer);
    }
    return undefined;
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
    } catch {
      Alert.alert('Error', 'Failed to create folder. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
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
                isCreating ? styles.buttonDisabled : undefined,
              ]}
              onPress={handleCreate}
              disabled={isCreating}
            >
              <Text style={styles.createButtonText}>
                {isCreating ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  container: {
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  createButtonText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
