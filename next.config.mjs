const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      buffer: require.resolve("buffer/"),
    };
    return config;
  },
};

export default nextConfig;
