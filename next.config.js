/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',       // Static export for Netlify drag-and-drop
  trailingSlash: true,    // Netlify needs this for clean URLs
  images: {
    unoptimized: true,    // Required for static export
    remotePatterns: [
      { protocol: 'https', hostname: '**.talabat.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
    ],
  },
};

module.exports = nextConfig;
