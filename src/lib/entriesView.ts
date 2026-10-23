import type { MyEntry, TournamentCategory } from '@/api/tournaments';
import { sportName } from '@/lib/homeView';
import { rupees } from '@/lib/format';

export interface EntryLookup { tournament: { name: string; status?: string; sport?: string }; categories: TournamentCategory[] }
export type Tone = 'text' | 'text2' | 'text3' | 'text4' | 'accentInk' | 'lossInk';
export interface EntryRow {
  id: string; tournamentId: string; categoryId: string; createdAt: string;
  name: string;
  sub: string;
  sport?: string;
  status: string; tone: Tone;
  canWithdraw: boolean;
}

function statusOf(e: MyEntry): { status: string; tone: Tone; closed: boolean } {
  switch (e.status) {
    case 'pending': return { status: 'Awaiting approval', tone: 'text2', closed: false };
    case 'approved': return { status: 'Approved', tone: 'text', closed: false };
    case 'rejected': return { status: 'Not accepted by the organiser', tone: 'lossInk', closed: true };
    case 'withdrawn': return { status: 'Withdrawn', tone: 'text4', closed: true };
    default: {
      const sold = e.auctionData?.soldPrice;
      return { status: sold ? `Drafted · sold ${rupees(sold)}` : 'Drafted', tone: 'accentInk', closed: false };
    }
  }
}

export function entryRows(entries: MyEntry[], lookups: Record<string, EntryLookup | null>): { active: EntryRow[]; closed: EntryRow[] } {
  const active: EntryRow[] = [];
  const closed: EntryRow[] = [];
  for (const e of entries) {
    const look = lookups[e.tournamentId] ?? null;
    const st = statusOf(e);
    const over = look?.tournament.status === 'completed' || look?.tournament.status === 'cancelled';
    const category = look?.categories.find((c) => c._id === e.categoryId);
    const sport = category?.sport ?? look?.tournament.sport;
    const sub = category && sport ? `${category.name} · ${sportName(sport)}` : category ? category.name : sport ? sportName(sport) : '';
    const isClosed = st.closed || over;
    const row: EntryRow = {
      id: e._id, tournamentId: e.tournamentId, categoryId: e.categoryId, createdAt: e.createdAt,
      name: look?.tournament.name || 'Tournament', sub, sport,
      status: st.closed ? st.status : over ? `Tournament ${look!.tournament.status}` : st.status,
      tone: st.closed ? st.tone : over ? 'text3' : st.tone,
      canWithdraw: !isClosed && (e.status === 'pending' || e.status === 'approved'),
    };
    (isClosed ? closed : active).push(row);
  }
  const newest = (a: EntryRow, b: EntryRow) => +new Date(b.createdAt) - +new Date(a.createdAt);
  return { active: active.sort(newest), closed: closed.sort(newest) };
}
