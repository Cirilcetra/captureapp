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
 * Upload a video blob to Firebase Storage
 * @param id Unique ID for the video
 * @param videoBlob Video blob to upload
 * @returns Download URL for the uploaded video
 */
export const uploadVideo = async (id: string, videoBlob: Blob): Promise<string> => {
  try {
    console.log(`Starting video upload for ID: ${id}, blob size: ${videoBlob.size} bytes`);
    
    // Always use base64 to avoid CORS issues - this is the most reliable approach
    const useBase64 = true;
    
    // Include user ID in the path to ensure privacy and security
    // Format: videos/userId/videoId.webm
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error("User is not authenticated");
    }
    
    const storagePath = `videos/${userId}/${id}.webm`;
    console.log(`Storage path: ${storagePath}`);
    
    // Create a storage reference
    const videoRef = ref(storage, storagePath);
    
    if (useBase64) {
      // Convert blob to base64 - this avoids CORS issues with binary uploads
      console.log("Converting blob to base64...");
      const base64 = await blobToBase64(videoBlob);
      
      // Upload the base64 string
      console.log("Uploading base64 string...");
      await uploadString(videoRef, base64, 'data_url');
      console.log("Base64 upload complete");
    } else {
      // Upload the video blob directly - this may be affected by CORS
      console.log("Uploading binary blob...");
      await uploadBytes(videoRef, videoBlob);
      console.log("Binary upload complete");
    }
    
    // Get the download URL
    console.log("Getting download URL...");
    const downloadURL = await getDownloadURL(videoRef);
    
    console.log(`Video uploaded successfully: ${id}`);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading video:", error);
    
    // Provide more detailed error information
    if (error instanceof Error) {
      throw new Error(`Failed to upload video: ${error.message}`);
    } else {
      throw new Error("Failed to upload video: Unknown error");
    }
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