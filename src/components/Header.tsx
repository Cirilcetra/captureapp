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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
        {/* Logo */}
        <div className="w-[200px]">
          <Link href="/" className="flex items-center">
            <span className="hidden font-bold text-lg sm:inline-block">Car Capture App</span>
            <span className="font-bold text-lg sm:hidden">CCA</span>
          </Link>
        </div>

        {/* Desktop Navigation - Center */}
        <div className="flex-1 flex justify-center">
          <nav className="hidden sm:flex items-center gap-8">
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
              </>
            ) : null}
          </nav>
        </div>

        {/* Right Side - Auth Buttons */}
        <div className="w-[200px] flex justify-end">
          <nav className="hidden sm:flex items-center gap-4">
            {user ? (
              <Button variant="ghost" onClick={handleSignOut}>
                Logout
              </Button>
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

          {/* Mobile Menu Button */}
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
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t bg-background">
          <div className="container py-2">
            {user ? (
              <>
                <Link 
                  href="/" 
                  className={`block py-2 text-base font-medium transition-colors ${
                    pathname === "/" ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/help" 
                  className={`block py-2 text-base font-medium transition-colors ${
                    pathname === "/help" ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Help
                </Link>
                <Link 
                  href="/settings" 
                  className={`block py-2 text-base font-medium transition-colors ${
                    pathname === "/settings" ? "text-foreground" : "text-foreground/60 hover:text-foreground"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Settings
                </Link>
                <button 
                  onClick={handleSignOut} 
                  className="block w-full py-2 text-left text-base font-medium text-foreground/60 hover:text-foreground"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="block py-2 text-base font-medium transition-colors text-foreground/60 hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link 
                  href="/signup" 
                  className="block py-2 text-base font-medium transition-colors text-foreground/60 hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
} 