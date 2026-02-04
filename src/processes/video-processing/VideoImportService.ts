import { launchImageLibrary, Asset } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { generateId } from '../../shared/utils/helpers';
import { MediaType } from '../../shared/types';

export interface ImportedMedia {
  id: string;
  uri: string;
  localPath: string;
  thumbnailPath?: string;
  type: MediaType;
  duration: number;
  width: number;
  height: number;
  size: number;
  fileName: string;
}

export class VideoImportService {
  private static readonly VIDEO_DIR = `${RNFS.DocumentDirectoryPath}/MotionWeave/videos`;
  private static readonly THUMB_DIR = `${RNFS.DocumentDirectoryPath}/MotionWeave/thumbnails`;

  static async initialize(): Promise<void> {
    try {
      const videoDirExists = await RNFS.exists(this.VIDEO_DIR);
      if (!videoDirExists) {
        await RNFS.mkdir(this.VIDEO_DIR, {
          NSURLIsExcludedFromBackupKey: true,
        });
      }
      
      const thumbDirExists = await RNFS.exists(this.THUMB_DIR);
      if (!thumbDirExists) {
        await RNFS.mkdir(this.THUMB_DIR, {
          NSURLIsExcludedFromBackupKey: true,
        });
      }
    } catch (error) {
      console.error('Failed to initialize video directory:', error);
      throw error;
    }
  }

  static async pickMedia(maxItems: number = 10): Promise<ImportedMedia[]> {
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: maxItems,
        quality: 1,
        includeBase64: false,
      });

      if (result.didCancel || !result.assets) {
        return [];
      }

      const importedMedia: ImportedMedia[] = [];

      for (const asset of result.assets) {
        if (asset.uri) {
          const imported = await this.importMedia(asset);
          if (imported) {
            importedMedia.push(imported);
          }
        }
      }

      return importedMedia;
    } catch (error) {
      console.error('Failed to pick media:', error);
      throw error;
    }
  }

  static async pickVideos(maxVideos: number = 10): Promise<ImportedMedia[]> {
    try {
      const result = await launchImageLibrary({
        mediaType: 'video',
        selectionLimit: maxVideos,
        quality: 1,
      });

      if (result.didCancel || !result.assets) {
        return [];
      }

      const importedVideos: ImportedMedia[] = [];

      for (const asset of result.assets) {
        if (asset.uri) {
          const imported = await this.importMedia(asset);
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

  private static async importMedia(
    asset: Asset,
  ): Promise<ImportedMedia | null> {
    try {
      if (!asset.uri) return null;

      const isVideo = asset.type?.startsWith('video/') ?? false;
      const mediaType: MediaType = isVideo ? 'video' : 'image';
      const mediaId = generateId();
      const extension = asset.fileName?.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const fileName = `${mediaId}.${extension}`;
      const localPath = `${this.VIDEO_DIR}/${fileName}`;

      // Ensure directory exists
      const dirExists = await RNFS.exists(this.VIDEO_DIR);
      if (!dirExists) {
        await RNFS.mkdir(this.VIDEO_DIR, { NSURLIsExcludedFromBackupKey: true });
      }

      // For iOS Photo Library assets, use the original ph:// URI directly
      // This avoids the need to copy files and works better with the iOS Photo Library
      let finalPath: string;
      
      if (asset.uri.startsWith('ph://')) {
        // Use the original Photo Library URI
        finalPath = asset.uri;
        console.log('Using Photo Library URI:', finalPath);
      } else {
        // For file system URIs, copy to app directory
        await RNFS.copyFile(asset.uri, localPath);
        finalPath = localPath;
      }

      // Get file stats (only for copied files)
      let fileSize = 0;
      if (!asset.uri.startsWith('ph://')) {
        const stats = await RNFS.stat(finalPath);
        fileSize = typeof stats.size === 'string' ? parseInt(stats.size) : stats.size;
      } else if (asset.fileSize) {
        fileSize = asset.fileSize;
      }
      
      // Create thumbnail path (same as final path - iOS can display video frames and images)
      const thumbnailPath = finalPath;

      return {
        id: mediaId,
        uri: asset.uri,
        localPath: finalPath,
        thumbnailPath,
        type: mediaType,
        duration: asset.duration || 0,
        width: asset.width || 0,
        height: asset.height || 0,
        size: fileSize,
        fileName,
      };
    } catch (error) {
      console.error('Failed to import media:', error);
      console.error('Asset URI:', asset.uri);
      console.error('Asset type:', asset.type);
      console.error('Destination path:', `${this.VIDEO_DIR}/${generateId()}.${asset.fileName?.split('.').pop() || 'mp4'}`);
      return null;
    }
  }

  static async deleteMedia(localPath: string): Promise<void> {
    try {
      const exists = await RNFS.exists(localPath);
      if (exists) {
        await RNFS.unlink(localPath);
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  }

  static async getMediaSize(localPath: string): Promise<number> {
    try {
      const stats = await RNFS.stat(localPath);
      return typeof stats.size === 'string' ? parseInt(stats.size) : stats.size;
    } catch (error) {
      console.error('Failed to get media size:', error);
      return 0;
    }
  }

  static async clearCache(): Promise<void> {
    try {
      const videoExists = await RNFS.exists(this.VIDEO_DIR);
      if (videoExists) {
        await RNFS.unlink(this.VIDEO_DIR);
        await RNFS.mkdir(this.VIDEO_DIR);
      }
      
      const thumbExists = await RNFS.exists(this.THUMB_DIR);
      if (thumbExists) {
        await RNFS.unlink(this.THUMB_DIR);
        await RNFS.mkdir(this.THUMB_DIR);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}
