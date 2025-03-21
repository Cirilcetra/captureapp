"use client";

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  serverTimestamp,
  DocumentData,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { CarProject } from './store';
import { User } from "firebase/auth";
import { toast } from "sonner";
import { useAppStore } from "./store";

const projectsCollection = 'projects';

/**
 * Ensure user is authenticated before any operation
 * @returns User object or null if not authenticated
 */
const ensureAuth = (): User | null => {
  const user = auth.currentUser;
  if (!user) {
    console.error("User not authenticated");
    return null;
  }
  return user;
};

/**
 * Save a new project to Firestore
 * 
 * @param project Project data to save
 * @returns Firebase document ID 
 */
export const saveProject = async (project: CarProject): Promise<boolean> => {
  const user = ensureAuth();
  if (!user) return false;

  // Ensure project has user ID
  if (!project.userId || project.userId !== user.uid) {
    console.error("Project does not belong to the authenticated user");
    return false;
  }

  try {
    // Ensure project has user ID
    const projectWithUserId = {
      ...project,
      userId: user.uid,
      createdAt: Timestamp.fromDate(new Date(project.createdAt)),
      updatedAt: Timestamp.fromDate(new Date(project.updatedAt)),
    };

    // Add the document to Firestore
    const projectRef = doc(db, projectsCollection, project.id);
    await setDoc(projectRef, projectWithUserId);
    return true;
  } catch (error) {
    console.error("Error saving project:", error);
    return false;
  }
};

/**
 * Update an existing project in Firestore
 * 
 * @param projectId Firestore document ID
 * @param project Project data to update
 */
export const updateProject = async (projectId: string, project: CarProject): Promise<boolean> => {
  const user = ensureAuth();
  if (!user) return false;

  // Ensure project has user ID and belongs to current user
  if (!project.userId || project.userId !== user.uid) {
    console.error("Project does not belong to the authenticated user");
    return false;
  }

  try {
    // Update with server timestamp
    const updateData = {
      ...project,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const projectRef = doc(db, projectsCollection, projectId);
    await updateDoc(projectRef, updateData);
    return true;
  } catch (error) {
    console.error("Error updating project:", error);
    return false;
  }
};

/**
 * Delete a project from Firestore
 * @param projectId Firestore document ID
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    // Check user authentication
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get the project to verify ownership
    const projectRef = doc(db, projectsCollection, projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      throw new Error('Project not found');
    }
    
    const projectData = projectSnap.data();
    if (projectData.userId !== userId) {
      throw new Error('Not authorized to delete this project');
    }

    await deleteDoc(projectRef);
  } catch (error) {
    console.error('Error deleting project from Firestore:', error);
    throw error;
  }
};

/**
 * Get all projects for the current user
 * 
 * @returns Array of user projects
 */
export const getUserProjects = async (): Promise<CarProject[]> => {
  const user = ensureAuth();
  if (!user) return [];

  try {
    // Query projects for this user
    const projectsQuery = query(
      collection(db, projectsCollection),
      where('userId', '==', user.uid)
    );
    
    const querySnapshot = await getDocs(projectsQuery);
    const projects: CarProject[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      
      // Safely convert timestamps or use the original value if it's already a string
      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate().toISOString() 
        : typeof data.createdAt === 'string' 
          ? data.createdAt 
          : new Date().toISOString();

      const updatedAt = data.updatedAt instanceof Timestamp 
        ? data.updatedAt.toDate().toISOString() 
        : typeof data.updatedAt === 'string' 
          ? data.updatedAt 
          : new Date().toISOString();
      
      projects.push({
        ...data,
        id: doc.id,
        createdAt,
        updatedAt,
      } as CarProject);
    });
    
    // Sync with app store
    const { setProjects } = useAppStore.getState();
    setProjects(projects);
    
    return projects;
  } catch (error) {
    console.error("Error getting user projects:", error);
    return [];
  }
};

/**
 * Get a single project by ID
 * @param projectId Firestore document ID
 * @returns Project data
 */
export const getProject = async (projectId: string): Promise<CarProject | null> => {
  try {
    // Check user authentication
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Get the project
    const projectRef = doc(db, projectsCollection, projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return null;
    }
    
    const data = projectSnap.data();
    
    // Verify ownership
    if (data.userId !== userId) {
      throw new Error('Not authorized to access this project');
    }
    
    // Safely convert timestamps
    const createdAt = data.createdAt instanceof Timestamp 
      ? data.createdAt.toDate().toISOString() 
      : typeof data.createdAt === 'string' 
        ? data.createdAt 
        : new Date().toISOString();

    const updatedAt = data.updatedAt instanceof Timestamp 
      ? data.updatedAt.toDate().toISOString() 
      : typeof data.updatedAt === 'string' 
        ? data.updatedAt 
        : new Date().toISOString();
    
    return {
      ...data,
      id: projectSnap.id,
      createdAt,
      updatedAt,
    } as CarProject;
  } catch (error) {
    console.error('Error getting project from Firestore:', error);
    throw error;
  }
}; 