/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prevent Next.js from inferring workspace root from unrelated lockfiles
  outputFileTracingRoot: __dirname,
}

module.exports = nextConfig
