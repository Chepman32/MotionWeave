export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | 'custom';
export type MediaType = 'video' | 'image';

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnailPath: string;
  duration: number;
  layout: LayoutConfig;
  videos: MediaClip[];
  outputPath?: string;
  settings: ProjectSettings;
}

export interface MediaClip {
  id: string;
  localUri: string;
  thumbnailUri?: string;
  type: MediaType;
  duration: number;
  startTime: number;
  endTime: number;
  position: GridPosition;
  transform: TransformConfig;
  aspectRatio?: number;
  filters: FilterConfig[];
  volume: number;
}

export interface LayoutConfig {
  type: 'grid' | 'freeform';
  rows?: number;
  cols?: number;
  spacing: number;
  borderRadius: number;
  aspectRatio: AspectRatio;
}

export interface GridPosition {
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
}

export interface TransformConfig {
  scale: number;
  translateX: number;
  translateY: number;
  rotation: number;
  resizeMode?: 'cover' | 'contain';
}

export interface FilterConfig {
  type: 'none' | 'vivid' | 'bw' | 'vintage' | 'cinematic' | 'cool' | 'warm';
  intensity: number;
}

export interface ProjectSettings {
  resolution: '720p' | '1080p' | '2k' | '4k';
  frameRate: 24 | 30 | 60;
  quality: 'low' | 'medium' | 'high' | 'maximum';
  format: 'mp4' | 'mov';
}

export interface Template {
  id: string;
  name: string;
  category: 'social' | 'grid' | 'cinematic' | 'creative';
  layout: LayoutConfig;
  isPremium: boolean;
  thumbnailUrl?: string;
}
