import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase/admin";
import { compareSemver, type ExtensionManifest } from "./manifest";
import { computeRevenueSplit } from "./pricing";

/**
 * Firestore repository for the Gen3ia Extension Platform.
 *
 * Collections (mirroring the domain model requested for Prisma, adapted to the
 * existing Firestore-first architecture of Gen3ia):
 * - developers                  (DeveloperProfile)
 * - developerApiKeys            (SDK/API keys, doc id = sha256(key))
 * - extensions                  (Extension)
 * - extensionVersions           (ExtensionVersion, doc id "<id>@<version>")
 * - extensionInstallations      (ExtensionInstallation, doc id "<id>__<uid>")
 * - extensionEntitlements       (Entitlement, doc id "<id>__<uid>")
 * - extensionPurchases          (Purchase)
 * - extensionLicenses           (License)
 * - extensionReviews            (Review, doc id "<id>__<uid>")
 * - extensionReports            (Report / signalement)
 * - extensionExecutions         (ExtensionExecution log)
 * - extensionUsageCounters      (per user/extension/day quota counters)
 * - extensionSecrets            (server-side secret values, never client-read)
 * - developerRevenue            (Revenue entries)
 */

export const EXTENSION_STATUS = ["draft", "pending", "approved", "rejected", "suspended"] as const;
export type ExtensionStatus = (typeof EXTENSION_STATUS)[number];
export const VERSION_STATUS = ["draft", "pending", "approved", "rejected"] as const;
export type VersionStatus = (typeof VERSION_STATUS)[number];

