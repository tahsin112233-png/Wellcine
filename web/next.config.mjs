/** @type {import('next').NextConfig} */
const nextConfig = {
  // Posters come from arbitrary provider CDNs; plain <img> is used instead
  // of next/image so no remotePatterns allowlist is needed.
  reactStrictMode: true,
};

export default nextConfig;
