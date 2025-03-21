"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { getAvailableVoices, generateNarration, Voice } from "@/lib/api-client";
import { uploadVideo } from "@/lib/firebase";
import { combineVideosServer, addAudioToVideoServer } from "@/lib/api-client";
import { Loader2, RefreshCw, Play, Pause } from "lucide-react";

export default function FinalPreview() {
  const { currentProject, setFinalVideo, completeProject, setNarrationUrl } = useAppStore();
  const [processing, setProcessing] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [combiningVideos, setCombiningVideos] = useState(false);
  const [combineProgress, setCombineProgress] = useState(0);
  const [combineStage, setCombineStage] = useState('');
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioStage, setAudioStage] = useState('');
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [combinedVideoUrl, setCombinedVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Load available voices and set initial state
  useEffect(() => {
    loadVoices();
    // Set combined video URL if it exists in the project
    if (currentProject?.finalVideoUrl) {
      setCombinedVideoUrl(currentProject.finalVideoUrl);
    }
  }, [currentProject]);
  
  const loadVoices = async () => {
    try {
      const voices = await getAvailableVoices();
      setAvailableVoices(voices);
      if (voices.length > 0) {
        setSelectedVoiceId(voices[0].voice_id);
      }
    } catch (error) {
      console.error("Error loading voices:", error);
      toast.error("Failed to load available voices");
    }
  };

  const handleCombineVideos = async () => {
    if (!currentProject?.shots || currentProject.shots.length === 0) {
      toast.error("No videos to combine");
      return;
    }

    // Filter out shots without videoUrl
    const validShots = currentProject.shots.filter(shot => shot.videoUrl);
    if (validShots.length === 0) {
      toast.error("No valid videos found to combine");
      return;
    }

    try {
      setCombiningVideos(true);
      setCombineProgress(0);
      setCombineStage('Starting video combination...');

      const videoUrls = validShots.map(shot => shot.videoUrl!);
      
      // Step 1: Combine videos with muted audio
      const combinedUrl = await combineVideosServer(
        currentProject.id,
        videoUrls,
        (progress, stage) => {
          setCombineProgress(progress);
          setCombineStage(`Combining videos: ${stage}`);
        },
        true  // mute original audio
      );

      // Step 2: If narration exists, add it to the combined video immediately
      if (currentProject.narrationUrl) {
        setCombineStage('Adding narration to video...');
        setCombineProgress(0);

        const finalVideoUrl = await addAudioToVideoServer(
          currentProject.id,
          combinedUrl,
          currentProject.narrationUrl,
          (progress, stage) => {
            setCombineProgress(progress);
            setCombineStage(`Adding narration: ${stage}`);
          }
        );

        // Save the final video URL and update preview
        const finalVideoId = `${currentProject.id}-final`;
        await setFinalVideo(currentProject.id, finalVideoUrl, finalVideoId);
        await completeProject(currentProject.id);
        setCombinedVideoUrl(finalVideoUrl);
        
        toast.success("Videos combined with narration successfully!");
      } else {
        // If no narration, save and show the muted combined video
        const finalVideoId = `${currentProject.id}-final`;
        await setFinalVideo(currentProject.id, combinedUrl, finalVideoId);
        await completeProject(currentProject.id);
        setCombinedVideoUrl(combinedUrl);
        toast.success("Videos combined successfully!");
      }
    } catch (error) {
      console.error("Error in video processing:", error);
      toast.error("Failed to process videos: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setCombiningVideos(false);
      setCombineProgress(0);
      setCombineStage('');
    }
  };
  
  const handleGenerateNarration = async () => {
    if (!currentProject?.generatedScript || !selectedVoiceId) {
      toast.error("Please generate a script first and select a voice");
      return;
    }

    setGeneratingAudio(true);
    setAudioProgress(0);
    setAudioStage('Generating narration...');

    try {
      // Generate narration using backend API
      const audioBlob = await generateNarration({
        script: currentProject.generatedScript,
        voice_id: selectedVoiceId
      });

      // Upload audio to Firebase
      const audioId = `${currentProject.id}-narration`;
      const audioUrl = await uploadVideo(audioId, audioBlob, 'narration');
      
      // Save narration URL
      await setNarrationUrl(currentProject.id, audioUrl);
      setAudioBlob(audioBlob);
      
      toast.success("Narration generated successfully!");
    } catch (error) {
      console.error("Error generating narration:", error);
      toast.error("Failed to generate narration");
    } finally {
      setGeneratingAudio(false);
    }
  };
  
  const handleAddAudioToVideo = async () => {
    if (!currentProject || !combinedVideoUrl || !currentProject.narrationUrl) {
      toast.error("Please combine videos and generate narration first");
      return;
    }

    setProcessing(true);
    setAudioProgress(0);
    setAudioStage('Starting...');

    try {
      // Add narration to muted video
      const finalVideoUrl = await addAudioToVideoServer(
        currentProject.id,
        combinedVideoUrl,
        currentProject.narrationUrl,
        (progress, stage) => {
          setAudioProgress(progress);
          setAudioStage(stage);
        }
      );

      // Save and update preview with the final video
      const finalVideoId = `${currentProject.id}-final`;
      await setFinalVideo(currentProject.id, finalVideoUrl, finalVideoId);
      await completeProject(currentProject.id);
      setCombinedVideoUrl(finalVideoUrl);
      
      toast.success("Narration added successfully!");
    } catch (error) {
      console.error("Error adding audio:", error);
      toast.error("Failed to add narration to video");
    } finally {
      setProcessing(false);
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  if (!currentProject) return null;
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Final Video Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video preview */}
          {combinedVideoUrl && (
            <div className="space-y-2">
              <video
                ref={videoRef}
                src={combinedVideoUrl}
                controls
                className="w-full rounded-lg"
                muted={!!currentProject?.narrationUrl} // Mute if narration exists
              />
              <Button
                onClick={handleCombineVideos}
                variant="outline"
                className="w-full"
                disabled={combiningVideos}
              >
                {combiningVideos ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {combineStage} ({combineProgress}%)
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recombine {currentProject.narrationUrl ? 'Video with Narration' : 'Videos'}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Initial combine button if no combined video exists */}
          {!combinedVideoUrl && (
            <Button
              onClick={handleCombineVideos}
              disabled={combiningVideos}
              className="w-full"
            >
              {combiningVideos ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {combineStage} ({combineProgress}%)
                </>
              ) : (
                "Combine Videos"
              )}
            </Button>
          )}

          {/* Narration section */}
          {combinedVideoUrl && (
            <div className="space-y-4">
              {currentProject.narrationUrl ? (
                // Audio player for existing narration
                <div className="space-y-2">
                  <audio
                    ref={audioRef}
                    src={currentProject.narrationUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                  <Button
                    onClick={toggleAudioPlayback}
                    variant="outline"
                    className="w-full"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Narration
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Play Narration
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleGenerateNarration}
                    variant="outline"
                    disabled={generatingAudio}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Narration
                  </Button>
                </div>
              ) : (
                // Narration generation controls
                <div className="space-y-2">
                  <select
                    value={selectedVoiceId}
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                    className="w-full p-2 rounded border"
                  >
                    {availableVoices.map((voice) => (
                      <option key={voice.voice_id} value={voice.voice_id}>
                        {voice.name}
                      </option>
                    ))}
                  </select>

                  <Button
                    onClick={handleGenerateNarration}
                    disabled={generatingAudio || !currentProject.generatedScript}
                    className="w-full"
                  >
                    {generatingAudio ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {audioStage} ({audioProgress}%)
                      </>
                    ) : (
                      "Generate Narration"
                    )}
                  </Button>
                </div>
              )}

              {/* Add audio button - only show if we have both video and narration but no final video */}
              {combinedVideoUrl && currentProject.narrationUrl && !currentProject.finalVideoUrl && (
                <Button
                  onClick={handleAddAudioToVideo}
                  disabled={processing}
                  className="w-full"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {audioStage} ({audioProgress}%)
                    </>
                  ) : (
                    "Add Narration to Video"
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 