export interface ExtensionDoc {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  developerId: string;
  developerName: string;
  status: ExtensionStatus;
  permissions: string[];
  pricing: ExtensionManifest["pricing"];
  latestVersion: string | null;
  approvedVersion: string | null;
  stats: { installs: number; ratingSum: number; ratingCount: number; executions: number };
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface ExtensionVersionDoc {
  id: string;
  extensionId: string;
  version: string;
  changelog: string;
  status: VersionStatus;
  manifest: ExtensionManifest;
  submittedAt?: number | null;
  reviewedAt?: number | null;
  reviewNote?: string | null;
  createdAt: number;
}

export interface InstallationDoc {
  id: string;
  extensionId: string;
  userId: string;
  version: string;
  status: "active" | "disabled" | "uninstalled";
  permissionsGranted: string[];
  settings: Record<string, string | number | boolean>;
  installedAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

const COL = {
  developers: "developers",
  apiKeys: "developerApiKeys",
  extensions: "extensions",
  versions: "extensionVersions",
  installations: "extensionInstallations",
  entitlements: "extensionEntitlements",
  purchases: "extensionPurchases",
  licenses: "extensionLicenses",
  reviews: "extensionReviews",
  reports: "extensionReports",
  executions: "extensionExecutions",
  usage: "extensionUsageCounters",
  secrets: "extensionSecrets",
  revenue: "developerRevenue",
} as const;

function now() {
  return Date.now();
}

function extensionRef(id: string) {
  return adminDb.collection(COL.extensions).doc(id);
}

function versionRef(extensionId: string, version: string) {
  return adminDb.collection(COL.versions).doc(`${extensionId}@${version}`);
}

function installationRef(extensionId: string, userId: string) {
  return adminDb.collection(COL.installations).doc(`${extensionId}__${userId}`);
}

function entitlementRef(extensionId: string, userId: string) {
  return adminDb.collection(COL.entitlements).doc(`${extensionId}__${userId}`);
}

// ---------------------------------------------------------------- developers

export async function ensureDeveloperProfile(userId: string, displayName: string) {
  const ref = adminDb.collection(COL.developers).doc(userId);
  await ref.set(
    {
      userId,
      displayName: displayName.slice(0, 120),
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    },
    { merge: true },
  );
  const snap = await ref.get();
  return snap.data() as { userId: string; displayName: string; createdAt: number };
}

// ---------------------------------------------------------------- extensions

export async function createExtension(
  developer: { userId: string; displayName: string },
  manifest: ExtensionManifest,
): Promise<ExtensionDoc> {
  const ref = extensionRef(manifest.id);
  const batch = adminDb.batch();
  const timestamp = now();
  batch.create(ref, {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    category: manifest.category,
    tags: manifest.tags ?? [],
    developerId: developer.userId,
    developerName: developer.displayName.slice(0, 120),
    status: "draft" as ExtensionStatus,
    permissions: manifest.permissions,
    pricing: manifest.pricing,
    latestVersion: manifest.version,
    approvedVersion: null,
    stats: { installs: 0, ratingSum: 0, ratingCount: 0, executions: 0 },
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  });
  batch.create(versionRef(manifest.id, manifest.version), {
    id: `${manifest.id}@${manifest.version}`,
    extensionId: manifest.id,
    version: manifest.version,
    changelog: "Initial version.",
    status: "draft" as VersionStatus,
    manifest,
    submittedAt: null,
    reviewedAt: null,
    reviewNote: null,
    createdAt: timestamp,
  });
  await batch.commit();
  const snap = await ref.get();
  return snap.data() as ExtensionDoc;
}

export async function getExtension(id: string): Promise<ExtensionDoc | null> {
  const snap = await extensionRef(id).get();
  return (snap.data() as ExtensionDoc | undefined) ?? null;
}

export async function listApprovedExtensions(options: {
  q?: string;
  category?: string;
  limit?: number;
}): Promise<ExtensionDoc[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection(COL.extensions)
    .where("status", "==", "approved")
    .where("deletedAt", "==", null)
    .orderBy("stats.installs", "desc")
    .limit(Math.min(options.limit ?? 48, 100));
  if (options.category) query = query.where("category", "==", options.category);
  const snap = await query.get();
  const docs = snap.docs.map((doc) => doc.data() as ExtensionDoc);
  const needle = options.q?.trim().toLowerCase();
  if (!needle) return docs;
  return docs.filter(
    (doc) =>
      doc.name.toLowerCase().includes(needle) ||
      doc.description.toLowerCase().includes(needle) ||
      doc.tags.some((tag) => tag.toLowerCase().includes(needle)),
  );
}

export async function listExtensionsByDeveloper(developerId: string): Promise<ExtensionDoc[]> {
  const snap = await adminDb
    .collection(COL.extensions)
    .where("developerId", "==", developerId)
    .where("deletedAt", "==", null)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return snap.docs.map((doc) => doc.data() as ExtensionDoc);
}

export async function softDeleteExtension(id: string, developerId: string): Promise<void> {
  const doc = await getExtension(id);
  if (!doc) throw new Error("Extension not found.");
  if (doc.developerId !== developerId) throw new Error("Only the developer may delete this extension.");
  await extensionRef(id).update({ deletedAt: now(), status: "suspended", updatedAt: now() });
}

// ---------------------------------------------------------------- versions

export async function createVersion(
  developerId: string,
  manifest: ExtensionManifest,
  changelog: string,
): Promise<ExtensionVersionDoc> {
  const extension = await getExtension(manifest.id);
  if (!extension) throw new Error("Extension not found.");
  if (extension.developerId !== developerId) throw new Error("Only the developer may add versions.");
  const ref = versionRef(manifest.id, manifest.version);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) throw new Error(`Version ${manifest.version} already exists.`);
    const timestamp = now();
    tx.create(ref, {
      id: `${manifest.id}@${manifest.version}`,
      extensionId: manifest.id,
      version: manifest.version,
      changelog: changelog.slice(0, 2_000),
      status: "draft" as VersionStatus,
      manifest,
      submittedAt: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: timestamp,
    });
    if (!extension.latestVersion || compareSemver(manifest.version, extension.latestVersion) > 0) {
      tx.update(extensionRef(manifest.id), { latestVersion: manifest.version, updatedAt: timestamp });
    }
  });
  const snap = await ref.get();
  return snap.data() as ExtensionVersionDoc;
}

export async function getVersion(extensionId: string, version: string): Promise<ExtensionVersionDoc | null> {
  const snap = await versionRef(extensionId, version).get();
  return (snap.data() as ExtensionVersionDoc | undefined) ?? null;
}

export async function listVersions(extensionId: string): Promise<ExtensionVersionDoc[]> {
  const snap = await adminDb
    .collection(COL.versions)
    .where("extensionId", "==", extensionId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => doc.data() as ExtensionVersionDoc);
}

