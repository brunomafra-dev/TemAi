import type { Recipe } from "@/features/recipes/types";

const GENERIC_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1200&q=80";

const CATEGORY_IMAGES: Record<string, string> = {
  bebidas: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=80",
  kids: "https://images.unsplash.com/photo-1565299543923-37dd37887442?auto=format&fit=crop&w=1200&q=80",
  lanches: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
  massas: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80",
  principais: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
  sobremesas: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=1200&q=80",
  veggie: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
};

const KEYWORD_IMAGES: Array<{ terms: string[]; image: string }> = [
  {
    terms: [
      "pao de parmesao",
      "pão de parmesão",
      "pao de queijo",
      "pão de queijo",
      "parmesao",
      "parmesão",
      "pao",
      "pão",
      "bread",
    ],
    image: "https://images.unsplash.com/photo-1600628421055-4d30de868b8f?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["chai", "cha verde", "chá verde", "tea cake"],
    image: "https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["batata", "potato"],
    image: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["brigadeiro", "palha italiana", "docinho", "torrone", "amendoim"],
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["avocado", "abacate", "toast", "torrada"],
    image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["arroz", "rice"],
    image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["banana", "muffin", "amora", "blueberry", "cupcake"],
    image: "https://images.unsplash.com/photo-1603532648955-039310d9ed75?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["bolo", "chocolate", "chocolatudo", "cenoura", "cake"],
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["feijao", "feijão", "linguica", "linguiça", "beterraba", "bean"],
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["pepino", "relish", "picles", "pickle"],
    image: "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["salada", "salad", "legume", "vegetal", "veggie"],
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["macarrao", "macarrão", "massa", "pasta", "lasanha"],
    image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["frango", "chicken"],
    image: "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["sopa", "caldo", "abobora", "abóbora", "soup"],
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["omelete", "ovo", "eggs"],
    image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["hamburguer", "hambúrguer", "burger"],
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
  },
  {
    terms: ["smoothie", "suco", "bebida", "drink"],
    image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1200&q=80",
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getRecipeImageFallback(recipe: Pick<Recipe, "title" | "category" | "ingredients">): string {
  const searchable = normalizeText([recipe.title, ...(recipe.ingredients || [])].join(" "));
  const match = KEYWORD_IMAGES.find((entry) =>
    entry.terms.some((term) => searchable.includes(normalizeText(term))),
  );

  if (match) return match.image;
  if (recipe.category && CATEGORY_IMAGES[recipe.category]) return CATEGORY_IMAGES[recipe.category];
  return GENERIC_RECIPE_IMAGE;
}
