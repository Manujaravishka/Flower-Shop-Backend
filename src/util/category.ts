import { Category } from "../model/gift.modal";

const normalizeCategoryString = (value: string): string => value.trim().toUpperCase();

export const normalizeCategoryValue = (value: unknown): Category | null => {
  if (typeof value !== "string") return null;

  const normalized = normalizeCategoryString(value);
  if (!normalized) return null;

  if (normalized === "BOUQUET") return Category.Boquets;
  if (normalized === "GIFT BOX") return Category.GiftBox;
  if (normalized === "KEY TAG") return Category.Keytag;

  return Object.values(Category).includes(normalized as Category)
    ? (normalized as Category)
    : null;
};

export const normalizeCategories = (value: unknown): Category[] => {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? [value]
    : [];

  return Array.from(
    new Set(
      items
        .filter((item): item is string => typeof item === "string")
        .map(normalizeCategoryValue)
        .filter((item): item is Category => item !== null)
    )
  );
};

export const normalizeCategoryQueryParam = (value?: string): (Category | RegExp)[] => {
  if (typeof value !== "string" || !value.trim()) return [];

  const normalizedCategories = Array.from(
    new Set(
      value
        .split(",")
        .map((item) => normalizeCategoryValue(item))
        .filter((item): item is Category => item !== null)
    )
  );

  return normalizedCategories.map((category) => {
    if (category === Category.Boquets) {
      return /^BOUQUETS?$/i;
    }
    if (category === Category.GiftBox) {
      return /^GIFT\s*BOX$/i;
    }
    if (category === Category.Keytag) {
      return /^KEYTAG$/i;
    }
    return new RegExp(`^${category}$`, "i");
  });
};
