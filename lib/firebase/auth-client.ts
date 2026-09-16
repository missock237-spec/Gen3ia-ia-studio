"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User
} from "firebase/auth";

import {
  auth,
  googleProvider,
  githubProvider
} from "./client";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

/**
 * Lightweight auth state hook shared by every client page.
 * Subscribes to Firebase auth state changes without requiring a provider.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { user, loading };
}

export async function signInWithGoogle(): Promise<User> {
  const result =
    await signInWithPopup(
      auth,
      googleProvider
    );

  return result.user;
}

export async function signInWithGitHub(): Promise<User> {
  const result =
    await signInWithPopup(
      auth,
      githubProvider
    );

  return result.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}
