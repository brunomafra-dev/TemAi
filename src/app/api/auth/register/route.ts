import { NextResponse } from "next/server";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { getSupabaseAnonServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
  parseJsonObjectBody,
  readOptionalBoolean,
  readOptionalString,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";

interface RegisterPayload {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  acceptedTerms?: boolean;
  redirectTo?: string;
}

function sanitizeUsername(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Chef",
    lastName: parts.slice(1).join(" "),
  };
}

function getSafeRedirectTo(request: Request, raw?: string): string {
  const origin = new URL(request.url).origin;
  if (raw && raw.startsWith(origin)) return raw;
  return `${origin}/auth/callback`;
}

export async function POST(request: Request) {
  try {
    const payload = (await parseJsonObjectBody(request, { maxBytes: 16 * 1024 })) as RegisterPayload &
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
    const fullName = readRequiredString(payload, "name", {
      fieldName: "Nome",
      minLength: 3,
      maxLength: 120,
    });
    const username = sanitizeUsername(
      readRequiredString(payload, "username", {
        fieldName: "Username",
        minLength: 3,
        maxLength: 48,
      }),
    );
    const acceptedTerms = readOptionalBoolean(payload, "acceptedTerms", false);
    const redirectTo = readOptionalString(payload, "redirectTo", {
      fieldName: "Redirect",
      maxLength: 400,
    });

    if (!acceptedTerms) {
      return NextResponse.json({ message: "Aceite os termos para continuar." }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ message: "Preencha os campos corretamente." }, { status: 400 });
    }

    const rateLimit = await consumeAuthRateLimit({
      route: "register",
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

    const serviceClient = getSupabaseServiceRoleClient();
    const availability = await serviceClient.rpc("is_username_available", {
      p_username: username,
    });
    if (availability.error || !availability.data) {
      return NextResponse.json({ message: "@ ja em uso. Escolha outro." }, { status: 409 });
    }

    const anonClient = getSupabaseAnonServerClient();
    const { data, error } = await anonClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getSafeRedirectTo(request, redirectTo),
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { message: error?.message || "Falha ao cadastrar." },
        { status: 400 },
      );
    }

    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return NextResponse.json(
        { message: "Este email ja esta cadastrado. Use Entrar ou Esqueci minha senha." },
        { status: 409 },
      );
    }

    const { firstName, lastName } = splitName(fullName);
    const nowIso = new Date().toISOString();
    const { error: profileError } = await serviceClient.from("profiles").upsert(
      {
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        username,
        selected_badge: "estagiario",
        unlocked_badges: ["estagiario"],
        accepted_terms_at: nowIso,
        accepted_privacy_at: nowIso,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      if (profileError.message.toLowerCase().includes("profiles_username_unique_idx")) {
        return NextResponse.json({ message: "@ ja em uso. Escolha outro." }, { status: 409 });
      }
      return NextResponse.json(
        { message: "Conta criada, mas houve falha ao salvar o perfil." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Conta criada. Verifique seu email para confirmar e entrar pelo link.",
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          }
        : null,
    });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    console.error("[auth/register] Falha ao processar cadastro", error);
    return NextResponse.json({ message: "Falha ao processar cadastro." }, { status: 500 });
  }
}
