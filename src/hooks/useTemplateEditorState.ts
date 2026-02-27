import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  CreateTemplateData,
  UpdateTemplateData,
  TierTemplate,
  BookTemplate,
} from "@/types/templates";
import type { TemplateEditorFormState, TemplateEditorStep } from "@/types/templateEditor";

interface UseTemplateEditorStateOptions {
  mode: "create" | "edit";
  templateId?: string;
  initialTemplate?: CreateTemplateData | UpdateTemplateData;
  onSubmit: (data: CreateTemplateData | UpdateTemplateData) => Promise<void>;
}

interface UseTemplateEditorStateReturn {
  formState: TemplateEditorFormState;
  currentStep: TemplateEditorStep;
  setCurrentStep: (step: TemplateEditorStep) => void;
  isSubmitting: boolean;
  draftStatus: "idle" | "saving" | "saved";
  draftLastSaved: Date | null;
  validation: {
    isValid: boolean;
    titleError: string | undefined;
    descriptionError: string | undefined;
    tiersError: string | undefined;
    tierNameErrors: (string | undefined)[];
    tierColorErrors: (string | undefined)[];
    warnings: string[];
  };
  isDirty: boolean;
  isDraftAvailable: boolean;
  showRestorePrompt: boolean;
  showLeavePrompt: boolean;
  updateFormState: (updates: Partial<TemplateEditorFormState>) => void;
  updateField: <K extends keyof TemplateEditorFormState>(
    field: K,
    value: TemplateEditorFormState[K]
  ) => void;
  updateTiers: (tiers: TierTemplate[]) => void;
  updateTier: (index: number, updates: Partial<TierTemplate>) => void;
  updateDefaultBooks: (books: BookTemplate[]) => void;
  addTier: () => void;
  removeTier: (index: number) => void;
  duplicateTier: (index: number) => void;
  moveTier: (fromIndex: number, toIndex: number) => void;
  resetToPreset: () => void;
  nextStep: () => void;
  prevStep: () => void;
  save: () => Promise<void>;
  validateStep: (step: TemplateEditorStep) => boolean;
  stepIsValid: (step: TemplateEditorStep) => boolean;
  discardDraft: () => void;
  restoreDraft: () => void;
  stayOnPage: () => void;
  confirmLeave: () => void;
}

const initialFormState: TemplateEditorFormState = {
  title: "",
  description: "",
  tiers: [],
  defaultBooks: [],
  features: {
    defaultBooksStep: false,
  },
};

const PRESET_TIERS: TierTemplate[] = [
  { id: "1", name: "S", color: "#FFD700", order: 0 },
  { id: "2", name: "A", color: "#C0C0C0", order: 1 },
  { id: "3", name: "B", color: "#CD7F32", order: 2 },
  { id: "4", name: "C", color: "#8B4513", order: 3 },
  { id: "5", name: "D", color: "#696969", order: 4 },
];

