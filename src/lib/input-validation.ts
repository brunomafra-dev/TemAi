import "server-only";
import { NextResponse } from "next/server";

const DEFAULT_MAX_BODY_BYTES = 32 * 1024;

export class InputValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "InputValidationError";
  }
}

type JsonObject = Record<string, unknown>;

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function assertObject(value: unknown): asserts value is JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputValidationError("Payload JSON invalido.");
  }
}

export async function parseJsonObjectBody(
  request: Request,
  options?: { maxBytes?: number },
): Promise<JsonObject> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (contentType && !contentType.includes("application/json")) {
    throw new InputValidationError("Content-Type invalido. Use application/json.", 415);
  }

  const contentLengthRaw = request.headers.get("content-length");
  const contentLength = contentLengthRaw ? Number(contentLengthRaw) : 0;
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new InputValidationError("Payload muito grande.", 413);
  }

  const raw = await request.text();
  if (!raw.trim()) {
    throw new InputValidationError("Payload JSON obrigatorio.");
  }

  if (byteLength(raw) > maxBytes) {
    throw new InputValidationError("Payload muito grande.", 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InputValidationError("JSON malformado.");
  }

  assertObject(parsed);
  return parsed;
}

interface StringOptions {
  minLength?: number;
  maxLength: number;
  lowercase?: boolean;
  pattern?: RegExp;
  fieldName: string;
}

function sanitizeStringValue(raw: string, options: StringOptions): string {
  const value = raw.trim();
  const minLength = options.minLength ?? 0;

  if (value.length < minLength) {
    throw new InputValidationError(`${options.fieldName} invalido.`);
  }

  if (value.length > options.maxLength) {
    throw new InputValidationError(`${options.fieldName} muito grande.`, 413);
  }

  const normalized = options.lowercase ? value.toLowerCase() : value;
  if (options.pattern && !options.pattern.test(normalized)) {
    throw new InputValidationError(`${options.fieldName} malformado.`);
  }

  return normalized;
}

export function readRequiredString(
  input: JsonObject,
  key: string,
  options: Omit<StringOptions, "fieldName"> & { fieldName?: string },
): string {
  const value = input[key];
  if (typeof value !== "string") {
    throw new InputValidationError(`${options.fieldName || key} obrigatorio.`);
  }
  return sanitizeStringValue(value, {
    ...options,
    fieldName: options.fieldName || key,
  });
}

export function readOptionalString(
  input: JsonObject,
  key: string,
  options: Omit<StringOptions, "fieldName"> & { fieldName?: string },
): string | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new InputValidationError(`${options.fieldName || key} malformado.`);
  }
  return sanitizeStringValue(value, {
    ...options,
    fieldName: options.fieldName || key,
  });
}

export function readStringArray(
  input: JsonObject,
  key: string,
  options: {
    maxItems: number;
    itemMaxLength: number;
    minItems?: number;
    fieldName?: string;
  },
): string[] {
  const raw = input[key];
  if (!Array.isArray(raw)) {
    throw new InputValidationError(`${options.fieldName || key} malformado.`);
  }

  if (raw.length > options.maxItems) {
    throw new InputValidationError(`${options.fieldName || key} muito grande.`, 413);
  }

  const normalized = raw
    .map((item) => {
      if (typeof item !== "string") {
        throw new InputValidationError(`${options.fieldName || key} malformado.`);
      }
      const value = item.trim();
      if (!value) return "";
      if (value.length > options.itemMaxLength) {
        throw new InputValidationError(`${options.fieldName || key} muito grande.`, 413);
      }
      return value;
    })
    .filter(Boolean);

  const minItems = options.minItems ?? 0;
  if (normalized.length < minItems) {
    throw new InputValidationError(`${options.fieldName || key} invalido.`);
  }

  return normalized;
}

export function readOptionalNumber(
  input: JsonObject,
  key: string,
  options: {
    min: number;
    max: number;
    integer?: boolean;
    defaultValue?: number;
    fieldName?: string;
  },
): number {
  const raw = input[key];
  const hasValue = raw !== undefined && raw !== null && raw !== "";

  if (!hasValue) {
    if (typeof options.defaultValue === "number") return options.defaultValue;
    throw new InputValidationError(`${options.fieldName || key} obrigatorio.`);
  }

  const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.trim()) : NaN;
  if (!Number.isFinite(value)) {
    throw new InputValidationError(`${options.fieldName || key} malformado.`);
  }
  if (options.integer !== false && !Number.isInteger(value)) {
    throw new InputValidationError(`${options.fieldName || key} malformado.`);
  }
  if (value < options.min || value > options.max) {
    throw new InputValidationError(`${options.fieldName || key} fora do limite.`);
  }
  return value;
}

export function readOptionalBoolean(
  input: JsonObject,
  key: string,
  defaultValue = false,
): boolean {
  const raw = input[key];
  if (raw === undefined || raw === null) return defaultValue;
  if (typeof raw !== "boolean") {
    throw new InputValidationError(`${key} malformado.`);
  }
  return raw;
}

export function readOptionalEnum<T extends string>(
  input: JsonObject,
  key: string,
  allowed: readonly T[],
  fallback: T,
  fieldName?: string,
): T {
  const raw = input[key];
  if (raw === undefined || raw === null || raw === "") return fallback;
  if (typeof raw !== "string") {
    throw new InputValidationError(`${fieldName || key} malformado.`);
  }
  const normalized = raw.trim() as T;
  if (!allowed.includes(normalized)) {
    throw new InputValidationError(`${fieldName || key} invalido.`);
  }
  return normalized;
}

export function sanitizeQueryString(
  value: string | null,
  options: {
    maxLength: number;
    fieldName: string;
    fallback?: string;
    pattern?: RegExp;
    lowercase?: boolean;
  },
): string {
  const fallback = options.fallback ?? "";
  if (value === null || value === undefined) return fallback;
  return sanitizeStringValue(value, {
    fieldName: options.fieldName,
    maxLength: options.maxLength,
    minLength: 0,
    pattern: options.pattern,
    lowercase: options.lowercase,
  });
}

export function sanitizePathParam(
  value: string,
  options: {
    maxLength: number;
    fieldName: string;
    pattern?: RegExp;
  },
): string {
  return sanitizeStringValue(value, {
    fieldName: options.fieldName,
    minLength: 1,
    maxLength: options.maxLength,
    pattern: options.pattern,
  });
}

export function validationErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof InputValidationError)) return null;
  return NextResponse.json({ message: error.message }, { status: error.status });
}
