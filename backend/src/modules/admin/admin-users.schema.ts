import { z } from "zod";

export const resetPasswordBodySchema = z.object({
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов")
    .max(100, "Пароль не может быть длиннее 100 символов"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordBodySchema>;
