/**
 * Утилита для показа пользовательских уведомлений об ошибках.
 *
 * Единственное место, где UI-библиотека (sileo) связана с отображением ошибок
 * из инфраструктурного слоя. Всё остальное — через неё.
 *
 * Если потребуется сменить библиотеку тостов или убрать тосты для SSR/тестов —
 * менять здесь, а не по всему коду.
 */
import { sileo } from "sileo";
import type { SileoButton } from "sileo";

interface NotifyErrorOptions {
  title: string;
  description?: string;
  /** Кнопка действия (например, «Обновить страницу») */
  button?: SileoButton;
}

export function notifyError(titleOrOpts: string | NotifyErrorOptions, description?: string): void {
  if (typeof document === "undefined") return;

  const opts = typeof titleOrOpts === "string"
    ? { title: titleOrOpts, description }
    : titleOrOpts;

  sileo.error({
    title: opts.title,
    description: opts.description,
    button: opts.button,
    duration: opts.button ? null : undefined, // с кнопкой — не скрываем автоматически
  });
}
