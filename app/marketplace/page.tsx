"use client";

import { FeatureAuthGate } from "@/components/auth/feature-auth-gate";
import { MarketplaceHub } from "@/components/marketplace/marketplace-hub";
import { useSessionAvailable } from "@/lib/firebase/auth-client";

export default function MarketplacePage() {
  // Session Firebase OU cookie de session serveur : l'une des deux suffit
  // pour parcourir, acheter et installer des extensions.
  const sessionDisponible = useSessionAvailable();

  if (sessionDisponible !== true) {
    return (
      <FeatureAuthGate
        feature="Marketplace Gen3ia"
        description="Connectez-vous pour découvrir, acheter, installer et gérer les extensions de vos agents."
      >
        <span />
      </FeatureAuthGate>
    );
  }

  return <MarketplaceHub />;
}
