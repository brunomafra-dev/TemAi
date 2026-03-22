"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getMyRecipes } from "@/features/recipes/local-storage";
import { getUserProfile, saveUserProfile } from "@/features/profile/storage";

export default function ProfilePage() {
  const [savedCount] = useState(() => getMyRecipes().length);
  const [profile, setProfile] = useState(() => getUserProfile());

  const quickStats = useMemo(
    () => [
      { label: "Receitas salvas", value: String(savedCount) },
      { label: "Objetivo semanal", value: "3 novas" },
      { label: "Modo favorito", value: "Ingredientes por texto" },
    ],
    [savedCount],
  );

  function onSaveProfile() {
    saveUserProfile(profile);
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setProfile((current) => ({ ...current, photoDataUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Area simples para acompanhar seu uso e evoluir preferencias nas proximas versoes.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Seu perfil</CardTitle>
          <CardDescription>Plano gratuito</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {profile.photoDataUrl ? (
              <img
                src={profile.photoDataUrl}
                alt="Foto de perfil"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-lg font-semibold text-muted-foreground">
                {profile.firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <Input type="file" accept="image/*" onChange={handlePhotoUpload} />
            </div>
          </div>

          <Input
            placeholder="Nome"
            value={profile.firstName}
            onChange={(event) =>
              setProfile((current) => ({ ...current, firstName: event.target.value }))
            }
          />
          <Input
            placeholder="Sobrenome"
            value={profile.lastName}
            onChange={(event) =>
              setProfile((current) => ({ ...current, lastName: event.target.value }))
            }
          />
          <Button className="w-full" onClick={onSaveProfile}>
            Salvar perfil
          </Button>

          {quickStats.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-surface-muted px-4 py-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-base font-semibold">{stat.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias futuras</CardTitle>
          <CardDescription>Itens planejados para evolucao do TemAi.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Sincronizacao de receitas em nuvem</li>
            <li>• Perfil alimentar (vegano, sem lactose, sem gluten)</li>
            <li>• Lista de compras automatica por receita</li>
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
