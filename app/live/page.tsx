import { headers } from "next/headers";

import { PcOnlyNotice } from "@/components/pc-only-notice";
import { detectDeviceFromHeaders } from "@/lib/device/detect";

import { LiveDashboard } from "./live-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agent Live",
};

/**
 * Page Agent Live — reservee aux ordinateurs.
 *
 * Double protection :
 * 1. Serveur : la detection d'appareils (headers poses par le proxy, repli
 *    sur l'User-Agent brut) bloque mobile et tablette ici meme.
 * 2. API : POST /api/live/sessions refuse aussi tout appareil non desktop.
 */
export default async function LivePage() {
  const device = detectDeviceFromHeaders(await headers());

  if (!device.isLiveCapable) {
    return <PcOnlyNotice deviceType={device.type} />;
  }

  return (
    <div className="min-h-full bg-[#f6f4ef] p-5 text-neutral-900 md:p-8">
      <div className="mx-auto max-w-6xl">
        <LiveDashboard />
      </div>
    </div>
  );
}
