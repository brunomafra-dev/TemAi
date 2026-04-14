import { NextResponse } from "next/server";
import { consumeAuthRateLimit, resetAuthRateLimit } from "@/features/security/auth-rate-limit";
import { getSupabaseAnonServerClient } from "@/lib/supabase-admin";
import {
  parseJsonObjectBody,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";

interface LoginPayload {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const payload = (await parseJsonObjectBody(request, { maxBytes: 8 * 1024 })) as LoginPayload &
      Record<string, unknown>;
    const email = readRequiredString(payload, "email", {
      fieldName: "Email",
      minLength: 6,
      maxLength: 160,
      lowercase: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    });
    const password = readRequiredString(payload, "password", {
      fieldName: "Senha",
      minLength: 6,
      maxLength: 256,
    });

    const rateLimit = await consumeAuthRateLimit({
      route: "login",
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
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return NextResponse.json({ message: "Email ou senha invalidos." }, { status: 401 });
    }

    await resetAuthRateLimit(rateLimit.key);

    return NextResponse.json({
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    return NextResponse.json({ message: "Falha ao processar login." }, { status: 500 });
  }
}
