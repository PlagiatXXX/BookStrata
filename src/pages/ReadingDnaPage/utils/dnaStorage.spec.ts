import { describe, it, expect, beforeEach } from "vitest";
import {
  getDnaTicketStorageKey,
  getDnaDraftStorageKey,
  cleanupLegacyDnaStorage,
  LEGACY_DNA_TICKET_KEY,
  LEGACY_DNA_DRAFT_KEY,
} from "./dnaStorage";

describe("dnaStorage utils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getDnaTicketStorageKey", () => {
    it("возвращает ключ для гостя, если userId не передан", () => {
      expect(getDnaTicketStorageKey()).toBe("bs_reading_dna_ticket_guest");
      expect(getDnaTicketStorageKey(null)).toBe("bs_reading_dna_ticket_guest");
      expect(getDnaTicketStorageKey(undefined)).toBe("bs_reading_dna_ticket_guest");
    });

    it("возвращает изолированный ключ для конкретного пользователя", () => {
      expect(getDnaTicketStorageKey(42)).toBe("bs_reading_dna_ticket_user_42");
      expect(getDnaTicketStorageKey(101)).toBe("bs_reading_dna_ticket_user_101");
    });
  });

  describe("getDnaDraftStorageKey", () => {
    it("возвращает ключ черновика для гостя, если userId не передан", () => {
      expect(getDnaDraftStorageKey()).toBe("bs_reading_dna_draft_guest");
      expect(getDnaDraftStorageKey(null)).toBe("bs_reading_dna_draft_guest");
    });

    it("возвращает изолированный ключ черновика для пользователя", () => {
      expect(getDnaDraftStorageKey(42)).toBe("bs_reading_dna_draft_user_42");
    });
  });

  describe("cleanupLegacyDnaStorage", () => {
    it("удаляет устаревшие неизолированные ключи из localStorage", () => {
      localStorage.setItem(LEGACY_DNA_TICKET_KEY, JSON.stringify({ ticketNumber: "BS-OLD" }));
      localStorage.setItem(LEGACY_DNA_DRAFT_KEY, JSON.stringify({ step: 1 }));
      localStorage.setItem("other_unrelated_key", "keep-me");

      cleanupLegacyDnaStorage();

      expect(localStorage.getItem(LEGACY_DNA_TICKET_KEY)).toBeNull();
      expect(localStorage.getItem(LEGACY_DNA_DRAFT_KEY)).toBeNull();
      expect(localStorage.getItem("other_unrelated_key")).toBe("keep-me");
    });
  });
});
