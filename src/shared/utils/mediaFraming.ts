import { MediaClip } from '../types';

export type ClipResizeMode = 'cover' | 'contain';

export interface MediaFrame {
  width: number;
  height: number;
  maxPanX: number;
  maxPanY: number;
}

export const clampNormalizedPan = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
};

export const getClipResizeMode = (clip: MediaClip): ClipResizeMode => {
  return clip.transform.resizeMode === 'contain' ? 'contain' : 'cover';
};

export const getClipPan = (
  clip: MediaClip,
): { x: number; y: number } => {
  return {
    x: clampNormalizedPan(clip.transform.translateX),
    y: clampNormalizedPan(clip.transform.translateY),
  };
};

export const computeMediaFrame = (
  containerWidth: number,
  containerHeight: number,
  mediaAspectRatio: number,
  resizeMode: ClipResizeMode,
): MediaFrame => {
  const safeContainerWidth = Math.max(containerWidth, 1);
  const safeContainerHeight = Math.max(containerHeight, 1);
  const safeAspectRatio =
    mediaAspectRatio > 0 && Number.isFinite(mediaAspectRatio)
      ? mediaAspectRatio
      : 1;
  const containerAspectRatio = safeContainerWidth / safeContainerHeight;

  let width = safeContainerWidth;
  let height = safeContainerHeight;

  if (resizeMode === 'cover') {
    if (safeAspectRatio > containerAspectRatio) {
      height = safeContainerHeight;
      width = height * safeAspectRatio;
    } else {
      width = safeContainerWidth;
      height = width / safeAspectRatio;
    }
  } else if (safeAspectRatio > containerAspectRatio) {
    width = safeContainerWidth;
    height = width / safeAspectRatio;
  } else {
    height = safeContainerHeight;
    width = height * safeAspectRatio;
  }

  return {
    width,
    height,
    maxPanX: Math.max(0, (width - safeContainerWidth) / 2),
    maxPanY: Math.max(0, (height - safeContainerHeight) / 2),
  };
};
