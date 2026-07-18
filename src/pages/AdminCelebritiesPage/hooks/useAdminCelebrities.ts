import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sileo } from "sileo";
import { useQueryClient } from "@tanstack/react-query";
import type { CelebrityItem } from "@/lib/celebritiesApi";
import {
  getAllCelebritiesForAdmin,
  createCelebrity,
  updateCelebrity,
  deleteCelebrity,
  toggleCelebrityPublish,
  uploadCelebrityPhoto,
  type CreateCelebrityInput,
  type UpdateCelebrityInput,
} from "@/lib/celebritiesApi";
import type { CuratedTier, CuratedBook } from "@/pages/AdminCollectionsPage/components/types";


interface CelebrityFormData {
  name: string;
  photoUrl: string;
  biography: string;
  category: string;
  isPublished: boolean;
  order: number;
}

const emptyFormData: CelebrityFormData = {
  name: "",
  photoUrl: "",
  biography: "",
  category: "",
  isPublished: false,
  order: 0,
};

export function useAdminCelebrities() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [celebrities, setCelebrities] = useState<CelebrityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCelebrity, setEditingCelebrity] = useState<CelebrityItem | null>(null);
  const [formData, setFormData] = useState<CelebrityFormData>(emptyFormData);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [curatedTiers, setCuratedTiers] = useState<CuratedTier[]>([]);
  const [curatedBooks, setCuratedBooks] = useState<CuratedBook[]>([]);

  // --- Загрузка ---

  const loadCelebrities = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllCelebritiesForAdmin();
      setCelebrities(response.sort((a, b) => a.order - b.order));
    } catch {
      sileo.error({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить знаменитостей",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCelebrities();
  }, [loadCelebrities]);

  // --- Открытие/закрытие ---

  const handleOpenCreate = useCallback(() => {
    setEditingCelebrity(null);
    setFormData({ ...emptyFormData });
    setCuratedTiers([
      { id: "tier_s", title: "S", color: "#ef4444" },
      { id: "tier_a", title: "A", color: "#f97316" },
      { id: "tier_b", title: "B", color: "#eab308" },
      { id: "tier_c", title: "C", color: "#84cc16" },
    ]);
    setCuratedBooks([]);
    setShowModal(true);
  }, []);

  const handleOpenEdit = useCallback((celebrity: CelebrityItem) => {
    setEditingCelebrity(celebrity);
    setFormData({
      name: celebrity.name,
      photoUrl: celebrity.photoUrl || "",
      biography: celebrity.biography || "",
      category: celebrity.category || "",
      isPublished: celebrity.isPublished,
      order: celebrity.order,
    });

    if (celebrity.tiers && celebrity.tierOrder) {
      const tiers: CuratedTier[] = celebrity.tierOrder
        .map((id) => celebrity.tiers?.[id])
        .filter(Boolean)
        .map((t) => ({
          id: t!.id,
          title: t!.title,
          color: t!.color,
        }));
      setCuratedTiers(tiers);

      const books: CuratedBook[] = [];
      const allBooks = celebrity.books || {};

      celebrity.tierOrder.forEach((tierId) => {
        const tier = celebrity.tiers?.[tierId];
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

      (celebrity.unrankedBookIds || []).forEach((bookId) => {
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
    setEditingCelebrity(null);
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
          name: formData.name.trim(),
          photoUrl: formData.photoUrl.trim() || undefined,
          biography: formData.biography.trim() || undefined,
          category: formData.category || undefined,
          isPublished: formData.isPublished,
          order: formData.order,
        };

        // Валидация книг без названия
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
            tags: b.tags ? b.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : undefined,
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
        };

        if (editingCelebrity) {
          await updateCelebrity(editingCelebrity.id, input as UpdateCelebrityInput);
        } else {
          await createCelebrity(input as CreateCelebrityInput);
        }

        sileo.success({
          title: editingCelebrity ? "Знаменитость обновлена" : "Знаменитость создана",
          description: `"${formData.name.trim()}" сохранена`,
          duration: 2000,
        });

        handleCloseModal();
        queryClient.invalidateQueries({ queryKey: ["celebrities"] });
        loadCelebrities();
      } catch {
        sileo.error({
          title: "Ошибка сохранения",
          description: "Не удалось сохранить знаменитость",
          duration: 3000,
        });
      } finally {
        setFormLoading(false);
      }
    },
    [formData, curatedBooks, curatedTiers, editingCelebrity, queryClient, loadCelebrities, handleCloseModal],
  );

  const handleDelete = useCallback(
    async (id: number, name: string) => {
      try {
        await deleteCelebrity(id);
        sileo.success({ title: "Знаменитость удалена", description: `"${name}" удалена`, duration: 3000 });
        loadCelebrities();
        setDeleteConfirm(null);
      } catch {
        sileo.error({ title: "Ошибка удаления", description: "Не удалось удалить знаменитость", duration: 3000 });
      }
    },
    [loadCelebrities],
  );

  const handleTogglePublish = useCallback(
    async (id: number, isPublished: boolean, name: string) => {
      try {
        await toggleCelebrityPublish(id);
        sileo.success({
          title: isPublished ? "Снято с публикации" : "Опубликовано",
          description: `"${name}"`,
          duration: 3000,
        });
        loadCelebrities();
      } catch {
        sileo.error({ title: "Ошибка", description: "Не удалось изменить статус публикации", duration: 3000 });
      }
    },
    [loadCelebrities],
  );

  // --- Форма ---

  const handlePhotoFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        sileo.error({ title: "Слишком большой файл", description: "Максимум 5 MB" });
        return;
      }
      setPhotoUploading(true);
      try {
        const result = await uploadCelebrityPhoto(file);
        setFormData((prev) => ({ ...prev, photoUrl: result.photoUrl }));
        sileo.success({ title: "Фото загружено" });
      } catch {
        sileo.error({ title: "Ошибка загрузки" });
      } finally {
        setPhotoUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [],
  );

  return {
    celebrities,
    loading,
    showModal,
    editingCelebrity,
    formData,
    formLoading,
    deleteConfirm,
    photoUploading,
    fileInputRef,
    curatedTiers,
    curatedBooks,
    navigate,

    setFormData,
    setCuratedTiers,
    setCuratedBooks,
    setDeleteConfirm,
    setShowModal,

    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleTogglePublish,
    handlePhotoFileSelect,
    loadCelebrities,
  };
}
