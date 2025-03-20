"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import Header from '@/components/Header';
import VideoCapture from '@/components/VideoCapture';
import ScriptGeneration from '@/components/ScriptGeneration';
import FinalPreview from '@/components/FinalPreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';

export default function CapturePage() {
  const { currentProject } = useAppStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("capture");
  
  // Use useEffect for navigation to avoid React Router errors
  useEffect(() => {
    if (!currentProject) {
      router.push("/");
    }
  }, [currentProject, router]);
  
  // If no project is selected, return loading UI instead of redirecting during render
  if (!currentProject) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <p>Loading project data...</p>
      </div>
    );
  }

  const handleCaptureComplete = () => {
    setActiveTab("script");
  };

  const handleScriptComplete = () => {
    setActiveTab("preview");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 container py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{currentProject.carId}</h1>
          <div>
            <Button variant="outline" onClick={() => router.push("/")}>
              Exit Project
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="capture">1. Capture Videos</TabsTrigger>
            <TabsTrigger value="script" disabled={!currentProject.shots.some(shot => shot.completed)}>
              2. Generate Script
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!currentProject.generatedScript}>
              3. Final Video
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="capture">
            <VideoCapture onAllCapturesComplete={handleCaptureComplete} />
          </TabsContent>
          
          <TabsContent value="script">
            <ScriptGeneration onScriptGenerated={handleScriptComplete} />
          </TabsContent>
          
          <TabsContent value="preview">
            <FinalPreview />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
} 