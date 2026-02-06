import { launchImageLibrary, Asset } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { generateId } from '../../shared/utils/helpers';
import { MediaType } from '../../shared/types';
import { DEFAULT_IMAGE_DURATION_SECONDS } from '../../shared/constants/media';

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
        includeExtra: true,
        assetRepresentationMode: 'compatible',
        formatAsMp4: true,
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
        includeExtra: true,
        assetRepresentationMode: 'compatible',
        formatAsMp4: true,
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

      const sourceUri = asset.uri;
      const isVideo = asset.type?.startsWith('video/') ?? false;
      const mediaType: MediaType = isVideo ? 'video' : 'image';
      const mediaId = generateId();
      const isIosLibraryAsset =
        sourceUri.startsWith('ph://') || sourceUri.startsWith('assets-library://');
      const extension =
        !isVideo && isIosLibraryAsset
          ? 'jpg'
          : asset.fileName?.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const fileName = `${mediaId}.${extension}`;
      const localPath = `${this.VIDEO_DIR}/${fileName}`;

      // Ensure directory exists
      const dirExists = await RNFS.exists(this.VIDEO_DIR);
      if (!dirExists) {
        await RNFS.mkdir(this.VIDEO_DIR, { NSURLIsExcludedFromBackupKey: true });
      }

      let finalPath = localPath;

      if (isIosLibraryAsset) {
        if (isVideo) {
          await RNFS.copyAssetsVideoIOS(sourceUri, localPath);
        } else {
          await RNFS.copyAssetsFileIOS(sourceUri, localPath, 0, 0, 1, 1, 'contain');
        }
      } else if (sourceUri.startsWith('content://')) {
        // Android content URIs can't be copied via RNFS without additional tooling.
        // Use the content URI directly for playback/preview.
        finalPath = sourceUri;
      } else {
        const sourcePath = sourceUri.startsWith('file://')
          ? sourceUri.replace('file://', '')
          : sourceUri;
        await RNFS.copyFile(sourcePath, localPath);
      }

      const finalUri =
        finalPath.startsWith('ph://') ||
        finalPath.startsWith('assets-library://') ||
        finalPath.startsWith('content://') ||
        finalPath.startsWith('http://') ||
        finalPath.startsWith('https://') ||
        finalPath.startsWith('file://')
          ? finalPath
          : `file://${finalPath}`;

      // Get file stats (best-effort)
      let fileSize = asset.fileSize || 0;
      try {
        if (
          !finalPath.startsWith('ph://') &&
          !finalPath.startsWith('assets-library://') &&
          !finalPath.startsWith('content://') &&
          !finalPath.startsWith('http://') &&
          !finalPath.startsWith('https://')
        ) {
          const stats = await RNFS.stat(finalPath);
          fileSize = typeof stats.size === 'string' ? parseInt(stats.size, 10) : stats.size;
        }
      } catch {
        // Keep fallback size
      }

      // Thumbnail path: for now we reuse the media URI (video previews render first frame).
      const thumbnailPath = finalUri;

      return {
        id: mediaId,
        uri: sourceUri,
        localPath: finalUri,
        thumbnailPath,
        type: mediaType,
        duration:
          mediaType === 'image'
            ? DEFAULT_IMAGE_DURATION_SECONDS
            : asset.duration || 0,
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
      const fsPath = localPath.startsWith('file://')
        ? localPath.replace('file://', '')
        : localPath;
      const exists = await RNFS.exists(fsPath);
      if (exists) {
        await RNFS.unlink(fsPath);
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  }

  static async getMediaSize(localPath: string): Promise<number> {
    try {
      const fsPath = localPath.startsWith('file://')
        ? localPath.replace('file://', '')
        : localPath;
      const stats = await RNFS.stat(fsPath);
      return typeof stats.size === 'string'
        ? parseInt(stats.size, 10)
        : stats.size;
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
