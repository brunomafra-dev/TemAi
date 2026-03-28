"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { saveUserProfileToCloud, type UserProfile } from "@/features/profile/storage";

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
  }

  async function handleLogin() {
    if (!client) {
      setMessage("Supabase nao configurado.");
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    const { error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setIsSubmitting(false);
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

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setIsSubmitting(false);
      setMessage(error.message || "Falha ao cadastrar.");
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

    if (data.user) {
      await saveUserProfileToCloud(profile);
    }

    setIsSubmitting(false);
    setMessage(
      "Conta criada. Verifique seu email para confirmar e entrar pelo link.",
    );
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
      typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : undefined;

    const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message || "Falha ao enviar email de recuperacao.");
      return;
    }

    setMessage("Enviamos um link para redefinir sua senha no seu email.");
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
                ? "Cadastro com username unico e confirmacao por email."
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
