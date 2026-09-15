import { randomUUID } from "node:crypto";
import { adminStorage } from "@/lib/firebase/admin";

const MAX_FILE_BYTES = Number(process.env.GEN3IA_MAX_PERMANENT_FILE_BYTES ?? 100 * 1024 * 1024);
const bucket = () => adminStorage.bucket();

function safeName(name: string) {
  const cleaned = name.normalize("NFKC").replace(/[\\/\0]/g, "_").replace(/[^\p{L}\p{N}._ -]/gu, "_").trim();
  if (!cleaned || cleaned === "." || cleaned === "..") throw new Error("Invalid file name.");
  return cleaned.slice(0, 180);
}
function objectPath(userId: string, name: string) { return `users/${userId}/permanent/${randomUUID()}-${safeName(name)}`; }

export async function storePermanentFile(params: { userId: string; filename: string; content: Buffer; contentType?: string; metadata?: Record<string, string> }) {
  if (!params.userId?.trim()) throw new Error("Permanent storage requires userId.");
  if (params.content.length === 0 || params.content.length > MAX_FILE_BYTES) throw new Error("File exceeds the permanent storage limit.");
  const path = objectPath(params.userId, params.filename);
  const file = bucket().file(path);
  await file.save(params.content, { resumable: params.content.length > 5 * 1024 * 1024, contentType: params.contentType || "application/octet-stream", metadata: { metadata: { userId: params.userId, originalName: safeName(params.filename), ...(params.metadata ?? {}) } }, validation: "crc32c" });
  return { path, filename: safeName(params.filename), sizeBytes: params.content.length, contentType: params.contentType || "application/octet-stream" };
}

export async function listPermanentFiles(userId: string, limit = 100) {
  const [files] = await bucket().getFiles({ prefix: `users/${userId}/permanent/`, maxResults: Math.min(Math.max(limit, 1), 500) });
  return Promise.all(files.map(async (file) => {
    const [metadata] = await file.getMetadata();
    return { path: file.name, filename: String(metadata.metadata?.originalName ?? file.name.split("/").pop()), sizeBytes: Number(metadata.size ?? 0), contentType: String(metadata.contentType ?? "application/octet-stream"), updatedAt: String(metadata.updated ?? "") };
  }));
}

export async function createPermanentDownloadUrl(userId: string, path: string) {
  if (!path.startsWith(`users/${userId}/permanent/`) || path.includes("..")) throw new Error("Invalid permanent storage path.");
  const [url] = await bucket().file(path).getSignedUrl({ action: "read", expires: Date.now() + 10 * 60 * 1000 });
  return url;
}

export async function deletePermanentFile(userId: string, path: string) {
  if (!path.startsWith(`users/${userId}/permanent/`) || path.includes("..")) throw new Error("Invalid permanent storage path.");
  await bucket().file(path).delete({ ignoreNotFound: true });
}
