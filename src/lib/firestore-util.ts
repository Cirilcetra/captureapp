"use client";

import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { CarProject } from './store';

/**
 * Helper function to update a project in Firestore
 * This function is used to work around TypeScript errors in the updateProject function
 */
export const updateFirestoreProject = async (projectId: string, project: CarProject): Promise<boolean> => {
  try {
    const projectRef = doc(db, 'projects', projectId);

    // Convert dates to Firestore timestamps
    const projectData = {
      ...project,
      updatedAt: Timestamp.fromDate(new Date())
    };

    // Update the document
    await setDoc(projectRef, projectData, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating project in Firestore:', error);
    return false;
  }
}; 