"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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

/**
 * Traduit les codes d'erreur Firebase Auth en messages francais
 * comprehensibles pour l'utilisateur final.
 */
export function traduireErreurAuth(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "Cette adresse email est deja utilisee par un compte existant.";
    case "auth/invalid-email":
      return "L'adresse email saisie n'est pas valide.";
    case "auth/missing-email":
      return "Veuillez saisir une adresse email.";
    case "auth/missing-password":
      return "Veuillez saisir un mot de passe.";
    case "auth/weak-password":
      return "Le mot de passe est trop faible : utilisez au moins 6 caracteres.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email ou mot de passe incorrect.";
    case "auth/invalid-login-credentials":
      return "Identifiants incorrects. Verifiez votre email et votre mot de passe.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Veuillez reessayer dans quelques minutes.";
    case "auth/user-disabled":
      return "Ce compte a ete desactive.";
    case "auth/network-request-failed":
      return "Erreur reseau : verifiez votre connexion internet.";
    case "auth/operation-not-allowed":
      return "La connexion par email/mot de passe n'est pas encore activee sur ce projet.";
    case "auth/admin-restricted-operation":
      return "La creation de compte n'est pas autorisee actuellement.";
    default:
      return error instanceof Error && error.message
        ? error.message
        : "Une erreur inattendue s'est produite. Veuillez reessayer.";
  }
}

/** Cree un compte avec email + mot de passe, renseigne le nom affiche et envoie l'email de verification. */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const result = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  if (displayName && displayName.trim()) {
    await updateProfile(result.user, {
      displayName: displayName.trim()
    });
  }

  try {
    await sendEmailVerification(result.user);
  } catch {
    // L'email de verification est best-effort : l'inscription reste valide.
  }

  return result.user;
}

/** Connecte un utilisateur existant avec email + mot de passe. */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const result = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return result.user;
}

/** Envoie l'email de reinitialisation du mot de passe. */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
