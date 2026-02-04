import {
  createNewProject,
  validateProject,
  calculateProjectDuration,
} from '../utils';

describe('Project Utils', () => {
  describe('createNewProject', () => {
    it('should create a new project with default values', () => {
      const project = createNewProject();

      expect(project.id).toBeDefined();
      expect(project.name).toBe('New Project');
      expect(project.videos).toEqual([]);
      expect(project.layout.type).toBe('grid');
      expect(project.layout.rows).toBe(2);
      expect(project.layout.cols).toBe(2);
    });

    it('should create a project with custom name', () => {
      const project = createNewProject('My Project');
      expect(project.name).toBe('My Project');
    });

    it('should create a project with custom layout', () => {
      const customLayout = {
        type: 'grid' as const,
        rows: 3,
        cols: 3,
        spacing: 12,
        borderRadius: 8,
        aspectRatio: '1:1' as const,
      };

      const project = createNewProject('Test', customLayout);
      expect(project.layout).toEqual(customLayout);
    });
  });

  describe('validateProject', () => {
    it('should validate a valid project', () => {
      const project = createNewProject();
      project.videos = [
        {
          id: '1',
          localUri: '/path/to/video.mp4',
          duration: 10,
          startTime: 0,
          endTime: 10,
          position: { row: 0, col: 0 },
          transform: { scale: 1, translateX: 0, translateY: 0, rotation: 0 },
          filters: [],
          volume: 1,
        },
      ];

      const result = validateProject(project);
      expect(result.valid).toBe(false); // Needs 4 videos for 2x2 grid
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject project with empty name', () => {
      const project = createNewProject('');
      const result = validateProject(project);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project name is required');
    });

    it('should reject project with no videos', () => {
      const project = createNewProject();
      const result = validateProject(project);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project must have at least one video');
    });
  });

  describe('calculateProjectDuration', () => {
    it('should return 0 for project with no videos', () => {
      const project = createNewProject();
      expect(calculateProjectDuration(project)).toBe(0);
    });

    it('should calculate duration from longest video', () => {
      const project = createNewProject();
      project.videos = [
        {
          id: '1',
          localUri: '/path/to/video1.mp4',
          duration: 10,
          startTime: 0,
          endTime: 10,
          position: { row: 0, col: 0 },
          transform: { scale: 1, translateX: 0, translateY: 0, rotation: 0 },
          filters: [],
          volume: 1,
        },
        {
          id: '2',
          localUri: '/path/to/video2.mp4',
          duration: 15,
          startTime: 0,
          endTime: 15,
          position: { row: 0, col: 1 },
          transform: { scale: 1, translateX: 0, translateY: 0, rotation: 0 },
          filters: [],
          volume: 1,
        },
      ];

      expect(calculateProjectDuration(project)).toBe(15);
    });
  });
});
