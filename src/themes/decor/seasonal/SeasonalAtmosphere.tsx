import { AutumnLeavesAtmosphere } from "./AutumnLeavesAtmosphere";
import { AutumnRainAtmosphere } from "./AutumnRainAtmosphere";
import { WinterFrostAtmosphere } from "./WinterFrostAtmosphere";
import { WinterAuroraAtmosphere } from "./WinterAuroraAtmosphere";
import { WinterNewYearAtmosphere } from "./WinterNewYearAtmosphere";

export interface SeasonalAtmosphereProps {
  theme: string | null | undefined;
  effectsEnabled?: boolean;
}

export function SeasonalAtmosphere({
  theme,
  effectsEnabled = true,
}: SeasonalAtmosphereProps) {
  if (!effectsEnabled || !theme) {
    return null;
  }

  switch (theme) {
    case "autumn-leaves":
      return <AutumnLeavesAtmosphere />;
    case "autumn-rain":
      return <AutumnRainAtmosphere />;
    case "winter-frost":
      return <WinterFrostAtmosphere />;
    case "winter-aurora":
      return <WinterAuroraAtmosphere />;
    case "winter-newyear":
      return <WinterNewYearAtmosphere />;
    default:
      return null;
  }
}
