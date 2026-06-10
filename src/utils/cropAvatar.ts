/**
 * Обрезка изображения аватарки с учётом позиции (pan).
 * Вырезает квадрат максимального размера из центра с учётом смещения.
 *
 * @param imageUrl — data URL или URL изображения
 * @param x — смещение по X в процентах (-50..50)
 * @param y — смещение по Y в процентах (-50..50)
 * @returns data URL обрезанного квадратного изображения
 */
export function cropAvatar(
  imageUrl: string,
  x: number,
  y: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const side = Math.min(img.width, img.height);

      // Вычисляем смещение пикселей: позиция в процентах относительно "свободного пространства"
      const maxOffsetX = (img.width - side) / 2;
      const maxOffsetY = (img.height - side) / 2;

      // x и y в диапазоне -1..1, где 0 = центр, -1 = максимум влево/вверх, 1 = вправо/вниз
      const offsetX = Math.round(maxOffsetX * Math.max(-1, Math.min(1, x / 50)));
      const offsetY = Math.round(maxOffsetY * Math.max(-1, Math.min(1, y / 50)));

      const sx = (img.width - side) / 2 + offsetX;
      const sy = (img.height - side) / 2 + offsetY;

      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Не удалось создать canvas"));
        return;
      }

      ctx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Не удалось загрузить изображение"));
    img.src = imageUrl;
  });
}
