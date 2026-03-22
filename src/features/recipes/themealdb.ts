import type { Recipe } from "@/features/recipes/types";
import type { ImportedRecipeDraft } from "@/features/recipes/import-from-url";
import { premiumReviewRecipe } from "@/features/recipes/premium-review";
import {
  translateIngredientToPortuguese,
  translateInstructionToPortuguese,
  translateToPortuguese,
} from "@/features/recipes/translation";

const THEMEALDB_BASE_URL = "https://www.themealdb.com/api/json/v1";

interface MealDbMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  [key: string]: string | null;
}

interface MealDbResponse {
  meals: MealDbMeal[] | null;
}

const CATEGORY_TO_EN: Record<string, string> = {
  principais: "Beef",
  veggie: "Vegetarian",
  massas: "Pasta",
  kids: "Dessert",
  sobremesas: "Dessert",
  fit: "Chicken",
};

const CATEGORY_PT: Record<string, string> = {
  Beef: "Carne bovina",
  Chicken: "Frango",
  Dessert: "Sobremesa",
  Lamb: "Cordeiro",
  Miscellaneous: "Variados",
  Pasta: "Massas",
  Pork: "Carne suina",
  Seafood: "Frutos do mar",
  Side: "Acompanhamento",
  Starter: "Entrada",
  Vegan: "Vegano",
  Vegetarian: "Vegetariano",
  Breakfast: "Cafe da manha",
  Goat: "Carne caprina",
};

const AREA_PT: Record<string, string> = {
  American: "Americana",
  British: "Britanica",
  Canadian: "Canadense",
  Chinese: "Chinesa",
  Croatian: "Croata",
  Dutch: "Holandesa",
  Egyptian: "Egipcia",
  Filipino: "Filipina",
  French: "Francesa",
  Greek: "Grega",
  Indian: "Indiana",
  Irish: "Irlandesa",
  Italian: "Italiana",
  Jamaican: "Jamaicana",
  Japanese: "Japonesa",
  Kenyan: "Queniana",
  Malaysian: "Malaia",
  Mexican: "Mexicana",
  Moroccan: "Marroquina",
  Polish: "Polonesa",
  Portuguese: "Portuguesa",
  Russian: "Russa",
  Spanish: "Espanhola",
  Thai: "Tailandesa",
  Tunisian: "Tunisiana",
  Turkish: "Turca",
  Ukrainian: "Ucraniana",
  Uruguayan: "Uruguaia",
  Venezuelan: "Venezuelana",
  Vietnamese: "Vietnamita",
  Algerian: "Argelina",
  Syrian: "Siria",
  Australian: "Australiana",
  Argentinian: "Argentina",
};

function getMealDbKey(): string {
  return process.env.THEMEALDB_API_KEY?.trim() || "1";
}

function mapIngredients(meal: MealDbMeal): string[] {
  const ingredients: string[] = [];

  for (let i = 1; i <= 20; i += 1) {
    const ingredient = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();
    if (!ingredient) continue;
    ingredients.push(measure ? `${measure} ${ingredient}`.trim() : ingredient);
  }

  return ingredients;
}

function mapSteps(instructions: string): string[] {
  return instructions
    .split(/\r?\n|\. /g)
    .map((step) => step.trim())
    .filter(Boolean)
    .map((step) => (step.endsWith(".") ? step : `${step}.`));
}

function inferCategory(meal: MealDbMeal): ImportedRecipeDraft["category"] {
  const text = `${meal.strCategory} ${meal.strMeal}`.toLowerCase();
  if (/(dessert|cake|pie|sweet|pudding)/.test(text)) return "sobremesas";
  if (/(vegetarian|vegan|salad)/.test(text)) return "veggie";
  if (/(pasta|lasagna|spaghetti|noodle|macaroni)/.test(text)) return "massas";
  if (/(breakfast|snack|kids|cookie|cupcake)/.test(text)) return "kids";
  return "principais";
}

