import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  addProductRecord,
  deleteProductRecord,
  listProductRecords,
} from "./product-records-store";

const previousDatabaseUrl = process.env.DATABASE_URL;

describe("Product Slice record isolation (memory path)", () => {
  beforeEach(async () => {
    delete process.env.DATABASE_URL;
    for (const userId of ["user-a", "user-b"]) {
      for (const sliceId of ["feedback", "ideas"]) {
        const records = await listProductRecords(userId, sliceId);
        for (const record of records) {
          await deleteProductRecord(userId, sliceId, record.id);
        }
      }
    }
  });

  afterAll(() => {
    if (previousDatabaseUrl) process.env.DATABASE_URL = previousDatabaseUrl;
    else delete process.env.DATABASE_URL;
  });

  it("scopes records by both owner and slice", async () => {
    await addProductRecord("user-a", "feedback", { summary: "A" });
    await addProductRecord("user-b", "feedback", { summary: "B" });
    await addProductRecord("user-a", "ideas", { summary: "Idea" });

    const feedbackA = await listProductRecords("user-a", "feedback");
    const feedbackB = await listProductRecords("user-b", "feedback");

    expect(feedbackA.map((record) => record.data.summary)).toEqual(["A"]);
    expect(feedbackB.map((record) => record.data.summary)).toEqual(["B"]);
  });

  it("delete requires matching owner and slice", async () => {
    const record = await addProductRecord("user-a", "feedback", { summary: "Secret" });

    expect(await deleteProductRecord("user-b", "feedback", record.id)).toBe(false);
    expect(await deleteProductRecord("user-a", "ideas", record.id)).toBe(false);
    expect(await deleteProductRecord("user-a", "feedback", record.id)).toBe(true);
  });
});
