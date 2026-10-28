// ThemeDecor — router for decorative overlays
import { FallingLeaves } from "./decor/FallingLeaves";
import { HalloweenAtmosphere } from "./decor/HalloweenAtmosphere";

interface ThemeDecorProps {
  name: string;
}

export function ThemeDecor({ name }: ThemeDecorProps) {
  switch (name) {
    case "falling-leaves":
      return <FallingLeaves />;
    case "haunted-night":
      return <HalloweenAtmosphere />;
    default:
      return null;
  }
}
