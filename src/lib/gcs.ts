import "server-only";
import { Storage } from "@google-cloud/storage";

// The service account key is provided as a base64-encoded JSON string (so it can
// live in a single-line env var on Vercel) rather than as a key file on disk.
const KEY_BASE64 = process.env.GCS_SERVICE_ACCOUNT_KEY_BASE64;
const BUCKET_NAME = process.env.GCS_BUCKET_NAME;

let storage: Storage | null = null;
let credentialsProjectId: string | undefined;

function getStorage(): Storage {
  if (storage) return storage;

  if (!KEY_BASE64) {
    throw new Error(
      "GCS_SERVICE_ACCOUNT_KEY_BASE64 is not set. Base64-encode your service account JSON key and set it as an env var."
    );
  }

  let credentials: { project_id?: string; client_email?: string; private_key?: string };
  try {
    const json = Buffer.from(KEY_BASE64, "base64").toString("utf8");
    credentials = JSON.parse(json);
  } catch {
    throw new Error("GCS_SERVICE_ACCOUNT_KEY_BASE64 is not valid base64-encoded JSON.");
  }

  credentialsProjectId = credentials.project_id;

  storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID || credentials.project_id,
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  });

  return storage;
}

export interface UploadedAttachment {
  url: string;
  gcsPath: string;
  contentType: string;
}

/**
 * Uploads a buffer to the configured GCS bucket under `CollectionAttachment/<yyyy-mm-dd>/<uuid>-<filename>`
 * and returns its public URL. The bucket is expected to either be public-read or fronted by
 * something that can serve these objects (adjust `makePublic` below if you'd rather use signed
 * URLs instead of public objects).
 */
export async function uploadAttachmentToGCS(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder?: string
): Promise<UploadedAttachment> {
  if (!BUCKET_NAME) {
    throw new Error("GCS_BUCKET_NAME is not set.");
  }

  const bucket = getStorage().bucket(BUCKET_NAME);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const gcsPath = `CollectionAttachment/${folder}/${safeName}`;
  const file = bucket.file(gcsPath);

  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=0, no-transform" },
  });

  // Bucket-level "uniform bucket-level access" + a public-read IAM binding is the usual setup;
  // if the bucket is private instead, swap this for a signed URL (see getSignedAttachmentUrl).
  const url = `https://storage.googleapis.com/${BUCKET_NAME}/${gcsPath}`;

  return { url, gcsPath, contentType };
}

/**
 * Alternative to a public URL: a time-limited signed URL. Use this if the bucket is private
 * and you don't want objects publicly reachable by anyone with the link forever.
 */
export async function getSignedAttachmentUrl(gcsPath: string, expiresInMs = 1000 * 60 * 60 * 24 * 7) {
  if (!BUCKET_NAME) {
    throw new Error("GCS_BUCKET_NAME is not set.");
  }
  const bucket = getStorage().bucket(BUCKET_NAME);
  const [url] = await bucket.file(gcsPath).getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMs,
  });
  return url;
}

export function isGCSConfigured(): boolean {
  return Boolean(KEY_BASE64 && BUCKET_NAME);
}

export { credentialsProjectId };
