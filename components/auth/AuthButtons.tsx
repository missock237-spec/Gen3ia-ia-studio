"use client";

import { useEffect } from "react";

import {
  completerConnexionRedirect,
  establishSession,
  signInWithGoogle,
  signInWithGitHub,
  traduireErreurAuth
} from "@/lib/firebase/auth-client";

export default function AuthButtons() {
  // Connexion par redirection (mobile) : au retour du flux OAuth sur /login,
  // on recupere le resultat et on etablit la session serveur.
  useEffect(() => {
    completerConnexionRedirect().catch((error) => {
      window.alert(traduireErreurAuth(error));
    });
  }, []);

  async function authenticate(
    provider: "google" | "github"
  ) {
    try {
      const user =
        provider === "google"
          ? await signInWithGoogle()
          : await signInWithGitHub();

      // Sur mobile, signInWith* redirige : on n'arrive jamais ici.
      await establishSession(user);
    } catch (error) {
      // La redirection mobile est un flux normal, pas une erreur a afficher.
      if (error instanceof Error && error.message === "REDIRECTION_EN_COURS") {
        return;
      }
      window.alert(traduireErreurAuth(error));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => authenticate("google")}
        className="rounded-xl border px-4 py-3 text-sm transition hover:bg-neutral-50"
      >
        Continuer avec Google
      </button>

      <button
        type="button"
        onClick={() => authenticate("github")}
        className="rounded-xl border px-4 py-3 text-sm transition hover:bg-neutral-50"
      >
        Continuer avec GitHub
      </button>
    </div>
  );
}