export function useTemplateEditorState({
  mode,
  templateId,
  initialTemplate,
  onSubmit,
}: UseTemplateEditorStateOptions): UseTemplateEditorStateReturn {
  const [formState, setFormState] = useState<TemplateEditorFormState>({
    ...initialFormState,
    ...(initialTemplate || {}),
  });

  const [currentStep, setCurrentStep] = useState<TemplateEditorStep>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [draftLastSaved, setDraftLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);

  // Проверка наличия черновика
  const isDraftAvailable = useMemo(() => {
    const savedDraft = localStorage.getItem(`template-draft-${templateId || "new"}`);
    return !!savedDraft;
  }, [templateId]);

  // Валидация имён тиров
  const tierNameErrors = useMemo(() => {
    return formState.tiers.map((tier) =>
      tier.name.trim() === "" ? "Название обязательно" : undefined
    );
  }, [formState.tiers]);

  // Валидация цветов тиров
  const tierColorErrors = useMemo(() => {
    return formState.tiers.map((tier) =>
      !tier.color || tier.color.trim() === "" ? "Цвет обязателен" : undefined
    );
  }, [formState.tiers]);

  // Предупреждения
  const warnings = useMemo(() => {
    const warns: string[] = [];
    if (formState.tiers.length === 0) {
      warns.push("Добавьте хотя бы один тир");
    }
    if (formState.title.trim().length < 3) {
      warns.push("Название слишком короткое");
    }
    return warns;
  }, [formState.tiers.length, formState.title]);

  const validateStep = useCallback(
    (step: TemplateEditorStep): boolean => {
      if (step === 0) {
        return formState.title.trim().length > 0;
      }
      if (step === 1) {
        return formState.tiers.length > 0 && tierNameErrors.every((e) => !e);
      }
      return true;
    },
    [formState.title, formState.tiers.length, tierNameErrors]
  );

  const stepIsValid = useCallback(
    (step: TemplateEditorStep): boolean => {
      return validateStep(step);
    },
    [validateStep]
  );

  const validation = {
    isValid: validateStep(currentStep) && warnings.length === 0,
    titleError:
      formState.title.trim().length === 0
        ? "Название обязательно"
        : undefined,
    descriptionError: undefined,
    tiersError:
      formState.tiers.length === 0 ? "Добавьте хотя бы один тир" : undefined,
    tierNameErrors: tierNameErrors.map(e => e ?? undefined),
    tierColorErrors: tierColorErrors.map(e => e ?? undefined),
    warnings,
  };

  const updateFormState = useCallback(
    (updates: Partial<TemplateEditorFormState>) => {
      setFormState((prev) => ({ ...prev, ...updates }));
      setIsDirty(true);
    },
    []
  );

  const updateField = useCallback(
    <K extends keyof TemplateEditorFormState>(
      field: K,
      value: TemplateEditorFormState[K]
    ) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
    },
    []
  );

  const updateTiers = useCallback((tiers: TierTemplate[]) => {
    setFormState((prev) => ({ ...prev, tiers }));
    setIsDirty(true);
  }, []);

  const updateTier = useCallback((index: number, updates: Partial<TierTemplate>) => {
    setFormState((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) =>
        i === index ? { ...tier, ...updates } : tier
      ),
    }));
    setIsDirty(true);
  }, []);

  const updateDefaultBooks = useCallback((books: BookTemplate[]) => {
    setFormState((prev) => ({ ...prev, defaultBooks: books }));
    setIsDirty(true);
  }, []);

  const addTier = useCallback(() => {
    const newTier: TierTemplate = {
      id: String(Date.now()),
      name: "",
      color: "#808080",
      order: formState.tiers.length,
    };
    setFormState((prev) => ({
      ...prev,
      tiers: [...prev.tiers, newTier],
    }));
    setIsDirty(true);
  }, [formState.tiers.length]);

  const removeTier = useCallback((index: number) => {
    setFormState((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  const duplicateTier = useCallback((index: number) => {
    const tierToDuplicate = formState.tiers[index];
    const newTier: TierTemplate = {
      ...tierToDuplicate,
      id: String(Date.now()),
      order: formState.tiers.length,
    };
    setFormState((prev) => ({
      ...prev,
      tiers: [...prev.tiers, newTier],
    }));
    setIsDirty(true);
  }, [formState.tiers]);

  const moveTier = useCallback((fromIndex: number, toIndex: number) => {
    setFormState((prev) => {
      const newTiers = [...prev.tiers];
      const [moved] = newTiers.splice(fromIndex, 1);
      newTiers.splice(toIndex, 0, moved);
      return {
        ...prev,
        tiers: newTiers.map((tier, i) => ({ ...tier, order: i })),
      };
    });
    setIsDirty(true);
  }, []);

  const resetToPreset = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      tiers: PRESET_TIERS.map((tier, i) => ({ ...tier, order: i })),
    }));
    setIsDirty(true);
  }, []);

  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => (prev < 2 ? (prev + 1) as TemplateEditorStep : prev));
    }
  }, [currentStep, validateStep]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev > 0 ? (prev - 1) as TemplateEditorStep : prev));
  }, []);

  const save = useCallback(async () => {
    console.log("[useTemplateEditorState] save вызван, formState:", formState);
    console.log("[useTemplateEditorState] mode:", mode, "templateId:", templateId);
    console.log("[useTemplateEditorState] validation.isValid:", validation.isValid);
    
    setIsSubmitting(true);
    setDraftStatus("saving");

    try {
      const templateData: CreateTemplateData | UpdateTemplateData = {
        ...formState,
        ...(mode === "edit" && templateId ? { id: templateId } : {}),
      };

      console.log("[useTemplateEditorState] Отправка templateData:", templateData);

      await onSubmit(templateData);
      setDraftStatus("saved");
      setDraftLastSaved(new Date());
      setIsDirty(false);
    } catch (error) {
      console.error("[useTemplateEditorState] Failed to save template:", error);
      setDraftStatus("idle");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [formState, mode, templateId, onSubmit, validation.isValid]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(`template-draft-${templateId || "new"}`);
    setShowRestorePrompt(false);
  }, [templateId]);

  const restoreDraft = useCallback(() => {
    const savedDraft = localStorage.getItem(`template-draft-${templateId || "new"}`);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft) as TemplateEditorFormState;
        setFormState(draft);
      } catch (e) {
        console.error("Failed to restore draft:", e);
      }
    }
    setShowRestorePrompt(false);
  }, [templateId]);

  const stayOnPage = useCallback(() => {
    setShowLeavePrompt(false);
  }, []);

  const confirmLeave = useCallback(() => {
    setShowLeavePrompt(false);
    window.history.back();
  }, []);

  // Сохранение черновика при изменениях
  const saveDraft = useCallback((state: TemplateEditorFormState) => {
    localStorage.setItem(
      `template-draft-${templateId || "new"}`,
      JSON.stringify(state)
    );
  }, [templateId]);

  // Автосохранение черновика
  const saveDraftDebounced = useCallback((state: TemplateEditorFormState) => {
    const timeoutId = setTimeout(() => {
      saveDraft(state);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [saveDraft]);

  // Эффект автосохранения
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (isDirty && formState.tiers.length > 0) {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      cleanupRef.current = saveDraftDebounced(formState);
    }
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [formState, isDirty, saveDraftDebounced]);

  // Проверка черновика при монтировании
  useEffect(() => {
    if (isDraftAvailable && mode === "edit") {
      setShowRestorePrompt(true);
    }
  }, [isDraftAvailable, mode]);

  // Предупреждение при попытке ухода со страницы
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    if (isDirty) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  return {
    formState,
    currentStep,
    setCurrentStep,
    isSubmitting,
    draftStatus,
    draftLastSaved,
    validation,
    isDirty,
    isDraftAvailable,
    showRestorePrompt,
    showLeavePrompt,
    updateFormState,
    updateField,
    updateTiers,
    updateTier,
    updateDefaultBooks,
    addTier,
    removeTier,
    duplicateTier,
    moveTier,
    resetToPreset,
    nextStep,
    prevStep,
    save,
    validateStep,
    stepIsValid,
    discardDraft,
    restoreDraft,
    stayOnPage,
    confirmLeave,
  };
}
