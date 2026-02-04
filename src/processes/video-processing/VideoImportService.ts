import { launchImageLibrary, Asset } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { generateId } from '../../shared/utils/helpers';

export interface ImportedVideo {
  id: string;
  uri: string;
  localPath: string;
  duration: number;
  width: number;
  height: number;
  size: number;
  fileName: string;
}

export class VideoImportService {
  private static readonly VIDEO_DIR = `${RNFS.DocumentDirectoryPath}/MotionWeave/videos`;

  static async initialize(): Promise<void> {
    try {
      const dirExists = await RNFS.exists(this.VIDEO_DIR);
      if (!dirExists) {
        await RNFS.mkdir(this.VIDEO_DIR, {
          NSURLIsExcludedFromBackupKey: true,
        });
      }
    } catch (error) {
      console.error('Failed to initialize video directory:', error);
      throw error;
    }
  }

  static async pickVideos(maxVideos: number = 10): Promise<ImportedVideo[]> {
    try {
      const result = await launchImageLibrary({
        mediaType: 'video',
        selectionLimit: maxVideos,
        quality: 1,
      });

      if (result.didCancel || !result.assets) {
        return [];
      }

      const importedVideos: ImportedVideo[] = [];

      for (const asset of result.assets) {
        if (asset.uri) {
          const imported = await this.importVideo(asset);
          if (imported) {
            importedVideos.push(imported);
          }
        }
      }

      return importedVideos;
    } catch (error) {
      console.error('Failed to pick videos:', error);
      throw error;
    }
  }

  private static async importVideo(
    asset: Asset,
  ): Promise<ImportedVideo | null> {
    try {
      if (!asset.uri) return null;

      const videoId = generateId();
      const extension = asset.fileName?.split('.').pop() || 'mp4';
      const fileName = `${videoId}.${extension}`;
      const localPath = `${this.VIDEO_DIR}/${fileName}`;

      // Copy video to app directory
      await RNFS.copyFile(asset.uri, localPath);

      // Get file stats
      const stats = await RNFS.stat(localPath);

      return {
        id: videoId,
        uri: asset.uri,
        localPath,
        duration: asset.duration || 0,
        width: asset.width || 0,
        height: asset.height || 0,
        size: parseInt(stats.size),
        fileName,
      };
    } catch (error) {
      console.error('Failed to import video:', error);
      return null;
    }
  }

  static async deleteVideo(localPath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(localPath);
      if (exists) {
        await RNFS.unlink(localPath);
      }
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  }

  static async getVideoSize(localPath: string): Promise<number> {
    try {
      const stats = await RNFS.stat(localPath);
      return parseInt(stats.size);
    } catch (error) {
      console.error('Failed to get video size:', error);
      return 0;
    }
  }

  static async clearCache(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.VIDEO_DIR);
      if (exists) {
        await RNFS.unlink(this.VIDEO_DIR);
        await RNFS.mkdir(this.VIDEO_DIR);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}
