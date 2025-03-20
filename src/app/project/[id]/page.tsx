"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Link from "next/link";
import { useParams } from "next/navigation";

// Dynamic imports for components that use FFmpeg
import dynamic from 'next/dynamic';

// Dynamically import components that depend on browser APIs
const VideoCapture = dynamic(() => import('@/components/VideoCapture'), { 
  ssr: false,
  loading: () => <div className="p-8 text-center">Loading video capture component...</div>
});

const ScriptGeneration = dynamic(() => import('@/components/ScriptGeneration'), {
  ssr: false,
  loading: () => <div className="p-8 text-center">Loading script generation component...</div>
});

const FinalPreview = dynamic(() => import('@/components/FinalPreview'), {
  ssr: false,
  loading: () => <div className="p-8 text-center">Loading final preview component...</div>
});

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { projects, setCurrentProject, currentProject } = useAppStore();
  const [activeTab, setActiveTab] = useState("capture");
  const [loading, setLoading] = useState(true);

  // Load current project based on URL param
  useEffect(() => {
    const projectExists = projects.some(p => p.id === projectId);
    
    if (!projectExists) {
      toast.error("Project not found");
      router.push("/");
      return;
    }
    
    setCurrentProject(projectId);
    setLoading(false);
  }, [projectId, projects, setCurrentProject, router]);

  // Determine if we can move to the script tab
  const canAccessScriptTab = () => {
    if (!currentProject) return false;
    const completedShots = currentProject.shots.filter(shot => shot.completed).length;
    return completedShots === currentProject.shots.length;
  };
  
  // Determine if we can move to the preview tab
  const canAccessPreviewTab = () => {
    if (!currentProject) return false;
    return Boolean(currentProject.generatedScript);
  };

  // Check conditions and control tab access
  const handleTabChange = (value: string) => {
    if (value === "script" && !canAccessScriptTab()) {
      toast.error("Please complete all video captures first");
      return;
    }
    
    if (value === "preview" && !canAccessPreviewTab()) {
      toast.error("Please generate a script first");
      return;
    }
    
    setActiveTab(value);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Loading project...</h2>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="container mx-auto px-4 py-6 flex items-center justify-center h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Project Not Found</CardTitle>
            <CardDescription>
              The project you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/" className="w-full">
              <Button className="w-full">Return to Home</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{currentProject.carId}</h1>
          <p className="text-muted-foreground mt-1">
            {new Date(currentProject.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="capture">1. Capture Videos</TabsTrigger>
          <TabsTrigger 
            value="script" 
            disabled={!canAccessScriptTab()}
          >
            2. Generate Script
          </TabsTrigger>
          <TabsTrigger 
            value="preview" 
            disabled={!canAccessPreviewTab()}
          >
            3. Final Preview
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="capture" className="mt-6">
          <VideoCapture 
            onAllCapturesComplete={() => handleTabChange("script")}
          />
        </TabsContent>
        
        <TabsContent value="script" className="mt-6">
          <ScriptGeneration
            onScriptGenerated={() => handleTabChange("preview")}
          />
        </TabsContent>
        
        <TabsContent value="preview" className="mt-6">
          <FinalPreview />
        </TabsContent>
      </Tabs>
    </div>
  );
} 