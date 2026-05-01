import { NextResponse } from "next/server";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { getSupabaseAnonServerClient } from "@/lib/supabase-admin";
import {
  parseJsonObjectBody,
  readOptionalString,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";

interface ForgotPasswordPayload {
  email?: string;
  redirectTo?: string;
}

function getSafeRedirectTo(request: Request, raw?: string): string {
  const origin = new URL(request.url).origin;
  if (raw && raw.startsWith(origin)) return raw;
  return `${origin}/auth/reset-password`;
}

export async function POST(request: Request) {
  try {
    const payload = (await parseJsonObjectBody(request, {
      maxBytes: 8 * 1024,
      allowedKeys: ["email", "redirectTo"],
    })) as ForgotPasswordPayload &
      Record<string, unknown>;
    const email = readRequiredString(payload, "email", {
      fieldName: "Email",
      minLength: 6,
      maxLength: 160,
      lowercase: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    });
    const redirectTo = readOptionalString(payload, "redirectTo", {
      fieldName: "Redirect",
      maxLength: 400,
    });

    const rateLimit = await consumeAuthRateLimit({
      route: "forgot-password",
      request,
      identifier: email,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message: "Muitas tentativas. Tente novamente em alguns minutos.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const client = getSupabaseAnonServerClient();
    await client.auth.resetPasswordForEmail(email, {
      redirectTo: getSafeRedirectTo(request, redirectTo),
    });

    return NextResponse.json({
      message: "Se o email existir, você receberá um link para redefinir a senha.",
    });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Falha ao processar solicitação." }, { status: 500 });
  }
}
