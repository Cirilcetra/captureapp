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

export default function Home() {
  const { getUserProjects, currentProject, setCurrentProject } = useAppStore();
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user projects from Firestore when authenticated
  useEffect(() => {
    async function loadFirestoreProjects() {
      if (user) {
        setIsLoading(true);
        try {
          // Get projects from Firestore
          await fetchFirestoreProjects();
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
  }, [user]);

  // Get only the projects for the current user
  const userProjects = getUserProjects();

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-6 px-4 sm:px-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your projects...</p>
              </div>
            </div>
          ) : userProjects.length > 0 ? (
            <ProjectSelector 
              projects={userProjects} 
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
