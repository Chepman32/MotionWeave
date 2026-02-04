import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { CustomButton } from '../../shared/components/CustomButton';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import {
  VideoImportService,
  ImportedVideo,
} from '../../processes/video-processing/VideoImportService';

interface VideoPickerModalProps {
  isVisible: boolean;
  onClose: () => void;
  onVideosSelected: (videos: ImportedVideo[]) => void;
  maxVideos: number;
}

export const VideoPickerModal: React.FC<VideoPickerModalProps> = ({
  isVisible,
  onClose,
  onVideosSelected,
  maxVideos,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handlePickVideos = async () => {
    try {
      setIsLoading(true);
      const videos = await VideoImportService.pickVideos(maxVideos);

      if (videos.length > 0) {
        onVideosSelected(videos);
        onClose();
      } else {
        Alert.alert('No Videos Selected', 'Please select at least one video.');
      }
    } catch (error) {
      console.error('Failed to pick videos:', error);
      Alert.alert('Error', 'Failed to import videos. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet isVisible={isVisible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Add Videos
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Select up to {maxVideos} videos from your library
        </Text>

        <View style={styles.options}>
          <TouchableOpacity
            style={[styles.option, { backgroundColor: colors.surface }]}
            onPress={handlePickVideos}
            disabled={isLoading}
          >
            <Text style={styles.optionIcon}>📁</Text>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>
              Choose from Library
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { backgroundColor: colors.surface }]}
            disabled
          >
            <Text style={styles.optionIcon}>📹</Text>
            <Text style={[styles.optionText, { color: colors.textSecondary }]}>
              Record Video (Coming Soon)
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Importing videos...
            </Text>
          </View>
        )}

        <CustomButton
          onPress={onClose}
          variant="secondary"
          style={styles.cancelButton}
        >
          Cancel
        </CustomButton>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    marginBottom: SPACING.xl,
  },
  options: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: 12,
    gap: SPACING.md,
  },
  optionIcon: {
    fontSize: 32,
  },
  optionText: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.md,
  },
  cancelButton: {
    marginTop: SPACING.md,
  },
});
