import RNFS from 'react-native-fs';
import { LayoutConfig, VideoClip, FilterConfig } from '../../shared/types';

export interface ExportOptions {
  resolution: '720p' | '1080p' | '2k' | '4k';
  frameRate: 24 | 30 | 60;
  quality: 'low' | 'medium' | 'high' | 'maximum';
  format: 'mp4' | 'mov';
}

export interface ExportProgress {
  progress: number; // 0-100
  time: number; // seconds processed
  speed: number; // processing speed
  estimatedTimeRemaining: number; // seconds
}

/**
 * NOTE: FFmpeg support is temporarily disabled due to the deprecation of
 * ffmpeg-kit-react-native. The library's binaries are no longer available.
 * 
 * TODO: Replace with one of these alternatives:
 * 1. react-native-ffmpeg (with custom binary source)
 * 2. react-native-video-processing (limited features)
 * 3. Custom native module with FFmpeg
 * 4. Cloud-based video processing
 */
export class FFmpegService {
  private static readonly OUTPUT_DIR = `${RNFS.DocumentDirectoryPath}/MotionWeave/exports`;
  private static isEnabled = false;

  static async initialize(): Promise<void> {
    try {
      const dirExists = await RNFS.exists(this.OUTPUT_DIR);
      if (!dirExists) {
        await RNFS.mkdir(this.OUTPUT_DIR, {
          NSURLIsExcludedFromBackupKey: true,
        });
      }
      console.warn('[FFmpegService] Video processing is temporarily disabled. FFmpeg binaries are not available.');
    } catch (error) {
      console.error('Failed to initialize FFmpeg directory:', error);
      throw error;
    }
  }

  static async composeVideo(
    clips: VideoClip[],
    layout: LayoutConfig,
    options: ExportOptions,
    onProgress?: (progress: ExportProgress) => void,
  ): Promise<string> {
    console.warn('[FFmpegService] Video composition is not available. FFmpeg-kit has been deprecated.');
    throw new Error(
      'Video composition is temporarily unavailable. ' +
      'Please check the project documentation for updates on FFmpeg replacement.'
    );
  }

  static async generateThumbnail(
    videoPath: string,
    time: number = 0,
  ): Promise<string> {
    console.warn('[FFmpegService] Thumbnail generation is not available. FFmpeg-kit has been deprecated.');
    throw new Error(
      'Thumbnail generation is temporarily unavailable. ' +
      'Please check the project documentation for updates on FFmpeg replacement.'
    );
  }

  static async trimVideo(
    inputPath: string,
    startTime: number,
    endTime: number,
  ): Promise<string> {
    console.warn('[FFmpegService] Video trimming is not available. FFmpeg-kit has been deprecated.');
    throw new Error(
      'Video trimming is temporarily unavailable. ' +
      'Please check the project documentation for updates on FFmpeg replacement.'
    );
  }

  static async cancel(): Promise<void> {
    console.warn('[FFmpegService] FFmpeg cancellation is not available.');
  }

  // Private helper methods kept for future implementation
  private static buildFFmpegCommand(
    clips: VideoClip[],
    layout: LayoutConfig,
    options: ExportOptions,
    outputPath: string,
  ): string {
    const resolution = this.getResolution(options.resolution);
    const crf = this.getQualityCRF(options.quality);

    if (layout.type === 'grid' && layout.rows && layout.cols) {
      return this.buildGridCommand(
        clips,
        layout,
        resolution,
        crf,
        options.frameRate,
        outputPath,
      );
    }

    throw new Error('Unsupported layout type');
  }

  private static buildGridCommand(
    clips: VideoClip[],
    layout: LayoutConfig,
    resolution: { width: number; height: number },
    crf: number,
    frameRate: number,
    outputPath: string,
  ): string {
    const rows = layout.rows || 2;
    const cols = layout.cols || 2;
    const cellWidth = Math.floor(resolution.width / cols);
    const cellHeight = Math.floor(resolution.height / rows);

    // Input files
    const inputs = clips.map((clip, i) => `-i "${clip.localUri}"`).join(' ');

    // Build filter complex for grid layout
    const filterParts: string[] = [];

    // Scale each video to cell size
    clips.forEach((clip, i) => {
      const filters: string[] = [];

      // Trim video
      if (clip.startTime > 0 || clip.endTime < clip.duration) {
        filters.push(`trim=start=${clip.startTime}:end=${clip.endTime}`);
        filters.push('setpts=PTS-STARTPTS');
      }

      // Scale to cell size
      filters.push(
        `scale=${cellWidth}:${cellHeight}:force_original_aspect_ratio=increase`,
      );
      filters.push(`crop=${cellWidth}:${cellHeight}`);

      // Apply filters
      if (clip.filters && clip.filters.length > 0) {
        clip.filters.forEach(filter => {
          const filterStr = this.getFilterString(filter);
          if (filterStr) filters.push(filterStr);
        });
      }

      filterParts.push(`[${i}:v]${filters.join(',')}[v${i}]`);
    });

    // Build xstack layout
    const layoutStr = this.buildXStackLayout(rows, cols, cellWidth, cellHeight);
    const videoInputs = clips.map((_, i) => `[v${i}]`).join('');
    filterParts.push(
      `${videoInputs}xstack=inputs=${clips.length}:layout=${layoutStr}[out]`,
    );

    const filterComplex = filterParts.join(';');

    return `${inputs} -filter_complex "${filterComplex}" -map "[out]" -c:v libx264 -preset medium -crf ${crf} -r ${frameRate} -pix_fmt yuv420p "${outputPath}"`;
  }

  private static buildXStackLayout(
    rows: number,
    cols: number,
    cellWidth: number,
    cellHeight: number,
  ): string {
    const positions: string[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cellWidth;
        const y = row * cellHeight;
        positions.push(`${x}_${y}`);
      }
    }

    return positions.join('|');
  }

  private static getFilterString(filter: FilterConfig): string {
    switch (filter.type) {
      case 'bw':
        return 'hue=s=0';
      case 'vivid':
        return `eq=saturation=${1 + filter.intensity}`;
      case 'vintage':
        return 'curves=vintage';
      case 'cool':
        return 'colortemperature=temperature=7000';
      case 'warm':
        return 'colortemperature=temperature=3000';
      default:
        return '';
    }
  }

  private static getResolution(resolution: string): {
    width: number;
    height: number;
  } {
    switch (resolution) {
      case '720p':
        return { width: 1280, height: 720 };
      case '1080p':
        return { width: 1920, height: 1080 };
      case '2k':
        return { width: 2560, height: 1440 };
      case '4k':
        return { width: 3840, height: 2160 };
      default:
        return { width: 1920, height: 1080 };
    }
  }

  private static getQualityCRF(quality: string): number {
    switch (quality) {
      case 'low':
        return 28;
      case 'medium':
        return 23;
      case 'high':
        return 18;
      case 'maximum':
        return 15;
      default:
        return 23;
    }
  }
}
