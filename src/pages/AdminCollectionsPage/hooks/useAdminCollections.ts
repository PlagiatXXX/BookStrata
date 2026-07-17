import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sileo } from "sileo";
import { useQueryClient } from "@tanstack/react-query";
import type { CollectionItem } from "@/types/collection";
import {
  getAllCollectionsForAdmin,
  createCollection,
  updateCollection,
  deleteCollection,
  toggleCollectionPublish,
  uploadCollectionCover,
  type CreateCollectionInput,
  type UpdateCollectionInput,
} from "@/lib/collectionsApi";
import type { CuratedTier, CuratedBook } from "../components/types";

interface CollectionFormData {
  type: "curated" | "literary";
  title: string;
  content: string;
  excerpt: string;
  coverImageUrl: string;
  categoryId: string;
  bookCovers: string[];
  tags: string;
  isPublished: boolean;
  isFeatured: boolean;
  order: number;
  editorialNote: string;
  accentColor: string;
}

const emptyFormData: CollectionFormData = {
  type: "literary",
  title: "",
  content: "",
  excerpt: "",
  coverImageUrl: "",
  categoryId: "",
  bookCovers: ["", "", ""],
  tags: "",
  isPublished: false,
  isFeatured: false,
  order: 0,
  editorialNote: "",
  accentColor: "",
};

