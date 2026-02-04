import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Platform, Alert } from 'react-native';
import RNFS from 'react-native-fs';

export class PhotoLibraryService {
  static async saveToLibrary(videoPath: string): Promise<boolean> {
    try {
      // Check if file exists
      const exists = await RNFS.exists(videoPath);
      if (!exists) {
        throw new Error('Video file not found');
      }

      // Save to camera roll
      const result = await CameraRoll.save(videoPath, {
        type: 'video',
      });

      console.log('Video saved to library:', result);
      return true;
    } catch (error) {
      console.error('Failed to save video to library:', error);

      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          Alert.alert(
            'Permission Required',
            'Please grant photo library access in Settings to save videos.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  // Open app settings
                  if (Platform.OS === 'ios') {
                    // Linking.openURL('app-settings:');
                  }
                },
              },
            ],
          );
        } else {
          Alert.alert('Error', 'Failed to save video to library.');
        }
      }

      return false;
    }
  }

  static async checkPermission(): Promise<boolean> {
    try {
      // On iOS, permission is requested automatically when saving
      return true;
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  static async getRecentVideos(count: number = 20): Promise<any[]> {
    try {
      const result = await CameraRoll.getPhotos({
        first: count,
        assetType: 'Videos',
      });

      return result.edges.map(edge => edge.node);
    } catch (error) {
      console.error('Failed to get recent videos:', error);
      return [];
    }
  }
}
