import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

// Create FFmpeg instance with logging enabled
const ffmpeg = new FFmpeg();

// Helper function to download video from Firebase Storage
async function downloadVideo(url: string): Promise<Blob> {
  try {
    console.log('🔄 Starting download process...');
    console.log('📥 Original URL:', url);
    
    // Extract the path from the Firebase Storage URL
    const pathStartIndex = url.indexOf('/o/') + 3;
    const pathEndIndex = url.indexOf('?');
    if (pathStartIndex === -1 || pathEndIndex === -1) {
      throw new Error('Invalid Firebase Storage URL format');
    }
    
    const storagePath = decodeURIComponent(url.substring(pathStartIndex, pathEndIndex));
    console.log('📂 Storage path:', storagePath);
    
    // Get the video blob using Firebase Storage
    console.log('🔑 Creating storage reference...');
    const storageRef = ref(storage, storagePath);
    
    // Get a fresh download URL
    console.log('🔗 Getting fresh download URL...');
    const downloadURL = await getDownloadURL(storageRef);
    console.log('📍 Download URL:', downloadURL);
    
    // Download the video using fetch with minimal configuration
    console.log('⬇️ Starting fetch request...');
    const response = await fetch(downloadURL);

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Downloaded video is empty');
    }
    
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
    console.log(`📦 Download complete! Size: ${sizeMB} MB`);
    return blob;
  } catch (error) {
    console.error('❌ Download failed:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      if (error.message.includes('storage/object-not-found')) {
        throw new Error('Video file not found in Firebase Storage. Please check if the video was uploaded successfully.');
      } else if (error.message.includes('storage/unauthorized')) {
        throw new Error('Access to video denied. Please check Firebase Storage rules and authentication.');
      } else if (error.message.includes('storage/quota-exceeded')) {
        throw new Error('Firebase Storage quota exceeded.');
      } else if (error.message.includes('storage/invalid-url')) {
        throw new Error('Invalid Firebase Storage URL format.');
      } else if (error.message.includes('storage/bucket-not-found')) {
        throw new Error('Firebase Storage bucket not found. Please check your Firebase configuration.');
      }
    }
    throw error;
  }
}

