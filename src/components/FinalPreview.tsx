"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { combineVideos, addAudioToVideo, initFFmpeg } from "@/lib/video-processor";
import { generateNarration, getAvailableVoices, Voice } from "@/lib/elevenlabs";
import FFmpegFallback from "./FFmpegFallback";
import { uploadVideo } from "@/lib/firebase";

export default function FinalPreview() {
  const { currentProject, setFinalVideo, completeProject } = useAppStore();
  const [processing, setProcessing] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [combiningVideos, setCombiningVideos] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [combinedVideoBlob, setCombinedVideoBlob] = useState<Blob | null>(null);
  const [combinedVideoUrl, setCombinedVideoUrl] = useState<string | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(true);
  const [ffmpegError, setFfmpegError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Initialize FFmpeg when component mounts
  useEffect(() => {
    const loadFFmpeg = async () => {
      setFfmpegLoading(true);
      try {
        console.log("Starting FFmpeg initialization in FinalPreview...");
        await initFFmpeg();
        console.log("FFmpeg initialized successfully in FinalPreview");
        setFfmpegLoaded(true);
        setFfmpegError(null);
        setDebugInfo(prev => prev + "\nFFmpeg loaded successfully");
      } catch (error) {
        console.error("FFmpeg loading error:", error);
        setFfmpegError(error instanceof Error ? error.message : "Failed to load video processing capabilities");
        toast.error("Failed to initialize video processing. Some features may not work.");
        setDebugInfo(prev => prev + `\nFFmpeg error: ${error}`);
      } finally {
        setFfmpegLoading(false);
      }
    };
    
    loadFFmpeg();
  }, []);
  
  // Load available voices from ElevenLabs
  useEffect(() => {
    const loadVoices = async () => {
      try {
        console.log("Loading voices from ElevenLabs...");
        const voices = await getAvailableVoices();
        console.log("Voices loaded:", voices);
        setAvailableVoices(voices);
        if (voices.length > 0) {
          setSelectedVoiceId(voices[0].voice_id);
        }
      } catch (error) {
        console.error("Error loading voices:", error);
        toast.error("Failed to load available voices. Please try again.");
      }
    };
    
    loadVoices();
  }, []);
  
  // Generate audio narration from script
  const handleGenerateAudio = async () => {
    if (!currentProject || !currentProject.generatedScript) {
      toast.error("No script available for audio generation");
      return;
    }
    
    setGeneratingAudio(true);
    setDebugInfo(prev => prev + "\nStarting audio generation");
    
    try {
      console.log("Generating narration with voice ID:", selectedVoiceId);
      const narrationBlob = await generateNarration(
        currentProject.generatedScript,
        { voiceId: selectedVoiceId }
      );
      
      console.log("Narration generated, blob size:", narrationBlob.size);
      setDebugInfo(prev => prev + `\nAudio narration generated: ${narrationBlob.size} bytes`);
      
      setAudioBlob(narrationBlob);
      toast.success("Audio narration generated!");
      
      // Create an audio element to play the narration
      const audioUrl = URL.createObjectURL(narrationBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error("Error generating narration:", error);
      setDebugInfo(prev => prev + `\nError generating narration: ${error}`);
      toast.error("Failed to generate audio narration. Please try again.");
    } finally {
      setGeneratingAudio(false);
    }
  };
  
  // Combine all videos into one
  const handleCombineVideos = async () => {
    if (!currentProject || !ffmpegLoaded) {
      toast.error("Project or video processing engine not available");
      return;
    }
    
    const shotsWithVideos = currentProject.shots.filter(shot => shot.videoUrl);
    
    if (shotsWithVideos.length !== currentProject.shots.length) {
      toast.error("Not all videos have been captured");
      setDebugInfo(prev => prev + "\nCannot combine videos: not all shots have been captured");
      return;
    }
    
    setCombiningVideos(true);
    setDebugInfo(prev => prev + "\nStarting video combination process");
    
    try {
      console.log("Starting to fetch video blobs");
      
      // Fetch all video blobs from Firebase URLs
      const videoBlobs: Blob[] = await Promise.all(
        shotsWithVideos.map(async (shot, index) => {
          console.log(`Processing video #${index + 1}`);
          try {
            if (!shot.videoUrl) {
              throw new Error(`Missing video URL for shot #${index + 1}`);
            }
            
            // Fetch from Firebase URL
            const response = await fetch(shot.videoUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch video #${index + 1}: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            
            console.log(`Video #${index + 1} fetched, size:`, blob.size);
            setDebugInfo(prev => prev + `\nFetched video #${index + 1}: ${blob.size} bytes`);
            return blob;
          } catch (error) {
            console.error(`Error preparing video #${index + 1}:`, error);
            setDebugInfo(prev => prev + `\nError preparing video #${index + 1}: ${error}`);
            throw error;
          }
        })
      );
      
      console.log("All video blobs prepared, starting combination", videoBlobs);
      setDebugInfo(prev => prev + `\nCombining ${videoBlobs.length} videos`);
      
      if (videoBlobs.some(blob => blob.size === 0)) {
        throw new Error("One or more videos are empty. Please recapture them.");
      }
      
      // Combine the videos
      toast.info("Combining videos... This may take a moment.");
      const combinedBlob = await combineVideos(videoBlobs);
      console.log("Videos combined successfully, combined size:", combinedBlob.size);
      setDebugInfo(prev => prev + `\nVideos combined: ${combinedBlob.size} bytes`);
      
      setCombinedVideoBlob(combinedBlob);
      
      // Create URL for video preview
      const url = URL.createObjectURL(combinedBlob);
      setCombinedVideoUrl(url);
      
      toast.success("Videos combined successfully!");
      
      // Set the video source
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.load();
      }
    } catch (error) {
      console.error("Error combining videos:", error);
      setDebugInfo(prev => prev + `\nError combining videos: ${error}`);
      toast.error(`Failed to combine videos: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setCombiningVideos(false);
    }
  };
  
  // Add audio narration to the combined video
  const handleAddAudioToVideo = async () => {
    if (!combinedVideoBlob || !audioBlob || !currentProject || !ffmpegLoaded) {
      toast.error("Missing video, audio, or video processing for final production");
      return;
    }
    
    setProcessing(true);
    setDebugInfo(prev => prev + "\nStarting to add audio to video");
    
    try {
      console.log("Adding audio to video");
      toast.info("Creating final video... This may take a minute.");
      
      const finalVideoBlob = await addAudioToVideo(combinedVideoBlob, audioBlob);
      console.log("Audio added to video, final size:", finalVideoBlob.size);
      setDebugInfo(prev => prev + `\nFinal video created: ${finalVideoBlob.size} bytes`);
      
      // Upload final video to Firebase Storage
      const finalVideoId = `${currentProject.id}-final-${Date.now()}`;
      toast.info("Uploading final video...");
      const downloadURL = await uploadVideo(finalVideoId, finalVideoBlob);
      
      // Update the store with the Firebase download URL and ID
      setFinalVideo(currentProject.id, downloadURL, finalVideoId);
      completeProject(currentProject.id);
      
      toast.success("Final video created and stored successfully!");
      
      // Set the video source to the Firebase URL
      if (videoRef.current) {
        videoRef.current.src = downloadURL;
        videoRef.current.load();
      }
      
      // Also keep a local reference for immediate playback
      setCombinedVideoUrl(downloadURL);
    } catch (error) {
      console.error("Error adding audio to video:", error);
      setDebugInfo(prev => prev + `\nError adding audio to video: ${error}`);
      toast.error(`Failed to create final video: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setProcessing(false);
    }
  };
  
  // Download the final video
  const handleDownload = () => {
    if (!currentProject?.finalVideoUrl) {
      toast.error("No final video available for download");
      return;
    }
    
    const a = document.createElement("a");
    a.href = currentProject.finalVideoUrl;
    a.download = `${currentProject.carId.replace(/\s+/g, "-")}-promo.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  const retryFFmpegLoad = async () => {
    setFfmpegLoading(true);
    setFfmpegError(null);
    setDebugInfo(prev => prev + "\nRetrying FFmpeg load");
    try {
      await initFFmpeg();
      setFfmpegLoaded(true);
      toast.success("Video processing loaded successfully!");
      setDebugInfo(prev => prev + "\nFFmpeg retry successful");
    } catch (error) {
      console.error("FFmpeg retry error:", error);
      setFfmpegError(error instanceof Error ? error.message : "Failed to load video processing capabilities");
      toast.error("Failed to initialize video processing. Please try again later.");
      setDebugInfo(prev => prev + `\nFFmpeg retry failed: ${error}`);
    } finally {
      setFfmpegLoading(false);
    }
  };

  if (!currentProject || !currentProject.generatedScript) return null;
  
  // Show loading state
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
          This may take a moment. We're setting up the video processing features for your final video.
        </p>
      </div>
    );
  }
  
  // Show error state
  if (ffmpegError) {
    return <FFmpegFallback error={ffmpegError} onRetry={retryFFmpegLoad} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Final Preview</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Script and Voice Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Script and Narration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-md max-h-64 overflow-y-auto whitespace-pre-wrap">
              {currentProject.generatedScript}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Voice:
              </label>
              <select 
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                disabled={generatingAudio || availableVoices.length === 0}
              >
                {availableVoices.length > 0 ? (
                  availableVoices.map((voice) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name}
                    </option>
                  ))
                ) : (
                  <option value="">Loading voices...</option>
                )}
              </select>
            </div>
            
            <Button 
              onClick={handleGenerateAudio} 
              className="w-full"
              disabled={generatingAudio || !selectedVoiceId}
            >
              {generatingAudio ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Audio...
                </>
              ) : audioBlob ? 'Regenerate Audio Narration' : 'Generate Audio Narration'}
            </Button>
          </CardContent>
        </Card>
        
        {/* Video Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Video Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden flex items-center justify-center">
              {combinedVideoUrl || currentProject.finalVideoUrl ? (
                <video 
                  ref={videoRef}
                  className="w-full h-full" 
                  controls 
                  src={currentProject.finalVideoUrl || combinedVideoUrl || undefined}
                  onError={(e) => {
                    console.error("Video playback error:", e);
                    setDebugInfo(prev => prev + "\nVideo playback error");
                    toast.error("Error playing video. The file may be corrupted.");
                  }}
                />
              ) : (
                <div className="text-white text-center p-4">
                  <p>No preview available yet</p>
                  <p className="text-sm text-gray-400 mt-2">Combine your videos to see a preview</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                onClick={handleCombineVideos} 
                variant="outline"
                className="w-full"
                disabled={combiningVideos || !ffmpegLoaded}
              >
                {combiningVideos ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Combining Videos...
                  </>
                ) : combinedVideoBlob ? 'Recombine Videos' : 'Combine Videos'}
              </Button>
              
              <Button 
                onClick={handleAddAudioToVideo} 
                className="w-full"
                disabled={processing || !combinedVideoBlob || !audioBlob || !ffmpegLoaded}
              >
                {processing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Final Video...
                  </>
                ) : 'Create Final Video with Narration'}
              </Button>
              
              {currentProject.finalVideoUrl && (
                <Button 
                  onClick={handleDownload}
                  variant="secondary"
                  className="w-full"
                >
                  Download Final Video
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Debug info (only visible in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-48">
              {debugInfo || "No debug information available"}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 