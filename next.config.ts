import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Vercel stocke les identifiants Firebase web sous les noms FIREBASE_* ;
  // le SDK client exige NEXT_PUBLIC_* inlines a build time. Ce mapping
  // rend la config disponible dans le bundle navigateur (cles publiques
  // par design — la securite repose sur les regles + domaines autorises).
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
  },
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
