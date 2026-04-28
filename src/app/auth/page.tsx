"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { saveUserProfile, type UserProfile } from "@/features/profile/storage";

type Mode = "login" | "register" | "forgot";

function sanitizeUsername(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
}

export default function AuthPage() {
  const router = useRouter();
  const client = getSupabaseBrowserClient();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestion, setUsernameSuggestion] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canRegister = useMemo(() => {
    return (
      name.trim().length >= 3 &&
      sanitizeUsername(username).length >= 3 &&
      email.trim().length >= 6 &&
      password.length >= 6 &&
      acceptedTerms &&
      usernameAvailable === true
    );
  }, [acceptedTerms, email, name, password, username, usernameAvailable]);

  async function checkUsernameAvailability(raw: string) {
    const next = sanitizeUsername(raw);
    setUsername(next);
    setUsernameAvailable(null);
    setUsernameSuggestion("");
    setMessage("");
    if (next.length < 3 || !client) return;

    setCheckingUsername(true);
    const { data, error } = await client.rpc("is_username_available", {
      p_username: next,
    });
    setCheckingUsername(false);
    if (error) {
      setMessage("Nao foi possivel verificar disponibilidade agora.");
      return;
    }
    setUsernameAvailable(Boolean(data));
    if (!data) {
      const suggestion = await suggestAvailableUsername(next);
      setUsernameSuggestion(suggestion);
    }
  }

  async function suggestAvailableUsername(baseRaw: string): Promise<string> {
    if (!client) return "";
    const base = sanitizeUsername(baseRaw).slice(0, 20);
    if (base.length < 3) return "";

    for (let i = 1; i <= 30; i += 1) {
      const candidate = `${base}${i}`;
      const { data, error } = await client.rpc("is_username_available", {
        p_username: candidate,
      });
      if (!error && data) return candidate;
    }

    return "";
  }

  async function handleLogin() {
    if (!client) {
      setMessage("Supabase nao configurado.");
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      retryAfterSeconds?: number;
      session?: { accessToken?: string; refreshToken?: string };
    };
    setIsSubmitting(false);
    if (!response.ok) {
      if (response.status === 429) {
        const retry = data.retryAfterSeconds ? ` Tente em ${data.retryAfterSeconds}s.` : "";
        setMessage((data.message || "Muitas tentativas.") + retry);
      } else {
        setMessage(data.message || "Falha no login.");
      }
      return;
    }

    const accessToken = data.session?.accessToken || "";
    const refreshToken = data.session?.refreshToken || "";
    if (!accessToken || !refreshToken) {
      setMessage("Falha ao criar sessao.");
      return;
    }

    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      setMessage(error.message || "Falha no login.");
      return;
    }
    router.replace("/");
  }

  async function handleRegister() {
    if (!client) {
      setMessage("Supabase nao configurado.");
      return;
    }
    if (!canRegister) {
      setMessage("Preencha os campos corretamente.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "";
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        username: sanitizeUsername(username),
        email: email.trim(),
        password,
        acceptedTerms,
        redirectTo,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      session?: { accessToken?: string; refreshToken?: string } | null;
    };
    if (!response.ok) {
      setIsSubmitting(false);
      setMessage(data.message || "Falha ao cadastrar.");
      return;
    }

    const fullName = name.trim();
    const parts = fullName.split(/\s+/);
    const firstName = parts[0] || "Chef";
    const lastName = parts.slice(1).join(" ");
    const nowIso = new Date().toISOString();

    const profile: UserProfile = {
      firstName,
      lastName,
      username: sanitizeUsername(username),
      photoDataUrl: "",
      selectedBadge: "estagiario",
      unlockedBadges: ["estagiario"],
      acceptedTermsAt: nowIso,
      acceptedPrivacyAt: nowIso,
    };

    saveUserProfile(profile);

    if (data.session?.accessToken && data.session.refreshToken) {
      await client.auth.setSession({
        access_token: data.session.accessToken,
        refresh_token: data.session.refreshToken,
      });
      setIsSubmitting(false);
      router.replace("/");
      return;
    }

    setIsSubmitting(false);
    setMessage(data.message || "Conta criada. Entre com seu email e senha para continuar.");
  }

  async function handleForgotPassword() {
    if (!client) {
      setMessage("Supabase nao configurado.");
      return;
    }
    if (!email.trim()) {
      setMessage("Informe seu email.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : "";
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        redirectTo,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      retryAfterSeconds?: number;
    };
    setIsSubmitting(false);
    if (!response.ok) {
      if (response.status === 429) {
        const retry = data.retryAfterSeconds ? ` Tente em ${data.retryAfterSeconds}s.` : "";
        setMessage((data.message || "Muitas tentativas.") + retry);
      } else {
        setMessage(data.message || "Falha ao enviar email de recuperacao.");
      }
      return;
    }
    setMessage(data.message || "Enviamos um link para redefinir sua senha no seu email.");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-6">
      <section className="relative overflow-hidden rounded-[2rem] shadow-[0_20px_45px_-25px_rgba(42,30,23,0.55)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1700&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-[#21160F]/76 backdrop-blur-[1.6px]" />
        <div className="relative z-10 px-5 pb-6 pt-7 text-[#FDF7EC]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#EADBC0]">TemAi</p>
          <h1 className="mt-2 font-display text-3xl">Bem-vindo(a)</h1>
          <p className="mt-2 text-sm text-[#E6D7BF]">
            Entre para salvar seu perfil, suas receitas e sua identidade em qualquer dispositivo.
          </p>
        </div>
      </section>

      <Card className="mt-5 border-[#E5D7BF] bg-[#FFFCF7]">
        <CardHeader>
          <CardTitle>
            {mode === "login" ? "Entrar" : mode === "register" ? "Criar conta" : "Recuperar senha"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Acesse sua conta TemAi."
              : mode === "register"
                ? "Cadastro com username unico para seu perfil."
                : "Informe seu email para receber o link de redefinicao."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "login" ? "default" : "secondary"}
              className="flex-1"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Entrar
            </Button>
            <Button
              type="button"
              variant={mode === "register" ? "default" : "secondary"}
              className="flex-1"
              onClick={() => {
                setMode("register");
                setMessage("");
              }}
            >
              Cadastrar
            </Button>
          </div>

          {mode === "register" ? (
            <>
              <Input
                placeholder="Seu nome"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <div className="space-y-1">
                <Input
                  placeholder="@seuusername"
                  value={username}
                  onChange={(event) => void checkUsernameAvailability(event.target.value)}
                />
                <p className="text-xs text-[#6A5E52]">
                  {checkingUsername
                    ? "Verificando disponibilidade..."
                    : usernameAvailable === true
                      ? "@ disponivel"
                      : usernameAvailable === false
                        ? "@ ja em uso"
                        : "Use letras, numeros, . e _"}
                </p>
                {usernameAvailable === false && usernameSuggestion ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary underline"
                    onClick={() => void checkUsernameAvailability(usernameSuggestion)}
                  >
                    Usar sugestao: @{usernameSuggestion}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {mode !== "forgot" ? (
            <Input
              placeholder="Senha"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          ) : null}

          {mode === "register" ? (
            <label className="flex items-start gap-2 rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-xs text-[#6A5E52]">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Li e concordo com os{" "}
                <Link href="/termos" className="font-semibold text-primary underline">
                  Termos de Uso
                </Link>{" "}
                e com a{" "}
                <Link href="/privacidade" className="font-semibold text-primary underline">
                  Politica de Privacidade
                </Link>
                .
              </span>
            </label>
          ) : null}

          <Button
            className="w-full"
            disabled={isSubmitting || (mode === "register" && !canRegister)}
            onClick={() =>
              void (
                mode === "login"
                  ? handleLogin()
                  : mode === "register"
                    ? handleRegister()
                    : handleForgotPassword()
              )
            }
          >
            {isSubmitting
              ? "Processando..."
              : mode === "login"
                ? "Entrar"
                : mode === "register"
                  ? "Criar conta"
                  : "Enviar link"}
          </Button>

          {mode === "login" ? (
            <button
              type="button"
              className="w-full text-center text-xs font-semibold text-primary underline"
              onClick={() => {
                setMode("forgot");
                setMessage("");
              }}
            >
              Esqueci minha senha
            </button>
          ) : null}

          {mode === "forgot" ? (
            <button
              type="button"
              className="w-full text-center text-xs font-semibold text-primary underline"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Voltar para login
            </button>
          ) : null}

          {message ? <p className="text-xs font-medium text-[#6A5E52]">{message}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
