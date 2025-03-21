import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with proper error handling
let openai: OpenAI;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OpenAI API key is missing in environment variables');
  } else if (process.env.OPENAI_API_KEY.startsWith('sk-your-openai')) {
    console.error('OpenAI API key has not been replaced with a valid key');
  } else {
    console.log('OpenAI API key is configured');
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.error('Error initializing OpenAI client:', error);
}

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key is not configured. Please add it to your .env.local file.',
          resolution: 'Add your OpenAI API key to the .env.local file as OPENAI_API_KEY=your-api-key' 
        },
        { status: 500 }
      );
    }

    // Check if API key is the placeholder value
    if (process.env.OPENAI_API_KEY.startsWith('sk-your-openai')) {
      return NextResponse.json(
        { 
          error: 'You need to replace the placeholder OpenAI API key with your actual key',
          resolution: 'Get your API key from https://platform.openai.com/api-keys and update the .env.local file' 
        },
        { status: 500 }
      );
    }

    // Check if OpenAI client is initialized
    if (!openai) {
      return NextResponse.json(
        { 
          error: 'OpenAI client failed to initialize',
          resolution: 'Check server logs for details and ensure your API key is valid' 
        },
        { status: 500 }
      );
    }

    const { carDetails, angleDescriptions } = await request.json();

    if (!carDetails || !angleDescriptions || !Array.isArray(angleDescriptions)) {
      return NextResponse.json(
        { error: 'Missing required fields: carDetails or angleDescriptions' },
        { status: 400 }
      );
    }

    console.log('Processing script generation request for car details:', carDetails.substring(0, 50) + '...');

    const prompt = `
      Create a professional 1-minute car promotional script based on the following information:
      
      CAR DETAILS:
      ${carDetails}
      
      VIDEO ANGLES (in sequence):
      ${angleDescriptions.map((desc, i) => `${i + 1}. ${desc}`).join('\n')}
      
      Instructions:
      - Script should be around 150-200 words
      - Use professional, engaging language
      - Highlight key features
      - Script should follow the sequence of video angles
      - Each angle gets approximately 6 seconds of narration
      - Keep the narration tight, concise, and impactful
    `;

    try {
      const completion = await openai.chat.completions.create({
        messages: [
          { role: "system", content: "You are a professional automotive copywriter who creates concise, engaging scripts for car promotion videos." },
          { role: "user", content: prompt }
        ],
        model: "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 500
      });

      const scriptContent = completion.choices[0]?.message?.content || "Error generating script. Please try again.";
      console.log('Successfully generated script');
      
      return NextResponse.json({ script: scriptContent });
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      
      // Enhanced error handling
      const errorMessage = openaiError instanceof Error ? openaiError.message : 'Unknown error';
      let userFriendlyError = `OpenAI API error: ${errorMessage}`;
      let resolution = 'Try again later or check your API key configuration';
      
      // Check for common error patterns
      if (errorMessage.includes('quota') || errorMessage.includes('insufficient_quota')) {
        userFriendlyError = 'Your OpenAI API key has exceeded its quota';
        resolution = 'Add a payment method to your OpenAI account or create a new API key';
      } else if (errorMessage.includes('invalid_api_key') || errorMessage.includes('incorrect api key')) {
        userFriendlyError = 'Your OpenAI API key is invalid';
        resolution = 'Double-check your API key and ensure it\'s entered correctly in .env.local';
      } else if (errorMessage.includes('rate limit')) {
        userFriendlyError = 'Rate limit exceeded for OpenAI API';
        resolution = 'Wait a minute and try again, or upgrade your OpenAI plan';
      }
      
      return NextResponse.json(
        { 
          error: userFriendlyError,
          resolution: resolution,
          details: errorMessage
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('General error in OpenAI route handler:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        resolution: 'Check your request format and try again'
      },
      { status: 500 }
    );
  }
} 