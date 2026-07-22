import { describe, expect, it } from "vitest";
import {
  ProductSliceRegistrySchema,
  buildProductRecordSchema,
  getProductSlice,
} from "./product-slices";

describe("Product Slice definitions", () => {
  it("loads the feedback slice", () => {
    const slice = getProductSlice("feedback");
    expect(slice?.title).toBe("Feedback Inbox");
    expect(slice?.fields.map((field) => field.id)).toEqual([
      "summary",
      "details",
      "priority",
    ]);
  });

  it("rejects duplicate slice ids", () => {
    const result = ProductSliceRegistrySchema.safeParse({
      schemaVersion: 1,
      slices: [
        {
          id: "feedback",
          title: "Feedback",
          description: "First feedback slice",
          fields: [{ id: "title", label: "Title", type: "text" }],
        },
        {
          id: "feedback",
          title: "Other",
          description: "Duplicate feedback slice",
          fields: [{ id: "title", label: "Title", type: "text" }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("validates records from the same definition", () => {
    const slice = getProductSlice("feedback");
    expect(slice).not.toBeNull();
    if (!slice) return;

    const schema = buildProductRecordSchema(slice);
    expect(
      schema.safeParse({
        summary: "Users need bulk export",
        details: "Observed in three support conversations",
        priority: "high",
      }).success
    ).toBe(true);

    expect(
      schema.safeParse({ summary: "", details: "", priority: "urgent" }).success
    ).toBe(false);
  });
});
