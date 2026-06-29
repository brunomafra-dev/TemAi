import { NextResponse } from "next/server";
import { consumeAuthRateLimit, resetAuthRateLimit } from "@/features/security/auth-rate-limit";
import { getSupabaseAnonServerClient } from "@/lib/supabase-admin";
import { parseJsonObjectBody, readRequiredString, validationErrorResponse } from "@/lib/input-validation";

interface LoginPayload {
  email?: string;
  password?: string;
}

function getLoginFailure(error?: { message?: string } | null): { message: string; status: number } {
  const normalizedMessage = error?.message?.toLowerCase() || "";

  if (normalizedMessage.includes("email not confirmed")) {
    return {
      message: "Confirme seu email antes de entrar. Veja também Spam/Lixo eletrônico.",
      status: 403,
    };
  }

  if (normalizedMessage.includes("too many") || normalizedMessage.includes("rate limit")) {
    return {
      message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      status: 429,
    };
  }

  return {
    message: "Email ou senha não conferem. Confira os dados ou use Esqueci minha senha.",
    status: 401,
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await parseJsonObjectBody(request, {
      maxBytes: 8 * 1024,
      allowedKeys: ["email", "password"],
    })) as LoginPayload & Record<string, unknown>;
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
      const failure = getLoginFailure(error);
      return NextResponse.json({ message: failure.message }, { status: failure.status });
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
    return NextResponse.json({ message: "Não foi possível processar login agora." }, { status: 500 });
  }
}
