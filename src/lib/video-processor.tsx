import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { toast } from 'sonner';

let ffmpeg: FFmpeg | null = null;

// Check if running in browser environment
const isBrowser = typeof window !== 'undefined';

// Initialize FFmpeg
export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (!isBrowser) {
    console.warn('FFmpeg can only be initialized in browser environment');
    return Promise.reject(new Error('Browser environment required'));
  }

  // Check if we have SharedArrayBuffer support
  if (typeof SharedArrayBuffer === 'undefined') {
    const errorMsg = 'Your browser doesn\'t support SharedArrayBuffer, which is required for video processing.';
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (ffmpeg) {
    console.log('FFmpeg already loaded, reusing instance');
    return ffmpeg;
  }

  try {
    console.log('Loading FFmpeg...');
    ffmpeg = new FFmpeg();
    
    // Set up logging
    ffmpeg.on('log', ({ message }) => {
      console.log(`FFmpeg Log: ${message}`);
    });

    // Set up progress tracking
    ffmpeg.on('progress', ({ progress }) => {
      console.log(`FFmpeg Progress: ${Math.round(progress * 100)}%`);
    });

    // Load directly from CDN - more reliable than trying local files first
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd';
    
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      console.log('FFmpeg loaded successfully from CDN');
      toast.success('Video processing engine loaded');
      return ffmpeg;
    } catch (error) {
      console.error('Error loading FFmpeg from CDN:', error);
      toast.error('Failed to load video processing engine. Please try again with a better connection.');
      throw error;
    }
  } catch (error) {
    console.error('Error initializing FFmpeg:', error);
    toast.error('Failed to initialize video processing engine. Please try reloading the page.');
    throw error;
  }
};

// Process a video (trim, resize, format conversion)
export const processVideo = async (
  videoFile: Blob,
  outputName: string,
  startTime: number = 0,
  duration: number = 6
): Promise<Blob> => {
  if (!isBrowser) {
    console.warn('Video processing can only be performed in browser environment');
    return Promise.reject(new Error('Browser environment required'));
  }

  console.log(`Processing video: start=${startTime}, duration=${duration}, size=${videoFile.size} bytes, type=${videoFile.type}`);
  
  if (videoFile.size === 0) {
    const error = new Error('Video file is empty');
    console.error(error);
    toast.error('Video file is empty and cannot be processed');
    throw error;
  }

  // If we're dealing with a non-video file (like a PNG), convert it to a simple video
  if (videoFile.type.startsWith('image/')) {
    console.log('Input is an image, converting to simple video');
    try {
      // Create a simple video from the image (using a canvas and MediaRecorder)
      const img = new Image();
      img.src = URL.createObjectURL(videoFile);
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 1280;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not create canvas context');
      }
      
      // Fill with black
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw image centered
      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
      );
      
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      
      ctx.drawImage(
        img, 
        x, y, 
        img.width * scale, 
        img.height * scale
      );
      
      // Convert to video using MediaRecorder
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp8',
        videoBitsPerSecond: 2500000 
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      const videoPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const videoBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(videoBlob);
        };
      });
      
      recorder.start();
      await new Promise(r => setTimeout(r, 1000)); // Record for 1 second
      recorder.stop();
      
      // Replace the input file with our video
      videoFile = await videoPromise;
      console.log(`Created video from image: ${videoFile.size} bytes`);
    } catch (error) {
      console.error('Error converting image to video:', error);
      throw new Error('Failed to convert image to video');
    }
  }

  try {
    const ffmpegInstance = await initFFmpeg();
    
    const inputFileExtension = videoFile.type.includes('mp4') ? 'mp4' : 'webm';
    const inputFileName = `input.${inputFileExtension}`;
    console.log(`Writing input file to memory: ${inputFileName} (type: ${videoFile.type})`);
    
    // Write the blob to memory
    ffmpegInstance.writeFile(inputFileName, await fetchFile(videoFile));
    console.log('File written to memory successfully');
    
    // Run a simpler FFmpeg command with fewer options for better compatibility
    console.log('Running simplified FFmpeg processing command');
    
    try {
      await ffmpegInstance.exec([
        '-i', inputFileName,
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-c:v', 'libx264', // Use H.264 for maximum compatibility
        '-preset', 'ultrafast', // Speed up processing at the cost of file size
        '-crf', '28', // Lower quality but faster processing
        '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2', // Pad to fit
        '-pix_fmt', 'yuv420p', // Required for maximum compatibility
        '-movflags', '+faststart',
        '-an', // Remove audio to simplify
        outputName
      ]);
      
      console.log('FFmpeg command executed successfully');
    } catch (ffmpegError) {
      console.error('FFmpeg command failed, trying with simpler options:', ffmpegError);
      
      // Try with even simpler options
      await ffmpegInstance.exec([
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '30',
        '-pix_fmt', 'yuv420p',
        '-an',
        outputName
      ]);
      
      console.log('Fallback FFmpeg command executed successfully');
    }
    
    // Read the output file
    console.log(`Reading processed output file: ${outputName}`);
    const data = await ffmpegInstance.readFile(outputName);
    console.log(`Read ${typeof data === 'string' ? data.length : data.byteLength} bytes from output file`);
    
    // Create a blob from the output
    const processedVideo = new Blob([data], { type: 'video/mp4' });
    console.log(`Created processed video blob: ${processedVideo.size} bytes`);
    
    // Clean up
    console.log('Cleaning up temporary files');
    try {
      await ffmpegInstance.deleteFile(inputFileName);
      await ffmpegInstance.deleteFile(outputName);
      console.log('Temporary files deleted successfully');
    } catch (cleanupError) {
      console.warn('Error during cleanup:', cleanupError);
      // Continue despite cleanup errors
    }
    
    return processedVideo;
  } catch (error) {
    console.error('Error processing video:', error);
    toast.error('Error processing video. Please try again.');
    throw error;
  }
};

