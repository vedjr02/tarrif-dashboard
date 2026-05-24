/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["recharts"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
