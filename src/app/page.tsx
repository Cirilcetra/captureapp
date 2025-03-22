"use client";

import { useEffect, useState } from 'react';
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Header from "@/components/Header";
import ProjectSelector from "@/components/ProjectSelector";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getUserProjects as fetchFirestoreProjects } from "@/lib/firestore";
import { toast } from "sonner";
import { CarProject } from '@/lib/store';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export default function Home() {
  const { getUserProjects, currentProject, setCurrentProject } = useAppStore();
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<CarProject[]>([]);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  // Fetch user projects from Firestore when authenticated
  useEffect(() => {
    async function loadFirestoreProjects() {
      if (user) {
        setIsLoading(true);
        try {
          // Get projects from Firestore
          const userProjects = await getUserProjects();
          setProjects(userProjects);
          console.log("Projects loaded from Firestore");
        } catch (error) {
          console.error("Error loading projects from Firestore:", error);
          toast.error("Failed to load your projects. Please refresh the page.");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
    
    loadFirestoreProjects();
  }, [user, getUserProjects]);

  return (
    <ProtectedRoute>
      <div className="min-h-[100dvh] flex flex-col pt-safe">
        <Header />
        <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your projects...</p>
              </div>
            </div>
          ) : projects.length > 0 ? (
            <ProjectSelector 
              projects={projects} 
              onSelectProject={(id) => setCurrentProject(id)}
            />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
