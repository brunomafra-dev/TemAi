import "server-only";
import { createHash } from "crypto";

type ApiLogLevel = "info" | "warn" | "error";

type ApiLogParams = {
  route: string;
  status: number;
  durationMs: number;
  userId?: string;
  operation?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  error?: unknown;
  level?: ApiLogLevel;
};

function hashUserId(userId?: string): string | undefined {
  if (!userId) return undefined;
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

function errorName(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof Error) return error.name || "Error";
  return "UnknownError";
}

function sanitizeMetadata(
  metadata?: ApiLogParams["metadata"],
): Record<string, string | number | boolean | null> | undefined {
  if (!metadata) return undefined;
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, value ?? null]),
  );
}

export function logApiEvent(params: ApiLogParams): void {
  const payload = {
    event: "temai.api",
    route: params.route,
    operation: params.operation,
    status: params.status,
    durationMs: Math.max(0, Math.round(params.durationMs)),
    user: hashUserId(params.userId),
    error: errorName(params.error),
    metadata: sanitizeMetadata(params.metadata),
  };

  const level = params.level || (params.status >= 500 ? "error" : params.status >= 400 ? "warn" : "info");
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}
