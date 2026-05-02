"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RatingStars } from "@/components/recipes/rating-stars";
import { BADGE_CATALOG } from "@/features/profile/badges";
import { getUserProfile, saveUserProfile, saveUserProfileToCloud } from "@/features/profile/storage";
import { LIBRARY_RECIPES } from "@/features/recipes/library-recipes";
import { getPendingShoppingCount } from "@/features/recipes/shopping-storage";
import type { Recipe } from "@/features/recipes/types";
import { cn, normalizeText } from "@/lib/utils";

const heroImage =
  "https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=1500&q=80";
const ctaImage =
  "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1500&q=80";

const categories = [
  {
    id: "principais",
    label: "Principais",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "veggie",
    label: "Veggie",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "massas",
    label: "Massas",
    image:
      "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "kids",
    label: "Kids",
    image:
      "https://gastronomiacarioca.zonasul.com.br/wp-content/uploads/2020/10/comida_crianca_zonasul.jpg",
  },
  {
    id: "sobremesas",
    label: "Sobremesas",
    image:
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "lanches",
    label: "Lanches",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "bebidas",
    label: "Bebidas",
    image:
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=80",
  },
];

const popularCategories = ["principais", "veggie", "massas", "kids", "sobremesas", "lanches", "bebidas"] as const;
const POPULAR_CACHE_KEY = "temai:home:popular:v1";
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
type Category = (typeof categories)[number];

const libraryMetaById: Record<
  string,
  {
    category: string;
    rating: number;
    image: string;
    author: string;
    views: number;
  }
> = {
  "library-macarrao-alho-e-oleo": {
    category: "massas",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=80",
    author: "Chef Amanda",
    views: 1540,
  },
  "library-omelete-cremosa": {
    category: "fit",
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=900&q=80",
    author: "TemAi Test Kitchen",
    views: 1280,
  },
  "library-arroz-forno-legumes": {
    category: "principais",
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
    author: "Chef Lucas",
    views: 1180,
  },
  "library-frango-grelhado-limao": {
    category: "fit",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=900&q=80",
    author: "Marta Fit",
    views: 1730,
  },
  "library-bolo-banana-rapido": {
    category: "sobremesas",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1603532648955-039310d9ed75?auto=format&fit=crop&w=900&q=80",
    author: "Cozinha da Nina",
    views: 1490,
  },
  "library-sopa-abobora-gengibre": {
    category: "veggie",
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80",
    author: "Verde & Sabor",
    views: 990,
  },
};

type PopularRecipeEntry = {
  recipe: Recipe;
  rating: number;
  image: string;
  author: string;
  views: number;
};

const CategoryButton = memo(function CategoryButton({
  category,
  isActive,
  onSelect,
}: {
  category: Category;
  isActive: boolean;
  onSelect: (categoryId: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(category.id)}
      className="flex min-w-[76px] flex-col items-center gap-2"
    >
      <span
        className={cn(
          "relative block h-[62px] w-[62px] overflow-hidden rounded-full border-2 shadow-sm transition",
          isActive ? "border-[#C66A3D]" : "border-[#E6DCCB]",
        )}
      >
        <span
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${category.image})` }}
        />
      </span>
      <span
        className={cn(
          "text-xs font-semibold",
          isActive ? "text-[#7E633A]" : "text-[#6E6258]",
        )}
      >
        {category.label}
      </span>
    </button>
  );
});

CategoryButton.displayName = "CategoryButton";

const PopularRecipeCard = memo(function PopularRecipeCard({ entry }: { entry: PopularRecipeEntry }) {
  return (
    <Link
      href={`/receita/${entry.recipe.id}?origin=library`}
      className="flex overflow-hidden rounded-[1.4rem] border border-[#E7DCCB] bg-[#FFFCF7] shadow-[0_16px_30px_-26px_rgba(42,30,23,0.75)]"
    >
      <div className="relative min-h-[122px] w-[40%] shrink-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${entry.image})` }}
        />
        <div className="absolute inset-0 bg-[#2A1E17]/30" />
        <div className="absolute left-2 top-2 flex gap-1.5">
          <span className="rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white">
            {entry.recipe.prepMinutes} min
          </span>
          <span className="rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white">
            ★ {(entry.rating * 2).toFixed(1)}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <p className="line-clamp-2 text-sm font-semibold text-[#2A1E17]">
            {entry.recipe.title}
          </p>
          <p className="mt-1 text-xs text-[#7E7366]">por {entry.author}</p>
        </div>
        <p className="text-[11px] font-semibold text-[#B19460]">
          {entry.views.toLocaleString("pt-BR")} acessos
        </p>
        <RatingStars readonly size="sm" value={entry.rating * 2} />
      </div>
    </Link>
  );
});

