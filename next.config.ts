/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  allowedDevOrigins: ['192.168.101.66']

};

module.exports = nextConfig;
