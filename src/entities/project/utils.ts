import { Project, LayoutConfig, ProjectSettings } from '../../shared/types';
import { generateId } from '../../shared/utils/helpers';

export const createNewProject = (
  name: string = '',
  layout?: LayoutConfig,
): Project => {
  const defaultLayout: LayoutConfig = layout || {
    type: 'grid',
    rows: 2,
    cols: 2,
    spacing: 8,
    borderRadius: 12,
    aspectRatio: '1:1',
  };

  const defaultSettings: ProjectSettings = {
    resolution: '1080p',
    frameRate: 30,
    quality: 'high',
    format: 'mp4',
  };

  return {
    id: generateId(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumbnailPath: '',
    duration: 0,
    layout: defaultLayout,
    videos: [],
    settings: defaultSettings,
  };
};

export const calculateProjectDuration = (project: Project): number => {
  if (project.videos.length === 0) return 0;

  // Find the longest video clip
  const maxDuration = Math.max(
    ...project.videos.map(clip => clip.endTime - clip.startTime),
  );

  return maxDuration;
};

export const validateProject = (
  project: Project,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (project.videos.length === 0) {
    errors.push('Project must have at least one video');
  }

  if (project.layout.type === 'grid') {
    const requiredCells =
      (project.layout.rows || 0) * (project.layout.cols || 0);
    if (project.videos.length < requiredCells) {
      errors.push(
        `Grid layout requires ${requiredCells} videos, but only ${project.videos.length} provided`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const getProjectThumbnailPath = (projectId: string): string => {
  return `/Documents/MotionWeave/projects/${projectId}/thumbnail.jpg`;
};

export const getProjectExportPath = (
  projectId: string,
  timestamp: number,
): string => {
  return `/Documents/MotionWeave/projects/${projectId}/exports/${timestamp}.mp4`;
};
