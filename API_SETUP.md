# API Setup for the Capture App

This document explains how to set up the necessary API keys for the Capture App.

## Overview

The Capture App uses two external API services:

1. **OpenAI API** - For generating promotional scripts
2. **ElevenLabs API** - For text-to-speech narration

## Setting Up API Keys

### Step 1: Create a `.env.local` file

In the root directory of the project, create or edit a file called `.env.local`:

```bash
touch .env.local
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

### Step 3: Add Your API Keys to `.env.local`

Open the `.env.local` file and add the following lines:

```
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs API Key
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

Replace `your_openai_api_key_here` and `your_elevenlabs_api_key_here` with your actual API keys.

### Step 4: Restart Your Development Server

If your development server is running, restart it to apply the changes:

```bash
npm run dev
```

## API Usage

The app now uses secure API routes to handle external API calls:

- `/api/openai` - Handles OpenAI API calls
- `/api/elevenlabs` - Handles ElevenLabs API calls

These server-side API routes keep your API keys secure by not exposing them to the client.

## Troubleshooting

### 401 Unauthorized Errors

If you see "401 Unauthorized" errors in your console:

1. Double-check that your API keys are correct
2. Make sure the API keys are properly formatted (no extra spaces)
3. Verify that your ElevenLabs API key doesn't have a `sk_` prefix unless that's actually part of the key
4. Confirm your OpenAI account has a valid payment method and sufficient credits

### API Rate Limits

Both OpenAI and ElevenLabs have rate limits:

- OpenAI: Limits depend on your account tier
- ElevenLabs: Character quota depends on your subscription plan

## Security Notice

Never commit your `.env.local` file to version control. It should be listed in your `.gitignore` file to prevent accidental commits. 