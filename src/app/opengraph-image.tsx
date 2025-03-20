import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const alt = 'Car Video Cataloger';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 60,
          background: 'linear-gradient(to bottom, #000000, #333333)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: 50,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 90, fontWeight: 'bold', marginBottom: 20 }}>
          Car Video Cataloger
        </div>
        <div style={{ fontSize: 40, opacity: 0.8 }}>
          Create professional car promo videos with AI
        </div>
      </div>
    ),
    // ImageResponse options
    {
      // For convenience, we can re-use the exported size config
      ...size,
    }
  );
} 