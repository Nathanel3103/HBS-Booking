/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Improves performance by enabling SWC compiler
  webpack: (config, { isServer }) => {
    // Fix for Webpack issues during deployment
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false, // Disable 'fs' module for client-side
      path: false,
      os: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
