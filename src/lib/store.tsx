"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from './firebase';
import { saveProject, updateProject, getUserProjects as fetchUserProjects } from './firestore';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface Shot {
  id: string;
  angle: string;
  description: string;
  completed: boolean;
  videoUrl: string | null;
  videoId: string | null;
}

export interface CarProject {
  id: string;
  userId: string;
  carId: string;
  shots: Shot[];
  completed: boolean;
  scriptData: string | null;
  generatedScript: string | null;
  narrationUrl: string | null;
  finalVideoUrl: string | null;
  finalVideoId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  projects: CarProject[];
  currentProject: CarProject | null;
  setProjects: (projects: CarProject[]) => void;
  addProject: (userId: string, carId: string) => void;
  updateShot: (projectId: string, shotId: string, videoUrl: string, videoId: string) => void;
  setNarrationUrl: (projectId: string, narrationUrl: string) => void;
  setFinalVideo: (projectId: string, finalVideoUrl: string, finalVideoId: string) => void;
  completeProject: (projectId: string) => void;
  getUserProjects: () => Promise<CarProject[]>;
  setCurrentProject: (projectId: string) => void;
  setScriptData: (projectId: string, scriptData: string) => void;
  setGeneratedScript: (projectId: string, script: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  currentProject: null,

  setProjects: (projects) => set({ projects }),

  getUserProjects: async () => {
    const projects = await fetchUserProjects();
    set({ projects });
    return projects;
  },

  setCurrentProject: (projectId) => {
    const project = get().projects.find(p => p.id === projectId);
    set({ currentProject: project || null });
  },

  addProject: (userId, carId) => {
    const now = new Date().toISOString();
    const newProject: CarProject = {
      id: uuidv4(),
      userId,
      carId,
      shots: [
        {
          id: uuidv4(),
          angle: "Front",
          description: "Capture the front of the car, including the grille and headlights",
          completed: false,
          videoUrl: null,
          videoId: null
        },
        {
          id: uuidv4(),
          angle: "Side",
          description: "Capture the side profile of the car",
          completed: false,
          videoUrl: null,
          videoId: null
        },
        {
          id: uuidv4(),
          angle: "Rear",
          description: "Capture the rear of the car, including taillights",
          completed: false,
          videoUrl: null,
          videoId: null
        }
      ],
      completed: false,
      scriptData: null,
      generatedScript: null,
      narrationUrl: null,
      finalVideoUrl: null,
      finalVideoId: null,
      createdAt: now,
      updatedAt: now
    };

    set((state) => ({
      projects: [...state.projects, newProject],
      currentProject: newProject
    }));

    // Save to Firebase using saveProject instead of updateProject
    saveProject(newProject);
  },

  updateShot: (projectId: string, shotId: string, videoUrl: string, videoId: string) => {
    set((state) => {
      const updatedProjects = state.projects.map((project) => {
        if (project.id === projectId) {
          const updatedShots = project.shots.map((shot) => {
            if (shot.id === shotId) {
              return {
                ...shot,
                videoUrl,
                videoId,
                completed: true
              };
            }
            return shot;
          });

          const updatedProject = {
            ...project,
            shots: updatedShots,
            updatedAt: new Date().toISOString()
          };

          // Update in Firebase
          updateProject(projectId, updatedProject);

          return updatedProject;
        }
        return project;
      });

      return {
        projects: updatedProjects,
        currentProject: updatedProjects.find(p => p.id === projectId) || null
      };
    });
  },

  setNarrationUrl: (projectId: string, narrationUrl: string) => {
    set((state) => {
      const updatedProjects = state.projects.map((project) => {
        if (project.id === projectId) {
          const updatedProject = {
            ...project,
            narrationUrl,
            updatedAt: new Date().toISOString()
          };

          // Update in Firebase
          updateProject(projectId, updatedProject);

          return updatedProject;
        }
        return project;
      });

      return {
        projects: updatedProjects,
        currentProject: updatedProjects.find(p => p.id === projectId) || null
      };
    });
  },

  setFinalVideo: (projectId: string, finalVideoUrl: string, finalVideoId: string) => {
    set((state) => {
      const updatedProjects = state.projects.map((project) => {
        if (project.id === projectId) {
          const updatedProject = {
            ...project,
            finalVideoUrl,
            finalVideoId,
            completed: true,
            updatedAt: new Date().toISOString()
          };

          // Update in Firebase
          updateProject(projectId, updatedProject);

          return updatedProject;
        }
        return project;
      });

      return {
        projects: updatedProjects,
        currentProject: updatedProjects.find(p => p.id === projectId) || null
      };
    });
  },

  completeProject: (projectId: string) => {
    set((state) => {
      const updatedProjects = state.projects.map((project) => {
        if (project.id === projectId) {
          const updatedProject = {
            ...project,
            completed: true,
            updatedAt: new Date().toISOString()
          };

          // Update in Firebase
          updateProject(projectId, updatedProject);

          return updatedProject;
        }
        return project;
      });

      return {
        projects: updatedProjects,
        currentProject: updatedProjects.find(p => p.id === projectId) || null
      };
    });
  },

  setScriptData: (projectId: string, scriptData: string) => {
    set((state) => {
      const updatedProjects = state.projects.map((project) => {
        if (project.id === projectId) {
          const updatedProject = {
            ...project,
            scriptData,
            updatedAt: new Date().toISOString()
          };

          // Update in Firebase
          updateProject(projectId, updatedProject);

          return updatedProject;
        }
        return project;
      });

      return {
        projects: updatedProjects,
        currentProject: updatedProjects.find(p => p.id === projectId) || null
      };
    });
  },

  setGeneratedScript: (projectId: string, script: string) => {
    set((state) => {
      const updatedProjects = state.projects.map((project) => {
        if (project.id === projectId) {
          const updatedProject = {
            ...project,
            generatedScript: script,
            script: script,
            updatedAt: new Date().toISOString()
          };

          // Update in Firebase
          updateProject(projectId, updatedProject);

          return updatedProject;
        }
        return project;
      });

      return {
        projects: updatedProjects,
        currentProject: updatedProjects.find(p => p.id === projectId) || null
      };
    });
  }
})); 