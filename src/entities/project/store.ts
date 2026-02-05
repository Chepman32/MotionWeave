import { create } from 'zustand';
import { Project } from '../../shared/types';
import { DatabaseService } from '../../processes/video-processing/DatabaseService';

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  loadProjects: () => Promise<void>;
}

const isProjectLike = (value: unknown): value is Project => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Project;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    typeof candidate.thumbnailPath === 'string' &&
    typeof candidate.duration === 'number' &&
    typeof candidate.layout === 'object' &&
    Array.isArray(candidate.videos) &&
    typeof candidate.settings === 'object'
  );
};

const withDerivedProjectFields = (project: Project): Project => {
  const fallbackThumbnail =
    project.videos[0]?.thumbnailUri || project.videos[0]?.localUri || '';

  return {
    ...project,
    thumbnailPath: fallbackThumbnail,
  };
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,

  addProject: async project => {
    try {
      const projectToSave = withDerivedProjectFields(project);
      await DatabaseService.saveProject(projectToSave);
      set(state => ({
        projects: [
          projectToSave,
          ...state.projects.filter(p => p.id !== projectToSave.id),
        ],
      }));
    } catch (error) {
      console.error('Failed to add project:', error);
      throw error;
    }
  },

  updateProject: async (id, updates) => {
    try {
      const snapshot = get();
      const projectFromList =
        snapshot.projects.find(p => p.id === id) || null;
      const projectFromCurrent =
        snapshot.currentProject?.id === id ? snapshot.currentProject : null;
      const baseProject = projectFromList || projectFromCurrent;

      if (!baseProject && !isProjectLike(updates)) {
        console.warn('updateProject called for unknown project:', id);
        return;
      }

      const updatedProject = withDerivedProjectFields({
        ...(baseProject || (updates as Project)),
        ...updates,
        id,
        updatedAt: Date.now(),
      });

      await DatabaseService.saveProject(updatedProject);

      set(state => {
        const exists = state.projects.some(p => p.id === id);
        return {
          projects: exists
            ? state.projects.map(p => (p.id === id ? updatedProject : p))
            : [updatedProject, ...state.projects],
          currentProject:
            state.currentProject?.id === id
              ? updatedProject
              : state.currentProject,
        };
      });
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  },

  deleteProject: async id => {
    try {
      await DatabaseService.deleteProject(id);
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProject:
          state.currentProject?.id === id ? null : state.currentProject,
      }));
    } catch (error) {
      console.error('Failed to delete project:', error);
      throw error;
    }
  },

  setCurrentProject: project => {
    set({ currentProject: project });
  },

  loadProjects: async () => {
    try {
      set({ isLoading: true });
      const loadedProjects = await DatabaseService.getAllProjects();

      set(state => {
        const byId = new Map<string, Project>();

        for (const p of loadedProjects) {
          if (!p?.id) continue;
          byId.set(p.id, p);
        }

        for (const p of state.projects) {
          if (!p?.id) continue;
          const existing = byId.get(p.id);
          if (!existing || p.updatedAt > existing.updatedAt) {
            byId.set(p.id, p);
          }
        }

        if (state.currentProject?.id) {
          const existing = byId.get(state.currentProject.id);
          if (
            !existing ||
            state.currentProject.updatedAt > existing.updatedAt
          ) {
            byId.set(state.currentProject.id, state.currentProject);
          }
        }

        const projects = [...byId.values()].sort(
          (a, b) => b.updatedAt - a.updatedAt,
        );

        return { projects, isLoading: false };
      });
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({ isLoading: false });
      throw error;
    }
  },
}));
