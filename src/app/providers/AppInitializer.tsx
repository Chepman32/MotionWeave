import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../shared/hooks/useTheme';

interface AppInitializerProps {
  children: React.ReactNode;
}

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { colors } = useTheme();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing MotionWeave...');

      // Initialize services one by one with error handling
      try {
        const { DatabaseService } = await import(
          '../../processes/video-processing/DatabaseService'
        );
        await DatabaseService.initialize();
        console.log('✓ Database initialized');
      } catch (dbError) {
        console.warn('Database initialization skipped:', dbError);
      }

      try {
        const { VideoImportService } = await import(
          '../../processes/video-processing/VideoImportService'
        );
        await VideoImportService.initialize();
        console.log('✓ Video import service initialized');
      } catch (importError) {
        console.warn('Video import initialization skipped:', importError);
      }

      try {
        const { FFmpegService } = await import(
          '../../processes/video-processing/FFmpegService'
        );
        await FFmpegService.initialize();
        console.log('✓ FFmpeg service initialized');
      } catch (ffmpegError) {
        console.warn('FFmpeg initialization skipped:', ffmpegError);
      }

      try {
        const { PurchaseService } = await import(
          '../../processes/iap/PurchaseService'
        );
        await PurchaseService.initialize();
        console.log('✓ Purchase service initialized');
      } catch (iapError) {
        console.warn('IAP initialization skipped:', iapError);
      }

      // Load projects if database is available
      try {
        const { useProjectStore } = await import(
          '../../entities/project/store'
        );
        await useProjectStore.getState().loadProjects();
        console.log('✓ Projects loaded');
      } catch (projectError) {
        console.warn('Project loading skipped:', projectError);
      }

      setIsInitialized(true);
      console.log('✓ App initialization complete');
    } catch (err) {
      console.error('Failed to initialize app:', err);
      // Don't block the app, just log the error
      setIsInitialized(true);
      console.log('⚠ App initialized with warnings');
    }
  };

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>
          Failed to initialize app
        </Text>
        <Text style={[styles.errorDetail, { color: colors.textSecondary }]}>
          {error}
        </Text>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
          Initializing...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    textAlign: 'center',
  },
});
