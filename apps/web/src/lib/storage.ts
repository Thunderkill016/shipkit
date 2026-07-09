import { createLocalStorage, createS3Storage, type StoragePort } from "@shipkit/storage";
import { join } from "node:path";

let cachedStorage: StoragePort | null = null;

/**
 * Resolves the storage adapter based on env variables.
 * If S3_BUCKET is configured, returns S3Storage.
 * Otherwise, falls back to LocalStorage (saving to public/uploads).
 */
export function getStorage(): StoragePort {
  if (cachedStorage) return cachedStorage;

  const bucket = process.env.S3_BUCKET;
  if (bucket) {
    cachedStorage = createS3Storage({
      bucket,
      region: process.env.S3_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
      endpoint: process.env.S3_ENDPOINT,
      publicUrlTemplate: process.env.S3_PUBLIC_URL_TEMPLATE,
    });
    return cachedStorage;
  }

  // Fallback to local storage in public/uploads
  const uploadDir = process.env.LOCAL_UPLOAD_DIR ?? join(process.cwd(), "public/uploads");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/uploads`
    : "http://localhost:3000/uploads";

  cachedStorage = createLocalStorage({
    uploadDir,
    baseUrl,
  });

  return cachedStorage;
}
