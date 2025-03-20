"use client";

import { useEffect } from 'react';
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ProjectSelector from "@/components/ProjectSelector";
import EmptyState from "@/components/EmptyState";

export default function Home() {
  const { projects, currentProject, setCurrentProject } = useAppStore();
  const router = useRouter();

  // If a project is selected, redirect to the capture page
  useEffect(() => {
    if (currentProject) {
      router.push("/capture");
    }
  }, [currentProject, router]);
  
  // Firebase storage doesn't need local cleanup as it's managed in the cloud
  // We could implement a Firebase cleanup routine here in the future if needed

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container py-6">
        {projects.length > 0 ? (
          <ProjectSelector 
            projects={projects} 
            onSelectProject={(id) => setCurrentProject(id)}
          />
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