export function useAdminCollections() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionItem | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>(emptyFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [curatedTiers, setCuratedTiers] = useState<CuratedTier[]>([]);
  const [curatedBooks, setCuratedBooks] = useState<CuratedBook[]>([]);

  const [typeFilter, setTypeFilter] = useState<"all" | "curated" | "literary">("all");

  const filteredCollections = useMemo(() => {
    if (typeFilter === "all") return collections;
    return collections.filter((c) => c.type === typeFilter);
  }, [collections, typeFilter]);

  // --- Загрузка ---

  const loadCollections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllCollectionsForAdmin();
      setCollections(response.sort((a, b) => a.order - b.order));
    } catch {
      sileo.error({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить коллекции",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // --- Открытие/закрытие ---

  const handleOpenCreate = useCallback(
    (presetType?: "curated" | "literary") => {
      const effectiveType = presetType || "literary";
      setEditingCollection(null);
      setFormData({
        ...emptyFormData,
        type: effectiveType,
      });
      setCuratedTiers(
        effectiveType === "curated"
          ? [
              { id: "tier_s", title: "S", color: "#ef4444" },
              { id: "tier_a", title: "A", color: "#f97316" },
              { id: "tier_b", title: "B", color: "#eab308" },
              { id: "tier_c", title: "C", color: "#84cc16" },
            ]
          : [],
      );
      setCuratedBooks([]);
      setShowModal(true);
    },
    [],
  );

  const handleOpenEdit = useCallback((collection: CollectionItem) => {
    setEditingCollection(collection);
    setFormData({
      type: collection.type,
      title: collection.title,
      content: collection.content || "",
      excerpt: collection.excerpt || "",
      coverImageUrl: collection.coverImageUrl || "",
      categoryId: collection.categoryId || "",
      bookCovers: collection.bookCovers?.length ? collection.bookCovers : ["", "", ""],
      tags: collection.tags.join(", "),
      isPublished: collection.isPublished,
      isFeatured: collection.isFeatured,
      order: collection.order,
      editorialNote: collection.editorialNote || "",
      accentColor: collection.accentColor || "",
    });

    if (collection.type === "curated" && collection.tiers && collection.tierOrder) {
      const tiers: CuratedTier[] = collection.tierOrder
        .map((id) => collection.tiers?.[id])
        .filter(Boolean)
        .map((t) => ({
          id: t!.id,
          title: t!.title,
          color: t!.color,
        }));
      setCuratedTiers(tiers);

      const books: CuratedBook[] = [];
      const allBooks = collection.books || {};

      collection.tierOrder.forEach((tierId) => {
        const tier = collection.tiers?.[tierId];
        if (tier) {
          tier.bookIds.forEach((bookId) => {
            const book = allBooks[bookId];
            if (book) {
              books.push({
                id: bookId,
                title: book.title,
                author: book.author,
                coverImageUrl: book.coverImageUrl,
                description: book.description,
                rating: book.rating,
                genre: book.genre,
                tags: book.tags?.join(", "),
                tierId: tierId,
              });
            }
          });
        }
      });

      (collection.unrankedBookIds || []).forEach((bookId) => {
        const book = allBooks[bookId];
        if (book) {
          books.push({
            id: bookId,
            title: book.title,
            author: book.author,
            coverImageUrl: book.coverImageUrl,
            description: book.description,
            rating: book.rating,
            genre: book.genre,
            tags: book.tags?.join(", "),
            tierId: null,
          });
        }
      });

      setCuratedBooks(books);
    } else {
      setCuratedTiers([]);
      setCuratedBooks([]);
    }

    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingCollection(null);
    setFormData(emptyFormData);
    setCuratedTiers([]);
    setCuratedBooks([]);
  }, []);

  // --- CRUD ---

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormLoading(true);

      try {
        const baseInput = {
          type: formData.type,
          title: formData.title.trim(),
          excerpt: formData.excerpt.trim(),
          coverImageUrl: formData.coverImageUrl.trim() || undefined,
          categoryId: formData.categoryId || undefined,
          tags: formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0),
          isPublished: formData.isPublished,
          isFeatured: formData.isFeatured,
          order: formData.order,
          editorialNote: formData.editorialNote.trim() || null,
          accentColor: formData.accentColor || undefined,
        };

        if (formData.type === "curated") {
          const emptyBooks = curatedBooks.filter((b) => !b.title.trim());
          if (emptyBooks.length > 0) {
            setFormLoading(false);
            sileo.warning({
              title: `${emptyBooks.length} книг без названия`,
              description: `Заполните название у ${emptyBooks.length > 1 ? "них" : "неё"} или удалите пустые строки.`,
              duration: 2000,
            });
            return;
          }

          const tiersMap: Record<string, { id: string; title: string; color: string; bookIds: string[] }> = {};
          const tierOrder: string[] = [];
          const booksMap: Record<string, { id: string; title: string; author: string; coverImageUrl: string; description?: string; rating?: number; genre?: string; tags?: string[] }> = {};
          const unrankedBookIds: string[] = [];

          curatedTiers.forEach((t) => {
            tiersMap[t.id] = { id: t.id, title: t.title, color: t.color, bookIds: [] };
            tierOrder.push(t.id);
          });

          curatedBooks.forEach((b) => {
            if (!b.title.trim()) return;
            const bookId = b.id;
            booksMap[bookId] = {
              id: bookId,
              title: b.title.trim(),
              author: b.author.trim(),
              coverImageUrl: b.coverImageUrl.trim(),
              description: b.description?.trim(),
              rating: b.rating != null ? Number(b.rating) : undefined,
              genre: b.genre?.trim(),
              tags: b.tags ? b.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
            };
            if (b.tierId && tiersMap[b.tierId]) {
              tiersMap[b.tierId].bookIds.push(bookId);
            } else if (tierOrder.length > 0) {
              tiersMap[tierOrder[0]!].bookIds.push(bookId);
            } else {
              unrankedBookIds.push(bookId);
            }
          });

          const input = {
            ...baseInput,
            tiers: tiersMap,
            tierOrder,
            books: booksMap,
            unrankedBookIds,
            content: undefined,
            bookCovers: formData.bookCovers.filter((url) => url.trim() !== ""),
          };

          if (editingCollection) {
            await updateCollection(editingCollection.id, input as UpdateCollectionInput);
          } else {
            await createCollection(input as unknown as CreateCollectionInput);
          }
        } else {
          const input = {
            ...baseInput,
            content: formData.content.trim() || undefined,
            bookCovers: formData.bookCovers.filter((url) => url.trim() !== ""),
          };
          if (editingCollection) {
            await updateCollection(editingCollection.id, input as UpdateCollectionInput);
          } else {
            await createCollection(input as unknown as CreateCollectionInput);
          }
        }

        sileo.success({
          title: editingCollection ? "Коллекция обновлена" : "Коллекция создана",
          description: `"${formData.title.trim()}" сохранена`,
          duration: 2000,
        });

        handleCloseModal();
        queryClient.invalidateQueries({ queryKey: ["published-collections"] });
        loadCollections();
      } catch {
        sileo.error({
          title: "Ошибка сохранения",
          description: "Не удалось сохранить коллекцию",
          duration: 3000,
        });
      } finally {
        setFormLoading(false);
      }
    },
    [formData, curatedBooks, curatedTiers, editingCollection, queryClient, loadCollections, handleCloseModal],
  );

  const handleDelete = useCallback(
    async (id: number, title: string) => {
      try {
        await deleteCollection(id);
        sileo.success({ title: "Коллекция удалена", description: `"${title}" удалена`, duration: 3000 });
        loadCollections();
        setDeleteConfirm(null);
      } catch {
        sileo.error({ title: "Ошибка удаления", description: "Не удалось удалить коллекцию", duration: 3000 });
      }
    },
    [loadCollections],
  );

  const handleTogglePublish = useCallback(
    async (id: number, isPublished: boolean, title: string) => {
      try {
        await toggleCollectionPublish(id);
        sileo.success({
          title: isPublished ? "Коллекция снята с публикации" : "Коллекция опубликована",
          description: `"${title}"`,
          duration: 3000,
        });
        loadCollections();
      } catch {
        sileo.error({ title: "Ошибка", description: "Не удалось изменить статус публикации", duration: 3000 });
      }
    },
    [loadCollections],
  );

  // --- Форма ---

  const handleBookCoverChange = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const newBookCovers = [...prev.bookCovers];
      newBookCovers[index] = value;
      return { ...prev, bookCovers: newBookCovers };
    });
  }, []);

  const handleCoverFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        sileo.error({ title: "Слишком большой файл", description: "Максимум 5 MB" });
        return;
      }
      setCoverUploading(true);
      try {
        const result = await uploadCollectionCover(file);
        setFormData((prev) => ({ ...prev, coverImageUrl: result.coverImageUrl }));
        sileo.success({ title: "Обложка загружена" });
      } catch {
        sileo.error({ title: "Ошибка загрузки" });
      } finally {
        setCoverUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [],
  );

  // --- Преобразование типа ---

  const handleTypeChange = useCallback(
    (type: "curated" | "literary") => {
      setFormData((prev) => ({ ...prev, type, content: type === "curated" ? "" : prev.content }));
      if (type === "literary") {
        setCuratedTiers([]);
        setCuratedBooks([]);
      } else if (!editingCollection) {
        setCuratedTiers([
          { id: "tier_s", title: "S", color: "#ef4444" },
          { id: "tier_a", title: "A", color: "#f97316" },
          { id: "tier_b", title: "B", color: "#eab308" },
          { id: "tier_c", title: "C", color: "#84cc16" },
        ]);
      }
    },
    [editingCollection],
  );

  return {
    // Состояния
    collections,
    filteredCollections,
    loading,
    showModal,
    editingCollection,
    formData,
    formLoading,
    deleteConfirm,
    coverUploading,
    fileInputRef,
    curatedTiers,
    curatedBooks,
    typeFilter,
    navigate,
    location,

    // Сеттеры
    setFormData,
    setCuratedTiers,
    setCuratedBooks,
    setDeleteConfirm,
    setTypeFilter,
    setShowModal,

    // Обработчики
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleTogglePublish,
    handleBookCoverChange,
    handleCoverFileSelect,
    handleTypeChange,
    loadCollections,
  };
}
