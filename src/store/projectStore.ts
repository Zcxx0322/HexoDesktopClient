import { create } from 'zustand';
import type { BlogProject } from '@/types';

interface ProjectState {
  projects: BlogProject[];
  currentProject: BlogProject | null;
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  setCurrentProject: (project: BlogProject | null) => void;
  addProject: (project: BlogProject) => void;
  removeProject: (projectId: string) => void;
  refreshProjects: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const projects = await window.electronAPI.listProjects();
      set({ projects, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
  },

  addProject: (project) => {
    set((state) => ({ projects: [project, ...state.projects] }));
  },

  removeProject: (projectId) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      currentProject:
        state.currentProject?.id === projectId ? null : state.currentProject,
    }));
  },

  refreshProjects: async () => {
    await get().loadProjects();
  },
}));
