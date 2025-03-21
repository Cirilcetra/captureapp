import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

// Create FFmpeg instance with logging enabled
const ffmpeg = new FFmpeg();

// Helper function to get a direct download URL from a Firebase Storage URL
async function getDirectDownloadURL(firebaseUrl: string): Promise<string> {
  try {
    // Extract the path from the Firebase Storage URL
    const storage = getStorage();
    const urlPath = firebaseUrl.split('/o/')[1].split('?')[0];
    const decodedPath = decodeURIComponent(urlPath);
    const fileRef = ref(storage, decodedPath);
    
    // Get a fresh download URL with valid token
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error('Error getting direct download URL:', error);
    throw new Error(`Failed to get download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function combineVideos(videoUrls: string[]): Promise<Blob> {
  try {
    // Load FFmpeg if not already loaded
    if (!ffmpeg.loaded) {
      console.log('Loading FFmpeg...');
      await ffmpeg.load({
        coreURL: await toBlobURL('/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
      });
      console.log('FFmpeg loaded successfully');
    }

    console.log('Starting video combination process...', videoUrls);

    // Load videos into FFmpeg's virtual filesystem
    for (let i = 0; i < videoUrls.length; i++) {
      console.log(`Processing video ${i + 1}/${videoUrls.length}`);
      
      try {
        // Get a fresh download URL with valid token
        const directUrl = await getDirectDownloadURL(videoUrls[i]);
        
        // Fetch video using the direct URL
        const response = await fetch(directUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch video ${i + 1}: ${response.status} ${response.statusText}`);
        }
        
        const videoBlob = await response.blob();
        if (videoBlob.size === 0) {
          throw new Error(`Video ${i + 1} is empty`);
        }
        
        console.log(`Writing video ${i + 1} to FFmpeg filesystem`);
        const extension = videoBlob.type === 'video/webm' ? 'webm' : 
                         videoBlob.type === 'video/quicktime' ? 'mov' : 'mp4';
        await ffmpeg.writeFile(`video${i}.${extension}`, await fetchFile(videoBlob));
      } catch (error) {
        console.error(`Error processing video ${i + 1}:`, error);
        throw new Error(`Failed to process video ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Create concatenation file list
    const concatContent = videoUrls.map((_, i) => {
      const extension = videoUrls[i].toLowerCase().endsWith('.webm') ? 'webm' :
                       videoUrls[i].toLowerCase().endsWith('.mov') ? 'mov' : 'mp4';
      return `file 'video${i}.${extension}'`;
    }).join('\n');
    console.log('Creating concat file with content:', concatContent);
    await ffmpeg.writeFile('filelist.txt', new TextEncoder().encode(concatContent));

    // Run FFmpeg command to merge videos with automatic format detection
    console.log('Running FFmpeg concat command...');
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'filelist.txt',
      '-c:v', 'libx264', // Use H.264 codec for compatibility
      '-preset', 'medium', // Balance between speed and quality
      '-crf', '23', // Reasonable quality setting
      'output.mp4'
    ]);

    // Read the output file
    console.log('Reading output file...');
    const data = await ffmpeg.readFile('output.mp4');

    // Clean up files
    console.log('Cleaning up temporary files...');
    for (let i = 0; i < videoUrls.length; i++) {
      await ffmpeg.deleteFile(`video${i}.mp4`);
    }
    await ffmpeg.deleteFile('filelist.txt');
    await ffmpeg.deleteFile('output.mp4');

    // Create output blob
    console.log('Creating output blob...');
    return new Blob([data], { type: 'video/mp4' });
  } catch (error) {
    console.error('Error in combineVideos:', error);
    throw new Error(`Failed to combine videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function addAudioToVideo(videoBlob: Blob, audioBlob: Blob): Promise<Blob> {
  try {
    // Load FFmpeg if not already loaded
    if (!ffmpeg.loaded) {
      console.log('Loading FFmpeg...');
      await ffmpeg.load({
        coreURL: await toBlobURL('/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
      });
      console.log('FFmpeg loaded successfully');
    }

    console.log('Starting audio addition process...');

    // Write input files to FFmpeg filesystem
    console.log('Writing files to FFmpeg filesystem...');
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoBlob));
    await ffmpeg.writeFile('audio.mp3', await fetchFile(audioBlob));

    // Add audio to video
    console.log('Running FFmpeg command to add audio...');
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-i', 'audio.mp3',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-map', '0:v:0',
      '-map', '1:a:0',
      'output.mp4'
    ]);

    // Read the output file
    console.log('Reading output file...');
    const data = await ffmpeg.readFile('output.mp4');

    // Clean up
    console.log('Cleaning up temporary files...');
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('audio.mp3');
    await ffmpeg.deleteFile('output.mp4');

    // Create output blob
    console.log('Creating output blob...');
    return new Blob([data], { type: 'video/mp4' });
  } catch (error) {
    console.error('Error in addAudioToVideo:', error);
    throw new Error(`Failed to add audio to video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to create a video element from a blob
export const createVideoElement = (blob: Blob): Promise<HTMLVideoElement> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(blob);
    video.onloadedmetadata = () => resolve(video);
    video.onerror = (e) => reject(e);
  });
}; 