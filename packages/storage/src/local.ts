import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { StoragePort } from "./index";

export interface LocalStorageConfig {
  /** The physical directory where files will be saved, e.g. "apps/web/public/uploads" */
  uploadDir: string;
  /** The base URL or path from which the files can be served, e.g. "/uploads" or "http://localhost:3000/uploads" */
  baseUrl: string;
}

/**
 * Local filesystem implementation of StoragePort.
 * Handy for local development and self-hosted VPS.
 */
export function createLocalStorage(config: LocalStorageConfig): StoragePort {
  if (!existsSync(config.uploadDir)) {
    mkdirSync(config.uploadDir, { recursive: true });
  }

  return {
    async put(key, data, opts) {
      const filePath = join(config.uploadDir, key);
      const dir = join(filePath, "..");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      let buffer: Buffer;
      if (data instanceof Uint8Array) {
        buffer = Buffer.from(data);
      } else if (data instanceof Blob) {
        const arrayBuffer = await data.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        buffer = data;
      }

      writeFileSync(filePath, buffer);

      const url = `${config.baseUrl.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;

      return {
        key,
        url,
        contentType: opts?.contentType,
        size: buffer.byteLength,
      };
    },

    async getUrl(key) {
      return `${config.baseUrl.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
    },

    async delete(key) {
      const filePath = join(config.uploadDir, key);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    },
  };
}
