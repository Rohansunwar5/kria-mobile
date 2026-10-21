import type { RecentMatch, SportSummary } from '@/api/career';
import type { RankedPlayer } from '@/api/rankings';
import { colors } from '@/constants/theme';
import { heroFor, RANK_MIN, sportName } from '@/lib/homeView';
import { RANKED_SPORTS } from '@/lib/sports';
import type { TournamentHistoryEntry } from '@/store/slices/registrationSlice';

export const ALL = 'all';

/** Every sport's figures summed: "All sports" is a real total, not an average of rates. */
export function allSports(sports: SportSummary[]): SportSummary {
  const sum = (k: keyof SportSummary) => sports.reduce((n, s) => n + (s[k] as number), 0);
  const decided = sum('decided');
  return { sport: ALL, played: sum('played'), decided, won: sum('won'), lost: sum('lost'), tied: sum('tied'), noResult: sum('noResult'), winRate: decided ? sum('won') / decided : 0 };
}

/**
 * DESIGN §5.8 ring: the win rate, or the distance to a ranking ("4/10") while
 * a rankable sport has under 10 decided matches.
 */
export function ringFor(s: SportSummary) {
  const towardsRank = s.sport !== ALL && RANKED_SPORTS.includes(s.sport) && s.decided < RANK_MIN;
  if (towardsRank) return { fraction: s.decided / RANK_MIN, label: `${s.decided}/${RANK_MIN}`, muted: true };
  if (!s.decided) return { fraction: 0, label: '—', muted: true };
  return { fraction: s.winRate, label: `${Math.round(s.winRate * 100)}%`, muted: false };
}

/** The W/L/T/NR split, in the order and colours of DESIGN §4.1. */
export function resultsBar(s: SportSummary) {
  const total = s.won + s.lost + s.tied + s.noResult;
  return [
    { label: 'Won', value: s.won, color: colors.accent },
    { label: 'Lost', value: s.lost, color: colors.loss },
    { label: 'Tied', value: s.tied, color: colors.tie },
    { label: 'No result', value: s.noResult, color: colors.noResult },
  ].map((b) => ({ ...b, share: total ? b.value / total : 0 }));
}

/** Last 10 for a sport (or all), newest first, from the career feed. */
export function formFor(recent: RecentMatch[], sport: string) {
  const rows = (sport === ALL ? recent : recent.filter((r) => r.sport === sport)).slice(0, 10);
  const won = rows.filter((r) => r.result === 'won').length;
  return { rows, note: rows.length ? `${won} of last ${rows.length} won` : '' };
}

/** The ranking card under the form (mock 1h): title, one line, and the track while unranked. */
export function rankNote(s: SportSummary, board: RankedPlayer[] | null | undefined, meId: string) {
  const name = sportName(s.sport).toLowerCase();
  if (!RANKED_SPORTS.includes(s.sport)) return { title: 'Not ranked', line: `Kria doesn't rank ${name} yet.`, progress: null };
  if (s.decided < RANK_MIN) {
    const left = RANK_MIN - s.decided;
    return { title: 'Not ranked yet', line: `${s.decided} of ${RANK_MIN} decided matches. ${left} more and you appear on the ${name} board.`, progress: s.decided / RANK_MIN };
  }
  if (board === undefined) return { title: 'Ranking', line: 'Loading the board…', progress: null };
  const h = heroFor(s, board, meId);
  return { title: h.ranked ? `${h.big} in ${name} on Kria` : h.rankLabel === 'Outside top 50' ? `Outside the top 50 in ${name}` : 'Ranking', line: `${h.gapA}${h.gapB}`.trim(), progress: null };
}

/** The best (lowest) rank you hold across sports, for the chip under your name. */
export function bestRank(sports: SportSummary[], boards: Record<string, RankedPlayer[] | null>, meId: string) {
  let best: { rank: number; sport: string } | null = null;
  for (const s of sports) {
    const i = boards[s.sport]?.findIndex((p) => p.playerId === meId) ?? -1;
    if (i >= 0 && (!best || i + 1 < best.rank)) best = { rank: i + 1, sport: s.sport };
  }
  return best;
}

/**
 * Tournament rows (mock 1h). The only placement the server records is a
 * winner's title (SERVER-GAPS.md #9/#10), so other rows say where the entry stands.
 */
export function tournamentRow(e: TournamentHistoryEntry, titles: string[]) {
  const t = e.tournament;
  const won = !!t && !!e.category && titles.includes(`Winner of ${e.category.name} at ${t.name}`);
  const result = won ? { text: 'Winner', color: colors.gold }
    : t?.status === 'ongoing' ? { text: 'In progress', color: colors.text2 }
      : t?.status === 'completed' ? { text: 'Completed', color: colors.text3 }
        : t?.status === 'cancelled' ? { text: 'Cancelled', color: colors.text4 }
          : e.status === 'pending' ? { text: 'Awaiting approval', color: colors.text3 }
            : e.auctionData?.soldPrice ? { text: `Sold ₹${e.auctionData.soldPrice.toLocaleString('en-IN')}`, color: colors.text2 }
              : { text: 'Entered', color: colors.text2 };
  const sub = [e.category?.name, e.team ? `for ${e.team.name}` : 'individual entry'].filter(Boolean).join(' · ');
  return { key: e._id, tournamentId: t?._id, name: t?.name ?? 'Tournament', sub, sport: t?.sport, crest: e.team?.logo, team: e.team?.name, result };
}
