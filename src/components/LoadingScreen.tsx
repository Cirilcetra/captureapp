"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface LoadingScreenProps {
  message?: string;
  showHomeButton?: boolean;
}

export default function LoadingScreen({ 
  message = "Loading...", 
  showHomeButton = true 
}: LoadingScreenProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">{message}</h2>
        <p className="text-muted-foreground">Please wait or return to the home page</p>
        
        {showHomeButton && (
          <Button className="mt-4" onClick={() => router.push("/")}>
            Return to Home
          </Button>
        )}
      </div>
    </div>
  );
} 