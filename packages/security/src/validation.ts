import { z } from "zod";

export const EmailPasswordSchema = z.object({
  email: z.string().email("Invalid email").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type EmailPassword = z.infer<typeof EmailPasswordSchema>;

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}
