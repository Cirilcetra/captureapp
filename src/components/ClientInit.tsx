"use client";

import { useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

export default function ClientInit() {
  useEffect(() => {
    // Initialize Firebase (optional check here since it's already initialized in firebase.ts)
    const initFirebase = async () => {
      try {
        // If Firebase is already initialized, this is just a safeguard
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
        };

        // Check if Firebase is already initialized
        try {
          // This will throw an error if Firebase hasn't been initialized yet
          getStorage();
          console.log('Firebase already initialized');
        } catch (e) {
          // Initialize Firebase if not already initialized
          const app = initializeApp(firebaseConfig);
          getStorage(app);
          console.log('Firebase storage system initialized');
        }
      } catch (error) {
        console.error('Error initializing Firebase storage:', error);
      }
    };
    
    initFirebase();
  }, []);
  
  return null;
} 