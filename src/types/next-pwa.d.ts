declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  export interface PWAOptions {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    skipWaiting?: boolean;
    scope?: string;
    sw?: string;
    publicExcludes?: string[];
    buildExcludes?: string[] | RegExp[];
    dynamicStartUrl?: boolean;
    fallbacks?: {
      document?: string;
      image?: string;
      font?: string;
      audio?: string;
      video?: string;
    };
    cacheOnFrontEndNav?: boolean;
    subdomainPrefix?: string;
    reloadOnOnline?: boolean;
    customWorkerDir?: string;
    customWorkerDirName?: string;
    runtimeCaching?: Array<{
      urlPattern: RegExp;
      handler: string;
      options: Record<string, any>;
    }>;
  }
  
  export default function withPWAInit(options?: PWAOptions): (config: NextConfig) => NextConfig;
} 