"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BADGE_CATALOG, inferUnlockedBadgesByRecipes } from "@/features/profile/badges";
import { getNotificationPrefs, saveNotificationPrefs } from "@/features/profile/notifications-storage";
import { getUserProfile, saveUserProfile, type UserProfile } from "@/features/profile/storage";
import { getMyRecipes, getSavedRecipeRefs } from "@/features/recipes/local-storage";
import {
  clearCheckedShoppingItems,
  getShoppingListItems,
  removeShoppingItem,
  saveShoppingListItems,
  toggleShoppingItemChecked,
  type ShoppingListItem,
} from "@/features/recipes/shopping-storage";

const sections = [
  { id: "edit", label: "Editar Perfil" },
  { id: "shopping", label: "Lista de Compras" },
  { id: "author", label: "Receitas Autorais" },
  { id: "saved", label: "Receitas Salvas" },
  { id: "notifications", label: "Notificacoes" },
  { id: "privacy", label: "Politica de dados e privacidade" },
  { id: "terms", label: "Termos de Uso" },
  { id: "logout", label: "Sair da conta" },
  { id: "delete", label: "Excluir conta" },
] as const;

type SectionId = (typeof sections)[number]["id"];

function getBadgeBySlug(slug: string) {
  return BADGE_CATALOG.find((badge) => badge.slug === slug) || BADGE_CATALOG[0];
}

