import {
  signInWithPopup,
  signOut,
  User
} from "firebase/auth";

import {
  auth,
  googleProvider,
  githubProvider
} from "./client";

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
