"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { getUserProjects } from "@/lib/firestore";
import CaptureForm from "@/components/CaptureForm";
import Header from "@/components/Header";
import LoadingScreen from "@/components/LoadingScreen";
import { toast } from "sonner";

export default function CapturePage() {
  const [isLoading, setIsLoading] = useState(true);
  const { currentProject, getUserProjects, setCurrentProject } = useAppStore();
  const { user } = useAuth();
  const router = useRouter();

  // Check if user is authenticated and has a selected project
  useEffect(() => {
    async function loadData() {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // Load projects from Firestore to ensure we have the latest data
        await getUserProjects();
      } catch (error) {
        console.error("Error loading projects:", error);
        toast.error("Failed to load your project data");
      }

      if (!currentProject) {
        // Redirect to home if no project is selected
        router.push("/");
        return;
      }

      setIsLoading(false);
    }

    loadData();
  }, [currentProject, router, user]);

  // Handle back navigation
  const handleBackToProjects = () => {
    // Clear current project selection and redirect to home
    setCurrentProject(null);
    router.push("/");
  };

  if (isLoading) {
    return <LoadingScreen message="Loading capture..." />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto py-6 px-4">
        <CaptureForm onBackToProjects={handleBackToProjects} />
      </main>
    </div>
  );
} 