function getInitialSection(value: string | null): SectionId | null {
  if (!value) return null;
  return sections.some((section) => section.id === value) ? (value as SectionId) : null;
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="pt-5">Carregando perfil...</div>}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = getInitialSection(searchParams.get("section"));

  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile());
  const [workingProfile, setWorkingProfile] = useState<UserProfile>(() => getUserProfile());
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>(() => getShoppingListItems());
  const [shoppingMode, setShoppingMode] = useState<"geral" | "por_receita">("geral");
  const [selectedRecipeFilter, setSelectedRecipeFilter] = useState<string>("all");
  const [notificationPrefs, setNotificationPrefs] = useState(() => getNotificationPrefs());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const myRecipes = useMemo(() => getMyRecipes(), []);
  const savedRefs = useMemo(() => getSavedRecipeRefs(), []);
  const categoryCounts = useMemo(() => {
    const next: Record<string, number> = {};
    myRecipes.forEach((recipe) => {
      const key = recipe.category || "principais";
      next[key] = (next[key] || 0) + 1;
    });
    return next;
  }, [myRecipes]);

  const unlockedBadges = useMemo(() => {
    const inferred = inferUnlockedBadgesByRecipes({
      totalPublished: myRecipes.length,
      byCategory: {
        sobremesas: categoryCounts.sobremesas || 0,
        veggie: categoryCounts.veggie || 0,
        lanches: categoryCounts.lanches || 0,
        bebidas: categoryCounts.bebidas || 0,
      },
    });

    return Array.from(new Set([...(profile.unlockedBadges || []), ...inferred]));
  }, [categoryCounts, myRecipes.length, profile.unlockedBadges]);

  const selectedBadgeSlug = unlockedBadges.includes(profile.selectedBadge)
    ? profile.selectedBadge
    : unlockedBadges[0] || "estagiario";
  const selectedBadge = getBadgeBySlug(selectedBadgeSlug);

  const shoppingRecipeOptions = useMemo(
    () => Array.from(new Map(shoppingItems.map((item) => [item.recipeId, item.recipeTitle])).entries()),
    [shoppingItems],
  );

  const filteredShoppingItems = useMemo(() => {
    if (selectedRecipeFilter === "all") return shoppingItems;
    return shoppingItems.filter((item) => item.recipeId === selectedRecipeFilter);
  }, [selectedRecipeFilter, shoppingItems]);

  const mergedShoppingItems = useMemo(() => {
    const byName = new Map<string, { name: string; checked: boolean; ids: string[] }>();
    filteredShoppingItems.forEach((item) => {
      const key = item.name.trim().toLowerCase();
      const current = byName.get(key);
      if (!current) {
        byName.set(key, { name: item.name, checked: item.checked, ids: [item.id] });
        return;
      }
      current.ids.push(item.id);
      current.checked = current.checked && item.checked;
    });
    return Array.from(byName.values());
  }, [filteredShoppingItems]);

  function changeSection(nextSection: SectionId | null) {
    if (!nextSection) {
      router.replace("/perfil", { scroll: false });
      return;
    }
    router.replace(`/perfil?section=${nextSection}`, { scroll: false });
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setWorkingProfile((current) => ({ ...current, photoDataUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  function saveProfileChanges() {
    const selected = unlockedBadges.includes(workingProfile.selectedBadge)
      ? workingProfile.selectedBadge
      : unlockedBadges[0] || "estagiario";

    const next = { ...workingProfile, selectedBadge: selected, unlockedBadges };
    saveUserProfile(next);
    setProfile(next);
    setWorkingProfile(next);
  }

  function toggleNotification(key: keyof typeof notificationPrefs) {
    const next = { ...notificationPrefs, [key]: !notificationPrefs[key] };
    setNotificationPrefs(next);
    saveNotificationPrefs(next);
  }

  function toggleMergedItem(ids: string[]) {
    const idSet = new Set(ids);
    const targetChecked = shoppingItems.filter((item) => idSet.has(item.id)).every((item) => item.checked);
    const next = shoppingItems.map((item) => (idSet.has(item.id) ? { ...item, checked: !targetChecked } : item));
    setShoppingItems(next);
    saveShoppingListItems(next);
  }

  function selectAllShoppingItems() {
    const visibleIds = new Set(filteredShoppingItems.map((item) => item.id));
    const next = shoppingItems.map((item) => (visibleIds.has(item.id) ? { ...item, checked: true } : item));
    setShoppingItems(next);
    saveShoppingListItems(next);
  }

  function deleteLocalAccount() {
    localStorage.clear();
    setShowDeleteConfirm(false);
    router.push("/");
  }

  return (
    <section className="space-y-5 pb-2">
      <header className="relative overflow-hidden rounded-[2rem] shadow-[0_20px_45px_-25px_rgba(42,30,23,0.55)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1700&q=80)" }}
        />
        <div className="absolute inset-0 bg-[#21160F]/76 backdrop-blur-[1.8px]" />
        <div className="relative z-10 px-5 pb-6 pt-7 text-[#FDF7EC]">
          <div className="flex items-center gap-3">
            {profile.photoDataUrl ? (
              <img src={profile.photoDataUrl} alt="Foto de perfil" className="h-14 w-14 rounded-full border border-white/35 object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-white/15 text-xl font-semibold">
                {profile.firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl">{profile.firstName} {profile.lastName}</h1>
              <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${selectedBadge.colorClass}`}>{selectedBadge.label}</p>
            </div>
          </div>
        </div>
      </header>

      <Card className="border-[#E5D7BF] bg-[#FFFCF7]">
        <CardContent className="space-y-2 pt-4">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                if (section.id === "logout") {
                  alert("Sessao local encerrada. (Auth real entra na proxima fase)");
                  changeSection(null);
                  return;
                }
                if (section.id === "delete") {
                  setShowDeleteConfirm(true);
                  return;
                }
                if (activeSection === section.id) {
                  changeSection(null);
                  return;
                }
                changeSection(section.id);
              }}
              className={
                activeSection === section.id
                  ? "w-full rounded-xl border border-[#C66A3D] bg-[#F8E8E1] px-4 py-3 text-left text-sm font-semibold text-[#7A4733]"
                  : "w-full rounded-xl border border-[#E5D7BF] bg-white px-4 py-3 text-left text-sm font-semibold text-[#5E5348]"
              }
            >
              {section.label}
            </button>
          ))}
        </CardContent>
      </Card>

      {activeSection === "edit" ? (
        <Card className="border-[#E5D7BF] bg-[#FFFCF7]">
          <CardContent className="space-y-4 pt-5">
            <p className="text-sm font-semibold text-[#5D5248]">Editar Perfil</p>

            <div className="rounded-2xl border border-[#E8DBC8] bg-[#FAF4EA] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7A6D60]">Preview</p>
              <div className="flex items-center gap-3">
                {workingProfile.photoDataUrl ? (
                  <img
                    src={workingProfile.photoDataUrl}
                    alt="Preview do perfil"
                    className="h-14 w-14 rounded-full border border-[#DCC9AE] object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#DCC9AE] bg-white text-lg font-semibold text-[#7A6D60]">
                    {(workingProfile.firstName || "C").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-[#4F4338]">
                    {workingProfile.firstName || "Chef"} {workingProfile.lastName}
                  </p>
                  <p
                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      getBadgeBySlug(workingProfile.selectedBadge || selectedBadgeSlug).colorClass
                    }`}
                  >
                    {getBadgeBySlug(workingProfile.selectedBadge || selectedBadgeSlug).label}
                  </p>
                </div>
              </div>
            </div>

            <label className="block rounded-xl border border-[#E8DBC8] bg-[#FAF4EA] px-3 py-2 text-xs text-[#6B6055]">
              Foto de perfil
              <input type="file" accept="image/*" className="mt-2 block w-full" onChange={handlePhotoUpload} />
            </label>

            <Input
              placeholder="Nome"
              value={workingProfile.firstName}
              onChange={(e) => setWorkingProfile((c) => ({ ...c, firstName: e.target.value }))}
            />
            <Input
              placeholder="Sobrenome"
              value={workingProfile.lastName}
              onChange={(e) => setWorkingProfile((c) => ({ ...c, lastName: e.target.value }))}
            />

            <div className="space-y-2 rounded-2xl border border-[#E8DBC8] bg-[#FAF4EA] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7A6D60]">Insignia</p>
              <div className="grid gap-2">
                {unlockedBadges.map((badgeSlug) => {
                  const badge = getBadgeBySlug(badgeSlug);
                  const isActive = (workingProfile.selectedBadge || selectedBadgeSlug) === badge.slug;
                  return (
                    <button
                      key={badge.slug}
                      onClick={() => setWorkingProfile((current) => ({ ...current, selectedBadge: badge.slug }))}
                      className={
                        isActive
                          ? "rounded-xl border border-[#C66A3D] bg-[#F8E8E1] px-3 py-2 text-left"
                          : "rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-left"
                      }
                    >
                      <p className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${badge.colorClass}`}>
                        {badge.label}
                      </p>
                      <p className="mt-1 text-xs text-[#6A5E52]">{badge.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Button className="w-full" onClick={saveProfileChanges}>
              Salvar alteracoes
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {activeSection === "shopping" ? (
        <Card className="border-[#E5D7BF] bg-[#FFFCF7]"><CardContent className="space-y-3 pt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#5D5248]">Lista de Compras</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={selectAllShoppingItems}>Selecionar todos</Button>
              <Button variant="secondary" size="sm" onClick={() => setShoppingItems(clearCheckedShoppingItems())}>Limpar concluidos</Button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShoppingMode("geral")} className={shoppingMode === "geral" ? "rounded-full border border-[#C66A3D] bg-[#F8E8E1] px-3 py-1 text-xs font-semibold text-[#7A4733]" : "rounded-full border border-[#E5D7BF] bg-white px-3 py-1 text-xs font-semibold text-[#6A5E52]"}>Geral</button>
            <button onClick={() => setShoppingMode("por_receita")} className={shoppingMode === "por_receita" ? "rounded-full border border-[#C66A3D] bg-[#F8E8E1] px-3 py-1 text-xs font-semibold text-[#7A4733]" : "rounded-full border border-[#E5D7BF] bg-white px-3 py-1 text-xs font-semibold text-[#6A5E52]"}>Por receita</button>
          </div>
          {shoppingMode === "por_receita" ? (
            <select value={selectedRecipeFilter} onChange={(e) => setSelectedRecipeFilter(e.target.value)} className="h-10 w-full rounded-xl border border-[#E5D7BF] bg-white px-3 text-sm">
              <option value="all">Todas as receitas</option>
              {shoppingRecipeOptions.map(([recipeId, recipeTitle]) => <option key={recipeId} value={recipeId}>{recipeTitle}</option>)}
            </select>
          ) : null}
          {shoppingItems.length === 0 ? <p className="text-sm text-[#7A6D60]">Sua lista esta vazia.</p> : shoppingMode === "geral" ? mergedShoppingItems.map((item) => (
            <label key={item.name.toLowerCase()} className="flex items-center justify-between rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-sm">
              <span className={item.checked ? "line-through text-[#9A8D7E]" : "text-[#4F4338]"}>{item.name}</span>
              <input type="checkbox" checked={item.checked} onChange={() => toggleMergedItem(item.ids)} />
            </label>
          )) : filteredShoppingItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={item.checked} onChange={() => setShoppingItems(toggleShoppingItemChecked(item.id))} /><span className={item.checked ? "line-through text-[#9A8D7E]" : "text-[#4F4338]"}>{item.name}</span></label>
              <Button size="sm" variant="outline" onClick={() => setShoppingItems(removeShoppingItem(item.id))}>Remover</Button>
            </div>
          ))}
        </CardContent></Card>
      ) : null}

      {activeSection === "author" ? (
        <Card className="border-[#E5D7BF] bg-[#FFFCF7]"><CardContent className="space-y-2 pt-5">
          <p className="text-sm font-semibold text-[#5D5248]">Receitas Autorais</p>
          <p className="text-sm text-[#7A6D60]">{myRecipes.length} receitas autorais.</p>
          <Link href="/minhas-receitas" className="inline-flex rounded-full border border-[#C66A3D] bg-[#F8E8E1] px-4 py-2 text-xs font-semibold text-[#7A4733]">Abrir Minhas Receitas</Link>
        </CardContent></Card>
      ) : null}

      {activeSection === "saved" ? (
        <Card className="border-[#E5D7BF] bg-[#FFFCF7]"><CardContent className="space-y-2 pt-5">
          <p className="text-sm font-semibold text-[#5D5248]">Receitas Salvas</p>
          {savedRefs.length === 0 ? <p className="text-sm text-[#7A6D60]">Voce ainda nao salvou receitas.</p> : savedRefs.map((item) => <p key={`${item.recipeId}-${item.savedAt}`} className="rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-xs">{item.recipeId}</p>)}
        </CardContent></Card>
      ) : null}

      {activeSection === "notifications" ? (
        <Card className="border-[#E5D7BF] bg-[#FFFCF7]"><CardContent className="space-y-2 pt-5">
          <p className="text-sm font-semibold text-[#5D5248]">Notificacoes</p>
          {[{ key: "recipeRating", label: "Sua receita recebeu classificacao" }, { key: "newBadge", label: "Voce ganhou um novo badge" }, { key: "publishSuccess", label: "Receita publicada com sucesso" }, { key: "shoppingUpdates", label: "Atualizacoes da lista de compras" }].map((item) => (
            <label key={item.key} className="flex items-center justify-between rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-sm">
              <span>{item.label}</span>
              <input type="checkbox" checked={Boolean(notificationPrefs[item.key as keyof typeof notificationPrefs])} onChange={() => toggleNotification(item.key as keyof typeof notificationPrefs)} />
            </label>
          ))}
        </CardContent></Card>
      ) : null}

      {activeSection === "privacy" ? (
        <Card className="border-[#E5D7BF] bg-[#FFFCF7]"><CardContent className="space-y-2 pt-5 text-sm text-[#6A5E52]"><p className="font-semibold text-[#5D5248]">Politica de dados e privacidade</p><p>Seus dados locais ficam no dispositivo nesta fase.</p></CardContent></Card>
      ) : null}

      {activeSection === "terms" ? (
        <Card className="border-[#E5D7BF] bg-[#FFFCF7]"><CardContent className="space-y-2 pt-5 text-sm text-[#6A5E52]"><p className="font-semibold text-[#5D5248]">Termos de Uso</p><p>Conteudo ofensivo pode ser removido.</p></CardContent></Card>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#FFFCF7] p-5 shadow-2xl">
            <p className="text-lg font-semibold text-[#4F4338]">Tem certeza que deseja excluir sua conta?</p>
            <p className="mt-2 text-sm text-[#7A6D60]">Essa acao remove dados locais deste dispositivo.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={deleteLocalAccount}>Excluir conta</Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
