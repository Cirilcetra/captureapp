"use client";

import Link from "next/link";
import { Button } from "./ui/button";

export default function Header() {
  return (
    <header className="border-b bg-background">
      <div className="container flex items-center justify-between h-16">
        <div>
          <Link href="/">
            <h1 className="text-xl font-bold">Car Capture App</h1>
          </Link>
          <p className="text-sm text-muted-foreground">Create professional car videos with AI</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/help">Help</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings">Settings</Link>
          </Button>
        </div>
      </div>
    </header>
  );
} 