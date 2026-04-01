import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Avatar generation schema - protects against oversized prompts that could abuse AI generation services.
export const generateAvatarBodySchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(2, "Prompt must be at least 2 characters")
    .max(500, "Prompt cannot exceed 500 characters"),
});

// Avatar upload schema - prevents Denial of Service (DoS) attacks via oversized payloads (e.g. 10MB limit for base64 data).
export const uploadAvatarBodySchema = z.object({
  avatar: z
    .string()
    .min(1, "Avatar is required")
    .max(10 * 1024 * 1024, "Avatar payload exceeds the 10MB limit"),
});

// JSON schemas for Fastify integration
export const generateAvatarSchema = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: zodToJsonSchema(generateAvatarBodySchema as any),
};

export const uploadAvatarSchema = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: zodToJsonSchema(uploadAvatarBodySchema as any),
};

export type GenerateAvatarInput = z.infer<typeof generateAvatarBodySchema>;
export type UploadAvatarInput = z.infer<typeof uploadAvatarBodySchema>;
