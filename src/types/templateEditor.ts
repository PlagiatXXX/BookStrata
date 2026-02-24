import type { BookTemplate, TierTemplate } from "./templates";

export interface TemplateEditorFormState {
  title: string;
  description: string;
  isPublic: boolean;
  tiers: TierTemplate[];
  defaultBooks?: BookTemplate[];
  features: {
    defaultBooksStep: boolean;
  };
}

export type TemplateEditorStep = 0 | 1 | 2;

