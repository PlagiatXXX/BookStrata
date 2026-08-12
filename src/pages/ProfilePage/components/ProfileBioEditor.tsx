import { useMemo, useState } from "react";
import { sileo } from "sileo";
import { Plus, Trash2, Check, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { createLogger } from "@/lib/logger";
import type { SocialLink, UpdateProfileInput } from "@/lib/userApi";

const logger = createLogger("ProfileBioEditor", { color: "purple" });

const PLATFORM_OPTIONS = [
  "telegram",
  "twitter",
  "instagram",
  "vkontakte",
  "youtube",
  "github",
  "website",
] as const;

const PLATFORM_PLACEHOLDERS: Record<(typeof PLATFORM_OPTIONS)[number], string> =
  {
    telegram: "https://t.me/username",
    twitter: "https://twitter.com/username",
    instagram: "https://instagram.com/username",
    vkontakte: "https://vk.ru/id666666666",
    youtube: "https://youtube.com/@username",
    github: "https://github.com/username",
    website: "https://example.com",
  };

function getPlatformPlaceholder(platform: (typeof PLATFORM_OPTIONS)[number]) {
  return PLATFORM_PLACEHOLDERS[platform] || "https://example.com";
}

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
  const [editingLinks, setEditingLinks] = useState(false);

  const handleAddLink = () => {
    if (socialLinks.length >= 6) {
      sileo.error({ title: "Максимум 6 ссылок", duration: 2000 });
      return;
    }
    setSocialLinks([...socialLinks, { platform: "telegram", url: "" }]);
  };

  const handleRemoveLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (
    index: number,
    field: "platform" | "url",
    value: string,
  ) => {
    setSocialLinks(
      socialLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link,
      ),
    );
  };

  const handleSave = async () => {
    const trimmedLinks = socialLinks
      .filter((l) => l.url.trim() !== "")
      .map((l) => ({
        platform: l.platform.trim(),
        url: l.url.trim(),
      }));

    setIsSaving(true);
    try {
      const input: UpdateProfileInput = {
        username: user.username,
        bio: bio.trim() || null,
        socialLinks: trimmedLinks.length > 0 ? trimmedLinks : null,
      };
      await updateProfile(input);
      setBio(bio.trim());
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

      {/* Social links */}
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
        <div className="space-y-2">
          {socialLinks.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <select
                value={link.platform}
                onChange={(e) =>
                  handleLinkChange(index, "platform", e.target.value)
                }
                className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                type="url"
                value={link.url}
                onChange={(e) => handleLinkChange(index, "url", e.target.value)}
                placeholder={getPlatformPlaceholder(
                  link.platform as (typeof PLATFORM_OPTIONS)[number],
                )}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={() => handleRemoveLink(index)}
                className="p-1 text-gray-500 hover:text-red-400 rounded cursor-pointer"
                title="Удалить"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {socialLinks.length < 6 && (
            <button
              onClick={handleAddLink}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-700 border border-gray-600 text-xs text-gray-300 hover:bg-gray-600 cursor-pointer"
            >
              <Plus size={14} />
              Добавить ссылку
            </button>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1 bg-violet-500/20 border border-violet-500/40 rounded-lg text-xs font-medium text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 cursor-pointer"
            >
              <Check size={14} />
              Готово
            </button>
            <button
              onClick={() => setEditingLinks(false)}
              className="flex items-center gap-1 px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-400 hover:bg-gray-600 cursor-pointer"
            >
              <X size={14} />
              Отмена
            </button>
          </div>
        </div>
      )}

      {!editingLinks && hasChanges && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-1.5 bg-violet-500/20 border border-violet-500/40 rounded-lg text-xs font-medium text-violet-300 hover:bg-violet-500/30 disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? "Сохранение…" : "Сохранить"}
        </button>
      )}
    </div>
  );
}
