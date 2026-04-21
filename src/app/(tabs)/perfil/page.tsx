"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BADGE_CATALOG, inferUnlockedBadgesByRecipes } from "@/features/profile/badges";
import { getNotificationPrefs, saveNotificationPrefs } from "@/features/profile/notifications-storage";
import { createSupportTicket, getMySupportTickets, type SupportTicket } from "@/features/profile/support-tickets";
import { getSubscriptionState, syncSubscriptionFromCloud, type SubscriptionState } from "@/features/profile/subscription-storage";
import {
  getUserProfile,
  saveUserProfile,
  saveUserProfileToCloud,
  syncUserProfileFromCloud,
  type UserProfile,
} from "@/features/profile/storage";
import { getMyRecipes, getSavedRecipeRefs } from "@/features/recipes/local-storage";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
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
  { id: "subscription", label: "Gerenciar assinatura" },
  { id: "badges", label: "Insignias" },
  { id: "shopping", label: "Lista de Compras" },
  { id: "author", label: "Receitas Autorais" },
  { id: "saved", label: "Receitas Salvas" },
  { id: "notifications", label: "Notificacoes" },
  { id: "support", label: "Suporte / Fale conosco" },
  { id: "privacy", label: "Politica de dados e privacidade" },
  { id: "terms", label: "Termos de Uso" },
  { id: "logout", label: "Sair da conta" },
  { id: "delete", label: "Excluir conta" },
] as const;

const notificationItems = [
  { key: "recipeRating", label: "Sua receita recebeu classificacao" },
  { key: "newBadge", label: "Voce ganhou um novo badge" },
  { key: "publishSuccess", label: "Receita publicada com sucesso" },
  { key: "shoppingUpdates", label: "Atualizacoes da lista de compras" },
] as const;

type SectionId = (typeof sections)[number]["id"];
type SupportQuickOption =
  | "beneficios"
  | "free-vs-premium"
  | "cancelamento"
  | "cobranca"
  | "login"
  | "falar-humano";

type SupportMessage = {
  from: "user" | "bot";
  text: string;
  options?: SupportQuickOption[];
};

const ProfileSectionButton = memo(function ProfileSectionButton({
  section,
  onOpen,
}: {
  section: (typeof sections)[number];
  onOpen: (section: SectionId) => void;
}) {
  return (
    <button
      onClick={() => onOpen(section.id)}
      className={
        section.id === "delete"
          ? "w-full rounded-xl border border-[#E8B4B4] bg-[#FFF4F4] px-4 py-3 text-left text-sm font-semibold text-[#B42318]"
          : "w-full rounded-xl border border-[#E5D7BF] bg-white px-4 py-3 text-left text-sm font-semibold text-[#5E5348]"
      }
    >
      {section.label}
    </button>
  );
});

ProfileSectionButton.displayName = "ProfileSectionButton";

function getBadgeBySlug(slug: string) {
  return BADGE_CATALOG.find((badge) => badge.slug === slug) || BADGE_CATALOG[0];
}

function sanitizeUsername(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);
}

