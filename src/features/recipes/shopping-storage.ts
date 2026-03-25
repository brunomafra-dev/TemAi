export interface ShoppingListItem {
  id: string;
  name: string;
  checked: boolean;
  recipeId: string;
  recipeTitle: string;
  createdAt: string;
}

const SHOPPING_LIST_KEY = "temai_shopping_list_v1";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function emitShoppingListChanged() {
  if (!hasWindow()) return;
  window.dispatchEvent(new CustomEvent("temai:shopping-list-changed"));
}

export function getShoppingListItems(): ShoppingListItem[] {
  if (!hasWindow()) return [];

  try {
    const raw = window.localStorage.getItem(SHOPPING_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ShoppingListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveShoppingListItems(items: ShoppingListItem[]): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
  emitShoppingListChanged();
}

export function addShoppingItemsFromRecipe(params: {
  recipeId: string;
  recipeTitle: string;
  ingredientNames: string[];
}): ShoppingListItem[] {
  const current = getShoppingListItems();
  const normalizedCurrent = new Set(current.map((item) => item.name.toLowerCase()));

  const additions = params.ingredientNames
    .map((name) => name.trim())
    .filter(Boolean)
    .filter((name) => !normalizedCurrent.has(name.toLowerCase()))
    .map((name) => ({
      id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      checked: false,
      recipeId: params.recipeId,
      recipeTitle: params.recipeTitle,
      createdAt: new Date().toISOString(),
    }));

  const next = [...current, ...additions];
  saveShoppingListItems(next);
  return next;
}

export function toggleShoppingItemChecked(itemId: string): ShoppingListItem[] {
  const current = getShoppingListItems();
  const next = current.map((item) =>
    item.id === itemId ? { ...item, checked: !item.checked } : item,
  );
  saveShoppingListItems(next);
  return next;
}

export function removeShoppingItem(itemId: string): ShoppingListItem[] {
  const current = getShoppingListItems();
  const next = current.filter((item) => item.id !== itemId);
  saveShoppingListItems(next);
  return next;
}

export function clearCheckedShoppingItems(): ShoppingListItem[] {
  const current = getShoppingListItems();
  const next = current.filter((item) => !item.checked);
  saveShoppingListItems(next);
  return next;
}

export function getPendingShoppingCount(): number {
  return getShoppingListItems().filter((item) => !item.checked).length;
}
