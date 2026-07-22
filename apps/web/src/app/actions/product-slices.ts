"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuth, getAuthAdapterName } from "@/lib/auth";
import { DEMO_USER_ID } from "@/lib/notes-store";
import {
  buildProductRecordSchema,
  getProductSlice,
  readProductRecordInput,
} from "@/lib/product-slices";
import {
  addProductRecord,
  deleteProductRecord,
} from "@/lib/product-records-store";

export type ProductSliceActionState = {
  error: string | null;
  ok?: boolean;
};

const ProductRecordIdSchema = z.string().uuid();

async function ownerId(): Promise<string> {
  const user = await getAuth().getUser();
  if (user) return user.id;
  if (getAuthAdapterName() !== "none") {
    throw new Error("Authentication required");
  }
  return DEMO_USER_ID;
}

export async function createProductRecordAction(
  sliceId: string,
  _previous: ProductSliceActionState,
  formData: FormData
): Promise<ProductSliceActionState> {
  const slice = getProductSlice(sliceId);
  if (!slice) return { error: "Unknown product slice" };

  const parsed = buildProductRecordSchema(slice).safeParse(
    readProductRecordInput(slice, formData)
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid product record",
    };
  }

  try {
    await addProductRecord(await ownerId(), slice.id, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save record",
    };
  }

  revalidatePath(`/app/slices/${slice.id}`);
  return { error: null, ok: true };
}

export async function deleteProductRecordAction(
  sliceId: string,
  formData: FormData
): Promise<void> {
  const slice = getProductSlice(sliceId);
  const id = ProductRecordIdSchema.safeParse(String(formData.get("id") ?? ""));
  if (!slice || !id.success) return;

  let owner: string;
  try {
    owner = await ownerId();
  } catch {
    return;
  }

  await deleteProductRecord(owner, slice.id, id.data);
  revalidatePath(`/app/slices/${slice.id}`);
}
