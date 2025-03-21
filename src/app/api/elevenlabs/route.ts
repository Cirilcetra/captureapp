import { NextRequest, NextResponse } from 'next/server';

// Default voice options
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel

// Debug the API key availability (logs only appear server-side)
const apiKey = process.env.ELEVENLABS_API_KEY;
console.log('ElevenLabs API key:', {
  exists: !!apiKey,
  length: apiKey?.length,
  firstChar: apiKey ? apiKey[0] : null,
  lastChar: apiKey ? apiKey[apiKey.length - 1] : null
});

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.ELEVENLABS_API_KEY) {
      console.error('ElevenLabs API key is not set in environment variables');
      return NextResponse.json(
        { error: 'ElevenLabs API key is not configured. Please add ELEVENLABS_API_KEY to your .env.local file.' },
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
    
    // Use direct API call which is more straightforward for this case
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`;
    
    // Test the API key first
    const testResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY.trim()
      }
    });

    if (!testResponse.ok) {
      console.error('ElevenLabs API key test failed:', await testResponse.text());
      return NextResponse.json(
        { error: 'Invalid ElevenLabs API key. The key was rejected by the ElevenLabs API.' },
        { status: 401 }
      );
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY.trim(),
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
      let errorMessage = 'Unknown error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail?.message || errorData.detail || errorData.message || response.statusText;
        console.error('ElevenLabs API error details:', errorData);
      } catch {
        // If we can't parse the error response, try to get the text
        try {
          errorMessage = await response.text();
          console.error('ElevenLabs API error text:', errorMessage);
        } catch {
          errorMessage = response.statusText;
        }
      }

      console.error(`ElevenLabs API error (${response.status}):`, errorMessage);

      // Special handling for common errors
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid ElevenLabs API key. Please check your ELEVENLABS_API_KEY in .env.local' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `ElevenLabs API error: ${errorMessage}` },
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
  } catch (error) {
    console.error('General error in ElevenLabs route handler:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}