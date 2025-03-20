// Client-side code for ElevenLabs integration
// We use API routes to keep API keys secure

// Default voice options
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

// Type definitions
type TextToSpeechOptions = {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
};

export type Voice = {
  voice_id: string;
  name: string;
  category: string;
};

/**
 * Converts text to speech using our secure API route
 */
export async function generateNarration(
  script: string, 
  options: TextToSpeechOptions = {}
): Promise<Blob> {
  try {
    console.log("Calling ElevenLabs API route for narration");
    
    const response = await fetch('/api/elevenlabs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        script,
        voiceId: options.voiceId,
        modelId: options.modelId,
        stability: options.stability,
        similarityBoost: options.similarityBoost,
      }),
    });
    
    if (!response.ok) {
      // Try to get error details
      const errorData = await response.json().catch(() => ({}));
      console.error(`ElevenLabs API route error (${response.status}):`, errorData);
      throw new Error(`ElevenLabs error: ${response.statusText}`);
    }
    
    // Get the audio blob directly
    return await response.blob();
  } catch (error) {
    console.error("Error generating narration:", error);
    throw new Error("Failed to generate narration. Please try again.");
  }
}

/**
 * Gets available voices from ElevenLabs
 * For simplicity, we're using a static list instead of calling the API
 */
export async function getAvailableVoices(): Promise<Voice[]> {
  // For this demo, we'll return a static list of common voices
  return [
    {
      voice_id: "21m00Tcm4TlvDq8ikWAM",
      name: "Rachel",
      category: "premade",
    },
    {
      voice_id: "pNInz6obpgDQGcFmaJgB",
      name: "Adam",
      category: "premade",
    },
    {
      voice_id: "EXAVITQu4vr4xnSDxMaL",
      name: "Sarah",
      category: "premade",
    },
    {
      voice_id: "D38z5RcWu1voky8WS1ja",
      name: "Thomas",
      category: "premade",
    }
  ];
}

/**
 * Converts a Blob to a data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
} 