import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 5;

export class PublicSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicSourceError";
  }
}

export type PublicFetchResponse = {
  status: number;
  headers: { get: (name: string) => string | null };
  body?: {
    getReader: () => {
      read: () => Promise<{ done: boolean; value?: Uint8Array }>;
      cancel?: () => Promise<void>;
    };
  } | null;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type PublicFetch = (
  input: string,
  init: {
    method: "GET";
    redirect: "manual";
    headers: Record<string, string>;
    signal: AbortSignal;
  }
) => Promise<PublicFetchResponse>;

export type AddressResolver = (hostname: string) => Promise<string[]>;

export type PublicSourceCaptureOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  fetcher?: PublicFetch;
  resolveAddresses?: AddressResolver;
};

export type PublicSourceCapture = {
  requestedUrl: string;
  finalUrl: string;
  redirectChain: string[];
  mediaType: string;
  byteLength: number;
  normalizedText: string;
  contentDigest: string;
  transformation: "html-to-normalized-text-v1" | "text-normalization-v1";
  safetyStatus: "clean" | "quarantined";
  safetySignals: string[];
};

export type LocatedCitation = {
  quote: string;
  start: number;
  end: number;
  occurrence: number;
  quoteDigest: string;
};

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (lower.startsWith("#")) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return named[lower] ?? match;
  });
}

export function normalizePublicText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function htmlToText(value: string): string {
  const withoutExecutableContent = value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg|canvas)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const withLineBreaks = withoutExecutableContent
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(p|div|section|article|header|footer|main|aside|li|tr|h[1-6])>/gi, "\n");
  return normalizePublicText(decodeHtmlEntities(withLineBreaks.replace(/<[^>]+>/g, " ")));
}

function safetySignals(text: string): string[] {
  const checks: Array<[string, RegExp]> = [
    [
      "instruction-override",
      /\b(ignore|disregard|override|forget)\b.{0,80}\b(previous|prior|system|developer)\b.{0,80}\b(instruction|message|prompt)s?\b/is,
    ],
    [
      "secret-exfiltration",
      /\b(send|upload|exfiltrate|reveal|print|return)\b.{0,80}\b(secret|token|credential|password|api[- ]?key|environment variable)s?\b/is,
    ],
    [
      "tool-command-injection",
      /\b(call|invoke|run|execute)\b.{0,60}\b(tool|function|shell|terminal|command)\b.{0,100}\b(ignore|without|bypass|secret|credential|system)\b/is,
    ],
    [
      "role-impersonation",
      /\b(system|developer|assistant)\s*(message|instruction|prompt)\s*:/i,
    ],
  ];
  return checks.filter(([, pattern]) => pattern.test(text)).map(([id]) => id);
}

function parseIpv4(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const values = parts.map((part) => Number(part));
  return values.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
    ? values
    : null;
}

export function isPublicNetworkAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0]!;
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicNetworkAddress(mapped[1]!);

  if (isIP(normalized) === 4) {
    const parts = parseIpv4(normalized)!;
    const [a, b, c] = parts;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b! >= 64 && b! <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b! >= 16 && b! <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 192 && b === 0) return false;
    if (a === 192 && b === 0 && c === 2) return false;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    return true;
  }

  if (isIP(normalized) === 6) {
    if (normalized === "::" || normalized === "::1") return false;
    if (/^(fc|fd)/.test(normalized)) return false;
    if (/^fe[89ab]/.test(normalized)) return false;
    if (/^ff/.test(normalized)) return false;
    if (normalized.startsWith("2001:db8")) return false;
    return true;
  }

  return false;
}

async function defaultResolveAddresses(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

function assertSafeUrlShape(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new PublicSourceError(`invalid public source URL: ${value}`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new PublicSourceError(`public source URL must use http or https: ${value}`);
  }
  if (url.username || url.password) {
    throw new PublicSourceError("public source URL may not contain credentials");
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new PublicSourceError(`public source hostname is not allowed: ${hostname}`);
  }
  if (
    (url.protocol === "http:" && url.port && url.port !== "80") ||
    (url.protocol === "https:" && url.port && url.port !== "443")
  ) {
    throw new PublicSourceError("public source URL may only use standard HTTP(S) ports");
  }
  url.hash = "";
  return url;
}

async function assertPublicDestination(url: URL, resolver: AddressResolver): Promise<void> {
  if (isIP(url.hostname)) {
    if (!isPublicNetworkAddress(url.hostname)) {
      throw new PublicSourceError(`public source resolves to a blocked address: ${url.hostname}`);
    }
    return;
  }
  const addresses = await resolver(url.hostname);
  if (addresses.length === 0) {
    throw new PublicSourceError(`public source hostname did not resolve: ${url.hostname}`);
  }
  const blocked = addresses.filter((address) => !isPublicNetworkAddress(address));
  if (blocked.length > 0) {
    throw new PublicSourceError(
      `public source hostname resolved to blocked address(es): ${blocked.join(", ")}`
    );
  }
}

function normalizedMediaType(value: string | null): string {
  return (value ?? "").split(";", 1)[0]!.trim().toLowerCase();
}

function allowedMediaType(mediaType: string): boolean {
  return (
    mediaType === "text/html" ||
    mediaType === "text/plain" ||
    mediaType === "text/markdown" ||
    mediaType === "application/json"
  );
}

async function readBoundedBody(response: PublicFetchResponse, maxBytes: number): Promise<Uint8Array> {
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (!chunk.value) continue;
      total += chunk.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel?.();
        throw new PublicSourceError(`public source exceeds ${maxBytes} bytes`);
      }
      chunks.push(chunk.value);
    }
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new PublicSourceError(`public source exceeds ${maxBytes} bytes`);
  }
  return bytes;
}

