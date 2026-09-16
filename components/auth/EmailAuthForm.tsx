"use client";

import { useState } from "react";

import {
  resetPassword,
  signInWithEmail,
  signUpWithEmail,
  traduireErreurAuth,
} from "@/lib/firebase/auth-client";

type Mode = "connexion" | "inscription";

/**
 * Formulaire d'authentification par email et mot de passe.
 * Gere la connexion, l'inscription (avec nom complet) et la
 * reinitialisation du mot de passe, avec messages d'erreur en francais.
 */
export default function EmailAuthForm() {
  const [mode, setMode] = useState<Mode>("connexion");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function establishSession(user: import("firebase/auth").User) {
    const token = await user.getIdToken(true);
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error("Impossible d'etablir la session authentifiee.");
    }
    window.location.href = "/studio";
  }

  function validate(): string | null {
    if (!email.trim() || !email.includes("@")) {
      return "Veuillez saisir une adresse email valide.";
    }
    if (password.length < 6) {
      return "Le mot de passe doit contenir au moins 6 caracteres.";
    }
    if (mode === "inscription" && password !== confirmPassword) {
      return "Les deux mots de passe ne correspondent pas.";
    }
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(true);
    try {
      if (mode === "inscription") {
        const user = await signUpWithEmail(email, password, fullName);
        await establishSession(user);
      } else {
        const user = await signInWithEmail(email, password);
        await establishSession(user);
      }
    } catch (authError) {
      setError(traduireErreurAuth(authError));
    } finally {
      setPending(false);
    }
  }

  async function handleReset(event: React.MouseEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!email.trim() || !email.includes("@")) {
      setError("Saisissez votre adresse email, puis cliquez a nouveau sur le lien.");
      return;
    }

    setPending(true);
    try {
      await resetPassword(email);
      setInfo(
        "Email de reinitialisation envoye. Consultez votre boite de reception (et vos spams)."
      );
    } catch (resetError) {
      setError(traduireErreurAuth(resetError));
    } finally {
      setPending(false);
    }
  }

  const inputClasses =
    "w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-neutral-900 bg-transparent";
  const buttonClasses =
    "w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 rounded-xl border p-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setMode("connexion");
            setError(null);
            setInfo(null);
          }}
          className={
            mode === "connexion"
              ? "rounded-lg bg-neutral-900 px-3 py-2 font-medium text-white"
              : "rounded-lg px-3 py-2 font-medium opacity-70 hover:opacity-100"
          }
        >
          Se connecter
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("inscription");
            setError(null);
            setInfo(null);
          }}
          className={
            mode === "inscription"
              ? "rounded-lg bg-neutral-900 px-3 py-2 font-medium text-white"
              : "rounded-lg px-3 py-2 font-medium opacity-70 hover:opacity-100"
          }
        >
          S&apos;inscrire
        </button>
      </div>

      {mode === "inscription" && (
        <input
          type="text"
          placeholder="Nom complet"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="name"
          className={inputClasses}
        />
      )}

      <input
        type="email"
        placeholder="Adresse email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
        className={inputClasses}
      />

      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete={mode === "inscription" ? "new-password" : "current-password"}
        required
        minLength={6}
        className={inputClasses}
      />

      {mode === "inscription" && (
        <input
          type="password"
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
          minLength={6}
          className={inputClasses}
        />
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {info && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {info}
        </p>
      )}

      <button type="submit" disabled={pending} className={buttonClasses}>
        {pending
          ? "Veuillez patienter..."
          : mode === "connexion"
            ? "Se connecter"
            : "Creer mon compte"}
      </button>

      {mode === "connexion" && (
        <a
          href="#"
          onClick={handleReset}
          className="text-center text-xs opacity-60 transition hover:opacity-100"
        >
          Mot de passe oublie ?
        </a>
      )}
    </form>
  );
}
