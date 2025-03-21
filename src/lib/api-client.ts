// API client for interacting with the FastAPI backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface VideoResponse {
  status: string;
  url?: string;
  message?: string;
  error?: string;
}

interface ProgressResponse {
  progress: number;
  stage: string;
  status: string;
}

// AI-related interfaces
export interface ScriptGenerationRequest {
  car_details: string;
  angle_descriptions: string[];
}

export interface ScriptGenerationResponse {
  script: string;
}

export interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
}

export interface VoicesResponse {
  voices: Voice[];
}

export interface NarrationGenerationRequest {
  script: string;
  voice_id?: string;
  model_id?: string;
  stability?: number;
  similarity_boost?: number;
}

export async function combineVideosServer(
  projectId: string,
  videoUrls: string[],
  onProgress?: (progress: number, stage: string) => void
): Promise<string> {
  try {
    // Start the combination process
    const response = await fetch(`${API_BASE_URL}/api/video/combine-videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        video_urls: videoUrls,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to combine videos');
    }

    const result: VideoResponse = await response.json();

    // Start polling for progress
    if (onProgress) {
      const taskId = `combine_${projectId}`;
      await pollProgress(taskId, onProgress);
    }

    if (result.status === 'success' && result.url) {
      return result.url;
    } else {
      throw new Error(result.error || 'Failed to get video URL');
    }
  } catch (error) {
    console.error('Error combining videos:', error);
    throw error;
  }
}

export async function addAudioToVideoServer(
  projectId: string,
  videoUrl: string,
  audioUrl: string,
  onProgress?: (progress: number, stage: string) => void
): Promise<string> {
  try {
    // Start the audio addition process
    const response = await fetch(`${API_BASE_URL}/api/video/add-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        video_url: videoUrl,
        audio_url: audioUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to add audio to video');
    }

    const result: VideoResponse = await response.json();

    // Start polling for progress
    if (onProgress) {
      const taskId = `audio_${projectId}`;
      await pollProgress(taskId, onProgress);
    }

    if (result.status === 'success' && result.url) {
      return result.url;
    } else {
      throw new Error(result.error || 'Failed to get video URL');
    }
  } catch (error) {
    console.error('Error adding audio to video:', error);
    throw error;
  }
}

async function pollProgress(
  taskId: string,
  onProgress: (progress: number, stage: string) => void,
  interval: number = 1000
): Promise<void> {
  while (true) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/video/progress/${taskId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const progress: ProgressResponse = await response.json();
      onProgress(progress.progress, progress.stage);

      if (progress.status === 'complete' || progress.progress === 100) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.error('Error polling progress:', error);
      break;
    }
  }
}

// AI-related functions
export async function generateScript(request: ScriptGenerationRequest): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate script');
    }

    const data: ScriptGenerationResponse = await response.json();
    return data.script;
  } catch (error) {
    console.error('Error generating script:', error);
    throw error;
  }
}

export async function getAvailableVoices(): Promise<Voice[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/voices`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch voices');
    }

    const data: VoicesResponse = await response.json();
    return data.voices;
  } catch (error) {
    console.error('Error fetching voices:', error);
    throw error;
  }
}

export async function generateNarration(request: NarrationGenerationRequest): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/narration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Failed to generate narration');
    }

    return await response.blob();
  } catch (error) {
    console.error('Error generating narration:', error);
    throw error;
  }
} 