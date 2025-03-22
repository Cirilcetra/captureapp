"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { uploadVideo } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

interface VideoCaptureProps {
  onAllCapturesComplete: () => void;
}

export default function VideoCapture({ onAllCapturesComplete }: VideoCaptureProps) {
  const { currentProject, updateShot } = useAppStore();
  const [processingVideo, setProcessingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  
  // Check if all captures are complete
  useEffect(() => {
    if (!currentProject) return;
    
    const allShotsCompleted = currentProject.shots.every(shot => shot.completed);
    if (allShotsCompleted) {
      onAllCapturesComplete();
    }
  }, [currentProject, onAllCapturesComplete]);
  
  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedShotId || !currentProject) {
      return;
    }

    // Validate file type
    if (!file.type.match(/^video\/(webm|mp4|quicktime)$/)) {
      toast.error("Please select a WebM, MP4, or MOV video file");
      return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File size too large (max 100MB)");
      return;
    }
    
    setProcessingVideo(true);
    setUploadProgress(0);
    try {
      // Create a unique video ID
      const videoId = `${currentProject.id}-shot-${selectedShotId}-${Date.now()}`;
      
      // Upload the video to Firebase Storage
      toast.info("Uploading video...");
      const downloadURL = await uploadVideo(videoId, file, 'video', (progress) => {
        setUploadProgress(progress);
      });
      
      // Save video URL and ID in the store
      await updateShot(currentProject.id, selectedShotId, downloadURL, videoId);
      
      toast.success("Video captured and stored successfully!");
      setSelectedShotId(null);
    } catch (error) {
      console.error("Error saving video:", error);
      toast.error("Failed to save video. Please try again.");
    } finally {
      setProcessingVideo(false);
      setUploadProgress(0);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Calculate progress for the progress bar
  const calculateProgress = useCallback(() => {
    if (!currentProject) return 0;
    const completedShots = currentProject.shots.filter(shot => shot.completed).length;
    return Math.floor((completedShots / currentProject.shots.length) * 100);
  }, [currentProject]);

  // Return null if no project
  if (!currentProject) return null;

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

      <input
        type="file"
        accept="video/webm,video/mp4,video/quicktime"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />
      
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

              {/* Show upload progress when processing */}
              {processingVideo && selectedShotId === shot.id && uploadProgress > 0 && (
                <div className="mb-4 space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-center text-muted-foreground">
                    Uploading... {uploadProgress.toFixed(0)}%
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => {
                  setSelectedShotId(shot.id);
                  fileInputRef.current?.click();
                }}
                disabled={processingVideo}
                variant={shot.completed ? "outline" : "default"}
                className="w-full"
              >
                {processingVideo && selectedShotId === shot.id ? (
                  <span className="flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  shot.completed ? "Reshoot" : "Capture"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
} 