export async function getLatestApprovedVersion(extensionId: string): Promise<ExtensionVersionDoc | null> {
  const extension = await getExtension(extensionId);
  if (!extension?.approvedVersion) return null;
  return getVersion(extensionId, extension.approvedVersion);
}

export async function submitVersion(
  developerId: string,
  extensionId: string,
  version: string,
): Promise<ExtensionVersionDoc> {
  const extension = await getExtension(extensionId);
  if (!extension) throw new Error("Extension not found.");
  if (extension.developerId !== developerId) throw new Error("Only the developer may submit this extension.");
  const ref = versionRef(extensionId, version);
  await ref.update({ status: "pending", submittedAt: now() });
  await extensionRef(extensionId).update({ status: "pending", updatedAt: now() });
  const snap = await ref.get();
  return snap.data() as ExtensionVersionDoc;
}

/** Automated + manual review decision (admin). */
export async function reviewVersion(params: {
  extensionId: string;
  version: string;
  decision: "approved" | "rejected";
  note?: string;
}): Promise<void> {
  const timestamp = now();
  await adminDb.runTransaction(async (tx) => {
    const versionSnap = await tx.get(versionRef(params.extensionId, params.version));
    if (!versionSnap.exists) throw new Error("Version not found.");
    tx.update(versionRef(params.extensionId, params.version), {
      status: params.decision,
      reviewedAt: timestamp,
      reviewNote: params.note?.slice(0, 1_000) ?? null,
    });
    if (params.decision === "approved") {
      tx.update(extensionRef(params.extensionId), {
        status: "approved",
        approvedVersion: params.version,
        updatedAt: timestamp,
      });
    } else {
      tx.update(extensionRef(params.extensionId), { status: "rejected", updatedAt: timestamp });
    }
  });
}

export async function suspendExtension(extensionId: string, note?: string): Promise<void> {
  await extensionRef(extensionId).update({ status: "suspended", updatedAt: now(), reviewNote: note ?? null });
}

export async function listPendingVersions(limit = 50): Promise<ExtensionVersionDoc[]> {
  const snap = await adminDb
    .collection(COL.versions)
    .where("status", "==", "pending")
    .orderBy("submittedAt", "asc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => doc.data() as ExtensionVersionDoc);
}

// ---------------------------------------------------------------- installations

export async function installExtension(params: {
  userId: string;
  extension: ExtensionDoc;
  version: string;
  permissionsGranted: string[];
  settings?: Record<string, string | number | boolean>;
}): Promise<InstallationDoc> {
  const timestamp = now();
  const ref = installationRef(params.extension.id, params.userId);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data: InstallationDoc = {
      id: `${params.extension.id}__${params.userId}`,
      extensionId: params.extension.id,
      userId: params.userId,
      version: params.version,
      status: "active",
      permissionsGranted: params.permissionsGranted,
      settings: params.settings ?? {},
      installedAt: snap.exists ? Number(snap.get("installedAt")) : timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    tx.set(ref, data);
    tx.update(extensionRef(params.extension.id), { "stats.installs": FieldValue.increment(1), updatedAt: timestamp });
  });
  const snap = await ref.get();
  return snap.data() as InstallationDoc;
}

export async function getInstallation(extensionId: string, userId: string): Promise<InstallationDoc | null> {
  const snap = await installationRef(extensionId, userId).get();
  return (snap.data() as InstallationDoc | undefined) ?? null;
}

