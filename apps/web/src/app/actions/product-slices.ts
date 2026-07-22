"use server";

import { revalidatePath } from "next/cache";
import { getAuth } from "@/lib/auth";
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

async function ownerId(): Promise<string> {
  const user = await getAuth().getUser();
  return user?.id ?? DEMO_USER_ID;
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
  const id = String(formData.get("id") ?? "");
  if (!slice || !id) return;

  await deleteProductRecord(await ownerId(), slice.id, id);
  revalidatePath(`/app/slices/${slice.id}`);
}
