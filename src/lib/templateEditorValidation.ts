import type { TierTemplate } from "@/types/templates";
import type { TemplateEditorFormState } from "@/types/templateEditor";
import { uid } from "@/utils/id";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const TITLE_MIN = 3;
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 500;
const TIER_NAME_MAX = 24;
const TIERS_MAX = 20;

export interface TemplateEditorValidationResult {
  isValid: boolean;
  titleError?: string;
  descriptionError?: string;
  tiersError?: string;
  tierNameErrors: Record<string, string>;
  tierColorErrors: Record<string, string>;
  warnings: string[];
}

export const createDefaultTemplateTiers = (): TierTemplate[] => [
  { id: uid(), name: "S", color: "#ef4444", order: 0 },
  { id: uid(), name: "A", color: "#f97316", order: 1 },
  { id: uid(), name: "B", color: "#eab308", order: 2 },
  { id: uid(), name: "C", color: "#84cc16", order: 3 },
  { id: uid(), name: "D", color: "#10b981", order: 4 },
];

export const normalizeTierOrder = (tiers: TierTemplate[]): TierTemplate[] =>
  tiers.map((tier, index) => ({
    ...tier,
    order: index,
    name: tier.name.trim(),
    color: normalizeHexColor(tier.color),
  }));

const normalizeHexColor = (color: string): string => {
  if (!color) return "#808080";
  if (HEX_COLOR_REGEX.test(color)) return color;
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    const short = color.slice(1);
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`.toLowerCase();
  }
  return "#808080";
};

export const validateTemplateEditor = (
  state: TemplateEditorFormState,
): TemplateEditorValidationResult => {
  const title = state.title.trim();
  const description = state.description.trim();
  const normalizedTiers = normalizeTierOrder(state.tiers);

  let titleError: string | undefined;
  let descriptionError: string | undefined;
  let tiersError: string | undefined;
  const tierNameErrors: Record<string, string> = {};
  const tierColorErrors: Record<string, string> = {};
  const warnings: string[] = [];

  if (!title) {
    titleError = "Введите название шаблона";
  } else if (title.length < TITLE_MIN) {
    titleError = `Название должно быть не короче ${TITLE_MIN} символов`;
  } else if (title.length > TITLE_MAX) {
    titleError = `Название должно быть не длиннее ${TITLE_MAX} символов`;
  }

  if (description.length > DESCRIPTION_MAX) {
    descriptionError = `Описание должно быть не длиннее ${DESCRIPTION_MAX} символов`;
  }

  if (normalizedTiers.length === 0) {
    tiersError = "Добавьте хотя бы один уровень";
  } else if (normalizedTiers.length > TIERS_MAX) {
    tiersError = `Максимум уровней: ${TIERS_MAX}`;
  }

  const duplicateTracker = new Map<string, string[]>();
  normalizedTiers.forEach((tier) => {
    const normalizedName = tier.name.trim().toLowerCase();
    if (!normalizedName) {
      tierNameErrors[tier.id] = "Название уровня обязательно";
    } else {
      if (tier.name.trim().length > TIER_NAME_MAX) {
        tierNameErrors[tier.id] =
          `Название уровня должно быть не длиннее ${TIER_NAME_MAX} символов`;
      } else if (tier.name.trim().length > 18) {
        warnings.push(`Уровень "${tier.name}" может выглядеть слишком длинным`);
      }
      const ids = duplicateTracker.get(normalizedName) ?? [];
      ids.push(tier.id);
      duplicateTracker.set(normalizedName, ids);
    }

    if (!HEX_COLOR_REGEX.test(tier.color)) {
      tierColorErrors[tier.id] = "Укажите цвет в формате #RRGGBB";
    }
  });

  duplicateTracker.forEach((ids) => {
    if (ids.length > 1) {
      ids.forEach((id) => {
        tierNameErrors[id] = "Название уровня должно быть уникальным";
      });
    }
  });

  const isValid =
    !titleError &&
    !descriptionError &&
    !tiersError &&
    Object.keys(tierNameErrors).length === 0 &&
    Object.keys(tierColorErrors).length === 0;

  return {
    isValid: Boolean(isValid),
    titleError,
    descriptionError,
    tiersError,
    tierNameErrors,
    tierColorErrors,
    warnings,
  };
};

