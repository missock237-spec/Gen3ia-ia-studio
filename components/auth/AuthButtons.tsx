"use client";

import {
  signInWithGoogle,
  signInWithGitHub
} from "@/lib/firebase/auth-client";

import { auth } from "@/lib/firebase/client";

export default function AuthButtons() {
  async function authenticate(
    provider: "google" | "github"
  ) {
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
        "Unable to establish authenticated session."
      );
    }

    window.location.href =
      "/studio";
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => authenticate("google")}
        className="rounded-xl border px-4 py-3"
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => authenticate("github")}
        className="rounded-xl border px-4 py-3"
      >
        Continue with GitHub
      </button>
    </div>
  );
}