export default function ProfilePage() {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<SectionId | null>(null);
  const [modalStage, setModalStage] = useState<"enter" | "open" | "exit">("open");
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile());
  const [workingProfile, setWorkingProfile] = useState<UserProfile>(() => getUserProfile());
  const [shoppingItems, setShoppingItems] = useState<ShoppingListItem[]>(() => getShoppingListItems());
  const [shoppingMode, setShoppingMode] = useState<"geral" | "por_receita">("geral");
  const [selectedRecipeFilter, setSelectedRecipeFilter] = useState<string>("all");
  const [notificationPrefs, setNotificationPrefs] = useState(() => getNotificationPrefs());
  const [subscription, setSubscription] = useState<SubscriptionState>(() => getSubscriptionState());
  const [badgeHint, setBadgeHint] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestion, setUsernameSuggestion] = useState("");
  const [supportInput, setSupportInput] = useState("");
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportTicketMessage, setSupportTicketMessage] = useState("");
  const [creatingSupportTicket, setCreatingSupportTicket] = useState(false);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([
    {
      from: "bot",
      text: "Oi! Sou o suporte virtual do TemAi. Escolha uma opcao abaixo ou digite sua duvida.",
      options: ["beneficios", "free-vs-premium", "cobranca", "falar-humano"],
    },
  ]);

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
  const usernameHandle = profile.username?.trim()
    ? `@${profile.username.trim().replace(/^@+/, "")}`
    : `@${[profile.firstName, profile.lastName].join("_").toLowerCase().replace(/\s+/g, "_")}`;
  const activeModalTitle = useMemo(
    () => sections.find((section) => section.id === activeModal)?.label,
    [activeModal],
  );

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

  useEffect(() => {
    let isMounted = true;
    syncUserProfileFromCloud()
      .then((remote) => {
        if (!isMounted || !remote) return;
        setProfile(remote);
        setWorkingProfile(remote);
      })
      .catch(() => {
        if (!isMounted) return;
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeModal !== "support") return;
    let isMounted = true;
    getMySupportTickets(5)
      .then((tickets) => {
        if (!isMounted) return;
        setSupportTickets(tickets);
      })
      .catch(() => {
        if (!isMounted) return;
      });

    return () => {
      isMounted = false;
    };
  }, [activeModal]);

  useEffect(() => {
    let isMounted = true;
    syncSubscriptionFromCloud()
      .then((remote) => {
        if (!isMounted || !remote) return;
        setSubscription(remote);
      })
      .catch(() => {
        if (!isMounted) return;
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    };
  }, []);

  const openModal = useCallback((section: SectionId) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    setActiveModal(section);
    setModalStage("enter");
    openTimeoutRef.current = setTimeout(() => setModalStage("open"), 12);
  }, []);

  const closeModal = useCallback(() => {
    setModalStage("exit");
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setActiveModal(null);
      setModalStage("open");
    }, 180);
  }, []);

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setWorkingProfile((current) => ({ ...current, photoDataUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  }

  async function saveProfileChanges() {
    const nextUsername = sanitizeUsername(workingProfile.username || "");
    if (nextUsername.length < 3) {
      setProfileMessage("Seu @ precisa ter pelo menos 3 caracteres.");
      return;
    }

    const currentUsername = sanitizeUsername(profile.username || "");
    if (nextUsername !== currentUsername && usernameAvailable !== true) {
      setProfileMessage("Esse @ ja esta em uso. Escolha outro.");
      return;
    }

    const selected = unlockedBadges.includes(workingProfile.selectedBadge)
      ? workingProfile.selectedBadge
      : unlockedBadges[0] || "estagiario";

    const next = { ...workingProfile, username: nextUsername, selectedBadge: selected, unlockedBadges };
    saveUserProfile(next);
    setProfile(next);
    setWorkingProfile(next);
    const synced = await saveUserProfileToCloud(next);
    setProfileMessage(
      synced
        ? "Perfil atualizado com sucesso."
        : "Perfil salvo localmente. Faca login para sincronizar.",
    );
  }

  async function checkUsernameAvailability(raw: string) {
    const next = sanitizeUsername(raw);
    setWorkingProfile((current) => ({ ...current, username: next }));
    setUsernameAvailable(null);
    setUsernameSuggestion("");
    setProfileMessage("");

    if (next.length < 3) return;

    const currentUsername = sanitizeUsername(profile.username || "");
    if (next === currentUsername) {
      setUsernameAvailable(true);
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) return;

    setCheckingUsername(true);
    const { data, error } = await client.rpc("is_username_available", {
      p_username: next,
    });
    setCheckingUsername(false);

    if (error) {
      setProfileMessage("Nao foi possivel validar o @ agora.");
      return;
    }

    setUsernameAvailable(Boolean(data));
    if (!data) {
      const suggestion = await suggestAvailableUsername(next);
      setUsernameSuggestion(suggestion);
    }
  }

  async function suggestAvailableUsername(baseRaw: string): Promise<string> {
    const client = getSupabaseBrowserClient();
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

  async function selectBadge(slug: string) {
    const unlocked = unlockedBadges.includes(slug);
    const badge = getBadgeBySlug(slug);

    if (!unlocked) {
      setBadgeHint(`Para desbloquear: ${badge.description}`);
      return;
    }

    const next = { ...profile, selectedBadge: slug, unlockedBadges };
    saveUserProfile(next);
    setProfile(next);
    setWorkingProfile(next);
    setBadgeHint(`Insignia ativa: ${badge.label}`);
    await saveUserProfileToCloud(next);
  }

  const toggleNotification = useCallback((key: keyof typeof notificationPrefs) => {
    setNotificationPrefs((current) => {
      const next = { ...current, [key]: !current[key] };
      saveNotificationPrefs(next);
      return next;
    });
  }, []);

  const toggleMergedItem = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setShoppingItems((current) => {
      const targetChecked = current.filter((item) => idSet.has(item.id)).every((item) => item.checked);
      const next = current.map((item) => (idSet.has(item.id) ? { ...item, checked: !targetChecked } : item));
      saveShoppingListItems(next);
      return next;
    });
  }, []);

  const selectAllShoppingItems = useCallback(() => {
    const visibleIds = new Set(filteredShoppingItems.map((item) => item.id));
    setShoppingItems((current) => {
      const next = current.map((item) => (visibleIds.has(item.id) ? { ...item, checked: true } : item));
      saveShoppingListItems(next);
      return next;
    });
  }, [filteredShoppingItems]);

  function deleteLocalAccount() {
    localStorage.clear();
    closeModal();
    router.push("/");
  }

  function optionLabel(option: SupportQuickOption): string {
    switch (option) {
      case "beneficios":
        return "Beneficios Premium";
      case "free-vs-premium":
        return "Free vs Premium";
      case "cancelamento":
        return "Cancelar assinatura";
      case "cobranca":
        return "Cobranca";
      case "login":
        return "Problemas de login";
      case "falar-humano":
        return "Falar com humano";
      default:
        return "Opcao";
    }
  }

  function optionPrompt(option: SupportQuickOption): string {
    switch (option) {
      case "beneficios":
        return "Quais sao os beneficios do Premium?";
      case "free-vs-premium":
        return "Qual a diferenca entre Free e Premium?";
      case "cancelamento":
        return "Como faco para cancelar assinatura?";
      case "cobranca":
        return "Tenho duvida de cobranca.";
      case "login":
        return "Nao estou conseguindo entrar na conta.";
      case "falar-humano":
        return "Quero falar com suporte humano.";
      default:
        return "Preciso de ajuda.";
    }
  }

  function replySupport(message: string): SupportMessage {
    const text = message.toLowerCase();
    if (
      text.includes("beneficio") ||
      text.includes("vantagem") ||
      text.includes("premium") ||
      text.includes("vale a pena")
    ) {
      return {
        from: "bot",
        text:
          "Premium (R$ 24,90/mes) inclui: geracao ilimitada com IA, uso de voz e imagem na IA, receitas autorais por voz e badges exclusivos. Se voce usa o app todo dia, costuma compensar rapido.",
        options: ["free-vs-premium", "cancelamento", "cobranca"],
      };
    }
    if (
      text.includes("free") ||
      text.includes("diferen") ||
      text.includes("compar") ||
      text.includes("limite")
    ) {
      return {
        from: "bot",
        text:
          "Free: 3 geracoes IA por mes, somente texto e badges padrao. Premium: ilimitado, IA com voz/imagem, receita autoral por voz e badges premium.",
        options: ["beneficios", "cancelamento", "falar-humano"],
      };
    }
    if (text.includes("cancelar") || text.includes("cancelamento")) {
      return {
        from: "bot",
        text:
          "Voce pode cancelar quando quiser. O premium continua ativo ate o fim do ciclo ja pago. Na renovacao seguinte, nao sera cobrado de novo.",
        options: ["cobranca", "falar-humano"],
      };
    }
    if (
      text.includes("cobranca") ||
      text.includes("cobrança") ||
      text.includes("cartao") ||
      text.includes("cartão") ||
      text.includes("pix")
    ) {
      return {
        from: "bot",
        text:
          "Para cobranca: confira o historico na loja (Google Play/App Store). Se houver cobranca duplicada ou erro, envie email com print e data para suporte@temaiapp.com.",
        options: ["falar-humano", "cancelamento"],
      };
    }
    if (text.includes("senha") || text.includes("login") || text.includes("email") || text.includes("conta")) {
      return {
        from: "bot",
        text:
          "Se nao consegue entrar, use 'esqueci minha senha' na tela de login. Confira tambem seu email de confirmacao e pasta spam.",
        options: ["falar-humano", "cobranca"],
      };
    }
    if (text.includes("humano") || text.includes("atendente")) {
      return {
        from: "bot",
        text:
          "Perfeito. Para atendimento humano, envie para suporte@temaiapp.com com: assunto, email da conta, print e descricao do problema.",
        options: ["cobranca", "login"],
      };
    }
    return {
      from: "bot",
      text:
        "Posso te ajudar com beneficios do premium, diferenca free vs premium, cobranca, cancelamento e login.",
      options: ["beneficios", "free-vs-premium", "cancelamento", "login"],
    };
  }

  function sendSupportPreset(option: SupportQuickOption) {
    const prompt = optionPrompt(option);
    setSupportMessages((current) => [...current, { from: "user", text: prompt }]);
    const bot = replySupport(prompt);
    setTimeout(() => {
      setSupportMessages((current) => [...current, bot]);
      if (option === "falar-humano") {
        void openHumanSupportTicket(prompt);
      }
    }, 160);
  }

  function sendSupportMessage() {
    const message = supportInput.trim();
    if (!message) return;
    setSupportMessages((current) => [...current, { from: "user", text: message }]);
    setSupportInput("");
    const bot = replySupport(message);
    setTimeout(() => {
      setSupportMessages((current) => [...current, bot]);
      if (message.toLowerCase().includes("humano") || message.toLowerCase().includes("atendente")) {
        void openHumanSupportTicket(message);
      }
    }, 180);
  }

  async function openHumanSupportTicket(userMessage: string) {
    if (creatingSupportTicket) return;
    setCreatingSupportTicket(true);
    setSupportTicketMessage("");

    const created = await createSupportTicket({
      subject: "Atendimento humano via chat do app",
      message: userMessage,
      metadata: {
        channel: "perfil_support_chat",
      },
    });

    setCreatingSupportTicket(false);

    if (!created) {
      setSupportTicketMessage("Nao foi possivel abrir ticket agora. Tente novamente ou envie email.");
      return;
    }

    setSupportTicketMessage(`Ticket aberto com sucesso. Protocolo: ${created.id.slice(0, 8).toUpperCase()}`);
    setSupportTickets((current) => [created, ...current].slice(0, 5));
    setSupportMessages((current) => [
      ...current,
      {
        from: "bot",
        text: `Pronto! Seu ticket foi aberto com protocolo ${created.id.slice(0, 8).toUpperCase()}.`,
        options: ["cobranca", "login"],
      },
    ]);
  }

  function statusLabel(status: SupportTicket["status"]): string {
    switch (status) {
      case "open":
        return "Aberto";
      case "in_progress":
        return "Em andamento";
      case "resolved":
        return "Resolvido";
      case "closed":
        return "Fechado";
      default:
        return "Aberto";
    }
  }

  function renderModalBody() {
    switch (activeModal) {
      case "subscription": {
        const isPremium = subscription.plan === "premium";
        const premiumUntil = subscription.premiumUntil
          ? new Date(`${subscription.premiumUntil}T12:00:00`).toLocaleDateString("pt-BR")
          : null;
        const renewsAt = subscription.renewsAt
          ? new Date(`${subscription.renewsAt}T12:00:00`).toLocaleDateString("pt-BR")
          : null;

        return (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#E5D7BF] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8A7A69]">Plano atual</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-[#4F4338]">{isPremium ? "Premium" : "Free"}</p>
                <span
                  className={
                    isPremium
                      ? "rounded-full border border-[#C66A3D] bg-[#F8E8E1] px-2 py-0.5 text-xs font-semibold text-[#7A4733]"
                      : "rounded-full border border-[#D6C8B4] bg-[#F7F0E4] px-2 py-0.5 text-xs font-semibold text-[#6E6358]"
                  }
                >
                  {isPremium ? "Ativo" : "Basico"}
                </span>
              </div>
              {isPremium ? (
                <div className="mt-2 space-y-1 text-xs text-[#6E6154]">
                  <p>Premium ativo ate: {premiumUntil || "Nao informado"}</p>
                  <p>Proxima renovacao: {renewsAt || "Nao informado"}</p>
                  <p>Mensalidade: R$ 24,90/mes</p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#6E6154]">
                  Uso mensal de IA: {subscription.aiGenerationsUsedThisMonth}/{subscription.aiGenerationsLimitThisMonth}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-[#E5D7BF] bg-white p-3">
              <p className="text-sm font-semibold text-[#5D5248]">Assinatura Premium</p>
              <p className="mt-1 text-xs text-[#6A5E52]">Valor atual: R$ 24,90 por mes.</p>
            </div>

            <div className="rounded-2xl border border-[#E5D7BF] bg-white p-3">
              <p className="text-sm font-semibold text-[#5D5248]">Beneficios Premium</p>
              <ul className="mt-2 space-y-1 text-xs text-[#6A5E52]">
                <li>• Geracao de receitas ilimitadas com IA</li>
                <li>• Adicionar suas receitas autorais com voz</li>
                <li>• Gerar receitas com IA utilizando imagem e voz</li>
                <li>• Badges exclusivos para premium</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#E5D7BF] bg-white p-3">
              <p className="text-sm font-semibold text-[#5D5248]">Plano Free (restricoes)</p>
              <ul className="mt-2 space-y-1 text-xs text-[#6A5E52]">
                <li>• Limite de 3 receitas geradas com IA por mes</li>
                <li>• Receitas geradas com IA so com texto</li>
                <li>• Adicao de receitas autorais so por texto</li>
                <li>• Badges padrao</li>
              </ul>
            </div>
          </div>
        );
      }
      case "edit":
        return (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#5D5248]">Editar Perfil</p>
            <label className="block rounded-xl border border-[#E8DBC8] bg-[#FAF4EA] px-3 py-2 text-xs text-[#6B6055]">
              Foto de perfil
              <input type="file" accept="image/*" className="mt-2 block w-full" onChange={handlePhotoUpload} />
            </label>
            <Input placeholder="Nome" value={workingProfile.firstName} onChange={(e) => setWorkingProfile((c) => ({ ...c, firstName: e.target.value }))} />
            <Input placeholder="Sobrenome" value={workingProfile.lastName} onChange={(e) => setWorkingProfile((c) => ({ ...c, lastName: e.target.value }))} />
            <div className="space-y-1">
              <Input
                placeholder="@seuusername"
                value={workingProfile.username}
                onChange={(e) => void checkUsernameAvailability(e.target.value)}
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
            {profileMessage ? (
              <p className="rounded-lg border border-[#E5D7BF] bg-white px-3 py-2 text-xs text-[#6A5E52]">
                {profileMessage}
              </p>
            ) : null}
            <Button className="w-full" onClick={() => void saveProfileChanges()}>Salvar alteracoes</Button>
          </div>
        );
      case "shopping":
        return (
          <div className="space-y-3">
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
            <div className="max-h-[45vh] space-y-2 overflow-auto pr-1">
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
            </div>
          </div>
        );
      case "badges":
        return (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#5D5248]">Insignias</p>
            <p className="text-xs text-[#7A6D60]">
              Toque para ativar. As bloqueadas mostram o requisito.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {BADGE_CATALOG.map((badge) => {
                const unlocked = unlockedBadges.includes(badge.slug);
                const isSelected = selectedBadgeSlug === badge.slug;
                return (
                  <button
                    key={badge.slug}
                    onClick={() => void selectBadge(badge.slug)}
                    className={
                      unlocked
                        ? `rounded-xl border px-3 py-2 text-left text-sm ${isSelected ? "border-[#C66A3D] bg-[#F8E8E1]" : "border-[#E5D7BF] bg-white"}`
                        : "rounded-xl border border-[#DFDFDF] bg-[#F5F5F5] px-3 py-2 text-left text-sm text-[#8A8A8A]"
                    }
                  >
                    <p className="font-semibold">{badge.label}</p>
                    <p className="text-xs">{badge.description}</p>
                  </button>
                );
              })}
            </div>
            {badgeHint ? (
              <p className="rounded-lg border border-[#E5D7BF] bg-white px-3 py-2 text-xs text-[#6A5E52]">
                {badgeHint}
              </p>
            ) : null}
          </div>
        );
      case "author":
        return (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#5D5248]">Receitas Autorais</p>
            <p className="text-sm text-[#7A6D60]">{myRecipes.length} receitas autorais.</p>
            <Link href="/minhas-receitas" className="inline-flex rounded-full border border-[#C66A3D] bg-[#F8E8E1] px-4 py-2 text-xs font-semibold text-[#7A4733]">Abrir Minhas Receitas</Link>
          </div>
        );
      case "saved":
        return (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#5D5248]">Receitas Salvas</p>
            <div className="max-h-[45vh] space-y-2 overflow-auto pr-1">
              {savedRefs.length === 0 ? <p className="text-sm text-[#7A6D60]">Voce ainda nao salvou receitas.</p> : savedRefs.map((item) => <p key={`${item.recipeId}-${item.savedAt}`} className="rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-xs">{item.recipeId}</p>)}
            </div>
          </div>
        );
      case "notifications":
        return (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#5D5248]">Notificacoes</p>
            {notificationItems.map((item) => (
              <label key={item.key} className="flex items-center justify-between rounded-xl border border-[#E5D7BF] bg-white px-3 py-2 text-sm">
                <span>{item.label}</span>
                <input type="checkbox" checked={Boolean(notificationPrefs[item.key as keyof typeof notificationPrefs])} onChange={() => toggleNotification(item.key as keyof typeof notificationPrefs)} />
              </label>
            ))}
          </div>
        );
      case "support":
        return (
          <div className="space-y-2">
            <p className="text-sm text-[#6A5E52]">
              Para suporte, duvidas de conta, assinatura ou privacidade, fale com nossa equipe:
            </p>
            <div className="rounded-xl border border-[#E5D7BF] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7A6D60]">Chat de suporte</p>
              <div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-lg border border-[#EADFCC] bg-[#FAF5EC] p-2">
                {supportMessages.map((item, index) => (
                  <div key={`${item.from}-${index}`} className="space-y-1">
                    <p
                      className={
                        item.from === "user"
                          ? "rounded-lg bg-[#F8E8E1] px-2 py-1 text-xs text-[#5E4134]"
                          : "rounded-lg bg-white px-2 py-1 text-xs text-[#5E5348]"
                      }
                    >
                      {item.text}
                    </p>
                    {item.from === "bot" && item.options?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {item.options.map((option) => (
                          <button
                            key={`${index}-${option}`}
                            type="button"
                            className="rounded-full border border-[#E5D7BF] bg-white px-2 py-1 text-[11px] font-semibold text-[#6A5E52]"
                            onClick={() => sendSupportPreset(option)}
                          >
                            {optionLabel(option)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  placeholder="Digite sua duvida"
                  value={supportInput}
                  onChange={(e) => setSupportInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendSupportMessage();
                    }
                  }}
                />
                <Button size="sm" onClick={sendSupportMessage}>Enviar</Button>
              </div>
              {supportTicketMessage ? (
                <p className="mt-2 rounded-lg border border-[#E5D7BF] bg-[#FAF4EA] px-2 py-1 text-xs text-[#6A5E52]">
                  {supportTicketMessage}
                </p>
              ) : null}
            </div>
            <div className="rounded-xl border border-[#E5D7BF] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#7A6D60]">Seus tickets recentes</p>
              {supportTickets.length === 0 ? (
                <p className="mt-2 text-xs text-[#7A6D60]">Nenhum ticket aberto ainda.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="rounded-lg border border-[#EADFCC] bg-[#FAF5EC] px-2 py-1">
                      <p className="text-xs font-semibold text-[#5E5348]">
                        {ticket.subject}
                      </p>
                      <p className="text-[11px] text-[#7A6D60]">
                        Protocolo: {ticket.id.slice(0, 8).toUpperCase()} • {statusLabel(ticket.status)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <a
              href="mailto:suporte@temaiapp.com?subject=TemAi%20-%20Suporte"
              className="inline-flex rounded-full border border-[#C66A3D] bg-[#F8E8E1] px-4 py-2 text-xs font-semibold text-[#7A4733]"
            >
              Enviar email para suporte
            </a>
            <p className="text-xs text-[#7A6D60]">
              Email de privacidade/LGPD: privacidade@temaiapp.com
            </p>
          </div>
        );
      case "privacy":
        return <Link href="/privacidade" className="text-sm font-semibold text-primary underline">Abrir Politica de Privacidade</Link>;
      case "terms":
        return <Link href="/termos" className="text-sm font-semibold text-primary underline">Abrir Termos de Uso</Link>;
      case "logout":
        return (
          <div className="space-y-3">
            <p className="text-sm text-[#6A5E52]">Deseja encerrar a sessao local agora?</p>
            <Button className="w-full" onClick={() => { alert("Sessao local encerrada. (Auth real entra na proxima fase)"); closeModal(); }}>
              Sair da conta
            </Button>
          </div>
        );
      case "delete":
        return (
          <div className="space-y-3">
            <p className="text-lg font-semibold text-[#4F4338]">Tem certeza que deseja excluir sua conta?</p>
            <p className="text-sm text-[#7A6D60]">Essa acao remove dados locais deste dispositivo.</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={closeModal}>Cancelar</Button>
              <Button className="flex-1" onClick={deleteLocalAccount}>Excluir conta</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
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
              <Image src={profile.photoDataUrl} alt="Foto de perfil" width={56} height={56} sizes="56px" unoptimized className="h-14 w-14 rounded-full border border-white/35 object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/35 bg-white/15 text-xl font-semibold">
                {profile.firstName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl">{profile.firstName} {profile.lastName}</h1>
              <p className="mt-0.5 text-xs text-[#E8DDCB]">{usernameHandle}</p>
              <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${selectedBadge.colorClass}`}>{selectedBadge.label}</p>
            </div>
          </div>
        </div>
      </header>

      <Card className="border-[#E5D7BF] bg-[#FFFCF7]">
        <CardContent className="space-y-2 pt-4">
          {sections.map((section) => (
            <ProfileSectionButton
              key={section.id}
              section={section}
              onOpen={openModal}
            />
          ))}
        </CardContent>
      </Card>

      {activeModal ? (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-200 ${
            modalStage === "open" ? "bg-black/50" : "bg-black/0"
          }`}
          onClick={closeModal}
        >
          <div
            className={`w-full max-w-md rounded-2xl bg-[#FFFCF7] p-5 shadow-2xl transition-all duration-200 ${
              modalStage === "open" ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[#5D5248]">{activeModalTitle}</p>
              <button className="text-xs font-semibold text-[#7A6D60]" onClick={closeModal}>Fechar</button>
            </div>
            {renderModalBody()}
          </div>
        </div>
      ) : null}
    </section>
  );
}
