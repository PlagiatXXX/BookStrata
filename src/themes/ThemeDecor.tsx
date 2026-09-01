// ThemeDecor — router for decorative overlays
import { FallingLeaves } from "./decor/FallingLeaves";

interface ThemeDecorProps {
  name: string;
}

export function ThemeDecor({ name }: ThemeDecorProps) {
  switch (name) {
    case "falling-leaves":
      return <FallingLeaves />;
    default:
      return null;
  }
}
