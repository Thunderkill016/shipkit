import { productRecords } from "@shipkit/db";
import { and, desc, eq } from "drizzle-orm";
import { createDb } from "./db";

export type ProductRecord = {
  id: string;
  userId: string;
  sliceId: string;
  data: Record<string, string>;
  createdAt: string;
};

const g = globalThis as unknown as {
  __shipkitProductRecords?: ProductRecord[];
};

function bucket(): ProductRecord[] {
  if (!g.__shipkitProductRecords) g.__shipkitProductRecords = [];
  return g.__shipkitProductRecords;
}

function failDatabase(operation: string, error: unknown): never {
  const detail = error instanceof Error ? error.message : String(error);
  throw new Error(`Product Slice Engine database ${operation} failed: ${detail}`);
}

function mapRow(row: typeof productRecords.$inferSelect): ProductRecord {
  return {
    id: row.id,
    userId: row.userId,
    sliceId: row.sliceId,
    data: row.data,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listProductRecords(
  userId: string,
  sliceId: string
): Promise<ProductRecord[]> {
  const db = createDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(productRecords)
        .where(and(eq(productRecords.userId, userId), eq(productRecords.sliceId, sliceId)))
        .orderBy(desc(productRecords.createdAt));
      return rows.map(mapRow);
    } catch (error) {
      failDatabase("read", error);
    }
  }

  return bucket()
    .filter((record) => record.userId === userId && record.sliceId === sliceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addProductRecord(
  userId: string,
  sliceId: string,
  data: Record<string, string>
): Promise<ProductRecord> {
  const db = createDb();
  if (db) {
    try {
      const [row] = await db
        .insert(productRecords)
        .values({ userId, sliceId, data })
        .returning();
      if (!row) throw new Error("insert returned no row");
      return mapRow(row);
    } catch (error) {
      failDatabase("write", error);
    }
  }

  const record: ProductRecord = {
    id: crypto.randomUUID(),
    userId,
    sliceId,
    data,
    createdAt: new Date().toISOString(),
  };
  bucket().unshift(record);
  return record;
}

export async function deleteProductRecord(
  userId: string,
  sliceId: string,
  id: string
): Promise<boolean> {
  const db = createDb();
  if (db) {
    try {
      const deleted = await db
        .delete(productRecords)
        .where(
          and(
            eq(productRecords.id, id),
            eq(productRecords.userId, userId),
            eq(productRecords.sliceId, sliceId)
          )
        )
        .returning({ id: productRecords.id });
      return deleted.length > 0;
    } catch (error) {
      failDatabase("delete", error);
    }
  }

  const records = bucket();
  const index = records.findIndex(
    (record) =>
      record.id === id && record.userId === userId && record.sliceId === sliceId
  );
  if (index === -1) return false;
  records.splice(index, 1);
  return true;
}
