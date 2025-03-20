# Car Video Cataloger

A Next.js Progressive Web App (PWA) for creating professional car promotional videos. Capture multiple shots of a car from different angles, generate AI-powered scripts, add professional narration, and combine them into a 1-minute promotional video.

## Features

- **Video Capture**: Record 10 six-second videos from different car angles
- **AI Script Generation**: Generate a contextual script using OpenAI that aligns with the video sequence
- **Text-to-Speech**: Create professional narration using ElevenLabs API
- **Video Processing**: Stitch videos together with synchronized AI-generated audio
- **Offline Capabilities**: Works as a PWA with offline functionality
- **Responsive Design**: Works on both desktop and mobile devices

## Technical Stack

- **Framework**: Next.js (App Router)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persist middleware
- **Form Validation**: React Hook Form with Zod
- **Video Processing**: FFMPEG WASM
- **AI Integration**: OpenAI for script generation, ElevenLabs for text-to-speech

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Add your API keys:
   - Update the OpenAI API key in `src/lib/openai.tsx`
   - Update the ElevenLabs API key in `src/lib/elevenlabs.tsx`

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## User Flow

1. **Create a New Project**: Enter a unique car ID
2. **Capture Videos**: Record 10 different 6-second shots with ability to reshoot
3. **Generate Script**: Enter car details and generate a synchronized script
4. **Create Narration**: Select a voice and generate audio narration
5. **Preview and Export**: Combine videos with narration and download the final result

## Portrait Mode Optimization

The application is specially designed for portrait video capture (9:16 aspect ratio), making it perfect for social media content and mobile viewing. The video processing pipeline automatically optimizes videos for this format.

## Production Build

To create a production build:

```bash
npm run build
npm start
```

## License

MIT
