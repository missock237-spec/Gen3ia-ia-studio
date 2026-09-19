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
    <div className="flex min-h-full items-center justify-center bg-[#f6f4ef] p-6 text-neutral-900">
      <div className="anim-scale-in w-full max-w-lg rounded-3xl border border-[rgba(23,23,20,0.09)] bg-white p-8 text-center shadow-[0_14px_40px_-18px_rgba(28,27,24,0.22)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-xs font-bold uppercase tracking-widest text-amber-700">
          PC
        </div>
        <h1 className="mt-6 font-serif text-2xl font-semibold">Agent Live — PC uniquement</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          Cette fonctionnalité n’est pas disponible depuis votre {appareil}.
          L’agent Live observe l’écran et contrôle le clavier et la souris d’un
          ordinateur : il nécessite Windows, Linux ou macOS.
        </p>
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-sm text-neutral-500">
          <li className="rounded-xl border border-[rgba(23,23,20,0.08)] bg-neutral-50 px-4 py-2.5">
            Sur Android / iPhone : utilisez le site web ou l’application
            installable depuis votre navigateur.
          </li>
          <li className="rounded-xl border border-[rgba(23,23,20,0.08)] bg-neutral-50 px-4 py-2.5">
            Sur PC : ouvrez gen3ia.online, l’app Gen3ia Desktop, ou installez
            le client Live.
          </li>
        </ul>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/studio" className="g3-btn g3-btn-ghost rounded-full">
            Retour au Studio
          </Link>
          <a
            href="https://github.com/missock237-spec/Gen3ia-ia-studio/releases"
            target="_blank"
            rel="noreferrer"
            className="g3-btn g3-btn-primary rounded-full"
          >
            Télécharger l’app PC (Windows / Linux)
          </a>
        </div>
      </div>
    </div>
  );
}
