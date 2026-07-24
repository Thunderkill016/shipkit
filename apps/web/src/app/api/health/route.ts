import { NextResponse } from "next/server";
import { resolveAuthAdapter } from "@/lib/auth-adapter";

/** Lightweight health for deploy probes (Vercel/Docker). */
export async function GET() {
  const adapter = resolveAuthAdapter();
  return NextResponse.json({
    ok: true,
    service: "cyclewarden",
    auth: adapter,
    time: new Date().toISOString(),
  });
}