export async function uninstallExtension(extensionId: string, userId: string): Promise<void> {
  const timestamp = now();
  await adminDb.runTransaction(async (tx) => {
    const ref = installationRef(extensionId, userId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("This extension is not installed.");
    if (snap.get("status") === "uninstalled") return;
    tx.update(ref, { status: "uninstalled", deletedAt: timestamp, updatedAt: timestamp });
    tx.update(extensionRef(extensionId), { "stats.installs": FieldValue.increment(-1), updatedAt: timestamp });
  });
}

export async function updateInstallationVersion(extensionId: string, userId: string, version: string): Promise<InstallationDoc> {
  const ref = installationRef(extensionId, userId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("This extension is not installed.");
  const latest = await getLatestApprovedVersion(extensionId);
  if (!latest) throw new Error("No approved version available.");
  if (version !== latest.version && compareSemver(version, latest.version) >= 0) {
    throw new Error("Requested version is not older than the latest approved version.");
  }
  await ref.update({ version: latest.version, permissionsGranted: latest.manifest.permissions, updatedAt: now() });
  const updated = await ref.get();
  return updated.data() as InstallationDoc;
}

export async function listInstalledExtensions(userId: string): Promise<InstallationDoc[]> {
  const snap = await adminDb
    .collection(COL.installations)
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .limit(100)
    .get();
  return snap.docs.map((doc) => doc.data() as InstallationDoc);
}

export async function updateInstallationSettings(
  extensionId: string,
  userId: string,
  settings: Record<string, string | number | boolean>,
): Promise<void> {
  await installationRef(extensionId, userId).update({ settings, updatedAt: now() });
}

// ---------------------------------------------------------------- entitlements / purchases / licenses

export interface EntitlementDoc {
  id: string;
  extensionId: string;
  userId: string;
  status: "active" | "expired" | "revoked";
  source: "free" | "purchase" | "subscription" | "grant";
  purchaseId?: string | null;
  expiresAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export async function upsertEntitlement(params: {
  extensionId: string;
  userId: string;
  source: EntitlementDoc["source"];
  purchaseId?: string | null;
  expiresAt?: number | null;
}): Promise<EntitlementDoc> {
  const timestamp = now();
  const ref = entitlementRef(params.extensionId, params.userId);
  const payload: EntitlementDoc = {
    id: `${params.extensionId}__${params.userId}`,
    extensionId: params.extensionId,
    userId: params.userId,
    status: "active",
    source: params.source,
    purchaseId: params.purchaseId ?? null,
    expiresAt: params.expiresAt ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await ref.set(payload, { merge: true });
  return payload;
}

export async function getEntitlement(extensionId: string, userId: string): Promise<EntitlementDoc | null> {
  const snap = await entitlementRef(extensionId, userId).get();
  return (snap.data() as EntitlementDoc | undefined) ?? null;
}

export async function revokeEntitlement(extensionId: string, userId: string): Promise<void> {
  await entitlementRef(extensionId, userId).update({ status: "revoked", updatedAt: now() });
}

export interface PurchaseDoc {
  id: string;
  userId: string;
  extensionId: string;
  version?: string;
  provider: "wallet" | "chariow";
  providerRef?: string | null;
  amountMinor: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  kind: "one_time" | "subscription";
  createdAt: number;
  paidAt?: number | null;
}

export async function createExtensionPurchase(input: {
  userId: string;
  extensionId: string;
  provider: PurchaseDoc["provider"];
  amountMinor: number;
  currency: string;
  kind: PurchaseDoc["kind"];
  id?: string;
}): Promise<PurchaseDoc> {
  const ref = input.id ? adminDb.collection(COL.purchases).doc(input.id) : adminDb.collection(COL.purchases).doc();
  const payload: PurchaseDoc = {
    id: ref.id,
    userId: input.userId,
    extensionId: input.extensionId,
    provider: input.provider,
    providerRef: null,
    amountMinor: input.amountMinor,
    currency: input.currency,
    status: "pending",
    kind: input.kind,
    createdAt: now(),
    paidAt: null,
  };
  await ref.create(payload);
  return payload;
}

export async function getExtensionPurchase(id: string): Promise<PurchaseDoc | null> {
  const snap = await adminDb.collection(COL.purchases).doc(id).get();
  return (snap.data() as PurchaseDoc | undefined) ?? null;
}

export async function markPurchasePaid(id: string, providerRef: string): Promise<PurchaseDoc> {
  await adminDb.collection(COL.purchases).doc(id).update({ status: "paid", providerRef, paidAt: now() });
  const snap = await adminDb.collection(COL.purchases).doc(id).get();
  return snap.data() as PurchaseDoc;
}

export async function createLicense(params: {
  purchaseId: string;
  userId: string;
  extensionId: string;
  licenseKey: string;
  expiresAt?: number | null;
}): Promise<void> {
  await adminDb.collection(COL.licenses).doc(params.licenseKey).create({
    licenseKey: params.licenseKey,
    purchaseId: params.purchaseId,
    userId: params.userId,
    extensionId: params.extensionId,
    status: "active",
    expiresAt: params.expiresAt ?? null,
    createdAt: now(),
  });
}

export async function listPurchasesByUser(userId: string, limit = 50): Promise<PurchaseDoc[]> {
  const snap = await adminDb
    .collection(COL.purchases)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => doc.data() as PurchaseDoc);
}

// ---------------------------------------------------------------- reviews & reports

export interface ReviewDoc {
  id: string;
  extensionId: string;
  userId: string;
  rating: number;
  title?: string | null;
  body: string;
  status: "visible" | "hidden";
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export async function upsertReview(params: {
  extensionId: string;
  userId: string;
  rating: number;
  title?: string;
  body: string;
}): Promise<void> {
  const timestamp = now();
  const ref = adminDb.collection(COL.reviews).doc(`${params.extensionId}__${params.userId}`);
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const previous = snap.data() as ReviewDoc;
      tx.update(ref, { rating: params.rating, title: params.title ?? null, body: params.body.slice(0, 4_000), updatedAt: timestamp });
      tx.update(extensionRef(params.extensionId), {
        "stats.ratingSum": FieldValue.increment(params.rating - previous.rating),
        updatedAt: timestamp,
      });
      return;
    }
    tx.create(ref, {
      id: ref.id,
      extensionId: params.extensionId,
      userId: params.userId,
      rating: params.rating,
      title: params.title ?? null,
      body: params.body.slice(0, 4_000),
      status: "visible",
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    } satisfies ReviewDoc as unknown as FirebaseFirestore.DocumentData);
    tx.update(extensionRef(params.extensionId), {
      "stats.ratingSum": FieldValue.increment(params.rating),
      "stats.ratingCount": FieldValue.increment(1),
      updatedAt: timestamp,
    });
  });
}

export async function listReviews(extensionId: string, limit = 20): Promise<ReviewDoc[]> {
  const snap = await adminDb
    .collection(COL.reviews)
    .where("extensionId", "==", extensionId)
    .where("status", "==", "visible")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((doc) => doc.data() as ReviewDoc);
}

export async function createReport(params: {
  extensionId: string;
  userId: string;
  reason: string;
  details?: string;
}): Promise<void> {
  await adminDb.collection(COL.reports).add({
    extensionId: params.extensionId,
    userId: params.userId,
    reason: params.reason.slice(0, 200),
    details: params.details?.slice(0, 2_000) ?? null,
    status: "open",
    createdAt: now(),
  });
}

// ---------------------------------------------------------------- executions & quotas

export async function recordExtensionExecution(params: {
  extensionId: string;
  version: string;
  userId: string;
  toolId: string;
  ok: boolean;
  status: string;
  durationMs: number;
  error?: string;
  executionId?: string;
}): Promise<void> {
  const timestamp = now();
  await Promise.all([
    adminDb.collection(COL.executions).add({
      extensionId: params.extensionId,
      version: params.version,
      userId: params.userId,
      toolId: params.toolId,
      ok: params.ok,
      status: params.status,
      durationMs: params.durationMs,
      error: params.error?.slice(0, 1_000) ?? null,
      executionId: params.executionId ?? null,
      createdAt: timestamp,
    }),
    extensionRef(params.extensionId).update({ "stats.executions": FieldValue.increment(1), updatedAt: timestamp }).catch(() => undefined),
  ]);
}

export async function listExtensionExecutions(params: {
  extensionId: string;
  userId?: string;
  limit?: number;
}): Promise<Array<Record<string, unknown>>> {
  let query: FirebaseFirestore.Query = adminDb
    .collection(COL.executions)
    .where("extensionId", "==", params.extensionId);
  if (params.userId) query = query.where("userId", "==", params.userId);
  const snap = await query.orderBy("createdAt", "desc").limit(Math.min(params.limit ?? 50, 200)).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/** Consumes one execution slot from the daily counter; throws when exceeded. */
export async function consumeExecutionQuota(params: {
  userId: string;
  extensionId: string;
  maxPerDay: number;
}): Promise<{ used: number }> {
  const ref = adminDb
    .collection(COL.usage)
    .doc(`${params.userId}__${params.extensionId}__${new Date().toISOString().slice(0, 10)}`);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used = Number(snap.get("count") ?? 0);
    if (used >= params.maxPerDay) {
      throw new Error(`Daily execution quota reached for this extension (${params.maxPerDay}/day).`);
    }
    tx.set(ref, { count: used + 1, userId: params.userId, extensionId: params.extensionId }, { merge: true });
    return { used: used + 1 };
  });
}

