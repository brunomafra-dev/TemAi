"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RatingStars } from "@/components/recipes/rating-stars";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Recipe } from "@/features/recipes/types";
import { getUserRecipeRating, setUserRecipeRating } from "@/features/recipes/ratings-storage";

const libraryFilters = [
  { id: "todas", label: "Todas" },
  { id: "principais", label: "Principais" },
  { id: "veggie", label: "Veggie" },
  { id: "massas", label: "Massas" },
  { id: "kids", label: "Kids" },
  { id: "sobremesas", label: "Sobremesas" },
];

export default function LibraryContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("todas");
  const [page, setPage] = useState(1);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const fromUrl = searchParams.get("category")?.trim();
    const allowed = new Set(libraryFilters.map((item) => item.id));
    if (fromUrl && allowed.has(fromUrl)) {
      setSelectedFilter(fromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedFilter]);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/library/search?q=${encodeURIComponent(search)}&category=${encodeURIComponent(selectedFilter)}&page=${page}&pageSize=12`,
        );
        if (!response.ok) {
          throw new Error("Falha ao carregar receitas.");
        }

        const data = (await response.json()) as {
          recipes: Recipe[];
          source: string;
          pagination?: { totalPages?: number; total?: number; page?: number };
        };
        if (isMounted) {
          setRecipes(data.recipes);
          setTotalPages(Math.max(1, data.pagination?.totalPages || 1));
          setTotalItems(Math.max(0, data.pagination?.total || 0));
          if (data.pagination?.page && data.pagination.page !== page) {
            setPage(data.pagination.page);
          }
          const ratingMap = Object.fromEntries(
            data.recipes.map((recipe) => [recipe.id, getUserRecipeRating(recipe.id)]),
          );
          setRatings(ratingMap);
        }
      } catch {
        if (isMounted) {
          setRecipes([]);
          setTotalPages(1);
          setTotalItems(0);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [search, selectedFilter, page]);

  function buildVisiblePages(): number[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    for (let i = page - 1; i <= page + 1; i += 1) {
      if (i > 1 && i < totalPages) {
        pages.add(i);
      }
    }

    return [...pages].sort((a, b) => a - b);
  }

  function onRate(recipeId: string, rating: number) {
    setUserRecipeRating(recipeId, rating);
    setRatings((current) => ({ ...current, [recipeId]: rating }));
  }

  return (
    <section className="space-y-5 pb-2">
      <header className="relative overflow-hidden rounded-[2rem] shadow-[0_20px_45px_-25px_rgba(42,30,23,0.55)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1556911073-a517e752729c?auto=format&fit=crop&w=1500&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-[#2A1E17]/65 backdrop-blur-[2px]" />
        <div className="relative z-10 px-5 pb-6 pt-7 text-[#FDF7EC]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#EADBC0]">Curadoria</p>
          <h1 className="mt-2 font-display text-3xl">Biblioteca de receitas</h1>
          <p className="mt-2 max-w-sm text-sm text-[#E6D7BF]">
            Explore receitas reais com filtros por categoria e navegacao por paginas.
          </p>
          <div className="mt-4 rounded-full bg-[#F5F1E8] p-1 shadow-[0_10px_25px_-18px_rgba(0,0,0,0.5)]">
            <Input
              placeholder="Buscar por nome ou ingrediente..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 border-0 bg-transparent text-[#2A1E17] placeholder:text-[#9F988D]"
            />
          </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {libraryFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setSelectedFilter(filter.id)}
            className={
              selectedFilter === filter.id
                ? "rounded-full border border-[#C9A86A] bg-[#F6EFDF] px-4 py-2 text-xs font-semibold text-[#7D6139]"
                : "rounded-full border border-[#E5D7BF] bg-[#FFFCF7] px-4 py-2 text-xs font-semibold text-[#857A6E]"
            }
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Card className="border-[#E5D7C1] bg-[#FFFCF7] shadow-[0_20px_35px_-25px_rgba(42,30,23,0.7)]">
          <CardContent className="pt-5">
            <p className="text-sm text-[#7A6D60]">Carregando receitas...</p>
          </CardContent>
        </Card>
      ) : recipes.length === 0 ? (
        <Card className="border-[#E5D7C1] bg-[#FFFCF7] shadow-[0_20px_35px_-25px_rgba(42,30,23,0.7)]">
          <CardContent className="pt-5">
            <p className="text-sm text-[#7A6D60]">
              Nenhuma receita encontrada para a busca atual.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="space-y-2">
              <RecipeCard
                recipe={recipe}
                href={`/receita/${recipe.id}?origin=library`}
                footerLabel={`Fonte: ${recipe.sourceLabel}`}
              />
              <div className="rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#7D715F]">
                  Sua avaliacao
                </p>
                <RatingStars
                  size="sm"
                  value={ratings[recipe.id] ?? 0}
                  onChange={(rating) => onRate(recipe.id, rating)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7D715F]">
              Pagina {page} de {totalPages}
            </p>
            <p className="text-xs text-[#7D715F]">{totalItems.toLocaleString("pt-BR")} receitas</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-full border border-[#E5D7BF] px-3 py-1 text-xs font-semibold text-[#6A5E52] disabled:opacity-45"
            >
              Anterior
            </button>
            {buildVisiblePages().map((pageNumber, index, arr) => (
              <div key={pageNumber} className="flex items-center gap-2">
                {index > 0 && pageNumber - arr[index - 1] > 1 ? (
                  <span className="text-xs text-[#8B7E70]">...</span>
                ) : null}
                <button
                  onClick={() => setPage(pageNumber)}
                  className={
                    pageNumber === page
                      ? "rounded-full border border-[#C9A86A] bg-[#F6EFDF] px-3 py-1 text-xs font-semibold text-[#7D6139]"
                      : "rounded-full border border-[#E5D7BF] bg-white px-3 py-1 text-xs font-semibold text-[#6A5E52]"
                  }
                >
                  {pageNumber}
                </button>
              </div>
            ))}
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="rounded-full border border-[#E5D7BF] px-3 py-1 text-xs font-semibold text-[#6A5E52] disabled:opacity-45"
            >
              Proxima
            </button>
          </div>
        </div>
      ) : null}

    </section>
  );
}
