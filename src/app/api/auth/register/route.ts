import { NextResponse } from "next/server";
import { consumeAuthRateLimit } from "@/features/security/auth-rate-limit";
import { getSupabaseAnonServerClient, getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import {
  parseJsonObjectBody,
  readOptionalBoolean,
  readRequiredString,
  validationErrorResponse,
} from "@/lib/input-validation";

interface RegisterPayload {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  acceptedTerms?: boolean;
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
    const { data, error } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username,
      },
    });

    if (error || !data.user) {
      const normalizedMessage = error?.message.toLowerCase() || "";
      if (
        normalizedMessage.includes("already") ||
        normalizedMessage.includes("registered") ||
        normalizedMessage.includes("exists")
      ) {
        return NextResponse.json(
          { message: "Este email ja esta cadastrado. Use Entrar ou Esqueci minha senha." },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { message: error?.message || "Falha ao cadastrar." },
        { status: 400 },
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
      await serviceClient.auth.admin.deleteUser(data.user.id);

      if (profileError.message.toLowerCase().includes("profiles_username_unique_idx")) {
        return NextResponse.json({ message: "@ ja em uso. Escolha outro." }, { status: 409 });
      }
      return NextResponse.json(
        { message: "Conta criada, mas houve falha ao salvar o perfil." },
        { status: 500 },
      );
    }

    const signIn = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signIn.error || !signIn.data.session) {
      return NextResponse.json(
        { message: "Conta criada. Entre com seu email e senha para continuar.", session: null },
        { status: 201 },
      );
    }

    return NextResponse.json({
      message: "Conta criada com sucesso.",
      session: {
        accessToken: signIn.data.session.access_token,
        refreshToken: signIn.data.session.refresh_token,
      },
    });
  } catch (error) {
    const validationResponse = validationErrorResponse(error);
    if (validationResponse) return validationResponse;
    console.error("[auth/register] Falha ao processar cadastro", error);
    return NextResponse.json({ message: "Falha ao processar cadastro." }, { status: 500 });
  }
}
