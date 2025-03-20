import { NextRequest, NextResponse } from 'next/server';
// Remove the SDK import since we're using direct API calls
// import { VoiceGeneration, ElevenLabsClient } from 'elevenlabs';

// Default voice options
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

// Debug the API key availability (logs only appear server-side)
console.log('ElevenLabs API key available:', !!process.env.ELEVENLABS_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key is not set in environment variables');
      return NextResponse.json(
        { error: 'ElevenLabs API key is not configured. Please add it to your environment variables.' },
        { status: 500 }
      );
    }

    const { script, voiceId, stability, similarityBoost, modelId } = await request.json();

    if (!script || typeof script !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: script' },
        { status: 400 }
      );
    }

    // Use selected voice ID or default
    const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;
    const selectedModelId = modelId || "eleven_multilingual_v2";
    const selectedStability = stability || 0.5;
    const selectedSimilarityBoost = similarityBoost || 0.75;

    console.log(`Server-side: Calling ElevenLabs API with voice ID: ${selectedVoiceId}`);
    
    try {
      // Use direct API call which is more straightforward for this case
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
        },
        body: JSON.stringify({
          text: script,
          model_id: selectedModelId,
          voice_settings: {
            stability: selectedStability,
            similarity_boost: selectedSimilarityBoost,
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        console.error(`ElevenLabs API error (${response.status}): ${errorText}`);
        return NextResponse.json(
          { error: `ElevenLabs API error (${response.status}): ${response.statusText}` },
          { status: response.status }
        );
      }
      
      // Get the audio as an array buffer
      const audioArrayBuffer = await response.arrayBuffer();
      
      // Return the audio with the correct content type
      return new NextResponse(audioArrayBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': 'attachment; filename="narration.mp3"'
        }
      });
    } catch (elevenLabsError) {
      console.error('ElevenLabs API error:', elevenLabsError);
      return NextResponse.json(
        { 
          error: elevenLabsError instanceof Error 
            ? `ElevenLabs API error: ${elevenLabsError.message}` 
            : 'Unknown error with ElevenLabs API',
          details: elevenLabsError
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('General error in ElevenLabs route handler:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 