"use client";

import {
  signInWithGoogle,
  signInWithGitHub,
  traduireErreurAuth
} from "@/lib/firebase/auth-client";

export default function AuthButtons() {
  async function authenticate(
    provider: "google" | "github"
  ) {
    try {
      const user =
        provider === "google"
          ? await signInWithGoogle()
          : await signInWithGitHub();

      const token =
        await user.getIdToken(true);

      const response =
        await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        });

      if (!response.ok) {
        throw new Error(
          "Impossible d'etablir la session authentifiee."
        );
      }

      window.location.href =
        "/studio";
    } catch (error) {
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
