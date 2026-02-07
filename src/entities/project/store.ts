import { create } from 'zustand';
import { Project, Folder } from '../../shared/types';
import { DatabaseService } from '../../processes/video-processing/DatabaseService';

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  isHydrated: boolean;
  folders: Folder[];
  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  loadProjects: () => Promise<void>;
  hydrate: () => Promise<void>;
  loadFolders: () => Promise<void>;
  createFolder: (name: string) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
  toggleFolderCollapse: (id: string) => void;
  moveProjectToFolder: (projectId: string, folderId: string | null) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<Project>;
  moveToTrash: (projectId: string) => Promise<void>;
  recoverFromTrash: (projectId: string) => Promise<void>;
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
  isHydrated: false,
  folders: [],

  hydrate: async () => {
    try {
      await Promise.all([get().loadProjects(), get().loadFolders()]);
      set({ isHydrated: true });
    } catch (error) {
      console.warn('Failed to hydrate projects:', error);
      set({ isHydrated: true });
    }
  },

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

  loadFolders: async () => {
    try {
      const folders = await DatabaseService.getAllFolders();
      set({ folders });
    } catch (error) {
      console.error('Failed to load folders:', error);
      throw error;
    }
  },

  createFolder: async (name: string) => {
    try {
      const folder = await DatabaseService.createFolder(name, 'custom');
      set(state => ({ folders: [...state.folders, folder] }));
      return folder;
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  },

  deleteFolder: async (id: string) => {
    try {
      await DatabaseService.deleteFolder(id);
      set(state => ({ folders: state.folders.filter(f => f.id !== id) }));
      await get().loadProjects(); // Reload projects as their folderId may have changed
    } catch (error) {
      console.error('Failed to delete folder:', error);
      throw error;
    }
  },

  toggleFolderCollapse: (id: string) => {
    set(state => ({
      folders: state.folders.map(f =>
        f.id === id ? { ...f, isCollapsed: !f.isCollapsed } : f
      ),
    }));
    // Update in database
    const folder = get().folders.find(f => f.id === id);
    if (folder) {
      DatabaseService.updateFolder(id, { isCollapsed: !folder.isCollapsed }).catch(error =>
        console.error('Failed to update folder collapse state:', error),
      );
    }
  },

  moveProjectToFolder: async (projectId: string, folderId: string | null) => {
    try {
      await DatabaseService.moveProjectToFolder(projectId, folderId);
      await get().loadProjects(); // Reload to reflect changes
    } catch (error) {
      console.error('Failed to move project to folder:', error);
      throw error;
    }
  },

  duplicateProject: async (projectId: string) => {
    try {
      const duplicated = await DatabaseService.duplicateProject(projectId);
      set(state => ({
        projects: [duplicated, ...state.projects],
      }));
      return duplicated;
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      throw error;
    }
  },

  moveToTrash: async (projectId: string) => {
    try {
      // Check if Trash folder exists
      let trashFolder = get().folders.find(f => f.type === 'trash');

      // Create Trash folder if it doesn't exist
      if (!trashFolder) {
        trashFolder = await DatabaseService.createFolder('Trash', 'trash');
        set(state => ({ folders: [...state.folders, trashFolder!] }));
      }

      // Move project to trash
      await DatabaseService.moveProjectToFolder(projectId, trashFolder.id);
      await get().loadProjects();
    } catch (error) {
      console.error('Failed to move project to trash:', error);
      throw error;
    }
  },

  recoverFromTrash: async (projectId: string) => {
    try {
      await DatabaseService.moveProjectToFolder(projectId, null);
      await get().loadProjects();
    } catch (error) {
      console.error('Failed to recover project from trash:', error);
      throw error;
    }
  },
}));
