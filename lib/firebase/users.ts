import {
  FieldValue,
  Timestamp
} from "firebase-admin/firestore";

import { adminDb } from "./admin";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;

  providers: string[];

  role: "user" | "admin";

  plan: "free" | "pro" | "enterprise";

  credits: number;

  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  lastLoginAt: Timestamp | FieldValue;
}

export async function ensureUserProfile(params: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  provider?: string;
}): Promise<void> {
  const ref = adminDb
    .collection("users")
    .doc(params.uid);

  const snapshot = await ref.get();

  const provider =
    params.provider || "unknown";

  if (!snapshot.exists) {
    const profile: UserProfile = {
      uid: params.uid,
      email: params.email ?? null,
      displayName:
        params.displayName ?? null,
      photoURL:
        params.photoURL ?? null,

      providers: [provider],

      role: "user",
      plan: "free",

      credits: 0,

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp()
    };

    await ref.set(profile);

    return;
  }

  const data =
    snapshot.data() as UserProfile;

  const providers = Array.from(
    new Set([
      ...(data.providers || []),
      provider
    ])
  );

  await ref.update({
    email:
      params.email ?? data.email ?? null,

    displayName:
      params.displayName ??
      data.displayName ??
      null,

    photoURL:
      params.photoURL ??
      data.photoURL ??
      null,

    providers,

    updatedAt:
      FieldValue.serverTimestamp(),

    lastLoginAt:
      FieldValue.serverTimestamp()
  });
}
