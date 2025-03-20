// Initialize Firebase for the application
import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from "firebase/storage";

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

/**
 * Upload a video blob to Firebase Storage
 * @param id Unique ID for the video
 * @param videoBlob Video blob to upload
 * @returns Download URL for the uploaded video
 */
export const uploadVideo = async (id: string, videoBlob: Blob): Promise<string> => {
  try {
    // For development, if CORS is an issue, we can convert the blob to base64
    // Note: this is less efficient but works around CORS issues
    const useBase64ForCORS = true; // Set to false in production
    
    // Create a storage reference
    const videoRef = ref(storage, `videos/${id}.webm`);
    
    if (useBase64ForCORS) {
      // Convert blob to base64
      const base64 = await blobToBase64(videoBlob);
      
      // Upload the base64 string
      await uploadString(videoRef, base64, 'data_url');
    } else {
      // Upload the video blob directly
      await uploadBytes(videoRef, videoBlob);
    }
    
    // Get the download URL
    const downloadURL = await getDownloadURL(videoRef);
    
    console.log(`Video uploaded successfully: ${id}`);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading video:", error);
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

export { storage }; 