// ---------------------------------------------------------------- secrets (server-side only)

export async function setExtensionSecret(extensionId: string, ref: string, value: string): Promise<void> {
  await adminDb.collection(COL.secrets).doc(`${extensionId}__${ref}`).set({
    extensionId,
    ref,
    value,
    updatedAt: now(),
  });
}

export async function getExtensionSecrets(extensionId: string): Promise<Record<string, string>> {
  const snap = await adminDb.collection(COL.secrets).where("extensionId", "==", extensionId).get();
  const secrets: Record<string, string> = {};
  for (const doc of snap.docs) secrets[String(doc.get("ref"))] = String(doc.get("value") ?? "");
  return secrets;
}

export async function listExtensionSecretRefs(extensionId: string): Promise<string[]> {
  const snap = await adminDb.collection(COL.secrets).where("extensionId", "==", extensionId).get();
  return snap.docs.map((doc) => String(doc.get("ref")));
}

export async function deleteExtensionSecret(extensionId: string, ref: string): Promise<void> {
  await adminDb.collection(COL.secrets).doc(`${extensionId}__${ref}`).delete();
}

// ---------------------------------------------------------------- developer revenue

export async function addDeveloperRevenueEntry(params: {
  purchaseId: string;
  developerId: string;
  extensionId: string;
  grossAmountMinor: number;
  currency: string;
}): Promise<void> {
  const split = computeRevenueSplit(params.grossAmountMinor);
  await adminDb.collection(COL.revenue).doc(params.purchaseId).create({
    purchaseId: params.purchaseId,
    developerId: params.developerId,
    extensionId: params.extensionId,
    grossAmountMinor: split.grossAmountMinor,
    feeMinor: split.feeMinor,
    netAmountMinor: split.netAmountMinor,
    currency: params.currency,
    status: "available",
    createdAt: now(),
  });
}