async function translateMeal(meal: MealDbMeal) {
  const title = await translateToPortuguese(meal.strMeal, "title");
  const category = CATEGORY_PT[meal.strCategory || ""] || (await translateToPortuguese(meal.strCategory || "Receita", "general"));
  const area = AREA_PT[meal.strArea || ""] || (await translateToPortuguese(meal.strArea || "Internacional", "general"));
  const description = `${category} - ${area}`;
  const ingredients = await Promise.all(mapIngredients(meal).map(translateIngredientToPortuguese));
  const steps = await Promise.all(
    mapSteps(meal.strInstructions || "No detailed instructions.").map(translateInstructionToPortuguese),
  );
  return { title, description, ingredients, steps };
}

async function mapMealToRecipe(meal: MealDbMeal): Promise<Recipe> {
  const translated = await translateMeal(meal);
  return {
    id: `mealdb-${meal.idMeal}`,
    title: translated.title,
    description: translated.description,
    ingredients: translated.ingredients,
    steps: translated.steps,
    prepMinutes: 35,
    servings: 2,
    imageUrl: meal.strMealThumb || undefined,
    sourceLabel: "TheMealDB",
    origin: "library",
  };
}

async function fetchFromMealDb(path: string): Promise<MealDbResponse> {
  const key = getMealDbKey();
  const response = await fetch(`${THEMEALDB_BASE_URL}/${key}${path}`, {
    next: { revalidate: 60 * 60 * 8 },
  });
  if (!response.ok) {
    throw new Error("Falha ao buscar dados no TheMealDB.");
  }
  return (await response.json()) as MealDbResponse;
}

async function listMealsByFirstLetter(letter: string): Promise<MealDbMeal[]> {
  const data = await fetchFromMealDb(`/search.php?f=${encodeURIComponent(letter)}`);
  return data.meals || [];
}

export async function collectMealDbRecipesForImport(
  count: number,
  options?: { premiumReview?: boolean },
): Promise<ImportedRecipeDraft[]> {
  const target = Math.max(1, Math.min(80, count));
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  const selected: MealDbMeal[] = [];

  for (const letter of letters) {
    if (selected.length >= target) break;
    const meals = await listMealsByFirstLetter(letter);
    for (const meal of meals) {
      if (selected.length >= target) break;
      if (!selected.some((item) => item.idMeal === meal.idMeal)) {
        selected.push(meal);
      }
    }
  }

  const drafts: ImportedRecipeDraft[] = [];
  const usePremiumReview = options?.premiumReview ?? true;
  for (const meal of selected.slice(0, target)) {
    const translated = await translateMeal(meal);
    const baseDraft: ImportedRecipeDraft = {
      slug: `mealdb-${meal.idMeal}`,
      title: translated.title,
      description: translated.description,
      category: inferCategory(meal),
      ingredients: translated.ingredients,
      steps: translated.steps,
      prepMinutes: 35,
      servings: 2,
      imageUrl: meal.strMealThumb || undefined,
      sourceName: "TheMealDB",
      sourceUrl: `https://www.themealdb.com/meal/${meal.idMeal}`,
    };
    const finalDraft = usePremiumReview ? await premiumReviewRecipe(baseDraft) : baseDraft;
    drafts.push(finalDraft);
  }

  return drafts;
}

export async function searchMealDbRecipes(query: string): Promise<Recipe[]> {
  const safeQuery = query.trim() || "chicken";
  const data = await fetchFromMealDb(`/search.php?s=${encodeURIComponent(safeQuery)}`);
  if (!data.meals) return [];
  return Promise.all(data.meals.slice(0, 18).map(mapMealToRecipe));
}

export async function listMealDbByCategory(categoryPt: string): Promise<Recipe[]> {
  const categoryEn = CATEGORY_TO_EN[categoryPt] || "Beef";
  const shortList = await fetchFromMealDb(`/filter.php?c=${encodeURIComponent(categoryEn)}`);
  if (!shortList.meals?.length) return [];
  const recipes = await Promise.all(
    shortList.meals.slice(0, 16).map((meal) => getMealDbRecipeById(`mealdb-${meal.idMeal}`)),
  );
  return recipes.filter((recipe): recipe is Recipe => Boolean(recipe));
}

export async function getMealDbRecipeById(mealId: string): Promise<Recipe | null> {
  const cleanId = mealId.replace(/^mealdb-/, "");
  const data = await fetchFromMealDb(`/lookup.php?i=${encodeURIComponent(cleanId)}`);
  if (!data.meals?.length) return null;
  return mapMealToRecipe(data.meals[0]);
}

