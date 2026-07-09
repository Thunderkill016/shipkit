/**
 * StoragePort — S3-compatible uploads (implement adapters later: R2, S3, Supabase Storage).
 */
export interface StoredObject {
  key: string;
  url: string;
  contentType?: string;
  size?: number;
}

export interface StoragePort {
  put(
    key: string,
    data: Uint8Array | Buffer | Blob,
    opts?: { contentType?: string; public?: boolean }
  ): Promise<StoredObject>;
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

export { createLocalStorage, type LocalStorageConfig } from "./local";
export { createS3Storage, type S3StorageConfig } from "./s3";
