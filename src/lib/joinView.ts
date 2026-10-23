import type { QuickCode } from '@/api/quickKnockout';
import { formatLabel as knockoutFormat, teamPlayers } from '@/lib/quickKnockoutView';
import { formatLabel as matchFormat } from '@/lib/quickMatchView';
import { initials } from '@/lib/matchCard';
import { sportName } from '@/lib/homeView';

export interface SlotView { slotId: string; name: string; ini: string; taken: boolean }
export type JoinView =
  | { kind: 'match'; kicker: string; title: string; format: string; code: string;
      sides: { name: string; slots: SlotView[] }[]; mine: boolean; full: boolean }
  | { kind: 'knockout'; kicker: string; title: string; format: string; host: string; count: number;
      mine: boolean; closed: string | null;
      teams: { teamId: string; name: string; count: string; full: boolean }[] | null;
      guests: { playerKey: string; name: string }[] };

const CLOSED = {
  live: 'This knockout has already started.',
  completed: 'This knockout has finished.',
  cancelled: 'This knockout was cancelled.',
} as const;

export function joinView(found: QuickCode, meId: string): JoinView {
  if (found.kind === 'match') {
    const m = found.data;
    const sides = m.sides.map((side) => ({
      name: side.name,
      slots: side.slots.map((s) => ({ slotId: s.slotId, name: s.displayName, ini: initials(s.displayName), taken: Boolean(s.playerId) })),
    }));
    return {
      kind: 'match',
      kicker: `Quick match · ${sportName(m.sport)}`,
      title: m.sides.map((s) => s.name).join(' vs '),
      format: matchFormat(m),
      code: m.joinCode,
      sides,
      mine: m.sides.some((s) => s.slots.some((x) => x.playerId === meId)),
      full: sides.every((s) => s.slots.every((x) => x.taken)),
    };
  }
  const k = found.data;
  const cricket = k.sport === 'cricket';
  const per = k.matchConfig.playersPerTeam ?? 0;
  return {
    kind: 'knockout',
    kicker: `Knockout · ${sportName(k.sport)}`,
    title: k.name,
    format: knockoutFormat(k) + (cricket ? ` · ${per} a side` : ''),
    host: k.players.find((p) => p.playerId === k.hostId)?.displayName ?? 'the host',
    count: k.players.length,
    mine: k.players.some((p) => p.playerId === meId),
    closed: k.status === 'waiting' ? null : CLOSED[k.status],
    teams: cricket
      ? (k.teams ?? []).map((t) => {
          const n = teamPlayers(k, t.teamId).length;
          const full = n >= per;
          return { teamId: t.teamId, name: t.name, count: full ? 'Full' : `${n}/${per}`, full };
        })
      : null,
    guests: k.players.filter((p) => !p.playerId).map((p) => ({ playerKey: p.playerKey, name: p.displayName })),
  };
}
