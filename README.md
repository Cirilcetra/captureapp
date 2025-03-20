# Car Capture App

A Next.js application for capturing and creating professional car videos with AI assistance.

## Features

- User authentication with Firebase (email/password)
- Capture videos of cars from different angles
- Generate video scripts with AI
- Store videos in Firebase Storage
- Track projects with Firestore
- Offline capabilities: Works as a PWA with offline functionality
- Responsive design: Works on both desktop and mobile devices

## Technical Stack

- **Next.js**: React framework for server-rendered applications
- **TypeScript**: For type safety and better development experience
- **Firebase**: Authentication, Firestore, and Storage
- **Tailwind CSS**: For styling and responsive design
- **shadcn/ui**: UI component library
- **FFmpeg WASM**: For client-side video processing
- **OpenAI API**: For script generation
- **ElevenLabs API**: For optional text-to-speech

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)

4. Enable the following Firebase services:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage

5. Add a web app to your Firebase project and get the configuration

6. Create a `.env.local` file with the following variables:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# OpenAI API (for script generation)
OPENAI_API_KEY=your-openai-api-key

# Optional: ElevenLabs API (for text-to-speech)
ELEVENLABS_API_KEY=your-elevenlabs-api-key
```

7. Set up Firestore security rules in the Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write only their own data
    match /projects/{projectId} {
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    
    // Allow authenticated users to read preset data
    match /presets/{presetId} {
      allow read: if request.auth != null;
    }
    
    // Default deny
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

8. Set up Firebase Storage rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /videos/{userId}/{videoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Authentication

The app uses Firebase Authentication with email/password:

1. Users can sign up with an email and password
2. Users can log in with their credentials
3. Each user's projects are isolated from other users
4. Authentication state is managed across the application

## Project Structure

```
src/
├── app/               # Next.js app router pages
│   ├── login/         # Login page
│   ├── signup/        # Sign up page
│   ├── capture/       # Video capture page
│   └── project/       # Project management pages
├── components/        # React components
│   ├── ui/            # UI components from shadcn/ui
│   └── ...            # App-specific components
├── lib/               # Utilities and services
│   ├── firebase.ts    # Firebase initialization
│   ├── firestore.ts   # Firestore service
│   ├── auth-context.tsx # Auth context provider
│   └── store.tsx      # Zustand state management
└── types/             # TypeScript type definitions
```

## Deployment

The easiest way to deploy this app is to use Vercel:

1. Push your code to GitHub
2. Import the project to Vercel
3. Add your environment variables in the Vercel project settings
4. Deploy!

## License

MIT
