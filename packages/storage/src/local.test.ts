import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createLocalStorage } from "./local";

// Define a test upload directory relative to this file
const testUploadDir = join(__dirname, "../test-uploads");

describe("createLocalStorage", () => {
  beforeAll(() => {
    if (existsSync(testUploadDir)) {
      rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    if (existsSync(testUploadDir)) {
      rmSync(testUploadDir, { recursive: true, force: true });
    }
  });

  it("should write file to local disk and delete it", async () => {
    const storage = createLocalStorage({
      uploadDir: testUploadDir,
      baseUrl: "http://localhost:3000/uploads",
    });

    const key = "test-folder/hello.txt";
    const data = new TextEncoder().encode("Hello world");
    const result = await storage.put(key, data, { contentType: "text/plain" });

    expect(result.key).toBe(key);
    expect(result.url).toBe("http://localhost:3000/uploads/test-folder/hello.txt");
    expect(result.size).toBe(11);

    const writtenPath = join(testUploadDir, key);
    expect(existsSync(writtenPath)).toBe(true);
    expect(readFileSync(writtenPath, "utf8")).toBe("Hello world");

    const retrievedUrl = await storage.getUrl(key);
    expect(retrievedUrl).toBe("http://localhost:3000/uploads/test-folder/hello.txt");

    await storage.delete(key);
    expect(existsSync(writtenPath)).toBe(false);
  });
});
