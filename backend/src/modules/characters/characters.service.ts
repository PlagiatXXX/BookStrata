// backend/src/modules/characters/characters.service.ts
import type { Character, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { slugify } from "../../lib/slug.js";
import type { BookCharacterInput, CharacterRoleValue } from "./characters.schema.js";

export interface BookCharacterRelationView {
  targetCharacterId: number;
  targetName: string;
  label: string;
}

export interface BookCharacterOtherBook {
  id: number;
  slug: string;
  title: string;
}

export interface BookCharacterView {
  id: number;
  characterId: number;
  slug: string;
  name: string;
  aliases: string[];
  universeSlug: string | null;
  role: CharacterRoleValue;
  summary: string;
  traits: string[];
  relations: BookCharacterRelationView[];
  otherBooks: BookCharacterOtherBook[];
}

export interface AdminCharacterSearchItem {
  id: number;
  slug: string;
  name: string;
  aliases: string[];
  universeSlug: string | null;
  traits: string[];
  bookCount: number;
}

const MAX_CHARACTER_ARRAY_ITEMS = 20;

interface PendingCharacterRelations {
  fromId: number;
  relations: BookCharacterInput["relations"];
}

function mergeUniqueStrings(
  existing: readonly string[],
  incoming: readonly string[],
  max = MAX_CHARACTER_ARRAY_ITEMS,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const raw of [...existing, ...incoming]) {
    if (result.length >= max) break;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((val, idx) => val === b[idx]);
}

async function generateUniqueCharacterSlug(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<string> {
  const base = slugify(name) || "character";

  for (let attempt = 1; attempt <= 20; attempt++) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const existing = await tx.character.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  const ts = Date.now().toString(36);
  for (let suffix = 0; suffix < 10; suffix++) {
    const candidate = suffix === 0 ? `${base}-${ts}` : `${base}-${ts}-${suffix}`;
    const existing = await tx.character.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  throw new Error(`Не удалось сгенерировать уникальный slug для персонажа "${base}"`);
}

async function findExistingCharacter(
  tx: Prisma.TransactionClient,
  item: BookCharacterInput,
): Promise<Character | null> {
  if (item.characterId !== undefined) {
    const byId = await tx.character.findUnique({
      where: { id: item.characterId },
    });
    if (byId) {
      return byId;
    }
  }

  return tx.character.findFirst({
    where: { name: { equals: item.name, mode: "insensitive" } },
  });
}

async function updateCharacterIfNeeded(
  tx: Prisma.TransactionClient,
  existing: Character,
  item: BookCharacterInput,
): Promise<Character> {
  const mergedAliases = mergeUniqueStrings(existing.aliases, item.aliases);
  const mergedTraits = mergeUniqueStrings(existing.traits, item.traits);
  const nextUniverseSlug = existing.universeSlug ?? item.universeSlug ?? null;

  const changed =
    !arraysEqual(existing.aliases, mergedAliases) ||
    !arraysEqual(existing.traits, mergedTraits) ||
    existing.universeSlug !== nextUniverseSlug;

  if (!changed) {
    return existing;
  }

  return tx.character.update({
    where: { id: existing.id },
    data: {
      aliases: mergedAliases,
      universeSlug: nextUniverseSlug,
      traits: mergedTraits,
    },
  });
}

async function createNewCharacter(
  tx: Prisma.TransactionClient,
  item: BookCharacterInput,
): Promise<Character> {
  const slug = await generateUniqueCharacterSlug(tx, item.name);
  return tx.character.create({
    data: {
      name: item.name,
      slug,
      aliases: mergeUniqueStrings([], item.aliases),
      universeSlug: item.universeSlug ?? null,
      traits: mergeUniqueStrings([], item.traits),
    },
  });
}

function buildBookCharacterRelations(
  pending: readonly PendingCharacterRelations[],
  nameToBookCharId: ReadonlyMap<string, number>,
  aliasToBookCharId: ReadonlyMap<string, number>,
): Array<{ fromId: number; toId: number; label: string }> {
  const relationData: Array<{ fromId: number; toId: number; label: string }> = [];
  const seenRelationKeys = new Set<string>();

  for (const { fromId, relations } of pending) {
    for (const rel of relations) {
      const targetKey = rel.targetName.trim().toLowerCase();
      const toId =
        nameToBookCharId.get(targetKey) ?? aliasToBookCharId.get(targetKey);

      if (toId === undefined || toId === fromId) {
        continue;
      }

      const label = rel.label.trim();
      if (!label) {
        continue;
      }

      const dedupeKey = `${fromId}:${toId}:${label}`;
      if (seenRelationKeys.has(dedupeKey)) {
        continue;
      }
      seenRelationKeys.add(dedupeKey);

      relationData.push({ fromId, toId, label });
    }
  }

  return relationData;
}

/** Возвращает отсортированных персонажей книги со связями и другими опубликованными книгами героя. */
export async function getBookCharactersView(
  bookId: number,
): Promise<BookCharacterView[]> {
  const rows = await prisma.bookCharacter.findMany({
    where: { bookId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      character: {
        include: {
          books: {
            where: {
              bookId: { not: bookId },
              book: {
                status: "published",
                mergedIntoId: null,
                slug: { not: null },
              },
            },
            orderBy: { book: { id: "asc" } },
            include: {
              book: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                },
              },
            },
          },
        },
      },
      relationsFrom: {
        orderBy: { id: "asc" },
        include: {
          to: {
            include: {
              character: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const otherBooks: BookCharacterOtherBook[] = [];
    for (const link of row.character.books) {
      if (link.book.slug) {
        otherBooks.push({
          id: link.book.id,
          slug: link.book.slug,
          title: link.book.title,
        });
      }
    }

    const relations: BookCharacterRelationView[] = row.relationsFrom.map(
      (rel) => ({
        targetCharacterId: rel.to.character.id,
        targetName: rel.to.character.name,
        label: rel.label,
      }),
    );

    return {
      id: row.id,
      characterId: row.characterId,
      slug: row.character.slug,
      name: row.character.name,
      aliases: row.character.aliases,
      universeSlug: row.character.universeSlug,
      role: row.role,
      summary: row.summary,
      traits: row.traits,
      relations,
      otherBooks,
    };
  });
}

/** Ищет канонических персонажей по имени или точному совпадению в aliases. */
export async function searchCharacters(
  query: string,
  limit = 15,
): Promise<AdminCharacterSearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const safeLimit = Math.min(Math.max(1, limit), 50);

  const characters = await prisma.character.findMany({
    where: {
      OR: [
        { name: { contains: trimmed, mode: "insensitive" } },
        { aliases: { has: trimmed } },
      ],
    },
    take: safeLimit,
    orderBy: [{ books: { _count: "desc" } }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      aliases: true,
      universeSlug: true,
      traits: true,
      _count: {
        select: { books: true },
      },
    },
  });

  return characters.map((ch) => ({
    id: ch.id,
    slug: ch.slug,
    name: ch.name,
    aliases: ch.aliases,
    universeSlug: ch.universeSlug,
    traits: ch.traits,
    bookCount: ch._count.books,
  }));
}

/** Полностью заменяет список персонажей книги и их связи в одной транзакции. */
export async function replaceBookCharacters(
  bookId: number,
  items: BookCharacterInput[],
): Promise<BookCharacterView[]> {
  await prisma.$transaction(async (tx) => {
    await tx.bookCharacter.deleteMany({ where: { bookId } });

    if (items.length === 0) {
      return;
    }

    const seenCharacterIds = new Set<number>();
    const nameToBookCharId = new Map<string, number>();
    const aliasToBookCharId = new Map<string, number>();
    const pendingRelations: PendingCharacterRelations[] = [];
    let createdOrder = 0;

    for (const item of items) {
      if (item.characterId !== undefined && seenCharacterIds.has(item.characterId)) {
        continue;
      }

      const existing = await findExistingCharacter(tx, item);
      if (existing && seenCharacterIds.has(existing.id)) {
        continue;
      }

      const character = existing
        ? await updateCharacterIfNeeded(tx, existing, item)
        : await createNewCharacter(tx, item);

      seenCharacterIds.add(character.id);

      const created = await tx.bookCharacter.create({
        data: {
          bookId,
          characterId: character.id,
          role: item.role,
          summary: item.summary,
          traits: mergeUniqueStrings([], item.traits),
          sortOrder: item.sortOrder ?? createdOrder,
        },
      });
      createdOrder += 1;

      const inputNameKey = item.name.trim().toLowerCase();
      if (inputNameKey && !nameToBookCharId.has(inputNameKey)) {
        nameToBookCharId.set(inputNameKey, created.id);
      }

      const charNameKey = character.name.trim().toLowerCase();
      if (charNameKey && !nameToBookCharId.has(charNameKey)) {
        nameToBookCharId.set(charNameKey, created.id);
      }

      for (const alias of [...item.aliases, ...character.aliases]) {
        const aliasKey = alias.trim().toLowerCase();
        if (aliasKey && !aliasToBookCharId.has(aliasKey)) {
          aliasToBookCharId.set(aliasKey, created.id);
        }
      }

      if (item.relations.length > 0) {
        pendingRelations.push({ fromId: created.id, relations: item.relations });
      }
    }

    const relationData = buildBookCharacterRelations(
      pendingRelations,
      nameToBookCharId,
      aliasToBookCharId,
    );

    if (relationData.length > 0) {
      await tx.bookCharacterRelation.createMany({
        data: relationData,
        skipDuplicates: true,
      });
    }
  });

  return getBookCharactersView(bookId);
}

async function runTransferCharactersIfCanonEmpty(
  db: Prisma.TransactionClient,
  dupBookId: number,
  canonBookId: number,
): Promise<void> {
  const canonCount = await db.bookCharacter.count({
    where: { bookId: canonBookId },
  });

  if (canonCount === 0) {
    await db.bookCharacter.updateMany({
      where: { bookId: dupBookId },
      data: { bookId: canonBookId },
    });
    return;
  }

  await db.bookCharacter.deleteMany({
    where: { bookId: dupBookId },
  });
}

/**
 * При склейке дублей переносит персонажей дубля на канон (если у канона их ещё нет)
 * или удаляет связи дубля (чтобы не оставались висячие записи, завышающие bookCount).
 * Должна вызываться ДО mergeGroup / удаления дубля.
 */
export async function transferCharactersIfCanonEmpty(
  dupBookId: number,
  canonBookId: number,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  if (dupBookId === canonBookId) {
    return;
  }

  if (tx) {
    await runTransferCharactersIfCanonEmpty(tx, dupBookId, canonBookId);
    return;
  }

  await prisma.$transaction((innerTx) =>
    runTransferCharactersIfCanonEmpty(innerTx, dupBookId, canonBookId),
  );
}