export async function combineVideos(
  videoUrls: string[],
  onProgress?: (progress: number, stage: string) => void
): Promise<Blob> {
  try {
    console.log(`🎬 Starting to combine ${videoUrls.length} videos...`);
    
    if (!videoUrls || videoUrls.length === 0) {
      throw new Error('No video URLs provided');
    }

    // Load FFmpeg if not already loaded
    if (!ffmpeg.loaded) {
      onProgress?.(0, 'Loading FFmpeg...');
      console.log('⚙️ Loading FFmpeg...');
      await ffmpeg.load({
        coreURL: await toBlobURL('/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
      });
      console.log('✅ FFmpeg loaded successfully');
    }

    // Download and process each video
    for (let i = 0; i < videoUrls.length; i++) {
      const downloadProgress = (i / videoUrls.length) * 30; // First 30% for downloading
      onProgress?.(downloadProgress, `Downloading video ${i + 1} of ${videoUrls.length}`);
      
      console.log(`\n📽️ Processing video ${i + 1} of ${videoUrls.length}`);
      console.log('🔗 Source:', videoUrls[i]);
      
      if (!videoUrls[i]) {
        throw new Error(`Invalid URL for video ${i + 1}`);
      }
      
      try {
        // Download the video
        const videoBlob = await downloadVideo(videoUrls[i]);
        const sizeMB = (videoBlob.size / (1024 * 1024)).toFixed(2);
        console.log(`✅ Video ${i + 1} downloaded (${sizeMB} MB)`);
        
        const processProgress = 30 + ((i / videoUrls.length) * 30); // 30-60% for processing
        onProgress?.(processProgress, `Converting video ${i + 1} of ${videoUrls.length}`);
        
        // Write the original video to FFmpeg filesystem
        const inputFileName = `input${i}.mov`;
        console.log(`💾 Writing to FFmpeg as ${inputFileName}...`);
        await ffmpeg.writeFile(inputFileName, await fetchFile(videoBlob));
        console.log('✅ Write complete');
        
        // Convert MOV to MP4 with optimized settings
        console.log(`🔄 Converting to MP4...`);
        await ffmpeg.exec([
          '-i', inputFileName,
          '-c:v', 'libx264',
          '-preset', 'ultrafast', // Changed from 'medium' to 'ultrafast' for speed
          '-crf', '28', // Slightly reduced quality for better speed (23 -> 28)
          '-tune', 'fastdecode',
          '-movflags', '+faststart',
          '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', // Ensure even dimensions
          `video${i}.mp4`
        ]);
        
        // Clean up the input file
        await ffmpeg.deleteFile(inputFileName);
        console.log(`✅ Video ${i + 1} ready for combining`);
      } catch (error) {
        console.error(`❌ Error processing video ${i + 1}:`, error);
        throw new Error(`Failed to process video ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Create concatenation file list
    onProgress?.(65, 'Preparing for combination...');
    const concatContent = videoUrls.map((_, i) => {
      return `file 'video${i}.mp4'`;
    }).join('\n');
    console.log('Creating concat file with content:', concatContent);
    await ffmpeg.writeFile('filelist.txt', new TextEncoder().encode(concatContent));

    // Run FFmpeg command to merge videos with optimized settings
    onProgress?.(70, 'Combining videos...');
    console.log('Running FFmpeg concat command...');
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'filelist.txt',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '28',
      '-tune', 'fastdecode',
      '-movflags', '+faststart',
      'output.mp4'
    ]);

    onProgress?.(85, 'Reading final video...');
    console.log('Reading output file...');
    const data = await ffmpeg.readFile('output.mp4');

    // Clean up files
    onProgress?.(95, 'Cleaning up...');
    console.log('Cleaning up temporary files...');
    for (let i = 0; i < videoUrls.length; i++) {
      await ffmpeg.deleteFile(`video${i}.mp4`);
    }
    await ffmpeg.deleteFile('filelist.txt');
    await ffmpeg.deleteFile('output.mp4');

    onProgress?.(100, 'Complete!');

    // Create output blob
    console.log('Creating output blob...');
    return new Blob([data], { type: 'video/mp4' });
  } catch (error) {
    console.error('Error in combineVideos:', error);
    throw new Error(`Failed to combine videos: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function addAudioToVideo(
  videoBlob: Blob, 
  audioBlob: Blob,
  onProgress?: (progress: number, stage: string) => void
): Promise<Blob> {
  try {
    // Load FFmpeg if not already loaded
    if (!ffmpeg.loaded) {
      onProgress?.(0, 'Loading FFmpeg...');
      console.log('Loading FFmpeg...');
      await ffmpeg.load({
        coreURL: await toBlobURL('/ffmpeg-core.js', 'text/javascript'),
        wasmURL: await toBlobURL('/ffmpeg-core.wasm', 'application/wasm'),
      });
      console.log('FFmpeg loaded successfully');
    }

    onProgress?.(10, 'Processing video...');
    console.log('Starting audio addition process...');

    // Write input files to FFmpeg filesystem
    console.log('Writing files to FFmpeg filesystem...');
    onProgress?.(20, 'Preparing video file...');
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoBlob));
    
    onProgress?.(40, 'Preparing audio file...');
    await ffmpeg.writeFile('audio.mp3', await fetchFile(audioBlob));

    // Add audio to video
    onProgress?.(60, 'Combining audio and video...');
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
    onProgress?.(80, 'Finalizing video...');
    console.log('Reading output file...');
    const data = await ffmpeg.readFile('output.mp4');

    // Clean up
    onProgress?.(90, 'Cleaning up...');
    console.log('Cleaning up temporary files...');
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('audio.mp3');
    await ffmpeg.deleteFile('output.mp4');

    // Create output blob
    onProgress?.(95, 'Creating final video file...');
    console.log('Creating output blob...');
    const finalBlob = new Blob([data], { type: 'video/mp4' });
    
    onProgress?.(100, 'Complete!');
    return finalBlob;
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