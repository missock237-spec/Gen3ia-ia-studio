import Link from "next/link";

/**
 * Ecran affiche quand l'agent Live est ouvert depuis un appareil non supporte
 * (mobile ou tablette). La fonctionnalite exige la capture d'ecran et le
 * controle clavier/souris d'un vrai ordinateur (Windows/Linux/macOS).
 */
export function PcOnlyNotice({ deviceType }: { deviceType?: string }) {
  const appareil =
    deviceType === "mobile"
      ? "téléphone"
      : deviceType === "tablet"
        ? "tablette"
        : "appareil actuel";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070a12] p-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-amber-400/25 bg-[#0d1220] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">
          PC
        </div>
        <h1 className="mt-6 text-2xl font-bold">Agent Live — PC uniquement</h1>
        <p className="mt-3 text-sm leading-6 text-white/65">
          Cette fonctionnalité n'est pas disponible depuis votre {appareil}.
          L'agent Live observe l'écran et contrôle le clavier et la souris d'un
          ordinateur : il nécessite Windows, Linux ou macOS.
        </p>
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-white/55">
          <li className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-2.5">
            Sur Android / iPhone : utilisez le site web ou l'application
            installable depuis votre navigateur.
          </li>
          <li className="rounded-xl border border-white/10 bg-white/[.03] px-4 py-2.5">
            Sur PC : ouvrez gen3ia.online, l'app Gen3ia Desktop, ou installez
            le client Live.
          </li>
        </ul>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/studio"
            className="rounded-xl border border-white/15 bg-white/[.04] px-5 py-3 text-sm font-semibold transition hover:bg-white/[.08]"
          >
            Retour au Studio
          </Link>
          <a
            href="https://github.com/missock237-spec/Gen3ia-ia-studio/releases"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500"
          >
            Télécharger l'app PC (Windows / Linux)
          </a>
        </div>
      </div>
    </main>
  );
}
