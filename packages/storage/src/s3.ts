import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { StoragePort } from "./index";

export interface S3StorageConfig {
  bucket: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  /** Custom endpoint for cloud providers like Cloudflare R2, MinIO, DigitalOcean Spaces */
  endpoint?: string;
  /** Template to override default S3 url structure, e.g. "https://cdn.example.com/{key}" */
  publicUrlTemplate?: string;
}

/**
 * AWS S3 / Cloudflare R2 / MinIO implementation of StoragePort.
 */
export function createS3Storage(config: S3StorageConfig): StoragePort {
  const client = new S3Client({
    region: config.region,
    credentials: config.credentials,
    endpoint: config.endpoint,
    // Enable path-style routing if using custom endpoints (like local MinIO or R2)
    forcePathStyle: config.endpoint ? true : undefined,
  });

  return {
    async put(key, data, opts) {
      let body: Uint8Array | Buffer;
      if (data instanceof Uint8Array) {
        body = data;
      } else if (data instanceof Blob) {
        const arrayBuffer = await data.arrayBuffer();
        body = new Uint8Array(arrayBuffer);
      } else {
        body = data;
      }

      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: opts?.contentType,
          ACL: opts?.public ? "public-read" : undefined,
        })
      );

      const url = await this.getUrl(key);

      return {
        key,
        url,
        contentType: opts?.contentType,
        size: body.byteLength,
      };
    },

    async getUrl(key) {
      if (config.publicUrlTemplate) {
        return config.publicUrlTemplate
          .replace("{bucket}", config.bucket)
          .replace("{region}", config.region)
          .replace("{key}", key.replace(/^\//, ""));
      }

      if (config.endpoint) {
        const base = config.endpoint.replace(/\/$/, "");
        return `${base}/${config.bucket}/${key.replace(/^\//, "")}`;
      }

      return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key.replace(/^\//, "")}`;
    },

    async delete(key) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: key,
        })
      );
    },
  };
}
