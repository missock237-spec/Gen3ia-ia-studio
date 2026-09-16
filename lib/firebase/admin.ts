import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";

import {
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";

import {
  getStorage,
  type Storage,
} from "firebase-admin/storage";

function getFirebaseAdminConfig() {
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

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  };
}

function getFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  return initializeApp({
    credential: cert(getFirebaseAdminConfig()),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  });
}

/**
 * Lazily initialized Firebase Admin app.
 *
 * Initialization happens on first access instead of at module import so
 * that Next.js can collect page data at build time without requiring the
 * production credentials to be present.
 */
let cachedApp: App | undefined;

export function getAdminApp(): App {
  if (!cachedApp) {
    cachedApp = getFirebaseAdmin();
  }
  return cachedApp;
}

/**
 * Creates a lazy proxy around a Firebase Admin service so that the first
 * property access triggers initialization. Methods are bound to the real
 * instance transparently.
 */
function lazyService<T extends object>(create: () => T): T {
  let instance: T | undefined;

  return new Proxy({} as T, {
    get(_target, property) {
      if (!instance) {
        instance = create();
      }
      const value = Reflect.get(instance as object, property);
      return typeof value === "function" ? value.bind(instance) : value;
    },
    has(_target, property) {
      if (!instance) {
        instance = create();
      }
      return Reflect.has(instance as object, property);
    },
  });
}

export const adminDb: Firestore = lazyService(() =>
  getFirestore(getAdminApp()),
);

export const adminStorage: Storage = lazyService(() =>
  getStorage(getAdminApp()),
);

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}
