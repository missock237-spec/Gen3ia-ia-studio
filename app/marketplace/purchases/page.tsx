"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FeatureAuthGate } from "@/components/auth/feature-auth-gate";
import { useAuth } from "@/lib/firebase/auth-client";

type Purchase = {
  id: string;
  extensionId: string;
  provider: "wallet" | "chariow";
  amountMinor: number;
  currency: string;
  status: string;
  kind: "one_time" | "subscription";
  createdAt: number;
  paidAt?: number | null;
  extension?: { id: string; name: string; developerName: string; latestVersion: string | null } | null;
};

type License = {
  id: string;
  licenseKey: string;
  extensionId: string;
  purchaseId: string | null;
  status: string;
  expiresAt: number | null;
  createdAt: number;
  extension?: { id: string; name: string; developerName: string; latestVersion: string | null } | null;
};

function money(amountMinor: number, currency: string) {
  return `${(amountMinor / 100).toLocaleString("fr-FR")} ${currency}`;
}

function date(value: number) {
  return value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export default function MarketplacePurchasesPage() {
  return (
    <FeatureAuthGate feature="vos achats et licences">
      <PurchasesContent />
    </FeatureAuthGate>
  );
}

function PurchasesContent() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [purchaseResponse, licenseResponse] = await Promise.all([
          fetch("/api/extensions/purchases?limit=100", { headers, cache: "no-store" }),
          fetch("/api/extensions/licenses?limit=100", { headers, cache: "no-store" }),
        ]);
        if (!purchaseResponse.ok || !licenseResponse.ok) throw new Error("Impossible de charger vos achats et licences.");
        const purchaseData = await purchaseResponse.json();
        const licenseData = await licenseResponse.json();
        if (!cancelled) {
          setPurchases(Array.isArray(purchaseData.purchases) ? purchaseData.purchases : []);
          setLicenses(Array.isArray(licenseData.licenses) ? licenseData.licenses : []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de chargement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <main className="min-h-screen bg-[#060812] px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/marketplace" className="text-xs text-violet-300 hover:text-violet-200">← Marketplace</Link>
        <div className="mt-5 rounded-[30px] border border-white/10 bg-gradient-to-br from-violet-500/[.12] via-white/[.025] to-cyan-400/[.06] p-7 sm:p-9">
          <p className="text-[10px] font-bold tracking-[.28em] text-violet-300">GEN3IA / MES ACHATS</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Achats, licences et accès</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">Retrouvez vos transactions et vos licences activées. Les droits d'utilisation sont déterminés côté serveur après validation du paiement.</p>
        </div>

        {error && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}</div>}
        {loading ? <div className="mt-6 grid gap-4 md:grid-cols-2"><div className="h-48 animate-pulse rounded-3xl bg-white/[.04]" /><div className="h-48 animate-pulse rounded-3xl bg-white/[.04]" /></div> : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">Licences actives</h2><p className="mt-1 text-xs text-white/35">{licenses.length} licence{licenses.length > 1 ? "s" : ""}</p></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] text-emerald-300">Serveur</span></div>
              <div className="mt-5 space-y-3">
                {licenses.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/35">Aucune licence enregistrée.</p> : licenses.map((license) => (
                  <div key={license.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{license.extension?.name ?? license.extensionId}</p><p className="mt-1 text-xs text-white/35">{license.extension?.developerName ?? "Développeur"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] ${license.status === "active" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/5 text-white/40"}`}>{license.status}</span></div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-white/35"><span>Créée<br /><b className="text-white/65">{date(license.createdAt)}</b></span><span>Expiration<br /><b className="text-white/65">{license.expiresAt ? date(license.expiresAt) : "Sans expiration"}</b></span></div>
                    <div className="mt-3 rounded-xl bg-white/[.035] px-3 py-2 font-mono text-[10px] text-white/45 break-all">{license.licenseKey}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[.025] p-5">
              <div><h2 className="font-semibold">Historique des achats</h2><p className="mt-1 text-xs text-white/35">{purchases.length} transaction{purchases.length > 1 ? "s" : ""}</p></div>
              <div className="mt-5 space-y-3">
                {purchases.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/35">Aucun achat enregistré.</p> : purchases.map((purchase) => (
                  <div key={purchase.id} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{purchase.extension?.name ?? purchase.extensionId}</p><p className="mt-1 text-xs text-white/35">{purchase.kind === "subscription" ? "Abonnement" : "Achat unique"} · {purchase.provider === "chariow" ? "Chariow" : "Wallet"}</p></div><b className="text-sm">{money(purchase.amountMinor, purchase.currency)}</b></div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-white/35"><span>{date(purchase.paidAt ?? purchase.createdAt)}</span><span className={`rounded-full px-2.5 py-1 ${purchase.status === "paid" ? "bg-emerald-400/10 text-emerald-300" : purchase.status === "refunded" ? "bg-red-400/10 text-red-300" : "bg-white/5 text-white/45"}`}>{purchase.status}</span></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
