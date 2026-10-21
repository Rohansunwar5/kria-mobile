import type { CreateKnockoutBody } from '@/api/quickKnockout';
import type { CreateQuickMatchBody } from '@/api/quickMatch';
import { SPORT_LABELS } from '@/lib/sports';

/**
 * Mock 1d, for both things a player can host: one quick match (POST
 * /quick-match) or a quick knockout (POST /quick-knockout). Each sends exactly
 * what its validator takes.
 */
export type HostSport = 'badminton' | 'table_tennis' | 'cricket';
export const HOST_SPORTS: HostSport[] = ['badminton', 'table_tennis', 'cricket'];
export type HostKind = 'match' | 'knockout';
type BestOf = 1 | 3 | 5 | 7;
type Points = 11 | 15 | 21;

/** Mirrors RALLY_FORMATS on the server (quickMatch.model.ts); both validators refuse anything else. */
export const RALLY_FORMATS: Record<Exclude<HostSport, 'cricket'>, { bestOf: BestOf[]; points: Points[]; defaults: { bestOf: BestOf; pointsToWin: Points } }> = {
  badminton: { bestOf: [1, 3, 5], points: [11, 15, 21], defaults: { bestOf: 3, pointsToWin: 21 } },
  table_tennis: { bestOf: [1, 3, 5, 7], points: [11, 21], defaults: { bestOf: 3, pointsToWin: 11 } },
};

/** A spot other than the host's. `name: ''` is open: it goes out as "Player N" for anyone to claim. */
export interface Spot {
  playerId?: string;
  name: string;
}

export interface HostForm {
  kind: HostKind;
  sport: HostSport;
  doubles: boolean;
  bestOf: BestOf;
  pointsToWin: Points;
  /** Cricket: players 2–11 a side, overs 1–50; a match adds per bowler 1–overs, a knockout 3–8 teams. */
  players: number;
  overs: number;
  perBowler: number;
  teams: number;
  sideA: string;
  sideB: string;
  /** Side A's spots after the host's own; side B's from the first. Read through `slotsFor`. */
  spotsA: Spot[];
  spotsB: Spot[];
  wait: boolean;
  /** Knockout only. Optional: the server names it "<first name>'s Knockout". */
  name: string;
}

export function initialForm(primarySport?: string): HostForm {
  const sport = HOST_SPORTS.includes(primarySport as HostSport) ? (primarySport as HostSport) : 'badminton';
  return {
    kind: 'match',
    sport,
    doubles: false,
    ...RALLY_FORMATS[sport === 'cricket' ? 'badminton' : sport].defaults,
    players: 6,
    overs: 8,
    // The server's own default when the field is omitted.
    perBowler: 4,
    teams: 4,
    sideA: '',
    sideB: '',
    spotsA: [],
    spotsB: [],
    wait: true,
    name: '',
  };
}

/** Switching rally sport resets to that sport's usual format, so badminton's 15 never reaches table tennis. */
export function pickSport(f: HostForm, sport: HostSport): HostForm {
  if (sport === f.sport || sport === 'cricket') return { ...f, sport };
  const d = RALLY_FORMATS[sport].defaults;
  return { ...f, sport, pointsToWin: d.pointsToWin, bestOf: f.kind === 'knockout' ? 1 : d.bestOf };
}

/** A knockout starts on one game a match (many matches to play); a single match on the sport's usual. */
export function pickKind(f: HostForm, kind: HostKind): HostForm {
  if (kind === f.kind) return f;
  const rally = f.sport === 'cricket' ? 'badminton' : f.sport;
  return { ...f, kind, bestOf: kind === 'knockout' ? 1 : RALLY_FORMATS[rally].defaults.bestOf };
}

export const perSide = (f: HostForm) => (f.sport === 'cricket' ? f.players : f.doubles ? 2 : 1);

