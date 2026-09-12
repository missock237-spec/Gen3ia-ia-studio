import {
  cert,
  getApps,
  initializeApp
} from "firebase-admin/app";

import {
  getFirestore
} from "firebase-admin/firestore";

import {
  getStorage
} from "firebase-admin/storage";

function getFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !privateKey
  ) {
    throw new Error(
      "Firebase Admin environment variables are missing."
    );
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey
    }),
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

const adminApp = getFirebaseAdmin();

export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
