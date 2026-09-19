"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Bouton d'installation PWA (Android / Chrome / Edge).
 * Utilise l'événement natif beforeinstallprompt ; si indisponible
 * (iOS, déjà installé, navigateur non compatible), affiche un guide court.
 */
function PwaInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [guide, setGuide] = useState<null | "ios" | "generique">(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setGuide(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return <span className="text-xs font-semibold text-emerald-600">Application installée ✓</span>;
  }

  return (
    <span className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            const choice = await deferred.userChoice;
            if (choice.outcome === "accepted") setInstalled(true);
            setDeferred(null);
            return;
          }
          const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
          setGuide(isIos ? "ios" : "generique");
        }}
        className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_-8px_rgba(28,27,24,0.55)] transition hover:bg-neutral-800"
      >
        Installer
      </button>
      {guide === "ios" && (
        <span className="max-w-[220px] text-right text-[11px] leading-4 text-neutral-500">
          Dans Safari : bouton Partager puis « Sur l&apos;écran d&apos;accueil ».
        </span>
      )}
      {guide === "generique" && (
        <span className="max-w-[220px] text-right text-[11px] leading-4 text-neutral-500">
          Menu du navigateur puis « Installer l&apos;application » ou « Ajouter à l&apos;écran d&apos;accueil ».
        </span>
      )}
    </span>
  );
}

const RELEASES_URL = "https://github.com/missock237-spec/Gen3ia-ia-studio/releases";

const PLATFORMS = [
  {
    key: "android",
    name: "Android",
    note: "Application web installable (PWA)",
    icon: "M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48A10.81 10.81 0 0 0 1 18h22a10.81 10.81 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z",
    action: "pwa" as const,
  },
  {
    key: "ios",
    name: "iPhone & iPad",
    note: "Application web installable (PWA)",
    icon: "M16.365 1.43c0 1.14-.47 2.2-1.23 3.01-.79.86-2.08 1.52-3.15 1.44-.14-1.1.43-2.27 1.19-3.06.84-.87 2.25-1.51 3.19-1.39zM20.94 17.1c-.57 1.3-.84 1.88-1.57 3.03-1.02 1.6-2.46 3.59-4.25 3.6-1.59.02-2-.99-4.16-.98-2.16.01-2.61 1-4.2.98-1.79-.02-3.16-1.82-4.18-3.42C.7 16.36.4 11.54 2.14 9.05c1.23-1.75 3.17-2.77 5-2.77 1.86 0 3.03 1 4.57 1 1.5 0 2.41-1 4.56-1 1.63 0 3.36.89 4.59 2.42-4.03 2.21-3.38 7.96.08 10.4z",
    action: "pwa" as const,
  },
  {
    key: "windows",
    name: "Windows",
    note: "Application Desktop (Agent Live inclus)",
    icon: "M3 5.5l7-.95v6.95H3V5.5zm0 13l7 .95V12.5H3v6zm8 1.08L21 21V12.5h-10v7.08zM11 3v7.5h10V3L11 4.42V3z",
    action: "desktop" as const,
  },
  {
    key: "linux",
    name: "Linux",
    note: "AppImage, .deb — Application Desktop",
    icon: "M12.52 2.02c-.66-.03-1.33.24-1.72.86-.5.8-.35 1.94-.05 3.11.27 1.07.6 2.14.35 3.06-.23.85-1.12 1.5-1.98 2.2-.92.75-1.8 1.55-1.9 2.9-.02.31-.19.65-.44 1.05-.3.48-.66 1-.6 1.66.05.55.42.96.86 1.28.88.63 2.13 1 3.28 1.32 1.15.32 2.18.6 2.72 1.14.3.3.79.4 1.24.36.45-.04.9-.2 1.2-.5.44-.43.55-1.04.5-1.6-.05-.55-.26-1.09-.5-1.56-.49-.94-1.1-1.72-1.4-2.55-.28-.79-.28-1.6.06-2.53.37-1.02.86-2.06 1.02-3.12.16-1.06 0-2.15-.72-3.1-.72-.96-1.9-1.54-3.02-1.6a2.7 2.7 0 0 0-.9.12z",
    action: "desktop" as const,
  },
];

/**
 * Section « Téléchargez les apps » — équivalent de la section
 * « Download the Apps » de runable.com : chaque plateforme Gen3ia
 * (PWA Android/iOS, Desktop Windows/Linux) avec son action réelle.
 */
export function AppDownloads() {
  return (
    <section aria-label="Applications Gen3ia" className="px-4 pb-20 sm:px-6">
      <div
        className="mx-auto max-w-6xl rounded-[36px] p-4 sm:p-6"
        style={{
          background:
            "linear-gradient(135deg, #fdeef0 0%, #f3ecfb 34%, #e3f1fb 68%, #eaf7f1 100%)",
        }}
      >
        <div className="reveal rounded-[28px] border border-[rgba(23,23,20,0.06)] bg-[#f9f7f2] p-7 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-center">
            <div>
              <p className="g3-eyebrow">Applications</p>
              <h2 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Chaque appareil.
                <br />
                Un seul Gen3ia.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-neutral-500">
                Installez l&apos;application web sur votre téléphone, ou
                l&apos;application Desktop sur votre PC pour débloquer l&apos;Agent
                Live. Vos agents, extensions et sessions vous suivent partout.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PLATFORMS.map((platform) => (
                <li
                  key={platform.key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[rgba(23,23,20,0.08)] bg-white p-4 shadow-[0_2px_10px_rgba(15,23,42,0.05)]"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-900 text-white">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d={platform.icon} />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-neutral-900">{platform.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] leading-4 text-neutral-400">{platform.note}</span>
                    </span>
                  </span>
                  {platform.action === "pwa" ? (
                    <PwaInstallButton />
                  ) : (
                    <a
                      href={RELEASES_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-full border border-[rgba(23,23,20,0.14)] bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-900 hover:text-white"
                    >
                      Télécharger
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
