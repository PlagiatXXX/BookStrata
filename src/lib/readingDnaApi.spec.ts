import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  previewReadingDna,
  saveReadingDna,
  getReadingTicket,
  conductReadingDuel,
  getReadingTwins,
  getReadingArchetypes,
  getMyReadingDna,
  shareReadingTicket,
  type ReadingDnaInputData,
} from "./readingDnaApi";
import { apiClient } from "./api-client";

vi.mock("./api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("readingDnaApi", () => {
  const sampleInput: ReadingDnaInputData = {
    axes: {
      storyFocus: 50,
      emotionalWeight: 50,
      pace: 50,
      darkness: 50,
      scope: 50,
      complexity: 50,
    },
    favoriteBooks: [
      { title: "Книга 1" },
      { title: "Книга 2" },
      { title: "Книга 3" },
    ],
    likedGenres: ["Классика"],
    dislikedGenres: [],
    favoriteAuthors: [],
    theme: "dark",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("previewReadingDna отправляет POST на /reading-dna/preview", async () => {
    const mockPreview = { archetype: "meaning-architect", archetypeName: "Архитектор смыслов" };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockPreview);

    const result = await previewReadingDna(sampleInput);

    expect(apiClient.post).toHaveBeenCalledWith("/reading-dna/preview", sampleInput);
    expect(result).toEqual(mockPreview);
  });

  it("saveReadingDna отправляет POST на /reading-dna/save", async () => {
    const mockTicket = { ticketNumber: "BS-7492-X", archetype: "meaning-architect" };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockTicket);

    const result = await saveReadingDna(sampleInput);

    expect(apiClient.post).toHaveBeenCalledWith("/reading-dna/save", sampleInput);
    expect(result).toEqual(mockTicket);
  });

  it("getReadingTicket отправляет GET на /reading-dna/ticket/:ticketNumber", async () => {
    const mockTicket = { ticketNumber: "BS-7492-X" };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockTicket);

    const result = await getReadingTicket("BS-7492-X");

    expect(apiClient.get).toHaveBeenCalledWith("/reading-dna/ticket/BS-7492-X");
    expect(result).toEqual(mockTicket);
  });

  it("conductReadingDuel отправляет POST на /reading-dna/duel", async () => {
    const mockDuel = { compatibility: 88, verdict: "Соулмейты" };
    vi.mocked(apiClient.post).mockResolvedValueOnce(mockDuel);

    const duelInput = {
      targetTicketNumber: "BS-7492-X",
      challengerDna: sampleInput,
    };
    const result = await conductReadingDuel(duelInput);

    expect(apiClient.post).toHaveBeenCalledWith("/reading-dna/duel", duelInput);
    expect(result).toEqual(mockDuel);
  });

  it("getReadingTwins отправляет GET на /reading-dna/twins/:ticketNumber с параметром limit", async () => {
    const mockTwins = { twins: [{ ticketNumber: "BS-1111-A", similarity: 94 }] };
    vi.mocked(apiClient.get).mockResolvedValueOnce(mockTwins);

    const result = await getReadingTwins("BS-7492-X", 3);

    expect(apiClient.get).toHaveBeenCalledWith("/reading-dna/twins/BS-7492-X", { limit: 3 });
    expect(result).toEqual(mockTwins);
  });

  it("getReadingArchetypes отправляет GET на /reading-dna/archetypes", async () => {
    const mockCatalog = [{ id: "meaning-architect", number: 1 }];
    vi.mocked(apiClient.get).mockResolvedValueOnce({ archetypes: mockCatalog });

    const result = await getReadingArchetypes();

    expect(apiClient.get).toHaveBeenCalledWith("/reading-dna/archetypes");
    expect(result).toEqual(mockCatalog);
  });

  it("getMyReadingDna отправляет GET на /reading-dna/me и возвращает dna", async () => {
    const mockDna = { ticketNumber: "BS-7492-X", archetypeName: "Архитектор смыслов" };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ dna: mockDna });

    const result = await getMyReadingDna();

    expect(apiClient.get).toHaveBeenCalledWith("/reading-dna/me");
    expect(result).toEqual(mockDna);
  });

  it("shareReadingTicket отправляет POST на /reading-dna/share и возвращает shareCount", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ shareCount: 7 });

    const result = await shareReadingTicket("BS-7492-X");

    expect(apiClient.post).toHaveBeenCalledWith("/reading-dna/share", {
      ticketNumber: "BS-7492-X",
    });
    expect(result).toBe(7);
  });
});
