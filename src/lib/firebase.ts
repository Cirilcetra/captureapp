"use client";

// Initialize Firebase for the application
import { initializeApp, getApps } from "firebase/app";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Validate Firebase configuration
const validateConfig = () => {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

  // Log configuration for debugging (remove in production)
  console.log('Firebase Config:', {
    ...config,
    apiKey: config.apiKey ? '**********' : undefined,
    storageBucket: config.storageBucket // explicitly log storage bucket
  });

  const missingValues = Object.entries(config)
    .filter(([key, value]) => !value || value.includes('your-'))
    .map(([key]) => key);

  if (missingValues.length > 0) {
    throw new Error(`Missing or invalid Firebase configuration: ${missingValues.join(', ')}`);
  }

  if (!config.storageBucket?.includes('firebasestorage.app')) {
    console.warn('Storage bucket might not be in the correct format. Expected: *.firebasestorage.app');
  }

  return config;
};

// Initialize Firebase
const firebaseConfig = validateConfig();
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

// Log storage configuration
console.log('Storage configuration:', {
  bucket: storage.app.options.storageBucket,
  authDomain: storage.app.options.authDomain
});

const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Upload a video or audio file to Firebase Storage with progress tracking
 * @param fileId Unique identifier for the file
 * @param file File blob to upload
 * @param type Optional type ('video' or 'narration'), defaults to 'video'
 * @param onProgress Optional callback for upload progress
 * @returns Download URL of the uploaded file
 */
export const uploadVideo = async (
  fileId: string, 
  file: Blob, 
  type: 'video' | 'narration' = 'video',
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Log upload attempt with detailed configuration
    console.log('Starting upload:', {
      fileId,
      type,
      size: file.size,
      contentType: file.type,
      userId: user.uid,
      storageBucket: storage.app.options.storageBucket,
      fullPath: `${type === 'video' ? 'videos' : 'narrations'}/${user.uid}/${fileId}`
    });

    // Create reference based on type
    const path = type === 'video' ? 'videos' : 'narrations';
    const storageRef = ref(storage, `${path}/${user.uid}/${fileId}`);
    
    // Log storage reference details
    console.log('Storage reference:', {
      bucket: storageRef.bucket,
      fullPath: storageRef.fullPath,
      name: storageRef.name
    });
    
    // Upload the file with metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        fileType: type
      }
    };

    // Create upload task
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

    // Return a promise that resolves with the download URL
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Handle progress updates
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
          onProgress?.(progress);
        },
        (error) => {
          // Handle errors
          console.error(`Error uploading ${type}:`, {
            error,
            code: error.code,
            message: error.message,
            serverResponse: error.serverResponse,
            storageBucket: storage.app.options.storageBucket
          });

          // Handle specific Firebase Storage errors
          if (error.code) {
            switch (error.code) {
              case 'storage/unauthorized':
                reject(new Error('Not authorized to upload files. Please check Firebase Storage rules and ensure you are logged in.'));
                break;
              case 'storage/canceled':
                reject(new Error('Upload was cancelled.'));
                break;
              case 'storage/invalid-checksum':
                reject(new Error('File upload failed due to network issues. Please try again.'));
                break;
              case 'storage/retry-limit-exceeded':
                reject(new Error('Upload failed after multiple attempts. Please check your network connection.'));
                break;
              case 'storage/quota-exceeded':
                reject(new Error('Storage quota exceeded. Please contact support.'));
                break;
              default:
                reject(new Error(`Upload failed: ${error.message}`));
            }
          } else {
            reject(error);
          }
        },
        async () => {
          // Handle successful upload
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log(`${type} uploaded successfully:`, {
              path: uploadTask.snapshot.ref.fullPath,
              contentType: uploadTask.snapshot.metadata.contentType,
              size: uploadTask.snapshot.metadata.size,
              bucket: uploadTask.snapshot.ref.bucket
            });
            console.log(`${type} download URL:`, downloadURL);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error: any) {
    console.error(`Error initiating upload for ${type}:`, error);
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
    const videoRef = ref(storage, `videos/${id}`);
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

export { auth, db };

// Export the app instance if needed elsewhere
export default app; 