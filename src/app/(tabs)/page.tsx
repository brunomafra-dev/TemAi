"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RatingStars } from "@/components/recipes/rating-stars";
import { getUserProfile } from "@/features/profile/storage";
import { LIBRARY_RECIPES } from "@/features/recipes/library-recipes";
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
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "sobremesas",
    label: "Sobremesas",
    image:
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=500&q=80",
  },
];

const popularCategories = ["principais", "veggie", "massas", "kids", "sobremesas"] as const;
const featuredPopular = [
  { slug: "tg-07caf2fde425-picanha-ao-forno-com-sal-grosso", title: "Picanha ao Forno com Sal Grosso" },
  { slug: "ext-86692078a806-risoto-pratico-de-shimeji", title: "Risoto pratico de shimeji" },
  { slug: "ext-88d9624726a7-massa-rustica-de-espinafre-na-manteiga-de-salvia", title: "Massa Rustica de espinafre na manteiga de Salvia" },
  { slug: "ext-2a87b91d385e-miniaboboras-recheadas-com-carne-seca", title: "Mini aboboras recheadas com carne seca" },
  { slug: "ext-f46c80c5f661-sorvete-de-frutas-amarelas", title: "Sorvete de Frutas Amarelas" },
] as const;

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

export default function HomePage() {
  const router = useRouter();
  const [profile] = useState(() => getUserProfile());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("principais");
  const [isGeneratorMenuOpen, setIsGeneratorMenuOpen] = useState(false);
  const [popularApiRecipes, setPopularApiRecipes] = useState<
    Array<{ recipe: Recipe; rating: number; category: string }>
  >([]);

  useEffect(() => {
    let isMounted = true;

    async function loadPopular() {
      try {
        const responses = await Promise.all(
          featuredPopular.map(async (featured, index) => {
            const preferredResponse = await fetch(`/api/library/meal/${featured.slug}`);
            if (!preferredResponse.ok) return null;
            const preferredData = (await preferredResponse.json()) as { recipe?: Recipe };
            const recipe = preferredData.recipe;
            if (!recipe) return null;
            return {
              recipe,
              rating: Math.max(4.2, 4.9 - index * 0.08),
              category: recipe.category || "principais",
            };
          }),
        );
        const filtered = responses.filter(Boolean) as Array<{ recipe: Recipe; rating: number; category: string }>;
        if (isMounted) {
          setPopularApiRecipes(filtered);
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

  function openGeneratorMenu() {
    setIsGeneratorMenuOpen(true);
  }

  function closeGeneratorMenu() {
    setIsGeneratorMenuOpen(false);
  }

  function redirectToCreate(mode: "text" | "audio" | "photo") {
    setIsGeneratorMenuOpen(false);
    router.push(`/gerar-receita-ia?mode=${mode}`);
  }

  function navigateToLibraryCategory(categoryId: string) {
    router.push(`/biblioteca?category=${encodeURIComponent(categoryId)}`);
  }

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

    const orderedFeatured = featuredPopular
      .map((featured) =>
        filteredApi.find((item) => item.recipe.id === featured.slug),
      )
      .filter(
        (item): item is { recipe: Recipe; rating: number; category: string } =>
          Boolean(item?.recipe),
      )
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
              {profile.photoDataUrl ? (
                <img
                  src={profile.photoDataUrl}
                  alt="Foto do usuario"
                  className="h-12 w-12 rounded-full border border-white/35 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm font-semibold text-[#FDF7EC]">
                  {profile.firstName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-display text-2xl leading-none">Ola, {profile.firstName} 👋</p>
                <p className="mt-1 text-sm text-[#E9DCC6]">{profile.lastName}</p>
              </div>
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-[#F5F1E8] transition hover:bg-white/25"
              aria-label="Notificacoes"
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
            </button>
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
          {categories.map((category) => {
            const isActive = category.id === selectedCategory;
            return (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id);
                  navigateToLibraryCategory(category.id);
                }}
                className="flex min-w-[76px] flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "relative block h-[62px] w-[62px] overflow-hidden rounded-full border-2 shadow-sm transition",
                    isActive ? "border-[#C9A86A]" : "border-[#E6DCCB]",
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
          })}
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
            <Link
              key={entry.recipe.id}
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
                    ★ {entry.rating.toFixed(1)}
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
                <RatingStars readonly size="sm" value={entry.rating} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {isGeneratorMenuOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/45 p-4 sm:items-center sm:justify-center">
          <div className="w-full rounded-[1.8rem] bg-[#FFFCF7] p-5 shadow-2xl sm:max-w-sm">
            <h3 className="text-xl font-semibold text-[#2A1E17]">Gerar receita</h3>
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
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
