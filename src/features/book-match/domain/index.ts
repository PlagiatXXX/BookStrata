// src/features/book-match/domain/index.ts
// Barrel export — domain layer.

export type {
  MatchAxis,
  ReadingProfile,
  UserMood,
  MatchResult,
  MatchLevel,
  MatchLevelLabel,
  AxisDiff,
} from "./types";

export { AXIS_WEIGHTS, AXIS_LABELS, SNAP_POINTS, snapValue, describeAxisDiff } from "./types";
export { matchScore } from "./matchScore";
export { matchLevel } from "./matchLevel";
export { explainMatch, describeDiff } from "./explainMatch";
export type { ExplainResult } from "./explainMatch";
