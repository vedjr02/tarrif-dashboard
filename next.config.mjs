/** @type {import('next').NextConfig} */
const nextConfig = {
  // Recharts publishes mixed ESM/CJS; transpiling avoids stale or invalid webpack chunks in dev.
  transpilePackages: ["recharts"]
};

export default nextConfig;