export async function capturePublicSource(
  value: string,
  options: PublicSourceCaptureOptions = {}
): Promise<PublicSourceCapture> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new PublicSourceError("public source timeout must be a positive integer");
  }
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
    throw new PublicSourceError("public source maxBytes must be a positive integer");
  }

  const fetcher =
    options.fetcher ??
    ((globalThis.fetch as unknown as PublicFetch | undefined) ??
      (() => Promise.reject(new PublicSourceError("global fetch is unavailable"))));
  const resolver = options.resolveAddresses ?? defaultResolveAddresses;
  const requested = assertSafeUrlShape(value);
  let current = requested;
  const redirectChain: string[] = [];

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicDestination(current, resolver);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: PublicFetchResponse;
    try {
      response = await fetcher(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "text/html,text/plain,text/markdown,application/json;q=0.9",
          "user-agent": "CycleWarden-Research/0.1",
        },
      });
    } catch (error) {
      throw new PublicSourceError(
        `public source request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new PublicSourceError("public source redirect is missing Location");
      if (redirect === MAX_REDIRECTS) {
        throw new PublicSourceError(`public source exceeded ${MAX_REDIRECTS} redirects`);
      }
      const next = assertSafeUrlShape(new URL(location, current).toString());
      redirectChain.push(next.toString());
      current = next;
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      throw new PublicSourceError(`public source returned HTTP ${response.status}`);
    }

    const mediaType = normalizedMediaType(response.headers.get("content-type"));
    if (!allowedMediaType(mediaType)) {
      throw new PublicSourceError(`unsupported public source media type: ${mediaType || "missing"}`);
    }
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      throw new PublicSourceError(`public source exceeds ${maxBytes} bytes`);
    }

    const bytes = await readBoundedBody(response, maxBytes);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const transformation =
      mediaType === "text/html" ? "html-to-normalized-text-v1" : "text-normalization-v1";
    const normalizedText = mediaType === "text/html" ? htmlToText(decoded) : normalizePublicText(decoded);
    if (!normalizedText) throw new PublicSourceError("public source produced no usable text");
    const signals = safetySignals(normalizedText);

    return {
      requestedUrl: requested.toString(),
      finalUrl: current.toString(),
      redirectChain,
      mediaType,
      byteLength: bytes.byteLength,
      normalizedText,
      contentDigest: sha256(normalizedText),
      transformation,
      safetyStatus: signals.length === 0 ? "clean" : "quarantined",
      safetySignals: signals,
    };
  }

  throw new PublicSourceError("public source retrieval ended unexpectedly");
}

export function locateExactCitation(
  normalizedText: string,
  quote: string,
  occurrence = 0
): LocatedCitation {
  if (!Number.isInteger(occurrence) || occurrence < 0) {
    throw new PublicSourceError("citation occurrence must be a non-negative integer");
  }
  const normalizedQuote = normalizePublicText(quote);
  if (normalizedQuote.length < 12) {
    throw new PublicSourceError("citation quote must contain at least 12 normalized characters");
  }
  if (normalizedQuote.length > 2_000) {
    throw new PublicSourceError("citation quote exceeds 2000 normalized characters");
  }

  const starts: number[] = [];
  let cursor = 0;
  while (cursor <= normalizedText.length - normalizedQuote.length) {
    const found = normalizedText.indexOf(normalizedQuote, cursor);
    if (found === -1) break;
    starts.push(found);
    cursor = found + Math.max(1, normalizedQuote.length);
  }
  const start = starts[occurrence];
  if (start === undefined) {
    throw new PublicSourceError(
      `citation quote occurrence ${occurrence} was not found in normalized source text`
    );
  }

  return {
    quote: normalizedQuote,
    start,
    end: start + normalizedQuote.length,
    occurrence,
    quoteDigest: sha256(normalizedQuote),
  };
}
