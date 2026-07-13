import { useState, useCallback } from "react";
import { apiTrackEvent } from "@/lib/analyticsApi";

export interface ShareUrls {
  telegram: string;
  vk: string;
}

/**
 * Хук для «Поделиться в соцсетях».
 * Возвращает:
 *   getShareUrls({ url, title }) — ссылки для TG/VK/Twitter
 *   copyLink(url) — копирование в буфер обмена + copied на 2с
 *   shareTo(url) — открыть URL соцсети в новом окне
 *   copied — флаг «скопировано»
 */
export function useShare() {
  const [copied, setCopied] = useState(false);

  const getShareUrls = useCallback(
    ({ url, title }: { url: string; title: string }): ShareUrls => {
      const text = `Мой книжный тир-лист «${title}» на BookStrata`;
      const encodedUrl = encodeURIComponent(url);
      const encodedText = encodeURIComponent(text);

      return {
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        vk: `https://vk.com/share.php?url=${encodedUrl}&title=${encodeURIComponent(title)}&description=${encodedText}&noparse=true`,

      };
    },
    [],
  );

  const copyLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Трекинг для воронки
    apiTrackEvent('share_clicked', { method: 'copy' });
  }, []);

  /** Открыть URL соцсети в новом окне */
  const shareTo = useCallback((shareUrl: string) => {
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=500");
    // Трекинг для воронки
    apiTrackEvent('share_clicked', { method: 'social' });
  }, []);

  return { getShareUrls, copyLink, copied, shareTo };
}
