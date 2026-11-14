import { QRCodeSVG } from "qrcode.react";

export interface ReadingTicketQrProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  className?: string;
  includeMargin?: boolean;
}

/**
 * Векторный компонент QR-кода для читательского билета и проверки совместимости.
 */
export function ReadingTicketQr({
  value,
  size = 80,
  fgColor = "#000000",
  bgColor = "transparent",
  className = "",
  includeMargin = false,
}: ReadingTicketQrProps) {
  if (!value) return null;

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        fgColor={fgColor}
        bgColor={bgColor}
        includeMargin={includeMargin}
        level="M"
      />
    </div>
  );
}
