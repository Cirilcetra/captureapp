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
import Header from "@/components/Header";
import dynamic from 'next/dynamic';
import { Camera, FileText, PlayCircle } from "lucide-react";

// Dynamically import browser-dependent components
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
  const { projects, setCurrentProject, currentProject, deleteProject } = useAppStore();
  const [activeTab, setActiveTab] = useState("capture");
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    if (currentProject) {
      // If final video is available, switch to final preview tab
      if (currentProject.finalVideoUrl) {
        setActiveTab("preview");
      }
    }
  }, [currentProject]);

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
    // Check if we can move to the selected tab
    if (value === "script" && !canAccessScriptTab()) {
      toast.error("Please capture all videos first");
      return;
    }
    if (value === "preview" && !canAccessPreviewTab()) {
      toast.error("Please generate the script first");
      return;
    }
    setActiveTab(value);
  };

  const handleDeleteProject = async () => {
    if (!currentProject) return;
    
    try {
      setIsDeleting(true);
      await deleteProject(currentProject.id);
      toast.success("Project deleted successfully");
      router.push("/");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col pt-safe">
        <div className="flex-1 container mx-auto px-4 py-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold">Loading project...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-[100dvh] flex flex-col pt-safe">
        <div className="flex-1 container mx-auto px-4 py-6 flex items-center justify-center">
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
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col pt-safe">
      <Header />
      <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{currentProject.carId}</h1>
            <p className="text-muted-foreground mt-1.5">
              Created on {new Date(currentProject.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" className="shrink-0">
                ← Back to Projects
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="shrink-0"
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
          <TabsList className="w-full">
            <TabsTrigger value="capture" className="flex items-center gap-2 flex-1">
              <Camera className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Capture</span>
            </TabsTrigger>
            <TabsTrigger value="script" className="flex items-center gap-2 flex-1">
              <FileText className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Script</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2 flex-1">
              <PlayCircle className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Preview</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="capture" className="mt-6">
            <VideoCapture 
              onAllCapturesComplete={() => {
                toast.success("All videos captured! You can now proceed to generate the script.");
              }}
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
      </main>
    </div>
  );
} 