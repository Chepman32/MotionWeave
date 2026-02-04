import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import {
  VideoImportService,
  ImportedMedia,
} from '../../processes/video-processing/VideoImportService';

interface VideoPickerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onMediaSelected: (media: ImportedMedia[]) => void;
  maxItems: number;
}

export const VideoPickerModal: React.FC<VideoPickerModalProps> = ({
  isVisible,
  onClose,
  onMediaSelected,
  maxItems,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Auto-open picker when modal becomes visible
  useEffect(() => {
    if (isVisible && !isLoading) {
      handlePickMedia();
    }
  }, [isVisible]);

  const handlePickMedia = async () => {
    try {
      setIsLoading(true);
      const media = await VideoImportService.pickMedia(maxItems);

      if (media.length > 0) {
        onMediaSelected(media);
      }
      onClose();
    } catch (error) {
      console.error('Failed to pick media:', error);
      Alert.alert('Error', 'Failed to import media. Please try again.');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Add Media
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Opening gallery...
        </Text>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Importing media...
            </Text>
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  title: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.md,
  },
});
