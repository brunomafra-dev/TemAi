"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const client = getSupabaseBrowserClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleReset() {
    if (!client) {
      setMessage("Supabase não configurado.");
      return;
    }
    if (password.length < 6) {
      setMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("As senhas não conferem.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    const { error } = await client.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message || "Falha ao redefinir senha.");
      return;
    }

    setMessage("Senha atualizada com sucesso. Você já pode entrar.");
    setTimeout(() => router.replace("/auth"), 900);
  }

  return (
    <main className="native-page mx-auto w-full max-w-md px-4">
      <Card className="border-[#E5D7BF] bg-[#FFFCF7]">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
          <CardDescription>Digite sua nova senha para concluir a recuperação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Nova senha"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            placeholder="Confirmar nova senha"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <Button className="w-full" onClick={() => void handleReset()} disabled={isSubmitting}>
            {isSubmitting ? "Atualizando..." : "Salvar nova senha"}
          </Button>
          {message ? <p className="text-xs font-medium text-[#6A5E52]">{message}</p> : null}
        </CardContent>
      </Card>
    </main>
  );
}
