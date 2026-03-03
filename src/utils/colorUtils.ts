/**
 * Calculates the luminance of a color
 * @param r Red value (0-255)
 * @param g Green value (0-255)
 * @param b Blue value (0-255)
 * @returns Luminance value
 */
export function getLuminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Converts hex color to RGB
 * @param hex Hex color string (#RRGGBB)
 * @returns RGB object with r, g, b values
 */
export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Determines if a color is light or dark and returns appropriate text color
 * @param backgroundColor Background color in hex format
 * @returns Text color ('#000000'/'black' for light backgrounds, '#FFFFFF'/'white' for dark backgrounds)
 */
export function getTextColorForBackground(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) {
    // Default to white text for unknown colors
    return "white";
  }

  const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
  // If luminance is greater than 0.5, the background is light, use dark text
  return luminance > 0.5 ? "black" : "white";
}

/**
 * Returns Tailwind CSS text color class based on background
 * @param backgroundColor Background color in hex format
 * @returns Tailwind CSS text color class
 */
export function getTailwindTextColorClass(backgroundColor: string): string {
  const textColor = getTextColorForBackground(backgroundColor);
  return textColor === "black" ? "text-black" : "text-white";
}

/**
 * Calculates contrast ratio between two colors
 * @param bgColor Background color in hex
 * @param textColor Text color in hex
 * @returns Contrast ratio
 */
export function getContrastRatio(bgColor: string, textColor: string): number {
  const bgRgb = hexToRgb(bgColor);
  const fgRgb = hexToRgb(textColor);

  if (!bgRgb || !fgRgb) {
    return 1; // Return minimum contrast if colors are invalid
  }

  const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const fgLum = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);

  const brightest = Math.max(bgLum, fgLum);
  const darkest = Math.min(bgLum, fgLum);

  return (brightest + 0.05) / (darkest + 0.05);
}
