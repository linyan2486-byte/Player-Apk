import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

export type AdminMedia = {
  publicId: string;
  title: string;
  artist?: string | null;
  kind: "audio" | "video";
  storageKey: string;
  mimeType?: string | null;
  fileSize?: number | null;
  published: number;
  sortOrder: number;
};

async function request(path: string, init?: RequestInit) {
  const token = await Auth.getSessionToken();
  const response = await fetch(`${getApiBaseUrl().replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) },
  });
  if (!response.ok) throw new Error((await response.text()) || `Request failed (${response.status})`);
  return response;
}

export async function listAdminMedia() {
  return (await request("/api/catalog/admin")).json() as Promise<AdminMedia[]>;
}

export async function updateAdminMedia(id: string, patch: Partial<Pick<AdminMedia, "title" | "artist" | "published" | "sortOrder">>) {
  await request(`/api/catalog/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteAdminMedia(id: string) {
  await request(`/api/catalog/${encodeURIComponent(id)}`, { method: "DELETE" });
}
