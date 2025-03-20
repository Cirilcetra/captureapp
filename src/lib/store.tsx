import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VideoShot = {
  id: string;
  angle: string;
  description: string;
  videoUrl: string | null;
  videoId: string | null;
  completed: boolean;
};

export type CarProject = {
  id: string;
  carId: string;
  createdAt: string;
  updatedAt: string;
  shots: VideoShot[];
  scriptData: string;
  generatedScript: string | null;
  finalVideoUrl: string | null;
  finalVideoId: string | null;
  completed: boolean;
};

type AppState = {
  projects: CarProject[];
  currentProject: CarProject | null;
  // Actions
  createProject: (carId: string) => void;
  setCurrentProject: (projectId: string) => void;
  updateShot: (projectId: string, shotId: string, videoUrl: string, videoId?: string | null) => void;
  setScriptData: (projectId: string, data: string) => void;
  setGeneratedScript: (projectId: string, script: string) => void;
  setFinalVideo: (projectId: string, videoUrl: string, videoId?: string | null) => void;
  completeProject: (projectId: string) => void;
  // Simplified helpers for Firebase URLs
  getValidVideoUrl: (shot: VideoShot) => Promise<string | null>;
  getValidFinalVideoUrl: (project: CarProject) => Promise<string | null>;
};

// Predefined shot angles for consistency
const DEFAULT_SHOTS: VideoShot[] = [
  { id: '1', angle: 'Front', description: 'Capture the front of the car', videoUrl: null, videoId: null, completed: false },
  { id: '2', angle: 'Driver Side', description: 'Capture the driver\'s side profile', videoUrl: null, videoId: null, completed: false },
  { id: '3', angle: 'Passenger Side', description: 'Capture the passenger\'s side profile', videoUrl: null, videoId: null, completed: false },
  { id: '4', angle: 'Rear', description: 'Capture the rear of the car', videoUrl: null, videoId: null, completed: false },
  { id: '5', angle: 'Front 3/4', description: 'Capture the front three-quarter view', videoUrl: null, videoId: null, completed: false },
  { id: '6', angle: 'Rear 3/4', description: 'Capture the rear three-quarter view', videoUrl: null, videoId: null, completed: false },
  { id: '7', angle: 'Interior - Dashboard', description: 'Capture the dashboard and front seats', videoUrl: null, videoId: null, completed: false },
  { id: '8', angle: 'Interior - Rear Seats', description: 'Capture the rear seats', videoUrl: null, videoId: null, completed: false },
  { id: '9', angle: 'Feature Highlight', description: 'Capture a unique feature of the car', videoUrl: null, videoId: null, completed: false },
  { id: '10', angle: 'Wheel Close-up', description: 'Capture a close-up of the wheels', videoUrl: null, videoId: null, completed: false }
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,
      
      createProject: (carId: string) => set((state) => {
        const newProject: CarProject = {
          id: crypto.randomUUID(),
          carId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          shots: [...DEFAULT_SHOTS],
          scriptData: '',
          generatedScript: null,
          finalVideoUrl: null,
          finalVideoId: null,
          completed: false,
        };
        
        return {
          projects: [...state.projects, newProject],
          currentProject: newProject
        };
      }),
      
      setCurrentProject: (projectId: string) => set((state) => ({
        currentProject: state.projects.find(p => p.id === projectId) || null
      })),
      
      updateShot: (projectId: string, shotId: string, videoUrl: string, videoId: string | null = null) => set((state) => {
        const projects = state.projects.map(project => {
          if (project.id !== projectId) return project;
          
          const shots = project.shots.map(shot => {
            if (shot.id !== shotId) return shot;
            return { 
              ...shot, 
              videoUrl, 
              videoId: videoId || shot.videoId, 
              completed: true 
            };
          });
          
          return {
            ...project,
            shots,
            updatedAt: new Date().toISOString()
          };
        });
        
        const currentProject = projects.find(p => p.id === projectId) || null;
        
        return { projects, currentProject };
      }),
      
      setScriptData: (projectId: string, data: string) => set((state) => {
        const projects = state.projects.map(project => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            scriptData: data,
            updatedAt: new Date().toISOString()
          };
        });
        
        const currentProject = projects.find(p => p.id === projectId) || null;
        
        return { projects, currentProject };
      }),
      
      setGeneratedScript: (projectId: string, script: string) => set((state) => {
        const projects = state.projects.map(project => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            generatedScript: script,
            updatedAt: new Date().toISOString()
          };
        });
        
        const currentProject = projects.find(p => p.id === projectId) || null;
        
        return { projects, currentProject };
      }),
      
      setFinalVideo: (projectId: string, videoUrl: string, videoId: string | null = null) => set((state) => {
        const projects = state.projects.map(project => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            finalVideoUrl: videoUrl,
            finalVideoId: videoId,
            updatedAt: new Date().toISOString()
          };
        });
        
        const currentProject = state.currentProject?.id === projectId
          ? { ...state.currentProject, finalVideoUrl: videoUrl, finalVideoId: videoId }
          : state.currentProject;
        
        return { projects, currentProject };
      }),
      
      completeProject: (projectId: string) => set((state) => {
        const projects = state.projects.map(project => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            completed: true,
            updatedAt: new Date().toISOString()
          };
        });
        
        const currentProject = state.currentProject?.id === projectId
          ? { ...state.currentProject, completed: true }
          : state.currentProject;
        
        return { projects, currentProject };
      }),
      
      // Simplified for Firebase URLs (no IndexedDB lookup needed)
      getValidVideoUrl: async (shot: VideoShot) => {
        if (!shot.videoUrl) return null;
        return shot.videoUrl;
      },
      
      getValidFinalVideoUrl: async (project: CarProject) => {
        if (!project.finalVideoUrl) return null;
        return project.finalVideoUrl;
      }
    }),
    {
      name: 'car-video-app-storage',
    }
  )
); 