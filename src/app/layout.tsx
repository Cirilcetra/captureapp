import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import ClientInit from '@/components/ClientInit';
import { AuthProvider } from '@/lib/auth-context';
import PWAWrapper from '@/components/PWAWrapper';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#002238',
};

export const metadata: Metadata = {
  title: 'Capture App',
  description: 'Video capture and script generation app',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: '/apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Capture App',
    startupImage: [
      '/splash/apple-splash-2048-2732.png',
      '/splash/apple-splash-1668-2388.png',
      '/splash/apple-splash-1536-2048.png',
      '/splash/apple-splash-1125-2436.png',
      '/splash/apple-splash-750-1334.png'
    ]
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.className} h-full overflow-auto bg-background antialiased`}>
        <AuthProvider>
          <ClientInit />
          {children}
          <PWAWrapper />
          <Toaster position="bottom-center" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                  });
                }
              `,
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
