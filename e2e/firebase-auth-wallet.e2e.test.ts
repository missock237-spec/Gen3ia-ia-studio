import { beforeAll, afterAll, describe, expect, it } from "vitest";

const PROJECT_ID = "demo-gen3ia";
const AUTH_EMULATOR = "127.0.0.1:9099";
const FIRESTORE_EMULATOR = "127.0.0.1:8080";
const TEST_EMAIL = `e2e-${Date.now()}@gen3ia.test`;
const TEST_PASSWORD = "Gen3iaE2E!2026";

process.env.FIREBASE_PROJECT_ID = PROJECT_ID;
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = PROJECT_ID;
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR;
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR;
process.env.GCLOUD_PROJECT = PROJECT_ID;

async function createAndSignIn(): Promise<{ idToken: string; localId: string }> {
  const createResponse = await fetch(
    `http://${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2e`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, returnSecureToken: true }),
    },
  );

  if (createResponse.ok) {
    return (await createResponse.json()) as { idToken: string; localId: string };
  }

  const signInResponse = await fetch(
    `http://${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=e2e`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, returnSecureToken: true }),
    },
  );
  expect(signInResponse.ok).toBe(true);
  return (await signInResponse.json()) as { idToken: string; localId: string };
}

describe("Firebase E2E: inscription -> session -> portefeuille", () => {
  let verifyFirebaseToken: typeof import("@/lib/firebase/auth-server").verifyFirebaseToken;
  let getWallet: typeof import("@/lib/billing/wallet").getWallet;
  let adminDb: typeof import("@/lib/firebase/admin").adminDb;
  let sessionPost: typeof import("@/app/api/auth/session/route").POST;

  beforeAll(async () => {
    ({ verifyFirebaseToken } = await import("@/lib/firebase/auth-server"));
    ({ getWallet } = await import("@/lib/billing/wallet"));
    ({ adminDb } = await import("@/lib/firebase/admin"));
    ({ POST: sessionPost } = await import("@/app/api/auth/session/route"));
  });

  afterAll(async () => {
    const userSnap = await adminDb.collection("users").where("email", "==", TEST_EMAIL).limit(1).get();
    await Promise.all(userSnap.docs.map((doc) => doc.ref.delete()));
  });

  it("inscrit un utilisateur Firebase et obtient un ID token", async () => {
    const { idToken, localId } = await createAndSignIn();
    expect(localId).toMatch(/^.+$/);
    expect(idToken.split(".")).toHaveLength(3);
  });

  it("établit la session via /api/auth/session et crée le profil Firestore", async () => {
    const { idToken, localId } = await createAndSignIn();
    const token = await verifyFirebaseToken(`Bearer ${idToken}`);
    expect(token.uid).toBe(localId);

    const response = await sessionPost(
      new Request("http://localhost/api/auth/session", {
        method: "POST",
        headers: { authorization: `Bearer ${idToken}` },
      }) as never,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      authenticated: boolean;
      user: { uid: string; email: string | null };
      wallet: { currency: string; balanceMinor: number; availableMinor: number };
    };

    expect(body.authenticated).toBe(true);
    expect(body.user.uid).toBe(localId);
    expect(body.user.email).toBe(TEST_EMAIL);
    expect(body.wallet.currency).toBe("XAF");

    const profile = await adminDb.collection("users").doc(localId).get();
    expect(profile.exists).toBe(true);
    expect(profile.get("uid")).toBe(localId);
    expect(profile.get("email")).toBe(TEST_EMAIL);
  });

  it("initialise le portefeuille une seule fois avec le solde d'accueil", async () => {
    const { idToken, localId } = await createAndSignIn();
    const token = await verifyFirebaseToken(`Bearer ${idToken}`);
    expect(token.uid).toBe(localId);

    const first = await getWallet(localId);
    const second = await getWallet(localId);

    expect(first.currency).toBe("XAF");
    expect(first.balanceMinor).toBe(300000);
    expect(first.reservedMinor).toBe(0);
    expect(first.availableMinor).toBe(300000);
    expect(first.welcomeGranted).toBe(true);
    expect(second.balanceMinor).toBe(first.balanceMinor);

    const wallet = await adminDb.collection("userWallets").doc(localId).get();
    const ledger = await adminDb.collection("walletLedger").doc(`welcome_${localId}`).get();
    expect(wallet.exists).toBe(true);
    expect(ledger.exists).toBe(true);
    expect(ledger.get("type")).toBe("welcome_grant");

    const ledgers = await adminDb.collection("walletLedger").where("userId", "==", localId).get();
    expect(ledgers.size).toBe(1);
  });
});
