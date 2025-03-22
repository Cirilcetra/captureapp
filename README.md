# Car Capture App

A Next.js application for capturing and creating professional car videos with AI assistance. Create stunning car promotional videos with AI-generated scripts and professional narration.

## Features

- **Video Capture**
  - Capture videos of cars from different angles
  - Support for multiple video formats (WebM, MP4, MOV)
  - Real-time upload progress tracking
  - File size validation (up to 100MB)
  - Automatic video format optimization

- **AI Script Generation**
  - Generate professional scripts using OpenAI GPT-4
  - Edit and customize generated scripts
  - Auto-match scripts to video sequence
  - Save and restore script versions
  - Demo data auto-fill for testing

- **Professional Narration**
  - Text-to-speech using ElevenLabs API
  - Multiple voice options
  - High-quality audio generation
  - Audio preview before finalizing

- **Video Processing**
  - Combine multiple video clips
  - Add professional narration
  - Client-side video processing with FFmpeg
  - Progress tracking for all operations
  - Support for various video formats

- **Discovery Feed**
  - Instagram-style video feed
  - Smooth video scrolling
  - Auto-play on scroll
  - Like and share functionality
  - Public/private video options

- **User Management**
  - User authentication with Firebase
  - Secure data isolation
  - Project management
  - Progress tracking
  - Cloud storage integration

- **Progressive Web App**
  - Offline capabilities
  - Responsive design
  - Mobile-first approach
  - Fast loading times
  - Service worker caching

## Technical Stack

- **Frontend**
  - Next.js 14 (App Router)
  - TypeScript
  - Tailwind CSS
  - shadcn/ui components
  - Zustand for state management
  - React Hook Form for forms

- **Backend & APIs**
  - Firebase Authentication
  - Cloud Firestore
  - Firebase Storage
  - OpenAI GPT-4 API
  - ElevenLabs API
  - FFmpeg WASM

- **Development Tools**
  - ESLint
  - Prettier
  - Husky for git hooks
  - TypeScript strict mode
  - Jest for testing

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project
- OpenAI API key
- ElevenLabs API key (optional)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/car-capture-app.git
cd car-capture-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a Firebase project:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication (Email/Password)
   - Create Firestore Database
   - Set up Storage

4. Create `.env.local` with your configuration:
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# ElevenLabs API (optional)
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

5. Set up Firebase Security Rules:
   - Copy rules from [README-FIREBASE.md](README-FIREBASE.md)
   - Apply rules in Firebase Console for both Firestore and Storage

## Development

Start the development server:

```bash
# Start the frontend
npm run dev
# or
yarn dev

# Start the backend (in a separate terminal)
cd backend
python -m uvicorn app.main:app --reload
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
├── src/
│   ├── app/                 # Next.js pages
│   ├── components/         
│   │   ├── ui/             # UI components
│   │   ├── VideoCapture.tsx
│   │   ├── ScriptGeneration.tsx
│   │   └── FinalPreview.tsx
│   ├── lib/
│   │   ├── firebase.ts     # Firebase config
│   │   ├── store.tsx       # Zustand store
│   │   └── api-client.ts   # API functions
│   └── types/              # TypeScript types
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app
│   │   ├── routes/         # API routes
│   │   └── services/       # Business logic
│   └── requirements.txt
├── public/                 # Static files
└── package.json
```

## Key Features Implementation

### Video Capture
- Supports multiple video formats
- Real-time upload progress
- Automatic format validation
- Cloud storage integration

### Script Generation
- AI-powered script creation
- Edit capabilities
- Version control
- Shot sequence matching

### Video Processing
- Client-side processing
- Progress tracking
- Multiple format support
- Quality optimization

## Deployment

1. Deploy the frontend to Vercel:
   - Connect your GitHub repository
   - Configure environment variables
   - Deploy

2. Deploy the backend:
   - Set up a Python hosting service (e.g., Heroku, DigitalOcean)
   - Configure environment variables
   - Update `NEXT_PUBLIC_API_URL` in frontend

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT

## Support

For support, email support@example.com or open an issue on GitHub.
