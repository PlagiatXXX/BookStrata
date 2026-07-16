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

export function notifyError(title: string, description?: string): void {
  if (typeof document === "undefined") return;
  sileo.error({ title, description });
}
