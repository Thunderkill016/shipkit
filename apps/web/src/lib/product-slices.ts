import { z } from "zod";
import rawRegistry from "../../../../product/slices.json";

const IdentifierSchema = z
  .string()
  .min(1)
  .max(48)
  .regex(/^[a-z][a-z0-9-]*$/, "Use lowercase kebab-case identifiers");

const BaseFieldSchema = z.object({
  id: IdentifierSchema,
  label: z.string().trim().min(1).max(80),
  required: z.boolean().default(false),
  placeholder: z.string().trim().max(160).optional(),
  help: z.string().trim().max(240).optional(),
  defaultValue: z.string().max(5000).optional(),
});

const TextFieldSchema = BaseFieldSchema.extend({
  type: z.literal("text"),
  maxLength: z.number().int().min(1).max(500).default(120),
});

const TextareaFieldSchema = BaseFieldSchema.extend({
  type: z.literal("textarea"),
  maxLength: z.number().int().min(1).max(5000).default(2000),
});

const SelectOptionSchema = z.object({
  value: IdentifierSchema,
  label: z.string().trim().min(1).max(80),
});

const SelectFieldSchema = BaseFieldSchema.extend({
  type: z.literal("select"),
  options: z.array(SelectOptionSchema).min(1).max(20),
});

export const ProductSliceFieldSchema = z.discriminatedUnion("type", [
  TextFieldSchema,
  TextareaFieldSchema,
  SelectFieldSchema,
]);

export const ProductSliceDefinitionSchema = z
  .object({
    id: IdentifierSchema,
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(280),
    submitLabel: z.string().trim().min(1).max(80).default("Create"),
    emptyState: z.string().trim().min(1).max(180).default("No records yet."),
    fields: z.array(ProductSliceFieldSchema).min(1).max(12),
  })
  .superRefine((slice, ctx) => {
    const fieldIds = new Set<string>();
    for (const [index, field] of slice.fields.entries()) {
      if (fieldIds.has(field.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "id"],
          message: `Duplicate field id: ${field.id}`,
        });
      }
      fieldIds.add(field.id);

      if (field.type === "select") {
        const optionValues = new Set<string>();
        for (const [optionIndex, option] of field.options.entries()) {
          if (optionValues.has(option.value)) {
            ctx.addIssue({
              code: "custom",
              path: ["fields", index, "options", optionIndex, "value"],
              message: `Duplicate option value: ${option.value}`,
            });
          }
          optionValues.add(option.value);
        }
        if (field.defaultValue && !optionValues.has(field.defaultValue)) {
          ctx.addIssue({
            code: "custom",
            path: ["fields", index, "defaultValue"],
            message: "Select defaultValue must match an option value",
          });
        }
      } else if (
        field.defaultValue !== undefined &&
        field.defaultValue.length > field.maxLength
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "defaultValue"],
          message: "defaultValue exceeds maxLength",
        });
      }
    }
  });

export const ProductSliceRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    slices: z.array(ProductSliceDefinitionSchema).min(1).max(30),
  })
  .superRefine((registry, ctx) => {
    const sliceIds = new Set<string>();
    for (const [index, slice] of registry.slices.entries()) {
      if (sliceIds.has(slice.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["slices", index, "id"],
          message: `Duplicate slice id: ${slice.id}`,
        });
      }
      sliceIds.add(slice.id);
    }
  });

export type ProductSliceField = z.infer<typeof ProductSliceFieldSchema>;
export type ProductSliceDefinition = z.infer<typeof ProductSliceDefinitionSchema>;
export type ProductSliceRegistry = z.infer<typeof ProductSliceRegistrySchema>;
export type ProductRecordData = Record<string, string>;

export const productSliceRegistry = ProductSliceRegistrySchema.parse(rawRegistry);

export function getProductSlices(): ProductSliceDefinition[] {
  return productSliceRegistry.slices;
}

export function getProductSlice(id: string): ProductSliceDefinition | null {
  return productSliceRegistry.slices.find((slice) => slice.id === id) ?? null;
}

export function buildProductRecordSchema(
  slice: ProductSliceDefinition
): z.ZodType<ProductRecordData> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of slice.fields) {
    let schema: z.ZodTypeAny;

    if (field.type === "select") {
      const allowed = new Set(field.options.map((option) => option.value));
      schema = z
        .string()
        .trim()
        .refine(
          (value) => (value === "" ? !field.required : allowed.has(value)),
          `${field.label} has an invalid option`
        );
    } else {
      schema = z.string().trim().max(field.maxLength, `${field.label} is too long`);
    }

    if (field.required) {
      schema = schema.refine(
        (value) => typeof value === "string" && value.length > 0,
        `${field.label} is required`
      );
    } else {
      schema = schema.optional().transform((value) => String(value ?? ""));
    }

    shape[field.id] = schema;
  }

  return z.object(shape).strict() as z.ZodType<ProductRecordData>;
}

export function readProductRecordInput(
  slice: ProductSliceDefinition,
  formData: FormData
): ProductRecordData {
  return Object.fromEntries(
    slice.fields.map((field) => [
      field.id,
      String(formData.get(field.id) ?? field.defaultValue ?? ""),
    ])
  );
}
