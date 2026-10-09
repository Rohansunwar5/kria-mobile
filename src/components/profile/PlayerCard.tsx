import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { Icon } from '@/components/icons';
import { Hairlines, Hazard } from '@/components/canvas';
import { Ghost } from '@/components/states';
import { FormStrip } from '@/components/profile/FormStrip';
import { useTheme } from '@/lib/theme';
import type { Palette } from '@/lib/theme/palette';
import { winPercent } from '@/lib/format';
import { SPORT_ICON, SPORT_LABELS } from '@/lib/sports';
import type { CareerProfile, RecentMatch } from '@/api/career';

const LBL = (theme: Palette) => ({
  fontFamily: 'SpaceMono_700Bold' as const,
  fontSize: 9,
  letterSpacing: 0.14 * 9,
  textTransform: 'uppercase' as const,
  color: theme.textMeta,
});

/**
 * Career totals across every sport. The win rate is SUMMED won over SUMMED
 * decided — never an average of per-sport rates, which would weigh a sport
 * played twice the same as one played forty times.
 */
export function careerTotals(profile: CareerProfile | null): { played: number; winRate: string } {
  const sports = profile?.sports ?? [];
  const played = sports.reduce((n, s) => n + s.played, 0);
  const won = sports.reduce((n, s) => n + s.won, 0);
  const decided = sports.reduce((n, s) => n + s.decided, 0);
  return { played, winRate: winPercent(decided > 0 ? won / decided : 0, decided) };
}

/**
 * The top of a profile, yours or another player's: photo, name, where and what
 * they play, a four-number scoreboard, and recent form.
 *
 * No email: it is private, and it says nothing about a player. Your own stays
 * in Edit profile. Designed in docs/profile-redesign.html.
 */
export function PlayerCard({
  name,
  avatar,
  action,
  location,
  profile,
  loading,
  recent,
  honours,
  events,
}: {
  name: string;
  /** The photo: the picker on your own profile, a plain avatar on anyone else's. */
  avatar: ReactNode;
  /** Top-right control — the Settings gear, on your own profile only. */
  action?: ReactNode;
  location?: string;
  profile: CareerProfile | null;
  loading: boolean;
  recent: RecentMatch[] | null;
  /** Granted honours plus legacy titles. */
  honours: number;
  /** Tournaments entered. */
  events: number;
}) {
  const theme = useTheme();
  const sports = profile?.sports.map((s) => s.sport) ?? [];
  const totals = careerTotals(profile);
  // Nothing cached yet: a dash, never a 0 that reads as a real figure.
  const pending = loading && !profile;
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  const cells = [
    { label: 'Played', value: pending ? '–' : String(totals.played), accent: false },
    { label: 'Win rate', value: pending ? '–' : totals.winRate, accent: true },
    { label: 'Honours', value: String(honours), accent: false },
    { label: 'Events', value: String(events), accent: false },
  ];

  return (
    <View style={{ overflow: 'hidden' }}>
      <Hairlines />
      <Ghost text={initials} size={168} style={{ right: -22, top: -14 }} />

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: 16, paddingTop: 10 }}>
        {avatar}
        <View style={{ flex: 1, gap: 6, paddingBottom: 2 }}>
          <Text
            numberOfLines={2}
            style={{ fontFamily: 'Anton_400Regular', textTransform: 'uppercase', fontSize: 32, lineHeight: 38, color: theme.text }}
          >
            {name}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            {location ? <Text style={LBL(theme)}>{location}</Text> : null}
            {sports.map((s) => (
              <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name={SPORT_ICON[s] ?? 'trophy'} size={12} color={theme.brandInk} />
                <Text style={LBL(theme)}>{SPORT_LABELS[s] ?? s}</Text>
              </View>
            ))}
            {!location && sports.length === 0 && !pending ? <Text style={LBL(theme)}>No matches yet</Text> : null}
          </View>
        </View>
        {action ? <View style={{ alignSelf: 'flex-start' }}>{action}</View> : null}
      </View>

      <View style={{ flexDirection: 'row', marginTop: 16, borderTopWidth: 1.5, borderTopColor: theme.lineSoft }}>
        {cells.map((c, i) => (
          <View
            key={c.label}
            accessible
            accessibilityLabel={`${c.label} ${c.value}`}
            style={{
              flex: 1,
              paddingLeft: i === 0 ? 16 : 12,
              paddingRight: 6,
              paddingVertical: 10,
              ...(i > 0 ? { borderLeftWidth: 1.5, borderLeftColor: theme.lineSoft } : null),
            }}
          >
            <Text numberOfLines={1} style={{ ...LBL(theme), fontSize: 8, letterSpacing: 0.12 * 8, color: theme.textFaint }}>{c.label}</Text>
            <Text style={{ fontFamily: 'SpaceMono_700Bold', fontSize: 22, color: c.accent ? theme.brandInk : theme.text, marginTop: 3 }}>
              {c.value}
            </Text>
          </View>
        ))}
      </View>

      <FormStrip recent={recent ?? []} style={{ paddingHorizontal: 16 }} />
      <Hazard />
    </View>
  );
}