/** Every slot of one side, host first on side A. `index` is the slot's place on its side. */
export function slotsFor(f: HostForm, side: 0 | 1, host: { playerId?: string; name: string }) {
  const n = perSide(f);
  const spots = side === 0 ? f.spotsA : f.spotsB;
  const offset = side === 0 ? 1 : 0;
  return Array.from({ length: n }, (_, i) => {
    if (side === 0 && i === 0) return { index: 0, host: true, spot: { playerId: host.playerId, name: host.name } as Spot };
    return { index: i, host: false, spot: spots[i - offset] ?? { name: '' } };
  });
}

export function setSpot(f: HostForm, side: 0 | 1, index: number, spot: Spot): HostForm {
  const key = side === 0 ? 'spotsA' : 'spotsB';
  const next = [...f[key]];
  next[index - (side === 0 ? 1 : 0)] = spot;
  return { ...f, [key]: next };
}

/** Step 3: a match needs both side names; a knockout's name is optional. */
export const namesReady = (f: HostForm) => f.kind === 'knockout' || (f.sideA.trim() !== '' && f.sideB.trim() !== '');

export function formatLine(f: HostForm) {
  if (f.sport === 'cricket') {
    return f.kind === 'knockout' ? `${f.players} a side · ${f.overs} overs · ${f.teams} teams` : `${f.players} a side · ${f.overs} overs · ${f.perBowler} per bowler`;
  }
  return `${f.doubles ? 'Doubles' : 'Singles'} · ${f.bestOf === 1 ? 'One game' : `Best of ${f.bestOf}`} to ${f.pointsToWin}`;
}

export function reviewRows(f: HostForm, host: { playerId?: string; name: string }, defaultName: string) {
  const rows = [
    { key: 'Sport', value: SPORT_LABELS[f.sport] ?? f.sport, step: 1 },
    { key: 'Type', value: f.kind === 'knockout' ? 'Knockout' : 'One match', step: 2 },
    { key: 'Format', value: formatLine(f), step: 2 },
  ];
  if (f.kind === 'knockout') return [...rows, { key: 'Name', value: f.name.trim() || defaultName, step: 3 }];
  const open = ([0, 1] as const).flatMap((side) => slotsFor(f, side, host)).filter((s) => !s.host && !s.spot.playerId).length;
  return [
    ...rows,
    { key: 'Sides', value: `${f.sideA.trim()} vs ${f.sideB.trim()}`, step: 3 },
    { key: 'Open spots', value: open ? `${open} to be claimed` : 'None', step: 3 },
  ];
}

export function buildBody(f: HostForm, host: { playerId?: string; name: string }): CreateQuickMatchBody {
  const side = (s: 0 | 1) => slotsFor(f, s, host).map(({ index, spot }) =>
    spot.playerId
      ? { playerId: spot.playerId, displayName: spot.name }
      // Placeholder name, the convention the server and old flow both use.
      : { displayName: spot.name.trim() || `Player ${index + 1}` },
  );
  return {
    sport: f.sport,
    sides: [{ name: f.sideA.trim(), slots: side(0) }, { name: f.sideB.trim(), slots: side(1) }],
    matchConfig: f.sport === 'cricket'
      ? { maxOvers: f.overs, maxOversPerBowler: Math.min(f.perBowler, f.overs), playersPerTeam: f.players }
      : { bestOf: f.bestOf, pointsToWin: f.pointsToWin },
    waitForPlayers: f.wait,
  };
}

export function buildKnockoutBody(f: HostForm): CreateKnockoutBody {
  const name = f.name.trim() ? { name: f.name.trim() } : {};
  if (f.sport === 'cricket') {
    return { sport: 'cricket', matchConfig: { maxOvers: f.overs, playersPerTeam: f.players }, teamCount: f.teams, ...name };
  }
  return { sport: f.sport, format: f.doubles ? 'doubles' : 'singles', matchConfig: { bestOf: f.bestOf, pointsToWin: f.pointsToWin }, ...name };
}
