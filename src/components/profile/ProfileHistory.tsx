import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Icon } from '@/components/icons';
import { RecentMatches } from '@/components/profile/RecentMatches';
import { PlayedForCard, type PlayedForEntry } from '@/components/profile/PlayedForCard';
import { KnockoutRow } from '@/components/knockout/KnockoutRow';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import type { RecentMatch } from '@/api/career';
import type { QuickKnockout } from '@/api/quickKnockout';

type Segment = 'matches' | 'knockouts' | 'teams';

/** A tournament entry. The own-profile history carries the auction price; the
 *  public payload never does, so `auctionData` is simply absent there. */
export type TeamEntry = PlayedForEntry & { _id: string; auctionData?: { soldPrice?: number } };

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 10,
  letterSpacing: 0.12 * 10,
  textTransform: 'uppercase' as const,
  color: theme.textFaint,
});

const ROWS = 3;

function Empty({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <View style={{ padding: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.keyline, borderRadius: 6 }}>
      <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, lineHeight: 19, color: theme.textMeta }}>{text}</Text>
    </View>
  );
}

/**
 * A player's history behind one switch — matches, knockouts and teams — so the
 * profile stays short. Each list shows a few rows and hands the rest to its own
 * full screen.
 *
 * Knockouts appear only on your own profile (`knockouts` given): the public
 * payload has none to show.
 */
export function ProfileHistory({
  recent,
  loading,
  error,
  onRetry,
  onAllMatches,
  knockouts,
  viewerId,
  onOpenKnockout,
  onAllKnockouts,
  teams,
  onOpenTournament,
  teamsEmpty,
}: {
  recent: RecentMatch[] | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onAllMatches: () => void;
  knockouts?: QuickKnockout[];
  viewerId?: string;
  onOpenKnockout?: (id: string) => void;
  onAllKnockouts?: () => void;
  teams: TeamEntry[];
  onOpenTournament: (id: string) => void;
  /** What an empty Teams list says — it reads differently about yourself. */
  teamsEmpty: string;
}) {
  const theme = useTheme();
  const [segment, setSegment] = useState<Segment>('matches');
  const segments: { key: Segment; label: string }[] = [
    { key: 'matches', label: 'Matches' },
    ...(knockouts ? [{ key: 'knockouts' as const, label: 'Knockouts' }] : []),
    { key: 'teams', label: 'Teams' },
  ];

  const matches = () => {
    if (!loading && !error && recent && recent.length === 0) return <Empty text="Every match played is listed here, newest first." />;
    return (
      <RecentMatches matches={recent} loading={loading} error={error} onRetry={onRetry} onSeeAll={onAllMatches} limit={ROWS} heading={null} />
    );
  };

  const knockoutList = () => {
    const all = knockouts ?? [];
    // A cancelled knockout is not history worth a row here; All knockouts keeps it.
    const shown = all.filter((k) => k.status !== 'cancelled');
    const rows = shown.slice(0, ROWS);
    const cancelled = all.length - shown.length;
    if (all.length === 0) return <Empty text="Knockouts you host or play in are listed here." />;
    return (
      <View style={{ gap: 9 }}>
        {rows.map((k) => (
          <KnockoutRow key={k._id} knockout={k} viewerId={viewerId} onPress={() => onOpenKnockout?.(k._id)} />
        ))}
        {cancelled > 0 ? (
          <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, lineHeight: 17, color: theme.textFaint }}>
            {cancelled === 1
              ? '1 cancelled knockout is left out here. It stays in All knockouts.'
              : `${cancelled} cancelled knockouts are left out here. They stay in All knockouts.`}
          </Text>
        ) : null}
        {all.length > rows.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See all knockouts"
            onPress={onAllKnockouts}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={{ ...LBL(theme), color: theme.brandInk }}>All knockouts</Text>
            <Icon name="arrow-right" size={12} color={theme.brandInk} strokeWidth={2.4} />
          </Pressable>
        ) : null}
      </View>
    );
  };

  const teamList = () => {
    if (teams.length === 0) return <Empty text={teamsEmpty} />;
    return (
      <View style={{ gap: 9 }}>
        {teams.map((e) => (
          <PlayedForCard
            key={e._id}
            entry={e}
            soldPrice={e.auctionData?.soldPrice}
            onPress={e.tournament ? () => onOpenTournament(e.tournament!._id) : undefined}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
      <Text style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 20, lineHeight: 24, color: theme.text, marginBottom: 10 }}>
        History
      </Text>
      <View
        accessibilityRole="tablist"
        style={{ flexDirection: 'row', marginBottom: 10, borderWidth: 1.5, borderColor: theme.line, borderRadius: 5, backgroundColor: theme.surface, overflow: 'hidden' }}
      >
        {segments.map((s, i) => {
          const on = s.key === segment;
          return (
            <Pressable
              key={s.key}
              accessibilityRole="tab"
              accessibilityLabel={s.label}
              accessibilityState={{ selected: on }}
              onPress={() => setSegment(s.key)}
              style={{
                flex: 1,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? theme.brand : 'transparent',
                ...(i > 0 ? { borderLeftWidth: 1.5, borderLeftColor: theme.lineFaint } : null),
              }}
            >
              <Text style={{ ...LBL(theme), color: on ? theme.onBrand : theme.textFaint }}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {segment === 'matches' ? matches() : segment === 'knockouts' ? knockoutList() : teamList()}
    </View>
  );
}
