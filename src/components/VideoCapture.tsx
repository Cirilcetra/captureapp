"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Webcam from "react-webcam";
import { processVideo, initFFmpeg } from "@/lib/video-processor";
import FFmpegFallback from "./FFmpegFallback";
import { uploadVideo } from "@/lib/firebase"; // Import Firebase upload function

// Define our view states and permission states
type CameraPermissionState = "granted" | "denied" | "prompt" | "unknown";
type CaptureViewState = "list" | "camera" | "preview";

interface VideoCaptureProps {
  onAllCapturesComplete: () => void;
}

export default function VideoCapture({ onAllCapturesComplete }: VideoCaptureProps) {
  // App store
  const { currentProject, updateShot } = useAppStore();

  // View state management
  const [viewState, setViewState] = useState<CaptureViewState>("list");
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  
  // Recording state
  const [recording, setRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  
  // Loading and error states
  const [processingVideo, setProcessingVideo] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(true);
  const [ffmpegError, setFfmpegError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<CameraPermissionState>("unknown");
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  
  // Refs
  const recordedChunks = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const MAX_RECORDING_TIME = 6; // 6 seconds per shot
  
  // Initialize FFmpeg when component mounts
  useEffect(() => {
    const loadFFmpeg = async () => {
      setFfmpegLoading(true);
      try {
        await initFFmpeg();
        setFfmpegLoaded(true);
        setFfmpegError(null);
      } catch (error) {
        console.error("FFmpeg loading error:", error);
        setFfmpegError(error instanceof Error ? error.message : "Failed to load video processing capabilities");
        toast.error("Failed to initialize video processing. Some features may not work.");
      } finally {
        setFfmpegLoading(false);
      }
    };
    
    loadFFmpeg();
    checkCameraPermission();
    
    // Cleanup function
    return () => {
      // Clear any active timers
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      // Stop any active media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error("Error stopping MediaRecorder:", err);
        }
      }
      
      // Release camera if active
      if (webcamRef.current && webcamRef.current.stream) {
        webcamRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Check camera permissions
  const checkCameraPermission = useCallback(async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(permissionStatus.state as CameraPermissionState);
        
        // Add listener for permission changes
        permissionStatus.addEventListener('change', () => {
          setCameraPermission(permissionStatus.state as CameraPermissionState);
        });
      }
    } catch (error) {
      console.error("Error checking camera permission:", error);
    }
  }, []);
  
  // Request camera access
  const requestCameraAccess = useCallback(async () => {
    setIsCameraLoading(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: videoConstraints,
        audio: false 
      });
      
      // Cleanup the stream immediately since we're just checking permission
      stream.getTracks().forEach(track => track.stop());
      
      setCameraPermission("granted");
      toast.success("Camera access granted");
      return true;
    } catch (error) {
      console.error("Camera access denied:", error);
      setCameraPermission("denied");
      toast.error("Camera access denied. Please grant permission and try again.");
      return false;
    } finally {
      setIsCameraLoading(false);
    }
  }, []);
  
  // Check if all captures are complete
  useEffect(() => {
    if (!currentProject) return;
    
    const allShotsCompleted = currentProject.shots.every(shot => shot.completed);
    if (allShotsCompleted) {
      onAllCapturesComplete();
    }
  }, [currentProject, onAllCapturesComplete]);
  
  // Handle opening the camera view
  const handleOpenCamera = useCallback(async (shotId: string) => {
    if (!ffmpegLoaded) {
      toast.error("Video processing is not available. Please check your browser compatibility.");
      return;
    }
    
    // Ensure we have camera permission before proceeding
    if (cameraPermission !== "granted") {
      const permissionGranted = await requestCameraAccess();
      if (!permissionGranted) return;
    }
    
    // Set states in a single batch to avoid race conditions
    setSelectedShotId(shotId);
    setViewState("camera");
    setCapturedVideoUrl(null);
    
    // Reset recording state
    setRecording(false);
    setRecordingTimer(0);
    recordedChunks.current = [];
  }, [ffmpegLoaded, cameraPermission, requestCameraAccess]);
  
  // Start recording
  const handleStartRecording = useCallback(() => {
    // Safety checks
    if (!webcamRef.current || !webcamRef.current.stream) {
      toast.error("Camera stream not available. Please refresh and try again.");
      return;
    }
    
    try {
      // Clear any previous recording data
      recordedChunks.current = [];
      
      // Set recording state
      setRecording(true);
      setRecordingTimer(MAX_RECORDING_TIME);
      
      // Find supported MIME type - try simpler options first
      const mimeTypes = [
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
        'video/webm;codecs=h264',
        ''  // Last fallback: let browser pick
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (!mimeType || MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log(`Using MIME type: ${selectedMimeType || 'default'}`);
          break;
        }
      }
      
      // Create and configure MediaRecorder with minimal options
      const options = selectedMimeType ? { mimeType: selectedMimeType, videoBitsPerSecond: 2500000 } : undefined;
      
      try {
        mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream, options);
        console.log("MediaRecorder created successfully with options:", options);
      } catch (err) {
        console.warn("Failed to create MediaRecorder with specified options, trying with default options");
        mediaRecorderRef.current = new MediaRecorder(webcamRef.current.stream);
      }
      
      // Add event listeners with error handling
      mediaRecorderRef.current.addEventListener("dataavailable", (event) => {
        console.log("MediaRecorder data available, size:", event.data?.size || 0);
        if (event.data && event.data.size > 0) {
          recordedChunks.current.push(event.data);
        }
      });
      
      mediaRecorderRef.current.addEventListener("stop", async () => {
        console.log("MediaRecorder stopped, processing...");
        
        // Use a timeout to prevent processing from getting stuck
        const processingTimeout = setTimeout(() => {
          if (processingVideo) {
            setProcessingVideo(false);
            toast.error("Video processing timed out. Please try again.");
            setViewState("camera");
          }
        }, 30000); // 30 second timeout
        
        try {
          await processRecording();
        } catch (error) {
          console.error("Error in processRecording:", error);
        } finally {
          clearTimeout(processingTimeout);
        }
      });
      
      mediaRecorderRef.current.addEventListener("error", (event) => {
        console.error("MediaRecorder error:", event);
        toast.error("Recording error occurred. Please try again.");
        setRecording(false);
      });
      
      // Start recording with shorter timeslice to get more frequent dataavailable events
      mediaRecorderRef.current.start(1000); // 1-second timeslices
      console.log("MediaRecorder started");
      
      // Set up timer to stop recording after MAX_RECORDING_TIME
      recordingTimerRef.current = setInterval(() => {
        setRecordingTimer(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            // Stop recording when timer reaches 0
            clearInterval(recordingTimerRef.current!);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              console.log("Timer reached 0, stopping MediaRecorder");
              mediaRecorderRef.current.stop();
            }
            return 0;
          }
          return newValue;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to start recording: " + (error instanceof Error ? error.message : "Unknown error"));
      setRecording(false);
    }
  }, [processingVideo]);
  
  // Process the recording after it's stopped
  const processRecording = useCallback(async () => {
    setRecording(false);
    setProcessingVideo(true);
    
    try {
      // Validate we have recording data
      if (recordedChunks.current.length === 0) {
        throw new Error("No video data was recorded");
      }
      
      console.log(`Processing ${recordedChunks.current.length} video chunks`);
      
      // Create a blob from the recorded chunks
      const videoBlob = new Blob(recordedChunks.current, { type: "video/webm" });
      
      if (videoBlob.size === 0) {
        throw new Error("Recorded video is empty. Please try again.");
      }
      
      console.log(`Video blob created, size: ${videoBlob.size} bytes`);
      toast.info("Processing video...");
      
      // If the blob is very large, just use it directly without FFmpeg
      if (videoBlob.size > 10 * 1024 * 1024) { // 10MB
        console.log("Video is large, using original without FFmpeg processing");
        const videoUrl = URL.createObjectURL(videoBlob);
        setCapturedVideoUrl(videoUrl);
        setViewState("preview");
        return;
      }
      
      try {
        // Process video with FFmpeg
        const processedVideoBlob = await processVideo(videoBlob, 'output.mp4', 0, MAX_RECORDING_TIME);
        
        // Create URL for preview
        const processedVideoUrl = URL.createObjectURL(processedVideoBlob);
        
        // Update state to show preview
        setCapturedVideoUrl(processedVideoUrl);
        setViewState("preview");
      } catch (ffmpegError) {
        console.error("FFmpeg processing failed, falling back to original video:", ffmpegError);
        toast.warning("Advanced video processing failed. Using original video.");
        
        // Fall back to using the original video if FFmpeg processing fails
        const videoUrl = URL.createObjectURL(videoBlob);
        setCapturedVideoUrl(videoUrl);
        setViewState("preview");
      }
    } catch (error) {
      console.error("Error processing video:", error);
      toast.error(`Failed to process video: ${error instanceof Error ? error.message : "Unknown error"}`);
      
      // Stay in camera view to allow retrying
      setViewState("camera");
    } finally {
      setProcessingVideo(false);
    }
  }, []);
  
  // Save the captured video
  const handleSaveVideo = useCallback(async () => {
    if (!capturedVideoUrl || !selectedShotId || !currentProject) {
      toast.error("Cannot save video: Missing required information");
      return;
    }
    
    try {
      // First, fetch the blob from the URL
      const response = await fetch(capturedVideoUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch video data");
      }
      
      const videoBlob = await response.blob();
      
      // Create a unique video ID
      const videoId = `${currentProject.id}-shot-${selectedShotId}-${Date.now()}`;
      
      // Upload the video to Firebase Storage
      toast.info("Uploading video...");
      const downloadURL = await uploadVideo(videoId, videoBlob);
      
      // Save video URL and ID in the store - using download URL directly
      await updateShot(currentProject.id, selectedShotId, downloadURL, videoId);
      
      toast.success("Video captured and stored successfully!");
      
      // Return to shot list
      setViewState("list");
      setSelectedShotId(null);
      setCapturedVideoUrl(null);
      
      // Clear recorded chunks to free memory
      recordedChunks.current = [];
    } catch (error) {
      console.error("Error saving video:", error);
      toast.error("Failed to save video. Please try again.");
    }
  }, [capturedVideoUrl, selectedShotId, currentProject, updateShot]);
  
  // Retake the video
  const handleRetake = useCallback(() => {
    // Go back to camera view but keep the selected shot
    setCapturedVideoUrl(null);
    setViewState("camera");
    setRecording(false);
    setRecordingTimer(0);
    recordedChunks.current = [];
  }, []);
  
  // Close camera and return to list
  const handleCloseCamera = useCallback(() => {
    // Clean up all state
    setViewState("list");
    setSelectedShotId(null);
    setCapturedVideoUrl(null);
    setRecording(false);
    setRecordingTimer(0);
    recordedChunks.current = [];
    
    // Stop any active media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error("Error stopping MediaRecorder:", err);
      }
    }
    
    // Clear any active timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  }, []);
  
  // Calculate progress for the progress bar
  const calculateProgress = useCallback(() => {
    if (!currentProject) return 0;
    const completedShots = currentProject.shots.filter(shot => shot.completed).length;
    return Math.floor((completedShots / currentProject.shots.length) * 100);
  }, [currentProject]);

  // Camera constraints for portrait mode
  const videoConstraints = {
    width: { ideal: 1080 },
    height: { ideal: 1920 },
    facingMode: "environment", // Use back camera on mobile devices
    aspectRatio: 9/16 // Portrait mode (9:16)
  };

  // Retry loading FFmpeg
  const retryFFmpegLoad = useCallback(async () => {
    setFfmpegLoading(true);
    setFfmpegError(null);
    try {
      await initFFmpeg();
      setFfmpegLoaded(true);
      toast.success("Video processing loaded successfully!");
    } catch (error) {
      console.error("FFmpeg retry error:", error);
      setFfmpegError(error instanceof Error ? error.message : "Failed to load video processing capabilities");
      toast.error("Failed to initialize video processing. Please try again later.");
    } finally {
      setFfmpegLoading(false);
    }
  }, []);

  // Return null if no project
  if (!currentProject) return null;
  
  // Show loading state while FFmpeg is loading
  if (ffmpegLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="flex items-center space-x-2 mb-4">
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium">Loading video processing capabilities...</span>
        </div>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          This may take a moment. We're setting up the video recording and processing features.
        </p>
      </div>
    );
  }
  
  // Show error state for FFmpeg
  if (ffmpegError) {
    return <FFmpegFallback error={ffmpegError} onRetry={retryFFmpegLoad} />;
  }
  
  // Show camera permission request UI
  if (cameraPermission === "denied" as CameraPermissionState) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.5 8h-5v5h5v-5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.5 11.5V11h-1v.5h1z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 16a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-9z" />
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" />
          </svg>
          <h2 className="text-2xl font-bold mb-2">Camera Access Required</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            This app needs access to your camera to capture videos. Please allow camera access in your browser settings and then click the button below.
          </p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            <strong>How to enable camera access:</strong><br />
            1. Click the camera or lock icon in your browser's address bar<br />
            2. Select "Allow" for camera access<br />
            3. Reload the page or click the button below
          </p>
          <Button 
            onClick={requestCameraAccess} 
            disabled={isCameraLoading}
            className="mx-auto"
          >
            {isCameraLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Requesting Access...
              </>
            ) : "Request Camera Access"}
          </Button>
        </div>
      </div>
    );
  }

  // CAMERA VIEW
  if (viewState === "camera") {
    const selectedShot = currentProject.shots.find(shot => shot.id === selectedShotId);
    
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="flex justify-between items-center w-full">
          <Button variant="ghost" onClick={handleCloseCamera} className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to shots
          </Button>
          <h3 className="font-medium">{selectedShot?.angle || "Capture Shot"}</h3>
          <div className="w-[100px]"></div> {/* Spacer for alignment */}
        </div>
        
        <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg aspect-[9/16]">
          <Webcam
            audio={false}
            ref={webcamRef}
            videoConstraints={videoConstraints}
            className="w-full h-full object-cover"
            onUserMediaError={(error) => {
              console.error("Camera access error:", error);
              toast.error("Failed to access camera. Please check permissions.");
              handleCloseCamera();
              setCameraPermission("denied");
            }}
            mirrored={false}
            screenshotFormat="image/jpeg"
          />
          
          {recording && (
            <div className="absolute top-4 left-0 w-full flex justify-center">
              <div className="bg-black/70 text-white px-4 py-2 rounded-full flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse"></div>
                <span>Recording: {recordingTimer}s</span>
              </div>
            </div>
          )}
          
          {processingVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-white text-center">
                <svg className="animate-spin h-8 w-8 text-white mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing video...
              </div>
            </div>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {selectedShot?.description || "Position your camera and press Record when ready"}
        </p>
        
        <Button 
          onClick={handleStartRecording}
          disabled={recording || processingVideo}
          className="w-full max-w-sm"
          size="lg"
        >
          {recording ? "Recording..." : "Record"}
        </Button>
        
        {/* Debug button - only visible in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 w-full max-w-sm">
            <details className="text-xs bg-muted p-2 rounded">
              <summary className="cursor-pointer font-medium">Debug Options</summary>
              <div className="mt-2 space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    try {
                      // Create a simple test video using canvas
                      const canvas = document.createElement('canvas');
                      canvas.width = 320;
                      canvas.height = 240;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.fillStyle = 'red';
                        ctx.fillRect(0, 0, 320, 240);
                        
                        // Convert canvas to Blob
                        const blob = await new Promise<Blob | null>(resolve => {
                          canvas.toBlob(resolve, 'image/png');
                        });
                        
                        if (blob) {
                          console.log("Created test blob, size:", blob.size);
                          toast.info("Testing with placeholder video...");
                          
                          // Use the blob directly
                          recordedChunks.current = [blob];
                          await processRecording();
                        }
                      }
                    } catch (error) {
                      console.error("Test video error:", error);
                      toast.error("Test video failed: " + (error instanceof Error ? error.message : "Unknown error"));
                    }
                  }}
                >
                  Test With Simple Image
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    toast.info("Reinitializing FFmpeg...");
                    try {
                      await initFFmpeg();
                      toast.success("FFmpeg reinitialized successfully");
                    } catch (error) {
                      console.error("FFmpeg reinit error:", error);
                      toast.error("Failed to reinitialize FFmpeg: " + (error instanceof Error ? error.message : "Unknown error"));
                    }
                  }}
                >
                  Reinitialize FFmpeg
                </Button>
                <div className="mt-2 p-2 bg-black/10 rounded text-xs">
                  <p>Debug Info:</p>
                  <p>• FFmpeg loaded: {ffmpegLoaded ? "Yes" : "No"}</p>
                  <p>• Camera permission: {cameraPermission}</p>
                  <p>• WebM supported: {MediaRecorder.isTypeSupported('video/webm') ? "Yes" : "No"}</p>
                  <p>• MP4 supported: {MediaRecorder.isTypeSupported('video/mp4') ? "Yes" : "No"}</p>
                  <p>• SharedArrayBuffer: {typeof SharedArrayBuffer !== 'undefined' ? "Supported" : "Not supported"}</p>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    );
  }
  
  // PREVIEW VIEW
  if (viewState === "preview") {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="flex justify-between items-center w-full">
          <Button variant="ghost" onClick={handleCloseCamera} className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Cancel
          </Button>
          <h3 className="font-medium">Review Capture</h3>
          <div className="w-[100px]"></div> {/* Spacer for alignment */}
        </div>
        
        <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg aspect-[9/16]">
          {capturedVideoUrl && (
            <video 
              src={capturedVideoUrl} 
              className="w-full h-full object-cover"
              controls
              autoPlay
              loop
            />
          )}
        </div>
        
        <div className="flex w-full max-w-sm gap-2">
          <Button 
            onClick={handleRetake} 
            variant="outline"
            className="flex-1"
          >
            Retake
          </Button>
          <Button 
            onClick={handleSaveVideo}
            className="flex-1"
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  // LIST VIEW (default)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Video Capture</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentProject.shots.filter(shot => shot.completed).length} of {currentProject.shots.length} complete
          </span>
          <Progress value={calculateProgress()} className="w-24" />
        </div>
      </div>
      
      {/* Camera status indicator */}
      <div className="flex items-center justify-center gap-2 py-2">
        <div className={`w-3 h-3 rounded-full ${
          cameraPermission === "granted" ? "bg-green-500" : 
          cameraPermission === "prompt" ? "bg-yellow-500" : 
          "bg-gray-500"
        }`}></div>
        <span className="text-sm">
          {cameraPermission === "granted" ? "Camera Ready" : 
           cameraPermission === "prompt" ? "Camera Permission Needed" : 
           cameraPermission === "denied" ? "Camera Denied" : 
           "Camera Status Unknown"}
        </span>
        {cameraPermission !== "granted" && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={requestCameraAccess}
            disabled={isCameraLoading}
            className="ml-2"
          >
            {isCameraLoading ? "Requesting..." : "Grant Access"}
          </Button>
        )}
      </div>
      
      {/* Shot list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {currentProject.shots.map((shot) => (
          <Card key={shot.id} className={`${shot.completed ? 'border-green-500' : ''}`}>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>{shot.angle}</span>
                {shot.completed && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{shot.description}</p>
              
              {shot.videoUrl && (
                <div className="mb-4 aspect-[9/16] overflow-hidden rounded-md">
                  <video 
                    src={shot.videoUrl} 
                    className="w-full h-full object-cover"
                    controls
                  />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => handleOpenCamera(shot.id)}
                disabled={processingVideo || cameraPermission === "denied" as CameraPermissionState}
                variant={shot.completed ? "outline" : "default"}
                className="w-full"
              >
                {shot.completed ? "Reshoot" : "Capture"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 