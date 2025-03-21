"use client";

// Initialize Firebase for the application
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Upload a video or audio file to Firebase Storage
 * @param fileId Unique identifier for the file
 * @param file File blob to upload
 * @param type Optional type ('video' or 'narration'), defaults to 'video'
 * @returns Download URL of the uploaded file
 */
export const uploadVideo = async (fileId: string, file: Blob, type: 'video' | 'narration' = 'video'): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Create reference based on type
    const path = type === 'video' ? 'videos' : 'narrations';
    const storageRef = ref(storage, `${path}/${user.uid}/${fileId}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    console.log(`${type} uploaded successfully:`, snapshot);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`${type} download URL:`, downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error(`Error uploading ${type}:`, error);
    throw error;
  }
};

/**
 * Convert a Blob to base64
 * @param blob The blob to convert
 * @returns A Promise that resolves to a base64 data URL
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Delete a video from Firebase Storage
 * @param id ID of the video to delete
 */
export const deleteVideo = async (id: string): Promise<void> => {
  try {
    const videoRef = ref(storage, `videos/${id}.webm`);
    await deleteObject(videoRef);
    console.log(`Video deleted successfully: ${id}`);
  } catch (error) {
    console.error("Error deleting video:", error);
    throw error;
  }
};

// Firebase Auth Functions
/**
 * Sign up a new user with email and password
 * @param email User's email
 * @param password User's password
 * @returns User credentials
 */
export const signUp = async (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

/**
 * Sign in an existing user with email and password
 * @param email User's email
 * @param password User's password
 * @returns User credentials
 */
export const signIn = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

/**
 * Sign out the current user
 */
export const logOut = async () => {
  return signOut(auth);
};

export { storage, auth, db }; 