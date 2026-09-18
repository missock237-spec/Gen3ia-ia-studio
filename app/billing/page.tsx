"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { authFetch, useSessionAvailable } from "@/lib/firebase/auth-client";

interface Wallet {
  currency: string;
  balanceMinor: number;
  reservedMinor: number;
  availableMinor: number;
  welcomeGranted: boolean;
  welcomeAmountMinor: number;
}

const COUNTRY_CODES = [
  { code: "CM", label: "Cameroun (+237)" },
  { code: "CI", label: "Côte d'Ivoire (+225)" },
  { code: "SN", label: "Sénégal (+221)" },
  { code: "GA", label: "Gabon (+241)" },
  { code: "CD", label: "RD Congo (+243)" },
  { code: "FR", label: "France (+33)" },
  { code: "BE", label: "Belgique (+32)" },
  { code: "US", label: "États-Unis (+1)" },
];

type TopupPhase = "idle" | "creating" | "phone" | "redirecting";

export default function BillingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState("");
  const [phase, setPhase] = useState<TopupPhase>("idle");
  const [countryCode, setCountryCode] = useState("CM");
  const [phoneNumber, setPhoneNumber] = useState("");
  const sessionDisponible = useSessionAvailable();

  const loadWallet = useCallback(async () => {
    // authFetch : ID token Firebase si disponible, sinon cookie de session.
    const response = await authFetch("/api/billing/wallet", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Impossible de charger le solde.");
    setWallet(data.wallet);
  }, []);

  useEffect(() => onAuthStateChanged(auth, async (current) => {
    setUser(current);
    // L'etat Firebase client peut etre perdu (webviews mobiles) : on charge
    // quand meme le solde via le cookie de session serveur.
    if (!current) {
      try { await loadWallet(); } catch { /* aucune session : page de connexion affichee */ }
      finally { setLoading(false); }
      return;
    }
    try {
      await loadWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le solde.");
    } finally { setLoading(false); }
  }), [loadWallet]);

  // Retour de paiement Chariow : ?topup=success&sale=sal_xxx
  useEffect(() => {
    if (sessionDisponible === false) return;
    const params = new URLSearchParams(window.location.search);
    const topup = params.get("topup");
    const saleId = params.get("sale");
    if (topup !== "success") return;

    window.history.replaceState({}, "", "/billing");
    if (!saleId) {
      // Differe d'un tick pour eviter un rendu en cascade synchrone (set-state-in-effect).
      const timer = setTimeout(() => setNotice("Paiement terminé. Le crédit apparaît dès la confirmation Chariow."), 0);
      return () => clearTimeout(timer);
    }
    (async () => {
      try {
        const response = await authFetch("/api/billing/topup/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saleId }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Vérification du paiement impossible.");
        setWallet(data.wallet);
        if (data.credited) {
          setSuccess(`Recharge confirmée : +${((data.wallet.balanceMinor ?? 0) / 100).toLocaleString("fr-FR")} ${data.wallet.currency} crédités sur votre portefeuille.`);
        } else {
          setNotice(data.reason ?? "Paiement reçu. Le crédit est en cours de confirmation.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Vérification du paiement impossible.");
      }
    })();
  }, [user]);

  const startTopup = async (phone?: { number: string; country_code: string }) => {
    if (sessionDisponible === false) return;
    setPhase(phone ? "redirecting" : "creating");
    setError(""); setNotice(""); setSuccess("");
    try {
      const response = await authFetch("/api/billing/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(phone ? { phone } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Impossible d'ouvrir le paiement Chariow.");
      if (data.requiresDetails) { setPhase("phone"); return; }
      if (!data.checkoutUrl) throw new Error("Chariow n'a pas renvoyé de page de paiement.");
      setPhase("redirecting");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'ouvrir le paiement.");
      setPhase("idle");
    }
  };

  const submitPhone = (event: React.FormEvent) => {
    event.preventDefault();
    const digits = phoneNumber.replace(/\D/g, "");
    if (!digits) { setError("Saisissez votre numéro de téléphone Mobile Money."); return; }
    startTopup({ number: digits, country_code: countryCode });
  };

  if (sessionDisponible === false) {
    return <main style={styles.main}><section style={styles.card}><h1>Financement Gen3ia</h1><p>Connectez-vous pour consulter votre solde et recharger votre compte.</p></section></main>;
  }

  const currency = wallet?.currency ?? "XAF";
  const amount = wallet ? (wallet.balanceMinor / 100).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : "0";
  const reserved = wallet ? (wallet.reservedMinor / 100).toLocaleString("fr-FR") : "0";
  const available = wallet ? (wallet.availableMinor / 100).toLocaleString("fr-FR") : "0";
  const empty = Boolean(wallet && wallet.availableMinor <= 0);
  const welcome = wallet ? (wallet.welcomeAmountMinor / 100).toLocaleString("fr-FR") : "0";
  const busy = phase === "creating" || phase === "redirecting";

  return <main style={styles.main}>
    <section style={styles.card}>
      <div style={styles.eyebrow}>GEN3IA WALLET</div>
      <h1>Solde de votre compte</h1>
      {wallet?.welcomeGranted && <div style={styles.welcome}>🎁 Solde de démonstration : {welcome} {currency} offerts une seule fois à l&apos;ouverture du compte.</div>}
      <div style={styles.balance}>{loading ? "…" : `${amount} ${currency}`}</div>
      <p style={styles.muted}>Disponible : {available} {currency} · Réservé : {reserved} {currency}</p>
      {empty && <div style={styles.locked}>🔒 <strong>Agents IA arrêtés</strong><br />Votre solde disponible est à 0. Rechargez votre portefeuille pour reprendre les exécutions.</div>}

      {phase === "phone"
        ? <form onSubmit={submitPhone} style={styles.phoneForm}>
            <label style={styles.label} htmlFor="country">Pays du numéro</label>
            <select id="country" value={countryCode} onChange={(e) => setCountryCode(e.target.value)} style={styles.input}>
              {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <label style={styles.label} htmlFor="phone">Numéro Mobile Money (sans indicatif)</label>
            <input id="phone" inputMode="numeric" autoComplete="tel-national" placeholder="6 90 00 00 00" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} style={styles.input} />
            <button type="submit" disabled={busy} style={styles.button}>{busy ? "Ouverture du paiement…" : "Payer avec Chariow (Mobile Money)"}</button>
          </form>
        : <button onClick={() => startTopup()} disabled={busy || loading} style={styles.button}>{busy ? "Ouverture du paiement…" : "Recharger avec Chariow"}</button>}

      {success && <p style={styles.success}>{success}</p>}
      {notice && <p style={styles.notice}>{notice}</p>}
      <p style={styles.note}>Le paiement s&apos;effectue via la boutique Chariow (Mobile Money, carte ou wallet selon votre pays). Le solde est crédité après confirmation du paiement par Chariow — automatiquement via le webhook signé, ou à votre retour sur cette page.</p>
      <p style={styles.note}>Le solde de démonstration est accordé une seule fois. Après épuisement, vous devez recharger votre portefeuille. Les exécutions sont facturées selon l&apos;utilisation réelle et aucune nouvelle allocation gratuite n&apos;est créée automatiquement.</p>
      {error && <p style={styles.error}>{error}</p>}
    </section>
  </main>;
}

const styles: Record<string, CSSProperties> = {
  main: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#080b14", color: "#f5f7ff" },
  card: { width: "100%", maxWidth: 620, padding: 32, borderRadius: 24, border: "1px solid #242a3d", background: "#101522", boxShadow: "0 20px 70px rgba(0,0,0,.35)" },
  eyebrow: { fontSize: 12, letterSpacing: 2, opacity: .65, marginBottom: 10 },
  welcome: { marginTop: 18, padding: 14, borderRadius: 12, background: "#17213a", border: "1px solid #2c3d67", fontSize: 14, lineHeight: 1.5 },
  balance: { fontSize: 44, fontWeight: 800, margin: "24px 0 8px" },
  muted: { opacity: .7 },
  locked: { marginTop: 18, padding: 16, borderRadius: 12, background: "#351923", border: "1px solid #6a3040", color: "#ffd6dc", lineHeight: 1.5 },
  note: { marginTop: 20, fontSize: 13, lineHeight: 1.6, opacity: .6 },
  phoneForm: { marginTop: 24, display: "grid", gap: 10 },
  label: { fontSize: 13, opacity: .75 },
  input: { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: "1px solid #2c3550", background: "#0b1120", color: "#f5f7ff", fontSize: 15 },
  button: { marginTop: 8, width: "100%", border: 0, borderRadius: 12, padding: "14px 18px", fontWeight: 700, cursor: "pointer", background: "#6d5dfc", color: "white" },
  success: { marginTop: 16, padding: 12, borderRadius: 10, background: "#12301f", border: "1px solid #2e5e40", color: "#9ff0bb", lineHeight: 1.5 },
  notice: { marginTop: 16, padding: 12, borderRadius: 10, background: "#17213a", border: "1px solid #2c3d67", color: "#c9d6ff", lineHeight: 1.5 },
  error: { marginTop: 16, color: "#ff7b8a" },
};
