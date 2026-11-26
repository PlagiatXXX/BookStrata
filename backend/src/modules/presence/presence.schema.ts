import { z } from "zod";

export const presencePingSchema = z.object({
  anonId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  page: z.string().min(1).max(512),
  status: z.enum(["active", "idle"]),
});

export const presenceLeaveSchema = z.object({
  anonId: z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

export type PresencePingInput = z.infer<typeof presencePingSchema>;
export type PresenceLeaveInput = z.infer<typeof presenceLeaveSchema>;