PopularRecipeCard.displayName = "PopularRecipeCard";

export default function HomePage() {
  const router = useRouter();
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState(() => getUserProfile());
  const [profilePhotoMessage, setProfilePhotoMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("principais");
  const [isGeneratorMenuOpen, setIsGeneratorMenuOpen] = useState(false);
  const [pendingShoppingCount, setPendingShoppingCount] = useState(0);
  const [popularApiRecipes, setPopularApiRecipes] = useState<
    Array<{ recipe: Recipe; rating: number; category: string }>
  >([]);
  const currentBadgeLabel =
    BADGE_CATALOG.find((badge) => badge.slug === profile.selectedBadge)?.label || "🌱 Estagiario";
  const usernameHandle = profile.username?.trim()
    ? `@${profile.username.trim().replace(/^@+/, "")}`
    : `@${[profile.firstName, profile.lastName].join("_").toLowerCase().replace(/\s+/g, "_")}`;

  useEffect(() => {
    let isMounted = true;

    const cached = typeof window !== "undefined" ? window.sessionStorage.getItem(POPULAR_CACHE_KEY) : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Array<{ recipe: Recipe; rating: number; category: string }>;
        setPopularApiRecipes(parsed);
      } catch {
        // ignore invalid cache
      }
    }

    async function loadPopular() {
      try {
        const response = await fetch("/api/library/popular?limit=7", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Falha ao carregar populares.");
        }
        const data = (await response.json()) as {
          recipes?: Array<{ recipe: Recipe; rating: number }>;
        };
        const filtered = (data.recipes || [])
          .filter((entry) => Boolean(entry.recipe?.id))
          .map((entry) => ({
            recipe: entry.recipe,
            rating: entry.rating,
            category: entry.recipe.category || "principais",
          }));
        if (isMounted) {
          setPopularApiRecipes(filtered);
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(POPULAR_CACHE_KEY, JSON.stringify(filtered));
          }
        }
      } catch {
        if (isMounted) {
          setPopularApiRecipes([]);
        }
      }
    }

    loadPopular();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function syncProfile() {
      setProfile(getUserProfile());
    }

    window.addEventListener("temai:profile-updated", syncProfile as EventListener);
    window.addEventListener("storage", syncProfile);
    return () => {
      window.removeEventListener("temai:profile-updated", syncProfile as EventListener);
      window.removeEventListener("storage", syncProfile);
    };
  }, []);

  useEffect(() => {
    function syncPendingCount() {
      setPendingShoppingCount(getPendingShoppingCount());
    }

    syncPendingCount();
    window.addEventListener("temai:shopping-list-changed", syncPendingCount as EventListener);
    window.addEventListener("storage", syncPendingCount);
    return () => {
      window.removeEventListener("temai:shopping-list-changed", syncPendingCount as EventListener);
      window.removeEventListener("storage", syncPendingCount);
    };
  }, []);

  useEffect(() => {
    const imageUrls = [heroImage, ctaImage];
    imageUrls.forEach((url) => {
      const img = new window.Image();
      img.src = url;
    });
  }, []);

  const openGeneratorMenu = useCallback(() => {
    setIsGeneratorMenuOpen(true);
  }, []);

  const closeGeneratorMenu = useCallback(() => {
    setIsGeneratorMenuOpen(false);
  }, []);

  const redirectToCreate = useCallback((mode: "text" | "audio" | "photo") => {
    setIsGeneratorMenuOpen(false);
    router.push(`/gerar-receita-ia?mode=${mode}`);
  }, [router]);

  const selectLibraryCategory = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    router.push(`/biblioteca?category=${encodeURIComponent(categoryId)}`);
  }, [router]);

  const openProfilePhotoPicker = useCallback(() => {
    setProfilePhotoMessage("");
    profilePhotoInputRef.current?.click();
  }, []);

  const handleProfilePhotoChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfilePhotoMessage("Escolha uma imagem válida.");
      return;
    }

    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setProfilePhotoMessage("Use uma imagem de até 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        setProfilePhotoMessage("Não foi possível carregar a imagem.");
        return;
      }

      const nextProfile = { ...getUserProfile(), photoDataUrl: result };
      saveUserProfile(nextProfile);
      setProfile(nextProfile);
      setProfilePhotoMessage("Foto atualizada.");
      void saveUserProfileToCloud(nextProfile);
    };
    reader.onerror = () => {
      setProfilePhotoMessage("Não foi possível carregar a imagem.");
    };
    reader.readAsDataURL(file);
  }, []);

  const fallbackPopularRecipes = useMemo(() => {
    return LIBRARY_RECIPES.map((recipe) => {
      const metadata = libraryMetaById[recipe.id] ?? {
        category: "principais",
        rating: 4.5,
        image:
          "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=900&q=80",
        author: recipe.sourceLabel,
        views: 850,
      };

      return {
        recipe,
        ...metadata,
      };
    })
      .filter((entry) => popularCategories.includes(entry.category as (typeof popularCategories)[number]))
      .filter((entry) => {
        if (!searchTerm.trim()) {
          return true;
        }

        const normalizedQuery = normalizeText(searchTerm);
        return (
          normalizeText(entry.recipe.title).includes(normalizedQuery) ||
          entry.recipe.ingredients.some((ingredient) => normalizeText(ingredient).includes(normalizedQuery))
        );
      })
      .sort((a, b) => b.rating - a.rating || b.views - a.views);
  }, [searchTerm]);

  const popularRecipes = useMemo(() => {
    const filteredApi = popularApiRecipes.filter((entry) => {
      if (!searchTerm.trim()) {
        return true;
      }

      const normalizedQuery = normalizeText(searchTerm);
      return (
        normalizeText(entry.recipe.title).includes(normalizedQuery) ||
        entry.recipe.ingredients.some((ingredient) => normalizeText(ingredient).includes(normalizedQuery))
      );
    });

    const orderedFeatured = filteredApi
      .map((entry) => ({
        recipe: entry.recipe,
        rating: entry.rating,
        image: entry.recipe.imageUrl || ctaImage,
        author: entry.recipe.sourceLabel,
        views: 1200,
      }));

    if (orderedFeatured.length > 0) return orderedFeatured;
    return fallbackPopularRecipes.slice(0, 5);
  }, [fallbackPopularRecipes, popularApiRecipes, searchTerm]);

  return (
    <section className="space-y-6 pb-2">
      <input
        ref={profilePhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleProfilePhotoChange}
      />
      <header className="relative overflow-hidden rounded-[2rem] shadow-[0_20px_45px_-25px_rgba(42,30,23,0.55)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImage})`,
          }}
        />
        <div className="absolute inset-0 bg-[#2A1E17]/65 backdrop-blur-[2px]" />

        <div className="relative z-10 px-5 pb-5 pt-6 text-[#FDF7EC]">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openProfilePhotoPicker}
                className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/35 bg-white/15 text-sm font-semibold text-[#FDF7EC] outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Trocar foto de perfil"
              >
                {profile.photoDataUrl ? (
                  <Image
                    src={profile.photoDataUrl}
                    alt="Foto do usuário"
                    fill
                    sizes="48px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    {profile.firstName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-[9px] font-bold opacity-0 transition group-hover:opacity-100">
                  trocar
                </span>
              </button>
              <div>
                <p className="font-display text-2xl leading-none">Ola, {profile.firstName} 👋</p>
                <p className="mt-1 text-xs text-[#E9DCC6]">{usernameHandle}</p>
                <p className="mt-1 text-xs font-semibold text-[#E9DCC6]">{currentBadgeLabel}</p>
                {profilePhotoMessage ? (
                  <p className="mt-1 text-[11px] font-semibold text-[#F5D7C3]">{profilePhotoMessage}</p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/perfil?section=notifications"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-[#F5F1E8] transition hover:bg-white/25"
                aria-label="Notificações"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                  <path
                    d="M6.5 10.5c0-3.2 2.3-5.8 5.5-5.8s5.5 2.6 5.5 5.8v3.3l1.5 2.2H5l1.5-2.2v-3.3Z"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M9.8 17.8c.4 1.2 1.3 1.8 2.2 1.8s1.8-.6 2.2-1.8" strokeWidth="1.8" />
                </svg>
              </Link>
              <Link
                href="/perfil?section=shopping"
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-[#F5F1E8] transition hover:bg-white/25"
                aria-label="Lista de compras"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor">
                  <path d="M7 8h10l-1 10H8L7 8Z" strokeWidth="1.8" />
                  <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeWidth="1.8" />
                </svg>
                {pendingShoppingCount > 0 ? (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#C66A3D] px-1.5 text-center text-[10px] font-bold text-[#2A1E17]">
                    {Math.min(99, pendingShoppingCount)}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9F988D]">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
                <path d="m20 20-3-3" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Busque por receitas e ingredientes..."
              className="h-12 w-full rounded-full border-0 bg-[#F5F1E8] pl-11 pr-4 text-sm text-[#2A1E17] shadow-[0_10px_25px_-18px_rgba(0,0,0,0.5)] outline-none placeholder:text-[#9F988D]"
            />
          </div>
        </div>
      </header>

      <button
        onClick={openGeneratorMenu}
        className="group relative block w-full overflow-hidden rounded-[2rem] text-left shadow-[0_18px_40px_-22px_rgba(42,30,23,0.7)]"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105"
          style={{
            backgroundImage: `url(${ctaImage})`,
          }}
        />
        <div className="absolute inset-0 bg-[#2A1E17]/60" />
        <div className="relative z-10 flex items-center justify-between px-6 py-7 text-[#FEF8EF]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#E8D8BD]">Experiencia IA</p>
            <h2 className="mt-2 font-display text-3xl leading-none">Criar receita com IA</h2>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-2xl">
            ✨
          </div>
        </div>
      </button>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Categorias</h3>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map((category) => (
            <CategoryButton
              key={category.id}
              category={category}
              isActive={category.id === selectedCategory}
              onSelect={selectLibraryCategory}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Receitas populares</h3>
          <Link
            href="/biblioteca"
            className="text-xs font-semibold uppercase tracking-wide text-[#8E7752]"
          >
            Ver todas
          </Link>
        </div>

        <div className="space-y-3">
          {popularRecipes.map((entry) => (
            <PopularRecipeCard key={entry.recipe.id} entry={entry} />
          ))}
        </div>
      </section>

      {isGeneratorMenuOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-4 sm:items-center sm:justify-center">
          <div className="max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[1.8rem] bg-[#FFFCF7] p-5 shadow-2xl sm:max-w-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-[#2A1E17]">Gerar receita</h3>
              <button onClick={closeGeneratorMenu} className="text-xs font-semibold text-[#7A6D60]">
                ← Voltar
              </button>
            </div>
            <p className="mt-1 text-sm text-[#7E7366]">Escolha como deseja iniciar:</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <button
                onClick={() => redirectToCreate("photo")}
                className="rounded-2xl border border-[#E7DCC8] bg-[#F8F2E7] px-3 py-4 text-center"
              >
                <p className="text-2xl">📷</p>
                <p className="mt-1 text-xs font-semibold text-[#5E5348]">Foto</p>
              </button>
              <button
                onClick={() => redirectToCreate("audio")}
                className="rounded-2xl border border-[#E7DCC8] bg-[#F8F2E7] px-3 py-4 text-center"
              >
                <p className="text-2xl">🎤</p>
                <p className="mt-1 text-xs font-semibold text-[#5E5348]">Audio</p>
              </button>
              <button
                onClick={() => redirectToCreate("text")}
                className="rounded-2xl border border-[#E7DCC8] bg-[#F8F2E7] px-3 py-4 text-center"
              >
                <p className="text-2xl">📝</p>
                <p className="mt-1 text-xs font-semibold text-[#5E5348]">Texto</p>
              </button>
            </div>
            <button
              onClick={closeGeneratorMenu}
              className="mt-4 w-full rounded-full border border-[#E0D2BA] py-2 text-sm font-semibold text-[#6E6154]"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}


