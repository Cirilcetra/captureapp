"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FFmpegFallbackProps {
  error: string | null;
  onRetry?: () => void;
}

export default function FFmpegFallback({ error, onRetry }: FFmpegFallbackProps) {
  return (
    <Card className="my-8 border-red-300 bg-red-50 dark:bg-red-950/20">
      <CardHeader>
        <CardTitle className="text-red-600 dark:text-red-400">
          Video Processing Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>{error || "There was an error loading the video processing functionality."}</p>
        
        <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-2">Possible solutions:</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Use a modern browser like Chrome, Edge, or Firefox (latest version)</li>
            <li>Make sure your browser settings allow SharedArrayBuffer (required for video processing)</li>
            <li>If you're using browser extensions, try disabling them or using incognito mode</li>
            <li>Clear your browser cache and cookies</li>
            <li>Refresh the page</li>
          </ul>
        </div>
        
        <div className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold mb-2">Technical requirements:</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>WebAssembly support</li>
            <li>SharedArrayBuffer support (requires secure context)</li>
            <li>Cross-Origin Isolation enabled (COOP/COEP headers)</li>
            <li>Modern JavaScript features (ES2018+)</li>
          </ul>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
        {onRetry && (
          <Button onClick={onRetry} className="w-full sm:w-auto">
            Try Again
          </Button>
        )}
        <Link href="/" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full">
            Return to Home
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
} 