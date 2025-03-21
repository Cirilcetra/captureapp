"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { combineVideos, addAudioToVideo } from "@/lib/video-processor";
import { generateNarration, getAvailableVoices, Voice } from "@/lib/elevenlabs";
import { uploadVideo } from "@/lib/firebase";

export default function FinalPreview() {
  const { currentProject, setFinalVideo, completeProject, setNarrationUrl } = useAppStore();
  const [processing, setProcessing] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [combiningVideos, setCombiningVideos] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [combinedVideoBlob, setCombinedVideoBlob] = useState<Blob | null>(null);
  const [combinedVideoUrl, setCombinedVideoUrl] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
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
  
  // Show audio player if narration exists
  const renderAudioSection = () => {
    if (!currentProject) return null;

    if (currentProject.narrationUrl) {
      return (
        <div className="space-y-2">
          <label className="text-sm font-medium">Generated Narration</label>
          <audio 
            ref={audioRef}
            src={currentProject.narrationUrl} 
            controls 
            className="w-full"
            onError={() => {
              toast.error("Failed to load audio narration");
            }}
          />
        </div>
      );
    }

    return (
      <>
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Voice</label>
          <select
            value={selectedVoiceId}
            onChange={(e) => setSelectedVoiceId(e.target.value)}
            className="w-full p-2 rounded-md border"
            disabled={generatingAudio}
          >
            {availableVoices.map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>
        
        <Button
          onClick={handleGenerateAudio}
          disabled={!currentProject.generatedScript || generatingAudio}
          className="w-full"
        >
          {generatingAudio ? "Generating Audio..." : "Generate Audio"}
        </Button>
      </>
    );
  };
  
  // Generate audio narration from script
  const handleGenerateAudio = async () => {
    if (!currentProject || !currentProject.generatedScript) {
      toast.error("No script available for audio generation");
      return;
    }

    // If narration already exists, don't generate again
    if (currentProject.narrationUrl) {
      toast.info("Narration already exists");
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
      
      // Upload the narration to Firebase
      const narrationId = `${currentProject.id}-narration-${Date.now()}`;
      const narrationUrl = await uploadVideo(narrationId, narrationBlob, 'narration');
      
      // Save the narration URL to the project
      await setNarrationUrl(currentProject.id, narrationUrl);
      
      setAudioBlob(narrationBlob);
      toast.success("Audio narration generated and saved!");
    } catch (error) {
      console.error("Error generating narration:", error);
      setDebugInfo(prev => prev + `\nError generating narration: ${error}`);
      
      // Show a more helpful error message
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          toast.error("Failed to generate audio: Invalid API key. Please check your ElevenLabs API key in .env.local");
        } else {
          toast.error(`Failed to generate audio: ${error.message}`);
        }
      } else {
        toast.error("Failed to generate audio narration. Please try again.");
      }
    } finally {
      setGeneratingAudio(false);
    }
  };
  
  // Combine all videos into one
  const handleCombineVideos = async () => {
    if (!currentProject) {
      toast.error("Project not available");
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
      
      // Fetch all video blobs from Firebase URLs with proper credentials
      const videoUrls = shotsWithVideos.map(shot => {
        if (!shot.videoUrl) throw new Error("Missing video URL");
        return shot.videoUrl;
      });
      
      // Combine the videos
      toast.info("Combining videos... This may take a moment.");
      const combinedBlob = await combineVideos(videoUrls);
      console.log("Videos combined successfully, combined size:", combinedBlob.size);
      setDebugInfo(prev => prev + `\nVideos combined: ${combinedBlob.size} bytes`);
      
      setCombinedVideoBlob(combinedBlob);
      
      // Create URL for video preview
      const url = URL.createObjectURL(combinedBlob);
      setCombinedVideoUrl(url);
      
      toast.success("Videos combined successfully!");
      
      // Set the video source
      if (videoRef.current) {
        const videoSrc = currentProject.finalVideoUrl || url;
        if (videoSrc) {
          videoRef.current.src = videoSrc;
          videoRef.current.load();
        }
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
    if (!combinedVideoBlob || !audioBlob || !currentProject) {
      toast.error("Missing video, audio, or project for final production");
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
      const downloadURL = await uploadVideo(finalVideoId, finalVideoBlob, 'video');
      
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
  
  // Return null if no project
  if (!currentProject) return null;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Final Preview</h2>
        <div className="flex items-center gap-2">
          {currentProject.finalVideoUrl && (
            <Button onClick={handleDownload} variant="outline">
              Download
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Video Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Video Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[9/16] overflow-hidden rounded-md bg-muted">
              {combinedVideoUrl || currentProject.finalVideoUrl ? (
                <video
                  ref={videoRef}
                  src={combinedVideoUrl || currentProject.finalVideoUrl || undefined}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No video preview available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Production Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderAudioSection()}
            
            <Button
              onClick={handleCombineVideos}
              disabled={combiningVideos || !currentProject?.shots.every(shot => shot.completed)}
              className="w-full"
            >
              {combiningVideos ? "Combining Videos..." : "Combine Videos"}
            </Button>
            
            <Button
              onClick={handleAddAudioToVideo}
              disabled={processing || !combinedVideoBlob || (!audioBlob && !currentProject?.narrationUrl)}
              className="w-full"
            >
              {processing ? "Creating Final Video..." : "Add Audio to Video"}
            </Button>
            
            {/* Debug Info */}
            {process.env.NODE_ENV === 'development' && debugInfo && (
              <div className="mt-4">
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">Debug Info</summary>
                  <pre className="mt-2 p-2 bg-muted rounded whitespace-pre-wrap">
                    {debugInfo}
                  </pre>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 