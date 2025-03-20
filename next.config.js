/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const nextConfig = {
  reactStrictMode: true,
  // This enables modules that depend on Node.js modules in the browser
  transpilePackages: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Required for FFmpeg WASM
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    
    // Copy FFmpeg WASM files to the static directory
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(
              __dirname,
              'node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js'
            ),
            to: path.resolve(__dirname, '.next/static/chunks/ffmpeg-core.js'),
          },
          {
            from: path.resolve(
              __dirname,
              'node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm'
            ),
            to: path.resolve(__dirname, '.next/static/chunks/ffmpeg-core.wasm'),
          },
        ],
      })
    );
    
    return config;
  },
  // Need to disable strict exportTrailingSlash for dynamic routes
  trailingSlash: false,
  // WASM files and shared memory need these security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

// To run without Turbopack, use: 
// npm run dev -- --no-turbo
module.exports = withPWA(nextConfig); 