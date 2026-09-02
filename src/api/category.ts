import API from '@/api/axios';
import type { Category } from '@/store/slices/registrationSlice';

export interface SportConfig {
  sport: string;
  displayName?: string;
  scoringType?: string;
  matchDurationType?: string;
  matchFormats?: { name: string; playersPerSide: number; description?: string }[];
  scoringConfig?: {
    pointsToWin?: number;
    minPointsDifference?: number;
    maxPoints?: number;
    setsToWin?: number;
    defaultOvers?: number;
    allowTieBreaker?: boolean;
    tieBreakerRules?: string;
  };
  bestOfOptions?: number[];
  allowedBracketTypes?: string[];
  scoreLabels?: { primary?: string; secondary?: string; tertiary?: string };
  defaults?: { bestOf?: number; pointsToWin?: number; tieBreakerPoints?: number };
}

const unwrap = (res: any) => res?.data?.data?.data ?? res?.data?.data ?? null;

export async function getCategory(categoryId: string): Promise<Category | null> {
  const res = await API.get(`/categories/${categoryId}`);
  return unwrap(res);
}

/** Sport rules drive the format block. A sport with no config is not an error —
 *  the screen just omits the block. */
export async function getSportConfig(sport: string): Promise<SportConfig | null> {
  try {
    const res = await API.get(`/sports/${sport}`);
    return unwrap(res);
  } catch {
    return null;
  }
}

/** How full a category is, for the slot-pressure meter. */
export function slotPressure(filled: number, cap?: number) {
  if (!cap || cap <= 0) return { left: 0, ratio: 0, filling: false, unlimited: true };
  const left = Math.max(0, cap - filled);
  const ratio = Math.min(1, filled / cap);
  // ponytail: "filling fast" is >=75% full with slots left. Tune the threshold
  // if it fires too often.
  return { left, ratio, filling: ratio >= 0.75 && left > 0, unlimited: false };
}
