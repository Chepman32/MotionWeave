import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { BottomSheet } from '../../shared/components/BottomSheet';
import { CustomButton } from '../../shared/components/CustomButton';
import { useTheme } from '../../shared/hooks/useTheme';
import { SPACING, TYPOGRAPHY } from '../../shared/constants/theme';
import {
  FFmpegService,
  ExportOptions,
} from '../../processes/video-processing/FFmpegService';
import { Project } from '../../shared/types';

interface ExportModalProps {
  isVisible: boolean;
  onClose: () => void;
  project: Project;
  onExportComplete: (outputPath: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isVisible,
  onClose,
  project,
  onExportComplete,
}) => {
  const { colors, isDark } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);

      const options: ExportOptions = {
        resolution: project.settings.resolution,
        frameRate: project.settings.frameRate,
        quality: project.settings.quality,
        format: project.settings.format,
      };

      const outputPath = await FFmpegService.composeVideo(
        project.videos,
        project.layout,
        options,
        progressData => {
          setProgress(progressData.progress);
        },
      );

      setIsExporting(false);
      onExportComplete(outputPath);

      // Ask if user wants to save to Photos
      Alert.alert(
        'Export Complete',
        'Your video collage has been exported successfully! Would you like to save it to your Photo Library?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => onClose(),
          },
          {
            text: 'Save to Photos',
            onPress: async () => {
              const { PhotoLibraryService } = await import(
                '../../processes/video-processing/PhotoLibraryService'
              );
              const saved = await PhotoLibraryService.saveToLibrary(outputPath);
              if (saved) {
                Alert.alert('Success', 'Video saved to Photo Library!');
              }
              onClose();
            },
          },
        ],
      );
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      Alert.alert('Export Failed', 'Failed to export video. Please try again.');
    }
  };

  const handleCancel = async () => {
    if (isExporting) {
      await FFmpegService.cancel();
      setIsExporting(false);
    }
    onClose();
  };

  return (
    <BottomSheet isVisible={isVisible} onClose={handleCancel}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Export Video
        </Text>

        {!isExporting ? (
          <>
            <View style={styles.settings}>
              <SettingRow
                label="Resolution"
                value={project.settings.resolution}
                colors={colors}
              />
              <SettingRow
                label="Frame Rate"
                value={`${project.settings.frameRate} fps`}
                colors={colors}
              />
              <SettingRow
                label="Quality"
                value={project.settings.quality}
                colors={colors}
              />
              <SettingRow
                label="Format"
                value={project.settings.format.toUpperCase()}
                colors={colors}
              />
            </View>

            <CustomButton onPress={handleExport} variant="primary">
              Start Export
            </CustomButton>

            <CustomButton
              onPress={onClose}
              variant="secondary"
              style={styles.cancelButton}
            >
              Cancel
            </CustomButton>
          </>
        ) : (
          <View style={styles.exportingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.progressText, { color: colors.textPrimary }]}>
              Exporting... {Math.round(progress)}%
            </Text>
            <View
              style={[styles.progressBar, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${progress}%` },
                ]}
              />
            </View>
            <CustomButton
              onPress={handleCancel}
              variant="secondary"
              style={styles.cancelButton}
            >
              Cancel Export
            </CustomButton>
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const SettingRow: React.FC<{ label: string; value: string; colors: any }> = ({
  label,
  value,
  colors,
}) => (
  <View style={styles.settingRow}>
    <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>
      {label}
    </Text>
    <Text style={[styles.settingValue, { color: colors.textPrimary }]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h2,
    marginBottom: SPACING.xl,
  },
  settings: {
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  settingLabel: {
    ...TYPOGRAPHY.body,
  },
  settingValue: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: SPACING.md,
  },
  exportingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  progressText: {
    ...TYPOGRAPHY.h3,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
