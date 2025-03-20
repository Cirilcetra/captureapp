"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from './firebase';
import { saveProject, updateProject } from './firestore';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

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
  userId: string;
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
  setCurrentProject: (projectId: string | null) => void;
  updateShot: (projectId: string, shotId: string, videoUrl: string, videoId?: string | null) => void;
  setScriptData: (projectId: string, data: string) => void;
  setGeneratedScript: (projectId: string, script: string) => void;
  setFinalVideo: (projectId: string, videoUrl: string, videoId?: string | null) => void;
  completeProject: (projectId: string) => void;
  // Simplified helpers for Firebase URLs
  getValidVideoUrl: (shot: VideoShot) => Promise<string | null>;
  getValidFinalVideoUrl: (project: CarProject) => Promise<string | null>;
  // User-specific methods
  getUserProjects: () => CarProject[];
  setProjects: (projects: CarProject[]) => void;
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
      
      createProject: async (carId: string) => {
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          console.error("User not authenticated, cannot create project");
          toast.error("You must be logged in to create a project");
          return;
        }
        
        const newProject: CarProject = {
          id: crypto.randomUUID(),
          userId,
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
        
        try {
          // Save to Firestore first
          const firestoreId = await saveProject(newProject);
          console.log(`Project saved to Firestore with ID: ${firestoreId}`);
          
          // Update local state after saving to Firestore
          set((state) => ({
            projects: [...state.projects, newProject],
            currentProject: newProject
          }));
        } catch (error) {
          console.error("Failed to save project to Firestore:", error);
          toast.error("Failed to save project: Network error");
        }
      },
      
      setCurrentProject: (projectId: string | null) => set((state) => ({
        currentProject: projectId === null ? null : state.projects.find(p => p.id === projectId) || null
      })),
      
      updateShot: async (projectId: string, shotId: string, videoUrl: string, videoId: string | null = null) => {
        try {
          const projects = get().projects;
          const project = projects.find(p => p.id === projectId);
          
          if (!project) return;
          
          // Update the shot in the project
          const updatedProject = {
            ...project,
            shots: project.shots.map(shot => 
              shot.id !== shotId 
                ? shot 
                : { ...shot, videoUrl, videoId: videoId || shot.videoId, completed: true }
            ),
            updatedAt: new Date().toISOString()
          };
          
          // Update in Firestore first
          await updateProject(projectId, updatedProject);
          
          // Then update local state
          set((state) => ({
            projects: state.projects.map(p => p.id === projectId ? updatedProject : p),
            currentProject: state.currentProject?.id === projectId
              ? updatedProject
              : state.currentProject
          }));
        } catch (error) {
          console.error("Failed to update shot in Firestore:", error);
          toast.error("Failed to save video: Network error");
          
          // Still update local state to prevent data loss
          set((state) => {
            const projects = state.projects.map(project => {
              if (project.id !== projectId) return project;
              
              const shots = project.shots.map(shot => {
                if (shot.id !== shotId) return shot;
                return { ...shot, videoUrl, videoId: videoId || shot.videoId, completed: true };
              });
              
              return { ...project, shots, updatedAt: new Date().toISOString() };
            });
            
            return {
              projects,
              currentProject: state.currentProject?.id === projectId
                ? projects.find(p => p.id === projectId) || null
                : state.currentProject
            };
          });
        }
      },
      
      // Get the active shot for a project
      getActiveShot: (projectId) => {
        const { projects } = get();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) return null;
        
        return project.shots[project.currentShotIndex] || null;
      },
      
      // Set script description for a project
      setScriptData: async (projectId, description) => {
        const { projects } = get();
        const projectIndex = projects.findIndex(p => p.id === projectId);
        
        if (projectIndex === -1) {
          console.error("Project not found");
          return;
        }
        
        const updatedProject = { 
          ...projects[projectIndex], 
          description,
          updatedAt: new Date().toISOString()
        };
        
        try {
          // Save to Firestore first
          await updateProject(projectId, updatedProject);
          
          // Then update local state
          set((state) => ({
            projects: state.projects.map(p => 
              p.id === projectId ? updatedProject : p
            )
          }));
        } catch (error) {
          console.error("Error updating project description:", error);
          toast.error("Failed to save description, but continuing");
          
          // Update local state even if Firestore update fails
          set((state) => ({
            projects: state.projects.map(p => 
              p.id === projectId ? updatedProject : p
            )
          }));
        }
      },
      
      // Set generated script for a project
      setGeneratedScript: async (projectId, script) => {
        const { projects } = get();
        const projectIndex = projects.findIndex(p => p.id === projectId);
        
        if (projectIndex === -1) {
          console.error("Project not found");
          return;
        }
        
        const updatedProject = { 
          ...projects[projectIndex], 
          script,
          updatedAt: new Date().toISOString()
        };
        
        try {
          // Save to Firestore first
          await updateProject(projectId, updatedProject);
          
          // Then update local state
          set((state) => ({
            projects: state.projects.map(p => 
              p.id === projectId ? updatedProject : p
            )
          }));
        } catch (error) {
          console.error("Error updating project script:", error);
          toast.error("Failed to save script, but continuing");
          
          // Update local state even if Firestore update fails
          set((state) => ({
            projects: state.projects.map(p => 
              p.id === projectId ? updatedProject : p
            )
          }));
        }
      },
      
      // Set final video for a project
      setFinalVideo: async (projectId, videoUrl, videoId) => {
        const { projects } = get();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) {
          console.error("Project not found");
          return;
        }
        
        const updatedProject = { 
          ...project, 
          finalVideoId: videoId,
          finalVideoUrl: videoUrl,
          updatedAt: new Date().toISOString()
        };
        
        try {
          // Save to Firestore first
          await updateProject(projectId, updatedProject);
          
          // Then update local state
          set((state) => ({
            projects: state.projects.map(p => 
              p.id === projectId ? updatedProject : p
            )
          }));
        } catch (error) {
          console.error("Error updating final video:", error);
          toast.error("Failed to save video information, but continuing");
          
          // Update local state even if Firestore update fails
          set((state) => ({
            projects: state.projects.map(p => 
              p.id === projectId ? updatedProject : p
            )
          }));
        }
      },
      
      // Mark a project as complete
      completeProject: async (projectId) => {
        const { projects } = get();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) {
          console.error("Project not found");
          return;
        }
        
        const updatedProject = { 
          ...project, 
          isComplete: true,
          updatedAt: new Date().toISOString()
        };
        
        try {
          // Save to Firestore first
          await updateProject(projectId, updatedProject);
          
          // Then update local state
          set((state) => ({
            projects: state.projects.map(p => 
              p.id === projectId ? updatedProject : p
            )
          }));
        } catch (error) {
          console.error("Error completing project:", error);
          toast.error("Failed to mark project as complete, but continuing");
          
          // Update local state even if Firestore update fails
          set((state) => ({
            projects: state.projects.map(p => 
              p.id === projectId ? updatedProject : p
            )
          }));
        }
      },
      
      getValidVideoUrl: async (shot: VideoShot) => {
        if (!shot.videoUrl) return null;
        return shot.videoUrl;
      },
      
      getValidFinalVideoUrl: async (project: CarProject) => {
        if (!project.finalVideoUrl) return null;
        return project.finalVideoUrl;
      },
      
      getUserProjects: () => {
        const userId = auth.currentUser?.uid;
        return userId ? get().projects.filter(project => project.userId === userId) : [];
      },
      
      setProjects: (projects: CarProject[]) => set({ projects }),
    }),
    {
      name: 'car-video-app-storage',
    }
  )
); 