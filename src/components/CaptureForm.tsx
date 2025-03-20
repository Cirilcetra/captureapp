"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VideoCapture from '@/components/VideoCapture';
import ScriptGeneration from '@/components/ScriptGeneration';
import FinalPreview from '@/components/FinalPreview';

interface CaptureFormProps {
  onBackToProjects: () => void;
}

export default function CaptureForm({ onBackToProjects }: CaptureFormProps) {
  const { currentProject } = useAppStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("capture");

  if (!currentProject) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No project selected</h2>
        <p className="text-muted-foreground mb-4">Please select or create a project first</p>
        <Button onClick={onBackToProjects}>
          Return to Projects
        </Button>
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
    <div className="w-full">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-xl sm:text-3xl font-bold">{currentProject.carId}</h1>
        <div>
          <Button variant="outline" onClick={onBackToProjects}>
            Exit Project
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="capture" className="text-xs sm:text-sm">1. Capture</TabsTrigger>
          <TabsTrigger 
            value="script" 
            disabled={!currentProject.shots?.some(shot => shot.completed)}
            className="text-xs sm:text-sm"
          >
            2. Script
          </TabsTrigger>
          <TabsTrigger 
            value="preview" 
            disabled={!currentProject.generatedScript}
            className="text-xs sm:text-sm"
          >
            3. Preview
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
    </div>
  );
} 