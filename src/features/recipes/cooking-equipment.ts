import type { CookingEquipment } from "@/features/recipes/types";

export const COOKING_EQUIPMENT_VALUES = [
  "stove",
  "oven",
  "air_fryer",
  "microwave",
  "blender",
] as const satisfies readonly CookingEquipment[];

export const DEFAULT_COOKING_EQUIPMENT: CookingEquipment[] = ["stove"];

export const COOKING_EQUIPMENT_LABELS: Record<CookingEquipment, string> = {
  stove: "Fogão",
  oven: "Forno",
  air_fryer: "Air fryer",
  microwave: "Micro-ondas",
  blender: "Liquidificador",
};

const COOKING_EQUIPMENT_SET = new Set<string>(COOKING_EQUIPMENT_VALUES);

export function isCookingEquipment(value: unknown): value is CookingEquipment {
  return typeof value === "string" && COOKING_EQUIPMENT_SET.has(value);
}

export function normalizeCookingEquipment(values: unknown): CookingEquipment[] {
  if (!Array.isArray(values)) return [...DEFAULT_COOKING_EQUIPMENT];

  const normalized = values
    .filter(isCookingEquipment)
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, COOKING_EQUIPMENT_VALUES.length);

  return normalized.length > 0 ? normalized : [...DEFAULT_COOKING_EQUIPMENT];
}

export function formatCookingEquipmentForPrompt(values: CookingEquipment[]): string {
  return normalizeCookingEquipment(values)
    .map((value) => COOKING_EQUIPMENT_LABELS[value])
    .join(", ");
}
