import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from '../../shared/hooks/useTheme';
import RNFS from 'react-native-fs';
import { AppIcon, loadAppIconFont } from '../../shared/components/AppIcon';
import { useThemeStore } from '../../shared/stores/themeStore';
import { usePreferencesStore } from '../../shared/stores/preferencesStore';

interface AppInitializerProps {
  children: React.ReactNode;
}

// Timeout for initialization (10 seconds)
const INIT_TIMEOUT = 10000;

export const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    isInitializedRef.current = isInitialized;
  }, [isInitialized]);

  useEffect(() => {
    initializeApp();
    
    // Set a timeout to prevent infinite loading
    timeoutRef.current = setTimeout(() => {
      if (!isInitializedRef.current) {
        console.warn('Initialization timeout - forcing continue');
        setIsInitialized(true);
        setIsLoading(false);
      }
    }, INIT_TIMEOUT);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const clearDatabaseAndRetry = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Clear the database file to force recreation
      const dbPath = `${RNFS.DocumentDirectoryPath}/../Library/LocalDatabase/motionweave.db`;
      const exists = await RNFS.exists(dbPath);
      if (exists) {
        await RNFS.unlink(dbPath);
        console.log('✓ Old database cleared');
      }
      
      // Retry initialization
      initializeApp();
    } catch (err) {
      console.error('Failed to clear database:', err);
      setError('Failed to reset database. Please restart the app.');
      setIsLoading(false);
    }
  };

  const initializeApp = async () => {
    try {
      console.log('Initializing MotionWeave...');
      setIsLoading(true);

      // Ensure icon font is loaded early to avoid "?" glyphs.
      await loadAppIconFont();

      // Hydrate user preferences (theme, toggles)
      try {
        await useThemeStore.getState().hydrate();
      } catch (themeError) {
        console.warn('Theme hydration failed:', themeError);
      }

      try {
        await usePreferencesStore.getState().hydrate();
      } catch (prefsError) {
        console.warn('Preferences hydration failed:', prefsError);
      }

      // Initialize services one by one with error handling
      // Database
      try {
        const { DatabaseService } = await import(
          '../../processes/video-processing/DatabaseService'
        );
        await DatabaseService.initialize();
        console.log('✓ Database initialized');
      } catch (dbError) {
        console.warn('Database initialization failed:', dbError);
        // Don't fail - app can work without database
      }

      // Video Import Service
      try {
        const { VideoImportService } = await import(
          '../../processes/video-processing/VideoImportService'
        );
        await VideoImportService.initialize();
        console.log('✓ Video import service initialized');
      } catch (importError) {
        console.warn('Video import initialization failed:', importError);
      }

      // FFmpeg Service
      try {
        const { FFmpegService } = await import(
          '../../processes/video-processing/FFmpegService'
        );
        await FFmpegService.initialize();
        console.log('✓ FFmpeg service initialized');
      } catch (ffmpegError) {
        console.warn('FFmpeg initialization failed:', ffmpegError);
      }

      // Purchase Service
      try {
        const { PurchaseService } = await import(
          '../../processes/iap/PurchaseService'
        );
        await PurchaseService.initialize();
        console.log('✓ Purchase service initialized');
      } catch (iapError) {
        console.warn('IAP initialization failed:', iapError);
      }

      // Load projects
      try {
        const { useProjectStore } = await import(
          '../../entities/project/store'
        );
        await useProjectStore.getState().hydrate();
        console.log('✓ Projects loaded');
      } catch (projectError) {
        console.warn('Project loading failed:', projectError);
      }

      console.log('App initialization complete');
      setIsInitialized(true);
      setIsLoading(false);
      
      // Clear the timeout since we succeeded
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } catch (err) {
      console.error('❌ Failed to initialize app:', err);
      setError('Failed to initialize. Tap below to reset.');
      setIsLoading(false);
      
      // Still allow app to continue after a delay
      setTimeout(() => {
        setIsInitialized(true);
      }, 3000);
    }
  };

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorHeader}>
          <AppIcon name="warning-outline" size={22} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            Initialization Issue
          </Text>
        </View>
        <Text style={[styles.errorDetail, { color: colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          onPress={clearDatabaseAndRetry}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryButtonText}>Reset & Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isInitialized || isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textPrimary }]}>
          Initializing...
        </Text>
        <Text style={[styles.subText, { color: colors.textSecondary }]}>
          Setting up your workspace
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
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  subText: {
    marginTop: 8,
    fontSize: 14,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
  },
  errorDetail: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
