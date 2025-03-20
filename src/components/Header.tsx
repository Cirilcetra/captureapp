"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function Header() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      setMobileMenuOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center">
            <span className="hidden font-bold sm:inline-block">Car Capture App</span>
            <span className="font-bold sm:hidden">CCA</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex items-center gap-6">
          {user ? (
            <>
              <Link 
                href="/" 
                className={`text-sm font-medium transition-colors ${
                  pathname === "/" ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/help" 
                className={`text-sm font-medium transition-colors ${
                  pathname === "/help" ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                Help
              </Link>
              <Link 
                href="/settings" 
                className={`text-sm font-medium transition-colors ${
                  pathname === "/settings" ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                Settings
              </Link>
              <Button variant="ghost" onClick={handleSignOut}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/signup">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile Navigation Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="sm:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle menu</span>
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t p-4 space-y-4 bg-background">
          {user ? (
            <>
              <Link 
                href="/" 
                className={`block text-base font-medium transition-colors ${
                  pathname === "/" ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/help" 
                className={`block text-base font-medium transition-colors ${
                  pathname === "/help" ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Help
              </Link>
              <Link 
                href="/settings" 
                className={`block text-base font-medium transition-colors ${
                  pathname === "/settings" ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Settings
              </Link>
              <Button variant="ghost" onClick={handleSignOut} className="justify-start px-0 w-full">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link 
                href="/login" 
                className="block text-base font-medium transition-colors text-foreground/60 hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link 
                href="/signup" 
                className="block text-base font-medium transition-colors text-foreground/60 hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
} 