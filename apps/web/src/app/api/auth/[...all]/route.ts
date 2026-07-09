import { getBetterAuth } from "@/lib/adapters/better-auth/auth-instance";
import { toNextJsHandler } from "better-auth/next-js";

const auth = getBetterAuth();

const handlers = auth
  ? toNextJsHandler(auth)
  : {
      GET: async () =>
        new Response(JSON.stringify({ error: "Better Auth not configured" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      POST: async () =>
        new Response(JSON.stringify({ error: "Better Auth not configured" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
    };

export const { GET, POST } = handlers;
