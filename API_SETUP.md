# API Setup for the Capture App

This document explains how to set up the necessary API keys for the Capture App.

## Overview

The Capture App uses a FastAPI backend that integrates with:

1. **OpenAI API** - For generating promotional scripts
2. **ElevenLabs API** - For text-to-speech narration

## Setting Up API Keys

### Step 1: Create a `.env` file in the backend directory

In the `backend` directory, create or edit a file called `.env`:

```bash
cd backend
touch .env
```

### Step 2: Get Your API Keys

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Create a new API key
4. Copy the API key (it starts with "sk-")

#### ElevenLabs API Key
1. Go to [ElevenLabs](https://elevenlabs.io/)
2. Sign in or create an account
3. Click on your profile icon in the top right
4. Select "Profile" from the dropdown menu
5. Copy your API key

### Step 3: Add Your API Keys to `.env`

Open the `.env` file and add the following lines:

```
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs API Key
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Firebase settings (if using Firebase)
STORAGE_BUCKET=your_firebase_storage_bucket
```

Replace the placeholder values with your actual API keys.

### Step 4: Start the Backend Server

Start the FastAPI backend server:

```bash
cd backend
uvicorn app.main:app --reload
```

## API Usage

The app uses the FastAPI backend to handle all external API calls:

- `/api/ai/script` - Generates scripts using OpenAI
- `/api/ai/voices` - Gets available voices from ElevenLabs
- `/api/ai/narration` - Generates narration using ElevenLabs

The backend handles all API keys securely, so no sensitive information is exposed to the frontend.

## Troubleshooting

### 401 Unauthorized Errors

If you see "401 Unauthorized" errors in your console:

1. Double-check that your API keys are correct in the backend `.env` file
2. Make sure the API keys are properly formatted (no extra spaces)
3. Verify that your ElevenLabs API key doesn't have a `sk_` prefix unless that's actually part of the key
4. Confirm your OpenAI account has a valid payment method and sufficient credits

### API Rate Limits

Both OpenAI and ElevenLabs have rate limits:

- OpenAI: Limits depend on your account tier
- ElevenLabs: Character quota depends on your subscription plan

## Security Notice

Never commit your `.env` file to version control. It should be listed in your `.gitignore` file to prevent accidental commits. 