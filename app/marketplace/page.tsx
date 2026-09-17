"use client";

import { useAuth } from "@/lib/firebase/auth-client";
import { FeatureAuthGate } from "@/components/auth/feature-auth-gate";
import { MarketplaceHub } from "@/components/marketplace/marketplace-hub";

export default function MarketplacePage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
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
