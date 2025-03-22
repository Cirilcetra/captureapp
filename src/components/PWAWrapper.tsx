"use client";

import dynamic from 'next/dynamic';

const InstallPWA = dynamic(() => import('@/components/InstallPWA'), { 
  ssr: false 
});

export default function PWAWrapper() {
  return <InstallPWA />;
} 