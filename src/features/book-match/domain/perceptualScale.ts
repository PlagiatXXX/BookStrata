/**
 * Perceptual Scale — нелинейное преобразование шкалы 0–100 через sigmoid.
 *
 * Проблема: линейная шкала не соответствует восприятию человека.
 * Разница между 45 и 55 ощущается сильнее, чем между 80 и 90.
 *
 * Решение: S-образная кривая (sigmoid), которая растягивает середину
 * и сжимает края. Центр (50) остаётся фиксированным.
 *
 * Формула: perceptual(x) = 100 / (1 + e^(-k * (x - 50) / 50))
 * где k = 4.5 (оптимальная крутизна для UI-слайдеров).
 */

const K = 4.5;

/** Sigmoid-преобразование: линейное значение → воспринимаемое. */
export function perceptual(linear: number): number {
  const x = (linear - 50) / 50; // нормализация в [-1, 1]
  const sigmoid = 1 / (1 + Math.exp(-K * x));
  return Math.round(sigmoid * 100 * 10) / 10; // 1 знак после запятой
}

/** Обратное преобразование: воспринимаемое → линейное. */
export function perceptualInverse(perceived: number): number {
  // inversesigmoid: x = 50 + 50 * ln(1/y - 1) / (-k)
  const y = perceived / 100;
  if (y <= 0) return 0;
  if (y >= 1) return 100;
  const x = 50 + (50 * Math.log((1 - y) / y)) / -K;
  return Math.round(x * 10) / 10;
}