// Combine multiple videos
export const combineVideos = async (videos: Blob[]): Promise<Blob> => {
  if (!isBrowser) {
    console.warn('Video combining can only be performed in browser environment');
    return Promise.reject(new Error('Browser environment required'));
  }

  console.log(`Combining ${videos.length} videos`);
  
  if (videos.length === 0) {
    const error = new Error('No videos to combine');
    console.error(error);
    toast.error('No videos available to combine');
    throw error;
  }

  try {
    const ffmpegInstance = await initFFmpeg();
    
    // Create a file list for concat
    let fileList = '';
    
    // Process each video and add to the list
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      console.log(`Processing video #${i+1}: ${video.size} bytes`);
      
      if (video.size === 0) {
        throw new Error(`Video #${i+1} is empty and cannot be processed`);
      }
      
      const inputFileName = `input${i}.mp4`;
      fileList += `file '${inputFileName}'\n`;
      
      console.log(`Writing video #${i+1} to memory as ${inputFileName}`);
      // Write the video to memory
      ffmpegInstance.writeFile(inputFileName, await fetchFile(video));
    }
    
    console.log('Creating concat file with content:', fileList);
    // Write the concat file
    ffmpegInstance.writeFile('filelist.txt', fileList);
    
    // Run FFmpeg command to concatenate videos
    console.log('Running FFmpeg concat command');
    await ffmpegInstance.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'filelist.txt',
      '-c', 'copy',
      'output.mp4'
    ]);
    
    console.log('FFmpeg concat command executed successfully');
    
    // Read the output file
    console.log('Reading combined output file');
    const data = await ffmpegInstance.readFile('output.mp4');
    console.log(`Read ${typeof data === 'string' ? data.length : data.byteLength} bytes from combined output file`);
    
    // Create a blob from the output
    const combinedVideo = new Blob([data], { type: 'video/mp4' });
    console.log(`Created combined video blob: ${combinedVideo.size} bytes`);
    
    // Clean up
    console.log('Cleaning up temporary files');
    try {
      for (let i = 0; i < videos.length; i++) {
        await ffmpegInstance.deleteFile(`input${i}.mp4`);
      }
      await ffmpegInstance.deleteFile('filelist.txt');
      await ffmpegInstance.deleteFile('output.mp4');
      console.log('Temporary files deleted successfully');
    } catch (cleanupError) {
      console.warn('Error during cleanup:', cleanupError);
      // Continue despite cleanup errors
    }
    
    return combinedVideo;
  } catch (error) {
    console.error('Error combining videos:', error);
    toast.error('Error combining videos. Please try again.');
    throw error;
  }
};

// Add audio to video
export const addAudioToVideo = async (video: Blob, audio: Blob): Promise<Blob> => {
  if (!isBrowser) {
    console.warn('Audio addition can only be performed in browser environment');
    return Promise.reject(new Error('Browser environment required'));
  }

  console.log(`Adding audio (${audio.size} bytes) to video (${video.size} bytes)`);
  
  if (video.size === 0) {
    throw new Error('Video file is empty');
  }
  
  if (audio.size === 0) {
    throw new Error('Audio file is empty');
  }

  try {
    const ffmpegInstance = await initFFmpeg();
    
    // Write files to memory
    console.log('Writing video and audio files to memory');
    ffmpegInstance.writeFile('input.mp4', await fetchFile(video));
    ffmpegInstance.writeFile('audio.mp3', await fetchFile(audio));
    
    // Run FFmpeg command to add audio to video
    console.log('Running FFmpeg command to add audio to video');
    await ffmpegInstance.exec([
      '-i', 'input.mp4',
      '-i', 'audio.mp3',
      '-map', '0:v',
      '-map', '1:a',
      '-c:v', 'copy',
      '-shortest',
      'output.mp4'
    ]);
    
    console.log('FFmpeg command executed successfully');
    
    // Read the output file
    console.log('Reading output file with audio');
    const data = await ffmpegInstance.readFile('output.mp4');
    console.log(`Read ${typeof data === 'string' ? data.length : data.byteLength} bytes from output file`);
    
    // Create a blob from the output
    const processedVideo = new Blob([data], { type: 'video/mp4' });
    console.log(`Created processed video blob: ${processedVideo.size} bytes`);
    
    // Clean up
    console.log('Cleaning up temporary files');
    try {
      await ffmpegInstance.deleteFile('input.mp4');
      await ffmpegInstance.deleteFile('audio.mp3');
      await ffmpegInstance.deleteFile('output.mp4');
      console.log('Temporary files deleted successfully');
    } catch (cleanupError) {
      console.warn('Error during cleanup:', cleanupError);
      // Continue despite cleanup errors
    }
    
    return processedVideo;
  } catch (error) {
    console.error('Error adding audio to video:', error);
    toast.error('Error adding audio to video. Please try again.');
    throw error;
  }
}; 