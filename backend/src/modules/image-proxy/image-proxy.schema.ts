import { z } from "zod";

/**
 * Схема валидации query-параметров для /api/images/proxy
 */
export const ProxyImageQuery = z.object({
  url: z
    .string()
    .url("URL должен быть валидным URL")
    .min(1, "URL обязателен")
    .max(2000, "URL слишком длинный"),
  /** Желаемая ширина в пикселях (по умолчанию 300) */
  width: z
    .string()
    .optional()
    .transform((val) => {
      const num = val ? parseInt(val, 10) : 300;
      if (isNaN(num) || num < 50 || num > 1200) return 300;
      return num;
    }),
  /** Качество WebP (1-100, по умолчанию 80) */
  quality: z
    .string()
    .optional()
    .transform((val) => {
      const num = val ? parseInt(val, 10) : 80;
      if (isNaN(num) || num < 1 || num > 100) return 80;
      return num;
    }),
});

export type ProxyImageQueryType = z.infer<typeof ProxyImageQuery>;
