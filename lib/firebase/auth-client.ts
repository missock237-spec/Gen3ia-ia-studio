"use client";

import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { auth, googleProvider, githubProvider, storage } from "./client";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export interface SignupProfile {
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber?: string;
  country?: string;
  bio?: string;
  language?: string;
  timezone?: string;
  photo?: File | null;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}

export async function signInWithGoogle(): Promise<User> {
  return (await signInWithPopup(auth, googleProvider)).user;
}

export async function signInWithGitHub(): Promise<User> {
  return (await signInWithPopup(auth, githubProvider)).user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export function traduireErreurAuth(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/email-already-in-use": return "Cette adresse email est deja utilisee par un compte existant.";
    case "auth/invalid-email": return "L'adresse email saisie n'est pas valide.";
    case "auth/missing-email": return "Veuillez saisir une adresse email.";
    case "auth/missing-password": return "Veuillez saisir un mot de passe.";
    case "auth/weak-password": return "Le mot de passe est trop faible : utilisez au moins 6 caracteres.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials": return "Email ou mot de passe incorrect.";
    case "auth/too-many-requests": return "Trop de tentatives. Veuillez reessayer dans quelques minutes.";
    case "auth/user-disabled": return "Ce compte a ete desactive.";
    case "auth/network-request-failed": return "Erreur reseau : verifiez votre connexion internet.";
    case "auth/operation-not-allowed": return "La connexion par email/mot de passe n'est pas encore activee sur ce projet.";
    case "auth/admin-restricted-operation": return "La creation de compte n'est pas autorisee actuellement.";
    default: return error instanceof Error && error.message ? error.message : "Une erreur inattendue s'est produite. Veuillez reessayer.";
  }
}

function validateProfile(profile: SignupProfile): void {
  if (!profile.firstName.trim() || profile.firstName.trim().length > 80) throw new Error("Le prenom est obligatoire.");
  if (!profile.lastName.trim() || profile.lastName.trim().length > 80) throw new Error("Le nom est obligatoire.");
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(profile.username.trim())) throw new Error("Le nom d'utilisateur doit contenir 3 a 32 caracteres (lettres, chiffres, ., _ ou -).");
  if (profile.bio && profile.bio.length > 500) throw new Error("La biographie ne peut pas depasser 500 caracteres.");
  if (profile.photo) {
    if (!profile.photo.type.startsWith("image/")) throw new Error("La photo de profil doit etre une image.");
    if (profile.photo.size > 5 * 1024 * 1024) throw new Error("La photo de profil ne doit pas depasser 5 Mo.");
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  profile: SignupProfile,
): Promise<User> {
  validateProfile(profile);
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  let photoURL: string | undefined;

  try {
    if (profile.photo) {
      const extension = profile.photo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const avatarRef = ref(storage, `users/${result.user.uid}/uploads/profile/avatar-${Date.now()}.${extension}`);
      const uploaded = await uploadBytes(avatarRef, profile.photo, { contentType: profile.photo.type });
      photoURL = await getDownloadURL(uploaded.ref);
    }

    const displayName = `${profile.firstName.trim()} ${profile.lastName.trim()}`.replace(/\s+/g, " ");
    await updateProfile(result.user, { displayName, ...(photoURL ? { photoURL } : {}) });

    const token = await result.user.getIdToken(true);
    const response = await fetch("/api/auth/profile", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        phoneNumber: profile.phoneNumber || null,
        country: profile.country || null,
        bio: profile.bio || null,
        language: profile.language || "fr",
        timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        photoURL: photoURL || result.user.photoURL || null,
      }),
    });
    if (!response.ok) throw new Error("Le profil n'a pas pu etre enregistre.");

    try { await sendEmailVerification(result.user); } catch { /* best effort */ }
    return result.user;
  } catch (error) {
    try { await result.user.delete(); } catch { /* avoid leaving a half-created auth account when possible */ }
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  return (await signInWithEmailAndPassword(auth, email, password)).user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
