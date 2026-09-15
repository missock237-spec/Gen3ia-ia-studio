"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface Wallet { currency: string; balanceMinor: number; reservedMinor: number; availableMinor: number; welcomeGranted: boolean; }

export default function BillingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => onAuthStateChanged(auth, async (current) => {
    setUser(current);
    if (!current) { setLoading(false); return; }
    try {
      const token = await current.getIdToken();
      const response = await fetch("/api/billing/wallet", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Impossible de charger le solde.");
      setWallet(data.wallet);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger le solde.");
    } finally { setLoading(false); }
  }), []);

  const topUp = async () => {
    if (!user) return;
    setPaying(true); setError("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/billing/topup", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Impossible d'ouvrir le paiement Chariow.");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'ouvrir le paiement.");
      setPaying(false);
    }
  };

  if (!user && !loading) return <main style={styles.main}><section style={styles.card}><h1>Financement Gen3ia</h1><p>Connectez-vous pour consulter votre solde et recharger votre compte.</p></section></main>;
  const amount = wallet ? (wallet.balanceMinor / 100).toFixed(2) : "0.00";
  const reserved = wallet ? (wallet.reservedMinor / 100).toFixed(2) : "0.00";
  const available = wallet ? (wallet.availableMinor / 100).toFixed(2) : "0.00";
  const empty = Boolean(wallet && wallet.availableMinor <= 0);

  return <main style={styles.main}>
    <section style={styles.card}>
      <div style={styles.eyebrow}>GEN3IA WALLET</div>
      <h1>Solde de votre compte</h1>
      {wallet?.welcomeGranted && <div style={styles.welcome}>🎁 Solde de démonstration : 5,00 {wallet.currency} offerts une seule fois à l'ouverture du compte.</div>}
      <div style={styles.balance}>{loading ? "…" : `${amount} ${wallet?.currency ?? "EUR"}`}</div>
      <p style={styles.muted}>Disponible : {available} {wallet?.currency ?? "EUR"} · Réservé : {reserved} {wallet?.currency ?? "EUR"}</p>
      {empty && <div style={styles.locked}>🔒 <strong>Agents IA arrêtés</strong><br />Votre solde disponible est à 0. Rechargez votre portefeuille pour reprendre les exécutions.</div>}
      <button onClick={topUp} disabled={paying || loading} style={styles.button}>{paying ? "Ouverture du paiement…" : "Recharger avec Chariow"}</button>
      <p style={styles.note}>Le solde de démonstration est accordé une seule fois. Après épuisement, vous devez recharger votre portefeuille. Les exécutions sont facturées selon l'utilisation réelle et aucune nouvelle allocation gratuite n'est créée automatiquement.</p>
      <p style={styles.note}>Le solde est crédité uniquement après confirmation du paiement par le webhook signé de Chariow.</p>
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
  button: { marginTop: 24, width: "100%", border: 0, borderRadius: 12, padding: "14px 18px", fontWeight: 700, cursor: "pointer", background: "#6d5dfc", color: "white" },
  error: { marginTop: 16, color: "#ff7b8a" },
};
