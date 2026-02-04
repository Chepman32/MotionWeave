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

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,

  addProject: async project => {
    try {
      await DatabaseService.saveProject(project);
      set(state => ({
        projects: [project, ...state.projects],
      }));
    } catch (error) {
      console.error('Failed to add project:', error);
      throw error;
    }
  },

  updateProject: async (id, updates) => {
    try {
      const state = get();
      const project = state.projects.find(p => p.id === id);

      if (project) {
        const updatedProject = {
          ...project,
          ...updates,
          updatedAt: Date.now(),
        };
        await DatabaseService.saveProject(updatedProject);

        set(state => ({
          projects: state.projects.map(p => (p.id === id ? updatedProject : p)),
          currentProject:
            state.currentProject?.id === id
              ? updatedProject
              : state.currentProject,
        }));
      }
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
      const projects = await DatabaseService.getAllProjects();
      set({ projects, isLoading: false });
    } catch (error) {
      console.error('Failed to load projects:', error);
      set({ isLoading: false });
      throw error;
    }
  },
}));
