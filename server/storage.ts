// S3-compatible object storage for Railway production (Cloudflare R2, AWS S3, etc.).
// Forge storage remains as a development fallback until S3 variables are configured.

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function hasS3Config() {
  return Boolean(ENV.s3Endpoint && ENV.s3Bucket && ENV.s3AccessKeyId && ENV.s3SecretAccessKey);
}

function getS3() {
  if (!hasS3Config()) throw new Error("S3/R2 storage config missing");
  return new S3Client({
    endpoint: ENV.s3Endpoint,
    region: ENV.s3Region || "auto",
    forcePathStyle: true,
    credentials: { accessKeyId: ENV.s3AccessKeyId, secretAccessKey: ENV.s3SecretAccessKey },
  });
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) throw new Error("Storage config missing: configure S3/R2 or BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY");
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string) { return relKey.replace(/^\/+/, ""); }
function appendHashSuffix(relKey: string) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string | NodeJS.ReadableStream,
  contentType = "application/octet-stream",
  contentLength?: number,
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  if (hasS3Config()) {
    const body = typeof data === "string" || Buffer.isBuffer(data) || data instanceof Uint8Array ? Buffer.from(data as any) : data as any;
    await new Upload({ client: getS3(), params: { Bucket: ENV.s3Bucket, Key: key, Body: body, ContentType: contentType, ...(contentLength ? { ContentLength: contentLength } : {}) }, partSize: 16 * 1024 * 1024, queueSize: 3 }).done();
    return { key, url: `/manus-storage/${key}` };
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  const presignUrl = new URL("v1/storage/presign/put", `${forgeUrl}/`);
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!presignResp.ok) throw new Error(`Storage presign failed (${presignResp.status})`);
  const { url: s3Url } = await presignResp.json() as { url: string };
  const body = typeof data === "string" || Buffer.isBuffer(data) || data instanceof Uint8Array ? new Blob([data as any], { type: contentType }) : data as any;
  const uploadResp = await fetch(s3Url, { method: "PUT", headers: { "Content-Type": contentType, ...(contentLength ? { "Content-Length": String(contentLength) } : {}) }, body, ...(typeof body?.pipe === "function" ? { duplex: "half" as const } : {}) });
  if (!uploadResp.ok) throw new Error(`Storage upload failed (${uploadResp.status})`);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string) { const key = normalizeKey(relKey); return { key, url: `/manus-storage/${key}` }; }

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (hasS3Config()) return getSignedUrl(getS3(), new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }), { expiresIn: 3600 });
  const { forgeUrl, forgeKey } = getForgeConfig();
  const getUrl = new URL("v1/storage/presign/get", `${forgeUrl}/`);
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!resp.ok) throw new Error(`Storage signed URL failed (${resp.status})`);
  const { url } = await resp.json() as { url: string };
  return url;
}
