import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Firebase Admin, AWS SDK and pino rely on Node.js APIs and must stay external
  // to the server bundle for correct behaviour on Vercel.
  serverExternalPackages: [
    "firebase-admin",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
    "pino",
    "exceljs",
  ],
};

export default nextConfig;
