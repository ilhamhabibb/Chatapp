import type { NextConfig } from "next";

const rfc1918 = [
  "localhost",
  "127.0.0.1",
  "192.168.*.*",
  "10.*.*.*",
  ...Array.from({ length: 16 }, (_, index) => `172.${16 + index}.*.*`),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: rfc1918,
};

export default nextConfig;