export async function getDeveloperRevenueSummary(developerId: string): Promise<{
  totalGrossMinor: number;
  totalFeeMinor: number;
  totalNetMinor: number;
  currency: string;
  entries: number;
}> {
  const snap = await adminDb
    .collection(COL.revenue)
    .where("developerId", "==", developerId)
    .orderBy("createdAt", "desc")
    .limit(500)
    .get();
  let totalGrossMinor = 0;
  let totalFeeMinor = 0;
  let totalNetMinor = 0;
  let currency = "XAF";
  for (const doc of snap.docs) {
    totalGrossMinor += Number(doc.get("grossAmountMinor") ?? 0);
    totalFeeMinor += Number(doc.get("feeMinor") ?? 0);
    totalNetMinor += Number(doc.get("netAmountMinor") ?? 0);
    currency = String(doc.get("currency") ?? currency);
  }
  return { totalGrossMinor, totalFeeMinor, totalNetMinor, currency, entries: snap.size };
}

// ---------------------------------------------------------------- API keys

export async function createDeveloperApiKey(params: {
  userId: string;
  keyHash: string;
  prefix: string;
  name: string;
}): Promise<void> {
  await adminDb.collection(COL.apiKeys).doc(params.keyHash).create({
    keyHash: params.keyHash,
    prefix: params.prefix,
    name: params.name.slice(0, 100),
    userId: params.userId,
    status: "active",
    createdAt: now(),
    lastUsedAt: null,
    revokedAt: null,
  });
}

export async function getDeveloperApiKey(keyHash: string) {
  const snap = await adminDb.collection(COL.apiKeys).doc(keyHash).get();
  if (!snap.exists) return null;
  if (snap.get("status") !== "active" || snap.get("revokedAt")) return null;
  return snap.data() as { userId: string; prefix: string; name: string };
}

export async function listDeveloperApiKeys(userId: string) {
  const snap = await adminDb
    .collection(COL.apiKeys)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map((doc) => ({
    prefix: String(doc.get("prefix")),
    name: String(doc.get("name")),
    status: String(doc.get("status")),
    createdAt: Number(doc.get("createdAt")),
  }));
}

export async function revokeDeveloperApiKey(keyHash: string, userId: string): Promise<void> {
  await adminDb.collection(COL.apiKeys).doc(keyHash).update({ status: "revoked", revokedAt: now(), userId });
}
