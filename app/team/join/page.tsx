"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/firebase/auth-client";
import { useTeam } from "@/lib/team/useTeam";
import type { TeamInvitation } from "@/lib/team/types";

/**
 * Acceptation d'une invitation d'équipe via /team/join?token=…
 * Gère proprement : utilisateur non connecté, invitation introuvable,
 * expirée, déjà utilisée, erreurs réseau et redirection vers l'équipe.
 */

type JoinStatus = "loading" | "ready" | "joined" | "notfound" | "error";

function JoinTeamPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#f6f4ef]">
          <p className="text-sm text-neutral-500">Chargement…</p>
        </main>
      }
    >
      <JoinTeamContent />
    </Suspense>
  );
}

function JoinTeamContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user, loading: authLoading } = useAuth();
  const { acceptInvitation } = useTeam();
  const router = useRouter();
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [status, setStatus] = useState<JoinStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setStatus("notfound");
      return;
    }
    if (!user) {
      // L'utilisateur doit être connecté : on ne peut pas lire les invitations.
      setStatus("loading");
      return;
    }
    let cancelled = false;
    const fetchInvite = async () => {
      setStatus("loading");
      try {
        const q = query(
          collection(db, "invitations"),
          where("token", "==", token),
          where("status", "==", "pending"),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        if (snap.empty) {
          setStatus("notfound");
          return;
        }
        const data = snap.docs[0].data();
        const rawExpiry = data.expiresAt;
        const expiresAt = typeof rawExpiry?.toDate === "function" ? rawExpiry.toDate() : null;
        if (expiresAt && expiresAt.getTime() < Date.now()) {
          setStatus("notfound");
          setErrorMessage("Cette invitation a expiré. Demandez une nouvelle invitation au propriétaire de l'équipe.");
          return;
        }
        setInvitation({ id: snap.docs[0].id, ...data } as TeamInvitation);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage("Impossible de vérifier l'invitation (connexion à la base de données impossible). Reconnectez-vous puis réessayez.");
        }
      }
    };
    void fetchInvite();
    return () => { cancelled = true; };
  }, [token, user, authLoading]);

  const handleJoin = async () => {
    if (!invitation || joining) return;
    setJoining(true);
    setErrorMessage(null);
    try {
      await acceptInvitation(invitation);
      setStatus("joined");
      router.replace(`/team/${invitation.teamId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de rejoindre l'équipe.";
      setStatus("error");
      setErrorMessage(message);
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || (status === "loading" && !errorMessage)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f4ef] px-4">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200/80 bg-white p-8 text-center shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-sky-500" />
          <p className="mt-4 text-sm text-neutral-500">Vérification de l&apos;invitation…</p>
        </div>
      </main>
    );
  }

  // Non connecté : porte d'entrée claire vers la connexion.
  if (!user) {
    const nextUrl = token ? `/team/join?token=${encodeURIComponent(token)}` : "/team";
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f4ef] px-4">
        <div className="anim-scale-in w-full max-w-md rounded-3xl border border-neutral-200/80 bg-white p-8 text-center shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 text-2xl">✉️</div>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-neutral-900">Invitation d&apos;équipe</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            Connectez-vous avec le compte invité pour rejoindre l&apos;équipe. Vous serez
            redirigé automatiquement vers l&apos;invitation après la connexion.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={`/login?next=${encodeURIComponent(nextUrl)}`} className="g3-btn g3-btn-primary rounded-full">
              Se connecter
            </Link>
            <Link href="/signup" className="g3-btn g3-btn-ghost rounded-full">
              Créer un compte
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Invitation introuvable / expirée / déjà utilisée.
  if (status === "notfound") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f4ef] px-4">
        <div className="anim-scale-in w-full max-w-md rounded-3xl border border-neutral-200/80 bg-white p-8 text-center shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-2xl">⏳</div>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-neutral-900">
            Invitation invalide ou expirée
          </h1>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            {errorMessage ?? "Ce lien n'est plus valable : l'invitation a peut-être déjà été utilisée, expirée ou a été révoquée."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/team" className="g3-btn g3-btn-primary rounded-full">Aller à mes équipes</Link>
            <Link href="/dashboard" className="g3-btn g3-btn-ghost rounded-full">Tableau de bord</Link>
          </div>
        </div>
      </main>
    );
  }

  // Erreur technique (réseau / permissions / échec d'acceptation).
  if (status === "error") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f4ef] px-4">
        <div className="anim-scale-in w-full max-w-md rounded-3xl border border-neutral-200/80 bg-white p-8 text-center shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-100 text-2xl">⚠️</div>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-neutral-900">Une erreur est survenue</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-500">{errorMessage}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => window.location.reload()} className="g3-btn g3-btn-primary rounded-full">
              Réessayer
            </button>
            <Link href="/team" className="g3-btn g3-btn-ghost rounded-full">Mes équipes</Link>
          </div>
        </div>
      </main>
    );
  }

  if (status === "joined") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f4ef] px-4">
        <div className="anim-scale-in w-full max-w-md rounded-3xl border border-neutral-200/80 bg-white p-8 text-center shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-2xl">🎉</div>
          <h1 className="mt-5 font-serif text-2xl font-semibold text-neutral-900">Vous avez rejoint l&apos;équipe !</h1>
          <p className="mt-3 text-sm text-neutral-500">Redirection vers l&apos;espace de l&apos;équipe…</p>
        </div>
      </main>
    );
  }

  // Prêt : récapitulatif de l'invitation.
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f4ef] px-4">
      <div className="anim-scale-in w-full max-w-md rounded-3xl border border-neutral-200/80 bg-white p-8 text-center shadow-[0_2px_10px_rgba(15,23,42,0.05)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sky-100 font-serif text-xl font-semibold text-sky-700">
          {invitation?.teamName?.charAt(0).toUpperCase() || "G"}
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.25em] text-neutral-400">Invitation Gen3ia</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-neutral-900">
          {invitation?.teamName || "Une équipe"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          {invitation?.invitedBy?.displayName
            ? `${invitation.invitedBy.displayName} vous invite à rejoindre cette équipe.`
            : "Vous êtes invité à rejoindre cette équipe."}
        </p>
        <span className="mt-4 inline-block rounded-full bg-neutral-100 px-4 py-1.5 text-xs font-semibold capitalize text-neutral-600">
          Rôle proposé : {invitation?.role}
        </span>
        <button
          type="button"
          onClick={handleJoin}
          disabled={joining}
          className="g3-btn g3-btn-primary mt-6 w-full rounded-full"
        >
          {joining ? "Acceptation…" : "Accepter et rejoindre"}
        </button>
      </div>
    </main>
  );
}

export default function JoinTeamPageRoot() {
  return <JoinTeamPage />;
}
