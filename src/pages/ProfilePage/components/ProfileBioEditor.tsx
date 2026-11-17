import { useMemo, useState } from "react";
import { sileo } from "sileo";
import { Plus } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { createLogger } from "@/lib/logger";
import { normalizeSocialUrl } from "@/lib/socialLinks";
import { SocialLinksEditor } from "@/pages/UserProfilePage/components/SocialLinksEditor";
import type { SocialLink, UpdateProfileInput } from "@/lib/userApi";

const logger = createLogger("ProfileBioEditor", { color: "purple" });

export function ProfileBioEditor({
  user,
  onSaved,
}: {
  user: {
    username: string;
    bio: string | null;
    socialLinks: SocialLink[] | null;
  };
  onSaved?: () => void;
}) {
  const { updateProfile } = useUser();
  const [bio, setBio] = useState(user.bio ?? "");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    user.socialLinks ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [editingLinks, setEditingLinks] = useState(false);

  const hasChanges = useMemo(() => {
    const originalBio = user.bio ?? "";
    const originalSocialLinks = user.socialLinks ?? [];
    const trimmedBio = bio.trim();
    const bioChanged = trimmedBio !== originalBio;

    const cleanedLinks = socialLinks
      .filter((link) => link.url.trim() !== "")
      .map((link) => ({
        platform: link.platform.trim(),
        url: link.url.trim(),
      }));

    const normalizedOriginalLinks = originalSocialLinks.map((link) => ({
      platform: link.platform.trim(),
      url: link.url.trim(),
    }));

    const linksChanged =
      cleanedLinks.length !== normalizedOriginalLinks.length ||
      cleanedLinks.some((link, index) => {
        const original = normalizedOriginalLinks[index];
        return (
          !original ||
          link.platform !== original.platform ||
          link.url !== original.url
        );
      });

    return bioChanged || linksChanged;
  }, [bio, socialLinks, user.bio, user.socialLinks]);

  /** Сохраняет bio и соцсети. Ссылки уже нормализованы SocialLinksEditor. */
  const persist = async (links: SocialLink[]) => {
    setIsSaving(true);
    try {
      const input: UpdateProfileInput = {
        username: user.username,
        bio: bio.trim() || null,
        socialLinks: links.length > 0 ? links : null,
      };
      await updateProfile(input);
      setBio(bio.trim());
      setSocialLinks(links);
      setEditingLinks(false);
      sileo.success({ title: "Профиль обновлён", duration: 2000 });
      onSaved?.();
    } catch (err) {
      logger.error(err instanceof Error ? err : new Error(String(err)), {
        action: "handleSave",
      });
      sileo.error({
        title: "Ошибка сохранения",
        description: "Попробуйте снова",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  /** Кнопка «Сохранить» в свёрнутом состоянии — сохраняет в основном bio. */
  const handleSaveBio = () => {
    const invalidIndexes: number[] = [];
    const normalized: SocialLink[] = [];
    socialLinks.forEach((link, index) => {
      const trimmedUrl = link.url.trim();
      if (!trimmedUrl) return;
      const url = normalizeSocialUrl(trimmedUrl);
      if (!url) {
        invalidIndexes.push(index);
      } else {
        normalized.push({ platform: link.platform.trim(), url });
      }
    });

    if (invalidIndexes.length > 0) {
      sileo.error({
        title: "Некорректная ссылка",
        description: "Проверьте ссылки в разделе «Соцсети»",
        duration: 4000,
      });
      return;
    }
    void persist(normalized);
  };

  const handleCancelLinks = () => {
    setSocialLinks(user.socialLinks ?? []);
    setEditingLinks(false);
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Bio textarea */}
      <div>
        <label className="block text-xs font-medium text-gray-300 mb-1">
          О себе
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          placeholder="Расскажите о себе, ваших вкусах, блоге о книгах..."
          className="w-full h-20 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          maxLength={500}
        />
        <div className="text-[11px] text-gray-500 mt-1 text-right">
          {bio.length}/500
        </div>
      </div>

      {/* Social links: логика и разметка вынесены в SocialLinksEditor */}
      {!editingLinks ? (
        <button
          onClick={() => setEditingLinks(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-300 hover:bg-gray-600 hover:text-white transition-colors cursor-pointer"
          disabled={isSaving}
        >
          <Plus size={14} />
          Соцсети ({socialLinks.length}/6)
        </button>
      ) : (
        <SocialLinksEditor
          value={socialLinks}
          onChange={setSocialLinks}
          onSave={(links) => void persist(links)}
          isSaving={isSaving}
          saveLabel="Готово"
          onCancel={handleCancelLinks}
        />
      )}

      {!editingLinks && hasChanges && (
        <button
          onClick={handleSaveBio}
          disabled={isSaving}
          className="px-4 py-1.5 bg-violet-500/20 border border-violet-500/40 rounded-lg text-xs font-medium text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? "Сохранение…" : "Сохранить"}
        </button>
      )}
    </div>
  );
}
