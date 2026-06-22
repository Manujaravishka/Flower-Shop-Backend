"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCategoryQueryParam = exports.normalizeCategories = exports.normalizeCategoryValue = void 0;
const gift_modal_1 = require("../model/gift.modal");
const normalizeCategoryString = (value) => value.trim().toUpperCase();
const normalizeCategoryValue = (value) => {
    if (typeof value !== "string")
        return null;
    const normalized = normalizeCategoryString(value);
    if (!normalized)
        return null;
    if (normalized === "BOUQUET" || normalized === "BOUQUETS")
        return gift_modal_1.Category.Boquets;
    if (normalized === "GIFT BOX")
        return gift_modal_1.Category.GiftBox;
    if (normalized === "KEY TAG")
        return gift_modal_1.Category.Keytag;
    return Object.values(gift_modal_1.Category).includes(normalized)
        ? normalized
        : null;
};
exports.normalizeCategoryValue = normalizeCategoryValue;
const normalizeCategories = (value) => {
    const items = Array.isArray(value)
        ? value
        : typeof value === "string"
            ? [value]
            : [];
    return Array.from(new Set(items
        .filter((item) => typeof item === "string")
        .map(exports.normalizeCategoryValue)
        .filter((item) => item !== null)));
};
exports.normalizeCategories = normalizeCategories;
const normalizeCategoryQueryParam = (value) => {
    if (typeof value !== "string" || !value.trim())
        return [];
    const normalizedCategories = Array.from(new Set(value
        .split(",")
        .map((item) => (0, exports.normalizeCategoryValue)(item))
        .filter((item) => item !== null)));
    return normalizedCategories.map((category) => {
        if (category === gift_modal_1.Category.Boquets) {
            return /^(BOUQUETS|BOQUETS)$/i;
        }
        if (category === gift_modal_1.Category.GiftBox) {
            return /^GIFT\s*BOX$/i;
        }
        if (category === gift_modal_1.Category.Keytag) {
            return /^KEYTAG$/i;
        }
        return new RegExp(`^${category}$`, "i");
    });
};
exports.normalizeCategoryQueryParam = normalizeCategoryQueryParam;
