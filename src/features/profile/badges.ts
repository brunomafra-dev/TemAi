import type { LibraryCategory } from "@/features/recipes/types";

export interface BadgeDefinition {
  slug: string;
  label: string;
  description: string;
  colorClass: string;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    slug: "estagiario",
    label: "🌱 Estagiario",
    description: "0 a 3 receitas postadas.",
    colorClass: "bg-[#EAE3D6] text-[#6F5F49]",
  },
  {
    slug: "cozinheiro_junior",
    label: "🍳 Cozinheiro Junior",
    description: "4 a 10 receitas postadas.",
    colorClass: "bg-[#E6F4FF] text-[#2B5D80]",
  },
  {
    slug: "cozinheiro_pleno",
    label: "🥘 Cozinheiro Pleno",
    description: "11 a 30 receitas postadas.",
    colorClass: "bg-[#EAF8E6] text-[#2F6A36]",
  },
  {
    slug: "cozinheiro_senior",
    label: "🔥 Cozinheiro Senior",
    description: "31 a 50 receitas postadas.",
    colorClass: "bg-[#FFEBD8] text-[#8A4E1B]",
  },
  {
    slug: "chef",
    label: "👨‍🍳 Chef",
    description: "51 a 100 receitas postadas.",
    colorClass: "bg-[#F6E9C8] text-[#8A6B33]",
  },
  {
    slug: "chef_executivo",
    label: "👑 Chef Executivo",
    description: "101+ receitas postadas.",
    colorClass: "bg-[#FDE7AF] text-[#6A4A00]",
  },
  {
    slug: "plant_based_chef",
    label: "🥗 Plant Based Chef",
    description: "30+ receitas veggie postadas.",
    colorClass: "bg-[#DFF7E0] text-[#1F6A29]",
  },
  {
    slug: "confeiteiro",
    label: "🍰 Confeiteiro",
    description: "10 a 30 receitas sobremesa postadas.",
    colorClass: "bg-[#FFE8F1] text-[#8A3D61]",
  },
  {
    slug: "chef_confeiteiro",
    label: "🧁 Chef Confeiteiro",
    description: "31+ receitas sobremesa postadas.",
    colorClass: "bg-[#FADDE9] text-[#8B3A63]",
  },
  {
    slug: "mestre_dos_lanches",
    label: "🍔 Mestre dos Lanches",
    description: "20+ receitas de lanches postadas.",
    colorClass: "bg-[#FCE2CC] text-[#8A4E1B]",
  },
  {
    slug: "mixologista",
    label: "🥤 Mixologista",
    description: "20+ receitas de bebidas postadas.",
    colorClass: "bg-[#DFF2FF] text-[#1D5E8A]",
  },
];

export function inferUnlockedBadgesByRecipes(params: {
  totalPublished: number;
  byCategory: Partial<Record<LibraryCategory, number>>;
}): string[] {
  const unlocked = new Set<string>(["estagiario"]);
  const total = params.totalPublished;
  const sobremesas = params.byCategory.sobremesas || 0;
  const veggie = params.byCategory.veggie || 0;
  const lanches = params.byCategory.lanches || 0;
  const bebidas = params.byCategory.bebidas || 0;

  if (total >= 4) unlocked.add("cozinheiro_junior");
  if (total >= 11) unlocked.add("cozinheiro_pleno");
  if (total >= 31) unlocked.add("cozinheiro_senior");
  if (total >= 51) unlocked.add("chef");
  if (total >= 101) unlocked.add("chef_executivo");

  if (veggie >= 30) unlocked.add("plant_based_chef");
  if (sobremesas >= 10) unlocked.add("confeiteiro");
  if (sobremesas >= 31) unlocked.add("chef_confeiteiro");
  if (lanches >= 20) unlocked.add("mestre_dos_lanches");
  if (bebidas >= 20) unlocked.add("mixologista");

  return [...unlocked];
}
