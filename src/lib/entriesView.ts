import type { MyEntry } from '@/api/tournaments';
import { sportName } from '@/lib/homeView';
import { rupees } from '@/lib/format';

export type Tone = 'text' | 'text2' | 'text3' | 'text4' | 'accentInk' | 'lossInk';
export interface EntryRow {
  id: string; tournamentId: string; categoryId: string; createdAt: string;
  name: string;
  sub: string;
  sport?: string;
  status: string; tone: Tone;
  /** Where the money stands on this entry, when there is money in it. */
  money?: string;
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

/** A paid entry says what it cost; one the server never saw paid says what is
 *  still owed. A free category says nothing. */
function moneyOf(e: MyEntry): string | undefined {
  const fee = e.category?.isPaidRegistration ? (e.category.registrationFee ?? 0) : 0;
  if (e.payment?.status === 'paid') return `Paid ${rupees(e.payment.amount)}`;
  if (fee > 0 && e.status !== 'withdrawn' && e.status !== 'rejected') return `${rupees(fee)} to pay`;
  return undefined;
}

export function entryRows(entries: MyEntry[]): { active: EntryRow[]; closed: EntryRow[] } {
  const active: EntryRow[] = [];
  const closed: EntryRow[] = [];
  for (const e of entries) {
    const st = statusOf(e);
    const over = e.tournament?.status === 'completed' || e.tournament?.status === 'cancelled';
    // A multisport tournament's own `sport` is just its first one, so the
    // category's wins when it has one.
    const sport = e.category?.sport ?? e.tournament?.sport;
    const categoryName = e.category?.name;
    const sub = categoryName && sport ? `${categoryName} · ${sportName(sport)}` : categoryName ? categoryName : sport ? sportName(sport) : '';
    const isClosed = st.closed || over;
    const row: EntryRow = {
      id: e._id, tournamentId: e.tournamentId, categoryId: e.categoryId, createdAt: e.createdAt,
      name: e.tournament?.name || 'Tournament', sub, sport,
      status: st.closed ? st.status : over ? `Tournament ${e.tournament!.status}` : st.status,
      tone: st.closed ? st.tone : over ? 'text3' : st.tone,
      money: moneyOf(e),
      canWithdraw: !isClosed && (e.status === 'pending' || e.status === 'approved'),
    };
    (isClosed ? closed : active).push(row);
  }
  const newest = (a: EntryRow, b: EntryRow) => +new Date(b.createdAt) - +new Date(a.createdAt);
  return { active: active.sort(newest), closed: closed.sort(newest) };
}
